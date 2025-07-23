

import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientComponent from './ClientComponent';

/**
 * This is the main Server Component for the short link page.
 * Its only job is to receive the `shortId` from the URL parameters
 * and render the corresponding ClientComponent, which handles all
 * interactive logic.
 */
export default function ShortLinkGatePage({ params }: { params: { shortId: string } }) {
  return <ClientComponent shortId={params.shortId} />;
}
