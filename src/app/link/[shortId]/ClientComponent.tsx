
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
import { collection, doc, writeBatch, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';


const hasVisitorCookie = (linkId: string): boolean => {
    if (typeof document === 'undefined') return false;
    const cookieName = `clipview-${linkId}`;
    return document.cookie.split(';').some((item) => item.trim().startsWith(`${cookieName}=`));
};

const setVisitorCookie = (linkId: string): void => {
    if (typeof document === 'undefined') return;
    const cookieName = `clipview-${linkId}`;
    const expires = new Date();
    expires.setTime(expires.getTime() + (60 * 60 * 1000)); // 1 hora de duración
    document.cookie = `${cookieName}=true;expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
};

const getOrCreatePersistentCookieId = (linkId: string): string => {
    if (typeof document === 'undefined') return 'server-side';
    const cookieName = `visitor-id-${linkId}`;
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


export default function ClientComponent({ shortId, linkId }: { shortId: string, linkId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
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
        const userRef = doc(db, 'users', link.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || userSnap.data()?.accountStatus === 'suspended') {
            setStatus('error');
            setErrorMessage('This link has been disabled by its owner.');
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
        setVisitorCookie(dataToUse.id);

        const linkRef = doc(db, 'links', dataToUse.id);
        const batch = writeBatch(db);
        
        batch.update(linkRef, { clicks: increment(1) });
        
        const clickLogRef = doc(collection(db, 'clicks'));
        batch.set(clickLogRef, {
            linkId: dataToUse.id,
            timestamp: serverTimestamp(),
            userId: user ? user.uid : null,
            userAgent: navigator.userAgent,
            cookie: getOrCreatePersistentCookieId(dataToUse.id),
            processed: false, // Mark as unprocessed for the backend job
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
