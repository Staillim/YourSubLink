
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LinkGatePage from '@/app/link/[shortId]/page';

type LinkData = {
  id: string;
  original: string;
  rules: any[];
  title: string;
  description?: string;
  userId: string;
  monetizable: boolean;
  realClicks: number;
};

type VisitedLinkInfo = {
    [shortId: string]: number; // Maps shortId to the timestamp of the last visit
};

export default function ClientComponent() {
  const [status, setStatus] = useState<'loading' | 'gate' | 'redirecting' | 'not-found'>('loading');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const params = useParams();
  const shortId = params.shortId as string;
  
  useEffect(() => {
    if (!shortId) {
        setStatus('not-found');
        return;
    };

    const getDeviceId = (): string => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    const processLinkVisit = async () => {
      try {
        // 1. Fetch link data
        const q = query(collection(db, 'links'), where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('not-found');
          return;
        }
        
        const linkDoc = querySnapshot.docs[0];
        const data = linkDoc.data();
        
        const fetchedLinkData: LinkData = {
            id: linkDoc.id,
            original: data.original,
            rules: data.rules || [],
            title: data.title,
            description: data.description,
            userId: data.userId,
            monetizable: data.monetizable || false,
            realClicks: data.realClicks || 0,
        };
        
        // 2. Client-side uniqueness check
        const deviceId = getDeviceId();
        const visitedLinks: VisitedLinkInfo = JSON.parse(localStorage.getItem('visitedLinks') || '{}');
        const lastVisitTimestamp = visitedLinks[shortId] || 0;
        const oneHour = 60 * 60 * 1000;
        const isUniqueByClient = (Date.now() - lastVisitTimestamp) > oneHour;

        // 3. Call API to record click and wait for it to complete
        const response = await fetch('/api/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortId, deviceId, isUniqueByClient }),
        });

        if (!response.ok) {
            // Even if API fails, try to proceed, but log error.
            console.error('Failed to record click, but proceeding with redirection/gating.');
        } else {
            const result = await response.json();
            // 4. Update client-side cache only on successful API call
            if (result.success && result.timestamp) {
                visitedLinks[shortId] = result.timestamp;
                localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
            }
        }

        // 5. Decide next step (Gate or Redirect)
        if (fetchedLinkData.rules && fetchedLinkData.rules.length > 0) {
            setLinkData(fetchedLinkData);
            setStatus('gate');
        } else {
            setStatus('redirecting');
            window.location.href = fetchedLinkData.original;
        }

      } catch (error) {
        console.error("Error getting link:", error);
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
      // Pass linkData to the LinkGatePage component
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
