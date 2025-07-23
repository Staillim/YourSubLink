
'use client';
import LinkGate from './ClientComponent';

/**
 * This page acts as the container for the "Link Gate".
 * It receives link data from the parent component and renders the gate.
 */
export default function LinkGatePage({ linkData }: { linkData: any }) {
  if (!linkData) {
    // This can happen if the page is accessed directly.
    // In a real app, you might want to redirect or show an error.
    return <p>Loading link...</p>;
  }
  return <LinkGate linkData={linkData} />;
}

