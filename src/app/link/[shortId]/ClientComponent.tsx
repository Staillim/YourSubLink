
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

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [linkData, setLinkData] = useState<LinkData | null>(null);

  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
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
        
        const userRef = doc(db, 'users', link.userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || userDoc.data().accountStatus === 'suspended') {
            setErrorMessage('This link is not available because the owner\'s account is suspended.');
            setStatus('error');
            return;
        }
        
        if (link.monetizationStatus === 'suspended') {
             setErrorMessage('Monetization for this link has been suspended by an administrator.');
             setStatus('error');
             return;
        }

        setLinkData(link);

        const hasRules = link.rules && link.rules.length > 0;

        if (hasRules) {
            setStatus('gate');
        } else {
            setStatus('redirecting');
            // For links without rules, redirect immediately without counting.
            // Clicks are only counted after passing the gate.
            window.location.href = link.original;
        }
    };

    processLinkVisit().catch(err => {
        console.error("Error processing link visit:", err);
        setStatus('not-found');
    });
  }, [shortId]);
  
  const handleAllStepsCompleted = async () => {
    if (!linkData) return;

    setStatus('redirecting');

    try {
        const batch = writeBatch(db);
        
        const clickLogRef = doc(collection(db, 'clicks'));
        const clickPayload = {
            linkId: linkData.id,
            userId: linkData.userId,
            timestamp: serverTimestamp(),
            processed: false,
        };
        batch.set(clickLogRef, clickPayload);
        
        await batch.commit();

    } catch(error) {
        console.error("Failed to register click:", error);
    } finally {
        window.location.href = linkData.original;
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
    return <LinkGate linkData={linkData} onAllStepsCompleted={handleAllStepsCompleted} />;
  }
  
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
