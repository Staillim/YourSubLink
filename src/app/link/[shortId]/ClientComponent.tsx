
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
        // Step 1: Just get the link data without counting any clicks.
        const response = await fetch('/api/get-link-data', {
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
            // If there are rules, show the gate. The click will be counted later.
            setStatus('gate');
        } else if (data.action === 'REDIRECT') {
            // If no rules, count the click and redirect immediately.
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
  
  // This function is called when the user clicks the "Unlock Link" button
  // Its only job is to switch the view to the countdown page.
  const handleUnlock = () => {
    setStatus('countdown');
  }

  // This function is called ONLY when the user clicks the "Continue" button
  // after the countdown has finished.
  const handleContinueAndCount = async () => {
    if (!shortId || !linkData) return;
    
    setStatus('redirecting');

    // This is the REAL click. Record it in the database.
    await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId }),
    });
    
    // Redirect to the final destination
    window.location.href = linkData.original;
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

  // Render the gate, passing the handleUnlock function to be called on button click.
  if (status === 'gate' && linkData) {
    return <LinkGate linkData={linkData} onUnlock={handleUnlock} onContinue={handleContinueAndCount} view="gate" />;
  }
  
  // After the button is clicked and state changes, render the countdown page.
  if (status === 'countdown' && linkData) {
      return <LinkGate linkData={linkData} onUnlock={handleUnlock} onContinue={handleContinueAndCount} view="countdown" />;
  }

  // Fallback loading state
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
