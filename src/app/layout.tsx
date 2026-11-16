import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fontsource-variable/nunito';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegistrar } from '@/components/sw-registrar';
import { ChromeShell } from '@/components/chrome-shell';

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'QuantFoundry. Zero to Quantitative Developer',
  description:
    'A rigorous, interactive learning platform that takes you from absolute zero to professional-level quantitative software engineering: mathematics, C++, Python, systems and finance.',
  applicationName: 'QuantFoundry',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'QuantFoundry',
    title: 'QuantFoundry — Zero to Quantitative Developer',
    description:
      'Prerequisite-sequenced lessons, interactive labs, judged C++ & Python problems, spaced repetition, and firm career tracks.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuantFoundry — Zero to Quantitative Developer',
    description:
      '394 authored lessons, 78 judged problems, spaced retrieval, and timed firm assessments from first principles to quant engineering.',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QuantFoundry',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1622' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ChromeShell>{children}</ChromeShell>
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
