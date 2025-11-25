
'use client';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useEffect, useMemo } from 'react';
import { ColorSettings } from '@/types';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const isDarkMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  const [colorSettings] = useLocalStorage<ColorSettings>('color-settings', {
    lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
    chordsColor: isDarkMode ? '#F59E0B' : '#000000',
    backgroundColor: isDarkMode ? '#0a0a0a' : '#f7f2fa',
  });

  useEffect(() => {
    document.body.style.backgroundColor = colorSettings.backgroundColor;
  }, [colorSettings.backgroundColor]);


  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#9f50e5" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <title>CifrasKadosh</title>
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
            >
                {children}
                <Toaster />
            </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
