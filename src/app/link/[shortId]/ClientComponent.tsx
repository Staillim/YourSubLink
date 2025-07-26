
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
import { db, auth } from '@/lib/firebase';
import { collection, doc, writeBatch, increment, serverTimestamp, getDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

// Helper function to manage visitor cookie
const getOrCreateVisitorCookie = (linkId: string): string => {
    const cookieName = `visitor-id-${linkId}`;
    let visitorId = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`))
        ?.split('=')[1];
    
    if (!visitorId) {
        visitorId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1); // Set cookie for 1 year
        document.cookie = `${cookieName}=${visitorId};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
    }
    return visitorId;
}


export default function ClientComponent({ shortId, linkId }: { shortId: string, linkId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);
  const [user] = useAuthState(auth);

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
        
        // 1. Increment the raw click counter on the link document.
        batch.update(linkRef, { clicks: increment(1) });
        
        // 2. Create a detailed log of the visit in the 'clicks' collection.
        const clickLogRef = doc(collection(db, 'clicks'));
        batch.set(clickLogRef, {
            linkId: dataToUse.id,
            timestamp: serverTimestamp(),
            userId: user ? user.uid : null, // Store userId if available
            ip: null, // IP cannot be reliably collected from the client-side
            userAgent: navigator.userAgent,
            cookie: getOrCreateVisitorCookie(dataToUse.id),
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
