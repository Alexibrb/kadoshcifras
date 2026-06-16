
'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Componente interno para ouvir erros de permissão do Firebase
 * e exibir notificações amigáveis (Toasts).
 */
const FirebaseErrorListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Logamos no console apenas em desenvolvimento para facilitar o debug
      if (process.env.NODE_ENV === 'development') {
        console.warn("Permissão Negada (Debug):", error.context.path, error.context.operation);
      }
      
      // Exibimos o toast para o usuário apenas se for uma operação de escrita (falha crítica)
      if (error.context.operation !== 'list' && error.context.operation !== 'get') {
        toast({
          variant: 'destructive',
          title: 'Ação não permitida',
          description: 'Você não tem permissão para realizar esta operação.',
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

/**
 * Wrapper para todos os provedores de contexto do lado do cliente.
 * Centralizar aqui evita erros de hidratação no Root Layout.
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
