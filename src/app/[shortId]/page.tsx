
import ClientComponent from './ClientComponent';

/**
 * This is the main Server Component for the short link page.
 * It now renders the ClientComponent directly, which will handle
 * fetching the shortId from the URL itself.
 */
export default function ShortLinkPage() {
  return <ClientComponent />;
}
