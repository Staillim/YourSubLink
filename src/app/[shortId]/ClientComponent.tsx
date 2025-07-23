
'use client';

import { useEffect, useState, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Rule } from '@/components/rule-editor';

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
          throw new Error('Failed to process click');
        }

        const data: ServerResponse = await res.json();

        if (data.action === 'GATE' && data.linkData) {
          // The server decided we need to show the gate.
          // We can redirect to a dedicated gate page, passing the data along.
          // For simplicity, we'll use a client-side route change.
          // A more robust solution might involve query params or state management.
          
          // Let's use router to navigate to a specific link gate page
          router.push(`/link/${shortId}`);
        } else if (data.action === 'REDIRECT' && data.destination) {
          window.location.href = data.destination;
        } else {
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

  // Fallback loading state
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
