
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
import { collection, doc, writeBatch, serverTimestamp, getDoc, query, where, getDocs, increment, limit } from 'firebase/firestore';
import type { Rule } from '@/components/rule-editor';

export default function ClientComponent({ shortId, linkId }: { shortId: string, linkId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);
  const [finalRules, setFinalRules] = useState<Rule[]>([]);

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
        const currentLink: LinkData = { id: linkDoc.id, ...data };

        const userRef = doc(db, 'users', currentLink.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || userSnap.data()?.accountStatus === 'suspended' || currentLink.monetizationStatus === 'suspended') {
            // Redirect without counting if user or link is suspended
            window.location.href = currentLink.original;
            setStatus('invalid'); // Set status but redirect immediately
            return;
        }
        
        setLinkData(currentLink);

        // Fetch global rules
        const globalRulesQuery = query(collection(db, 'globalRules'), where('status', '==', 'active'));
        const globalRulesSnapshot = await getDocs(globalRulesQuery);
        const globalRules = globalRulesSnapshot.docs.map(doc => {
            const ruleData = doc.data();
            return { type: ruleData.type, url: ruleData.url };
        }).filter(rule => rule.type && rule.url); // Ensure valid rule structure

        // Merge user rules and applicable global rules
        const mergedRules = [...(currentLink.rules || []), ...globalRules];
        setFinalRules(mergedRules);

        if (mergedRules.length > 0) {
            setGateStartTime(Date.now());
            setStatus('gate');
        } else {
            setStatus('redirecting');
            await handleAllStepsCompleted(currentLink);
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

    if (gateStartTime) {
        const completionTime = Date.now();
        const durationInSeconds = (completionTime - gateStartTime) / 1000;
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

            if (customCpm != null && customCpm > 0) {
                // Use custom CPM because it's defined and greater than 0
                cpmUsed = customCpm;
            } else {
                // Use global CPM if custom is null, undefined, or 0
                const cpmQuery = query(collection(db, 'cpmHistory'), where('endDate', '==', null), limit(1));
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
            earningsGenerated: earningsGenerated,
            cpmUsed: cpmUsed,
            processed: true, // Mark as processed immediately
            processedAt: serverTimestamp(),
            userAgent: navigator.userAgent,
        });

        await batch.commit();

    } catch(error) {
        console.error("Failed to count click:", error);
    } finally {
        window.location.href = dataToUse.original;
    }
  }

  if (status === 'invalid') {
    // A redirect is triggered in useEffect, but we can show a message as a fallback.
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
            <h1 className="text-2xl font-bold">Link Not Available</h1>
            <p className="mt-2 text-muted-foreground">This link has been disabled.</p>
        </div>
    )
  }

  if (status === 'not-found') {
    return notFound();
  }

  if (status === 'loading' || status === 'redirecting' || !linkData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (status === 'gate') {
    const gateLinkData = { ...linkData, rules: finalRules };
    return <LinkGate linkData={gateLinkData} onAllStepsCompleted={() => handleAllStepsCompleted()} />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
