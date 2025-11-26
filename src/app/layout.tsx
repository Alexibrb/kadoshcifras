
'use client';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

const FirebaseErrorListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error("Erro de Permissão do Firestore (Ouvinte):", error.message);
      
      // Lança o erro para que o overlay de desenvolvimento do Next.js o capture.
      // Isso fornece um stack trace clicável e contexto rico durante o desenvolvimento.
      if (process.env.NODE_ENV === 'development') {
         setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // Em produção, mostra um toast amigável.
        toast({
          variant: 'destructive',
          title: 'Permissão Negada',
          description: 'Você não tem permissão para realizar esta ação.',
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
};


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
                <FirebaseErrorListener />
                {children}
                <Toaster />
            </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
