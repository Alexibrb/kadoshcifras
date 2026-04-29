'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Share, PlusSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const { isInstallable, isIOS, isStandalone, installApp } = usePWAInstall();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-8">
      <div className="text-center space-y-6 w-full max-w-2xl">
        <h2 className="text-3xl font-headline text-muted-foreground tracking-tight">
          Bem-vindo ao
        </h2>
        <div className="inline-flex items-center justify-center">
          <Image 
            src="/logocifrafacil.png" 
            alt="CifrasKadosh Logo" 
            width={350} 
            height={350} 
            data-ai-hint="logo music" 
            priority
          />
        </div>
        <p className="max-w-xl mx-auto text-lg md:text-xl text-foreground/80 font-body">
          Seu companheiro definitivo para criar, gerenciar e apresentar músicas. Transponha tons, crie repertórios facilmente.
        </p>

        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <Button asChild size="lg" className="font-bold w-full sm:w-auto">
              <Link href="/signup">Cadastre-se</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-bold w-full sm:w-auto">
              <Link href="/login">Eu tenho uma conta</Link>
            </Button>
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
            <Card className="bg-primary/5 border-primary/20 max-w-xs mx-auto">
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

      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CifrasKadosh. Todos os Direitos Reservados.</p>
      </footer>
    </main>
  );
}