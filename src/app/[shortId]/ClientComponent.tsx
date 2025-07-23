
'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Rule } from '@/components/rule-editor';

type ServerResponse = {
  action: 'GATE' | 'REDIRECT';
  destination?: string;
  linkData?: {
    id: string;
    original: string;
    rules: Rule[];
    title: string;
    description?: string;
    userId: string;
    monetizable: boolean;
  };
};

export default function ClientComponent({ shortId }: { shortId: string }) {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const router = useRouter();

  useEffect(() => {
    if (!shortId) {
      setStatus('error');
      return;
    }

    const processClick = async () => {
      try {
        const res = await fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortId }),
        });

        if (!res.ok) {
          throw new Error(`Failed to process click: ${res.statusText}`);
        }

        const data: ServerResponse = await res.json();

        if (data.action === 'GATE') {
          // The server decided we need to show the gate.
          // The page /link/[shortId] will render the gate component.
          router.push(`/link/${shortId}`);
        } else if (data.action === 'REDIRECT' && data.destination) {
          // The server says to redirect immediately.
          window.location.href = data.destination;
        } else {
            // Invalid response from server.
            throw new Error('Invalid server response');
        }

      } catch (error) {
        console.error("Error processing click:", error);
        setStatus('error');
      }
    };

    processClick();
  }, [shortId, router]);

  if (status === 'error') {
    notFound();
  }

  // Fallback loading state while we process the click and redirect.
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
