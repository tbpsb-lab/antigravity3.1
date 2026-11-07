import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Inter, Literata } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})
const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
})
const geistMono = Geist_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist-mono',
  display: 'swap',
})
const literata = Literata({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-literata',
  display: 'swap',
})

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const metadata: Metadata = {
  title: 'odak — Hızlı Okuma (RSVP)',
  description:
    'Tek kelimelik odak penceresiyle hızlı okuma. Cam, Neon ve Kağıt temaları; başparmak dostu kontroller ve Zen odak modu.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: `${BASE_PATH}/favicon.ico?v=3`,
        sizes: 'any',
      },
      {
        url: `${BASE_PATH}/icon-light-32x32.png?v=3`,
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: `${BASE_PATH}/icon-dark-32x32.png?v=3`,
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: `${BASE_PATH}/icon.svg?v=3`,
        type: 'image/svg+xml',
      },
    ],
    apple: `${BASE_PATH}/apple-icon.png?v=3`,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

// İlk boyamada (First Paint) tema parlamasını (FOUC) %100 önleyen senkron başlatıcı
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('hizlioku_reader_settings');if(s){var p=JSON.parse(s);if(p&&(p.theme==='ios'||p.theme==='linear'||p.theme==='kindle')){document.documentElement.setAttribute('data-theme',p.theme);return;}}document.documentElement.setAttribute('data-theme','ios');}catch(e){document.documentElement.setAttribute('data-theme','ios');}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} ${literata.variable}`}
    >
      <head>
        <link rel="icon" href={`${BASE_PATH}/favicon.ico?v=3`} sizes="any" />
        <link rel="icon" type="image/svg+xml" href={`${BASE_PATH}/icon.svg?v=3`} />
        <link rel="apple-touch-icon" href={`${BASE_PATH}/apple-icon.png?v=3`} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  )
}
