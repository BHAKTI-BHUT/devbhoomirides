import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'


import { CallbackHandler } from '@/components/CallbackHandler'
import { IdentityProvider } from '@/lib/identity-context'
import '../styles.css'

const siteName =
  'Devbhoomi Rides – Book Shared Rides Between Dehradun and Karnaprayag'
const siteDescription =
  'Scheduled shared taxi rides from Dehradun to Karnaprayag via Rishikesh, Devprayag, Srinagar and Rudraprayag. Check available seats and book seats online for your Uttarakhand travel.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'keywords',
        content:
          'Dehradun to Karnaprayag, shared taxi, scheduled rides, Uttarakhand travel, book seats online, Rishikesh, Srinagar Garhwal, Rudraprayag',
      },
      { name: 'theme-color', content: '#12372f' },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-snow text-ink">
        <IdentityProvider>
          <CallbackHandler>{children}</CallbackHandler>
        </IdentityProvider>
        <Scripts />
      </body>
    </html>
  )
}
