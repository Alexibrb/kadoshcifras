
'use client';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';

const StyleInjector = () => {
  const { appUser } = useAuth();
  const theme = (typeof window !== 'undefined' && window.localStorage.getItem('theme')) || 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (appUser?.colorSettings) {
      root.style.setProperty('--custom-text-color', appUser.colorSettings.textColor);
      root.style.setProperty('--custom-chord-color', appUser.colorSettings.chordColor);
      root.style.setProperty('--custom-background-color', appUser.colorSettings.backgroundColor);
      root.style.setProperty('background-color', 'var(--custom-background-color)', 'important');
      root.style.setProperty('color', 'var(--custom-text-color)');
    } else {
      // Reverte para os valores padrão do CSS quando as configurações não existem
      root.style.removeProperty('--custom-text-color');
      root.style.removeProperty('--custom-chord-color');
      root.style.removeProperty('--custom-background-color');
      root.style.removeProperty('background-color');
      root.style.removeProperty('color');
    }
  }, [appUser?.colorSettings, theme]);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

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
                <StyleInjector />
                {children}
                <Toaster />
            </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
