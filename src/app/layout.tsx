import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/* Self-hosted by next/font — no runtime CDN request, which matters when the
   only network at the venue is a phone hotspot. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'AI Payment Assistant',
  description: 'Delegate a payment to an AI agent, and check which model actually handled it.',
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  /* The verdict screen runs edge to edge; safe-area insets are handled in CSS. */
  viewportFit: 'cover',
  themeColor: '#f9fafb'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
