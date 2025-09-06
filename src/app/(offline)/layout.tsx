
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

// Este é um layout minimalista para as páginas que não exigem autenticação,
// como a página de apresentação offline. Ele fornece o provedor de tema e o Toaster.
export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
    >
        {children}
        <Toaster />
    </ThemeProvider>
  );
}
