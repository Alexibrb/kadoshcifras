'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, Download, Share, PlusSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { Song, Setlist } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const { isInstallable, isIOS, isStandalone, installApp } = usePWAInstall();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const loading = loadingSongs || loadingSetlists;

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

        {/* Seção de Instalação PWA no Dashboard */}
        {!isStandalone && (isInstallable || isIOS) && (
          <div className="pt-4 space-y-4">
            {isInstallable && (
              <Button 
                onClick={installApp} 
                variant="secondary" 
                size="lg"
                className="w-full h-16 bg-primary/5 text-primary hover:bg-primary/10 border-primary/20 border animate-pulse font-bold"
              >
                <Download className="mr-2 h-5 w-5" /> Instalar Aplicativo
              </Button>
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
