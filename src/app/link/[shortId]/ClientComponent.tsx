
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
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp, getDoc, limit } from 'firebase/firestore';

const hasVisitorCookie = (linkId: string): boolean => {
    if (typeof document === 'undefined') return false;
    const cookieName = `clipview-${linkId}`;
    return document.cookie.split(';').some((item) => item.trim().startsWith(`${cookieName}=`));
};

const setVisitorCookie = (linkId: string): void => {
    if (typeof document === 'undefined') return;
    const cookieName = `clipview-${linkId}`;
    const expires = new Date();
    expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas de duración
    document.cookie = `${cookieName}=true;expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};

const getOrCreatePersistentCookieId = (): string => {
    if (typeof document === 'undefined') return 'server-side-visitor';
    const cookieName = `visitor-id`;
    let visitorId = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`))
        ?.split('=')[1];
    
    if (!visitorId) {
        visitorId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1); // Persistencia de 1 año
        document.cookie = `${cookieName}=${visitorId};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
    }
    return visitorId;
}


export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [gateStartTime, setGateStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
        // Query for the link using the shortId
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortId', '==', shortId), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setStatus('not-found');
            return;
        }

        const linkDoc = querySnapshot.docs[0];
        const data = linkDoc.data() as Omit<LinkData, 'id'>;
        const link = { id: linkDoc.id, ...data };
        
        // After finding the link, check the owner's status
        const userRef = doc(db, 'users', link.userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || userDoc.data().accountStatus === 'suspended') {
            setErrorMessage('This link is not available because the owner\'s account is suspended.');
            setStatus('error');
            return;
        }

        if (hasVisitorCookie(link.id)) {
            window.location.href = link.original;
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
  }, [shortId]);
  
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
        setVisitorCookie(dataToUse.id);

        const batch = writeBatch(db);
        
        const clickLogRef = doc(collection(db, 'clicks'));
        batch.set(clickLogRef, {
            linkId: dataToUse.id,
            userId: dataToUse.userId,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,
            cookie: getOrCreatePersistentCookieId(),
            processed: false,
        });

        await batch.commit();

    } catch(error) {
        console.error("Failed to count click:", error);
    } finally {
        window.location.href = dataToUse.original;
    }
  }


  if (status === 'not-found') {
    return notFound();
  }
  
  if (status === 'error') {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Link Not Available</h1>
        <p className="mt-2 text-lg text-muted-foreground">{errorMessage}</p>
      </div>
    );
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
