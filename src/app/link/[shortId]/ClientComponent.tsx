
/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente maneja la lógica más crítica de la aplicación: el conteo de visitas y la redirección.
 * Un cambio incorrecto aquí puede romper la monetización y el registro de clics.
 */

'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LinkGate from '@/components/link-gate'; 
import type { LinkData } from '@/types'; 
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, increment, serverTimestamp, getDoc } from 'firebase/firestore';

export default function ClientComponent({ shortId, linkId }: { shortId: string, linkId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!linkId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
        const linkRef = doc(db, 'links', linkId);
        const linkDoc = await getDoc(linkRef);

        if (!linkDoc.exists()) {
            setStatus('not-found');
            return;
        }

        const data = linkDoc.data() as Omit<LinkData, 'id'>;
        const link: LinkData = { id: linkDoc.id, ...data };

        // Check if creator account or link itself is suspended
        const userRef = doc(db, 'users', link.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            // If the user who created the link doesn't exist, treat the link as invalid.
            setStatus('invalid');
            return;
        }
        
        const userData = userSnap.data();
        if (userData?.accountStatus === 'suspended' || link.monetizationStatus === 'suspended') {
            setStatus('invalid');
            return;
        }
        
        setLinkData(link);

        const hasRules = link.rules && link.rules.length > 0;

        if (hasRules) {
            setGateStartTime(Date.now());
            setStatus('gate');
        } else {
            setStatus('redirecting');
            await handleAllStepsCompleted(link);
        }
    };

    processLinkVisit().catch(err => {
        console.error("Error processing link visit:", err);
        setStatus('not-found');
    });
  }, [linkId]);
  
  const handleAllStepsCompleted = async (finalLinkData?: LinkData) => {
    const dataToUse = finalLinkData || linkData;
    if (!dataToUse) return;

    // Security check: Interaction Speed
    if (gateStartTime) {
        const completionTime = Date.now();
        const durationInSeconds = (completionTime - gateStartTime) / 1000;
        // If it took less than 10 seconds, it's likely a bot. Don't count the click.
        if (durationInSeconds < 10) {
            console.warn(`Invalid click detected: completed too fast (${durationInSeconds}s). Redirecting without counting.`);
            window.location.href = dataToUse.original;
            return;
        }
    }

    setStatus('redirecting');

    try {
        const linkRef = doc(db, 'links', dataToUse.id);
        const batch = writeBatch(db);
        
        // 1. Increment the click counter
        batch.update(linkRef, { clicks: increment(1) });
        
        let earningsGenerated = 0;

        // 2. If monetizable, calculate and increment earnings
        if (dataToUse.monetizable) {
            // The user document was already fetched, so we can assume it exists here
            const userRef = doc(db, 'users', dataToUse.userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const customCpm = userData?.customCpm;

            let cpmUsed = 0;
            if (customCpm != null && customCpm > 0) {
                cpmUsed = customCpm;
            } else {
                // If no custom CPM, fetch the global one (already secured by rules)
                const cpmHistoryRef = collection(db, 'cpmHistory');
                const cpmQuery = query(cpmHistoryRef, where('endDate', '==', null), limit(1));
                const cpmSnapshot = await getDocs(cpmQuery);
                let activeCpm = 3.00; // Default fallback CPM
                if (!cpmSnapshot.empty) {
                    activeCpm = cpmSnapshot.docs[0].data().rate;
                }
                cpmUsed = activeCpm;
            }
            
            earningsGenerated = cpmUsed / 1000;
            batch.update(linkRef, { generatedEarnings: increment(earningsGenerated) });
        }
        
        // 3. Create a log of the click
        const clickLogRef = doc(collection(db, 'clicks'));
        batch.set(clickLogRef, {
            linkId: dataToUse.id,
            userId: dataToUse.userId,
            timestamp: serverTimestamp(),
            earningsGenerated: earningsGenerated,
        });

        await batch.commit();

    } catch(error) {
        console.error("Failed to count click:", error);
    } finally {
        window.location.href = dataToUse.original;
    }
  }

  if (status === 'invalid') {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
            <h1 className="text-2xl font-bold">Link Not Available</h1>
            <p className="mt-2 text-muted-foreground">This link has been disabled by the creator or an administrator.</p>
        </div>
    )
  }

  if (status === 'not-found') {
    return notFound();
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (status === 'gate' && linkData) {
    return <LinkGate linkData={linkData} onAllStepsCompleted={() => handleAllStepsCompleted()} />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
