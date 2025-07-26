import ClientComponent from './ClientComponent';
import { notFound } from 'next/navigation';

/**
 * This is the main Server Component for the short link page.
 * Its only job is to receive the `shortId` from the URL parameters
 * and render the corresponding ClientComponent, which handles all
 * interactive logic.
 */
export default async function ShortLinkPage({ params }: { params: { shortId: string } }) {
  
  if (!params.shortId) {
    notFound();
  }

  // Pass the shortId to the client component to handle the data fetching.
  return <ClientComponent shortId={params.shortId} />;
}
