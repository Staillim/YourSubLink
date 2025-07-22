
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function ShortLinkPage({ params }: { params: { shortId: string } }) {
  const { shortId } = params;
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const getLink = async () => {
      try {
        const q = query(collection(db, 'links'), where('shortId', '==', shortId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          notFound();
          return;
        }
        
        const linkDoc = querySnapshot.docs[0];
        const linkData = linkDoc.data();
        
        // Increment click count
        const linkRef = doc(db, 'links', linkDoc.id);
        await updateDoc(linkRef, {
            clicks: increment(1)
        });

        // Redirect to original URL
        window.location.href = linkData.original;

      } catch (error) {
        console.error("Error getting link:", error);
        notFound();
      }
    };

    getLink();
  }, [shortId]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
