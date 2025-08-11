
import ClientComponent from './ClientComponent';

/**
 * This is the main Server Component for the short link page.
 * Its only job is to receive the `shortId` from the URL parameters
 * and render the corresponding ClientComponent, which handles all
 * interactive logic.
 */
export default async function ShortLinkPage({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;

  const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
  const ADS_PUSH_ENABLED = process.env.NEXT_PUBLIC_ADS_PUSH_ENABLED === 'true';

  return (
    <>
      {ADS_ENABLED && ADS_PUSH_ENABLED && (
        <div dangerouslySetInnerHTML={{
          __html: ``
        }} />
      )}

      <ClientComponent shortId={shortId} />
    </>
  );
}
