
import './globals.css';
import { ClientProviders } from '@/components/client-providers';

/**
 * Root Layout (Server Component).
 * Mantendo como Server Component garantimos que o CSS e os metadados 
 * sejam entregues corretamente ao navegador na primeira carga.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3B2825" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icon-512x512.png?v=2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <title>CifrasKadosh</title>
      </head>
      <body className="font-body antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
