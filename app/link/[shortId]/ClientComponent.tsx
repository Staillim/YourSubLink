
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
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp, getDoc } from 'firebase/firestore';

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setStatus('not-found');
            return;
        }

        const linkDoc = querySnapshot.docs[0];
        const data = linkDoc.data() as Omit<LinkData, 'id'>;
        const link: LinkData = { id: linkDoc.id, ...data };
        
        setLinkData(link);

        const hasRules = link.rules && link.rules.length > 0;

        if (hasRules) {
            setGateStartTime(Date.now());
            setStatus('gate');
        } else {
            // If no rules, count the click and redirect immediately.
            setStatus('redirecting');
            await handleAllStepsCompleted(link);
        }

    };

    processLinkVisit().catch(err => {
        console.error("Error processing link visit:", err);
        setStatus('not-found');
    });
  }, [shortId]);
  
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
        
        let cpmUsed = 0;
        let earningsGenerated = 0;

        // 2. If monetizable AND not suspended, calculate and increment earnings
        if (dataToUse.monetizable && dataToUse.monetizationStatus !== 'suspended') {
            // Check for a custom CPM on the user's profile
            const userRef = doc(db, 'users', dataToUse.userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const customCpm = userData?.customCpm;

            if (customCpm && customCpm > 0) {
                // Use custom CPM because it's defined and greater than 0
                cpmUsed = customCpm;
            } else {
                // Use global CPM if custom is null, undefined, or 0
                const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
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
        
        // 3. Create a log of the click with earnings info
        const clickLogRef = doc(collection(db, 'clicks'));
        batch.set(clickLogRef, {
            linkId: dataToUse.id,
            userId: dataToUse.userId,
            timestamp: serverTimestamp(),
            cpmUsed,
            earningsGenerated,
        });

        // Commit all operations atomically
        await batch.commit();

    } catch(error) {
        console.error("Failed to count click:", error);
    } finally {
        // Redirect to the final destination
        window.location.href = dataToUse.original;
    }
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

  // Render the gate, passing the handleAllStepsCompleted function to be called on button click.
  if (status === 'gate' && linkData) {
    return <LinkGate linkData={linkData} onAllStepsCompleted={() => handleAllStepsCompleted()} />;
  }
  
  // Fallback loading state
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
