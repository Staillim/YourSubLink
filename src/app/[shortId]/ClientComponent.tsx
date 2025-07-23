
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LinkGate from '@/components/link-gate'; 
import type { LinkData } from '@/types'; 

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'countdown' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);

  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
      try {
        // This is the initial fetch to get link data. No click is counted here.
        const response = await fetch('/api/get-link-data', { // A new, simple API route just to fetch data
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortId }), 
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data: { link: LinkData; action: 'GATE' | 'REDIRECT' } = await response.json();
        
        setLinkData(data.link);

        if (data.action === 'GATE') {
            setStatus('gate');
        } else if (data.action === 'REDIRECT') {
            // For links with no rules, count the click now and redirect
            await fetch('/api/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortId }),
            });
            setStatus('redirecting');
            window.location.href = data.link.original;
        }

      } catch (error) {
        console.error("Error processing link visit:", error);
        setStatus('not-found');
      }
    };

    processLinkVisit();
  }, [shortId]);
  
  // This function is called only when the user unlocks the link.
  const handleUnlock = async () => {
    if (!shortId) return;
    
    // This is the "Total Click" - happens only when the user unlocks the link.
    await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId }),
    });

    setStatus('countdown');
  }

  if (status === 'not-found') {
    return notFound();
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (status === 'gate' && linkData) {
    return <LinkGate linkData={linkData} onUnlock={handleUnlock} />;
  }
  
  if (status === 'countdown' && linkData) {
      return <LinkGate linkData={linkData} onUnlock={handleUnlock} initialStatus="countdown" />;
  }

  // Fallback state, should be brief
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
