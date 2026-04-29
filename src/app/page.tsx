
'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Share, PlusSquare, LayoutDashboard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { isInstallable, isIOS, isStandalone, installApp } = usePWAInstall();
  const { user } = useAuth();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6 w-full max-w-2xl pb-24">
        <h2 className="text-2xl md:text-3xl font-headline text-muted-foreground tracking-tight">
          Bem-vindo ao
        </h2>
        <div className="inline-flex items-center justify-center">
          <Image 
            src="/icon-512x512.png" 
            alt="CifrasKadosh Logo" 
            width={350} 
            height={350} 
            data-ai-hint="logo music" 
            className="w-48 h-48 md:w-[320px] md:h-[320px] object-contain drop-shadow-xl"
            priority
          />
        </div>
        <p className="max-w-xl mx-auto text-base md:text-xl text-foreground/80 font-body px-4">
          Seu companheiro definitivo para criar, gerenciar e apresentar músicas. Transponha tons, crie repertórios facilmente.
        </p>

        <div className="flex flex-col items-center gap-6 mt-8 w-full px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            {user ? (
              <Button asChild size="lg" className="font-bold w-full sm:w-64" variant="default">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-5 w-5" /> Ir para o Painel
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="font-bold w-full sm:w-48">
                  <Link href="/signup">Cadastre-se</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-bold w-full sm:w-48">
                  <Link href="/login">Eu tenho uma conta</Link>
                </Button>
              </>
            )}
          </div>

          {/* Botão de Instalação para Android/Desktop */}
          {isInstallable && !isStandalone && (
            <Button 
              onClick={installApp} 
              variant="secondary" 
              size="lg" 
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 w-full sm:w-auto animate-bounce"
            >
              <Download className="mr-2 h-5 w-5" /> Instalar Aplicativo
            </Button>
          )}

          {/* Instrução para iOS (iPhone/iPad) */}
          {isIOS && !isStandalone && (
            <Card className="bg-primary/5 border-primary/20 w-full max-w-xs mx-auto">
              <CardContent className="p-4 space-y-2 text-center">
                <p className="text-sm font-semibold flex items-center justify-center gap-2">
                  Instale no iPhone <Download className="h-4 w-4" />
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Toque em <Share className="h-3 w-3 inline mx-0.5" /> no navegador e depois em <PlusSquare className="h-3 w-3 inline mx-0.5" /> <strong>Adicionar à Tela de Início</strong>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <footer className="absolute bottom-6 left-0 right-0 text-center px-4">
        <p className="text-xs md:text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CifrasKadosh. Todos os Direitos Reservados.
        </p>
      </footer>
    </main>
  );
}
