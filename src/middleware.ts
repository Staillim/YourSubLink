import createMiddleware from 'next-intl/middleware';
import {locales} from './navigation';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales,
 
  // Used when no locale matches
  defaultLocale: 'en',

  // Specify public routes that shouldn't be prefixed
  publicPages: ['/auth']
});
 
export const config = {
  // Match all pathnames except for
  // - /api/… routes
  // - /_next/… routes
  // - /_vercel/… routes
  // - /link/… routes (for short links)
  // - files with an extension (e.g. favicon.ico)
  matcher: ['/((?!api|_next|_vercel|link|.*\\..*).*)']
};
