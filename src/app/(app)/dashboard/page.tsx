
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, Download, Share, PlusSquare, Smartphone, Heart, Copy, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import type { Song, Setlist, AppSettings } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const { data: appSettings, loading: loadingSettings } = useFirestoreDocument<AppSettings>('settings', 'app');
  const { isInstallable, isIOS, isStandalone, installApp } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  // Chave Pix dinâmica vinda das configurações do Admin
  const pixKey = useMemo(() => appSettings?.adminPixKey || "não configurado", [appSettings]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleInstallRedirect = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const copyPixKey = () => {
    if (!appSettings?.adminPixKey) {
      toast({
        title: "Chave Indisponível",
        description: "O administrador ainda não configurou uma chave Pix.",
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast({
      title: "Chave Pix Copiada!",
      description: "Obrigado por considerar apoiar o projeto.",
    });
    setTimeout(() => setCopied(false), 3000);
  };
  
  const loading = loadingSongs || loadingSetlists || loadingSettings;

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <div className="text-center mb-6">
            <h2 className="text-3xl font-bold font-headline tracking-tight">
              Olá, {user?.displayName?.split(' ')[0] ?? 'Músico'}!
            </h2>
            <p className="text-muted-foreground text-sm">O que vamos tocar hoje?</p>
        </div>

        <Button asChild size="lg" className="h-24 text-lg justify-between shadow-md" variant="default">
          <Link href="/songs">
            <div className="flex items-center">
              <div className="bg-primary-foreground/20 p-3 rounded-full mr-4">
                <Music className="h-6 w-6" />
              </div>
              <span className="font-semibold">Músicas</span>
            </div>
            {loading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-primary-foreground/20" />
            ) : (
                <Badge variant="secondary" className="text-base px-3">{songs.length}</Badge>
            )}
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-24 text-lg justify-between shadow-sm border-2">
          <Link href="/setlists">
             <div className="flex items-center">
              <div className="bg-primary/10 p-3 rounded-full mr-4 text-primary">
                <ListMusic className="h-6 w-6" />
              </div>
              <span className="font-semibold text-primary">Repertórios</span>
            </div>
             {loading ? (
                <Skeleton className="h-6 w-10 rounded-md" />
            ) : (
                <Badge variant="default" className="text-base px-3 bg-primary">{setlists.length}</Badge>
            )}
          </Link>
        </Button>

        {/* Botão Ajude o Projeto */}
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary" className="h-16 text-md font-bold text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 border-dashed border-2">
              <Heart className="mr-2 h-5 w-5 text-destructive fill-destructive/10" /> 
              Ajude o Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                <Heart className="h-6 w-6 text-destructive fill-destructive" />
                Apoie o CifrasKadosh
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                O CifrasKadosh é um projeto independente. Sua doação ajuda a cobrir custos de servidores, banco de dados e manutenção contínua.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg text-center space-y-2">
                <p className="text-sm font-medium">Contribua via Pix</p>
                <div className="flex items-center justify-center gap-2 bg-background border rounded-md p-3 select-all">
                  {loadingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <span className="font-mono text-sm break-all">{pixKey}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyPixKey}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Qualquer valor é bem-vindo e faz a diferença! ❤️
              </p>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => window.open('https://nubank.com.br', '_blank')}>
                Fazer Doação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Seção de Instalação PWA no Dashboard */}
        {!isStandalone && (
          <div className="pt-4 space-y-4">
            {isInstallable ? (
              <Button 
                onClick={installApp} 
                variant="secondary" 
                size="lg"
                className="w-full h-16 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 border animate-pulse font-bold"
              >
                <Download className="mr-2 h-5 w-5" /> Instalar Aplicativo
              </Button>
            ) : (
              !isIOS && (
                <Button 
                  onClick={handleInstallRedirect}
                  variant="secondary" 
                  size="lg"
                  className="w-full h-16 bg-primary/10 text-primary hover:bg-primary/20 border-primary/30 border font-bold"
                >
                  <Smartphone className="mr-2 h-5 w-5" /> Instalar App (Clique aqui)
                </Button>
              )
            )}

            {isIOS && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-2 text-center">
                  <p className="text-sm font-semibold flex items-center justify-center gap-2">
                    Instalar no iPhone <Download className="h-4 w-4" />
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Toque em <Share className="h-3 w-3 inline mx-0.5" /> e depois em <PlusSquare className="h-3 w-3 inline mx-0.5" /> <strong>Adicionar à Tela de Início</strong>.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Button onClick={handleLogout} size="lg" variant="ghost" className="h-16 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-4">
            <LogOut className="mr-3 h-5 w-5" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
