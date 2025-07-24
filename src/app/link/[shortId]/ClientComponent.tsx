
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
import { collection, query, where, getDocs, doc, writeBatch, increment, serverTimestamp, runTransaction } from 'firebase/firestore';

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);

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
    if (!shortId || !dataToUse) return;

    setStatus('redirecting');

    try {
        const response = await fetch('/api/click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shortId: dataToUse.shortId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to record click:', errorData.error);
        }
    } catch(error) {
        console.error("Failed to count click:", error);
        // We still redirect the user even if counting fails
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
