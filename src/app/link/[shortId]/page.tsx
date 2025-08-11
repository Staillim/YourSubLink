
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientComponent from './ClientComponent';
import { notFound } from 'next/navigation';

/**
 * This is the main Server Component for the short link page.
 * Its primary job is to securely fetch the link's document ID using the `shortId` 
 * from the URL parameters. It then passes this ID to the ClientComponent,
 * which handles all client-side interactive logic. This approach ensures that
 * complex queries are handled on the server, and the client only needs simple
 * read permissions.
 */
export default async function ShortLinkPage({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;
  
  if (!shortId) {
    notFound();
  }

  // Server-side query to find the document ID from the shortId
  const linksRef = collection(db, 'links');
  const q = query(linksRef, where('shortId', '==', shortId), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    notFound();
  }

  const linkId = querySnapshot.docs[0].id;

  return <ClientComponent shortId={shortId} linkId={linkId} />;
}

    