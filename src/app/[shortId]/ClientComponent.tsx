
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LinkGatePage from '@/app/link/[shortId]/page';

type LinkData = {
  id: string;
  original: string;
  rules: any[];
  title: string;
  description?: string;
  userId: string;
  monetizable: boolean;
};

export default function ClientComponent() {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<any>(null); // Can hold API response data
  const params = useParams();
  const shortId = params.shortId as string;
  
  useEffect(() => {
    if (!shortId) {
        setStatus('not-found');
        return;
    };

    const processLinkVisit = async () => {
      try {
        // Call the central API to record the click and get instructions
        const response = await fetch('/api/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortId }),
        });

        if (!response.ok) {
            if(response.status === 404) {
                setStatus('not-found');
            } else {
                // For other server errors, we might still try to redirect to a default/error page
                // or just show not found.
                console.error('API Error:', response.statusText);
                setStatus('not-found');
            }
            return;
        }

        const result = await response.json();

        if (result.action === 'GATE') {
            setLinkData(result.linkData);
            setStatus('gate');
        } else if (result.action === 'REDIRECT') {
            setStatus('redirecting');
            window.location.href = result.destination;
        } else {
            // Fallback for any unexpected action
            setStatus('not-found');
        }

      } catch (error) {
        console.error("Error processing link visit:", error);
        setStatus('not-found');
      }
    };

    processLinkVisit();
  }, [shortId]);
  
  if (status === 'not-found') {
      notFound();
  }

  if (status === 'loading' || status === 'redirecting') {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
        </div>
      );
  }
  
  if (status === 'gate' && linkData) {
      return <LinkGatePage linkData={linkData} />;
  }

  // Fallback state
  return (
     <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        <p className="mt-4 text-lg text-muted-foreground">Processing...</p>
    </div>
  );
}
