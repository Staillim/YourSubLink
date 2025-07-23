
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LinkGate from '@/components/link-gate'; // We'll create this component
import type { LinkData } from '@/types'; // We'll create this types file

const HOUR_IN_MS = 60 * 60 * 1000;

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);

  useEffect(() => {
    if (!shortId) {
      setStatus('not-found');
      return;
    }

    const processLinkVisit = async () => {
      try {
        const visitKey = `visit_timestamp_${shortId}`;
        const lastVisit = localStorage.getItem(visitKey);
        const now = new Date().getTime();
        
        const isRealVisit = !lastVisit || (now - parseInt(lastVisit, 10) > HOUR_IN_MS);

        const response = await fetch('/api/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortId, isRealVisit }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        if (isRealVisit) {
            localStorage.setItem(visitKey, now.toString());
        }

        const data: { link: LinkData; action: 'GATE' | 'REDIRECT' } = await response.json();
        
        setLinkData(data.link);

        if (data.action === 'GATE') {
            setStatus('gate');
        } else if (data.action === 'REDIRECT') {
            setStatus('redirecting');
            window.location.href = data.link.original;
        }

      } catch (error) {
        console.error("Error processing link visit:", error);
        setStatus('not-found'); // If anything fails, treat as not found.
      }
    };

    processLinkVisit();
  }, [shortId]);

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
    return <LinkGate linkData={linkData} />;
  }

  // Fallback state, should be brief
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Please wait...</p>
    </div>
  );
}
