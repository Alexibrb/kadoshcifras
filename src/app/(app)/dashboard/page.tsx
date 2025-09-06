
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, HardDriveDownload, Check, AlertCircle, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { Song, Setlist } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useEffect, useState } from 'react';
import { syncOfflineData } from '@/services/offline-service';
import { useToast } from '@/hooks/use-toast';
import { getLastSyncTime, db } from '@/lib/dexie';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    const fetchLastSync = async () => {
      const time = await getLastSyncTime();
      setLastSync(time);
    };
    fetchLastSync();
    
    const syncSubscription = db.on('changes', () => {
        fetchLastSync();
    });

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      syncSubscription.unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineData();
      toast({
        title: "Sincronização Concluída",
        description: "Todos os dados foram salvos para uso offline.",
      });
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: "Não foi possível baixar os dados. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const loading = loadingSongs || loadingSetlists;

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-center mb-4">
          Bem-vindo, {user?.displayName ?? 'Músico'}!
        </h2>

        <Alert variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <AlertTitle>{isOnline ? 'Você está Online' : 'Você está Offline'}</AlertTitle>
            <AlertDescription>
                {isOnline 
                    ? 'Sincronize os dados para garantir o acesso offline.'
                    : 'Os dados estão sendo carregados do cache local.'
                }
            </AlertDescription>
        </Alert>

        <Card className="p-4">
          <div className="flex flex-col items-center gap-2">
              <Button onClick={handleSync} disabled={isSyncing || !isOnline} size="lg" className="w-full h-16 text-lg">
                <RefreshCw className={`mr-2 h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar para Uso Offline'}
              </Button>
               {lastSync && (
                <p className="text-xs text-muted-foreground mt-2">
                    Última sincronização: {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
                </p>
            )}
          </div>
        </Card>
        
        <Button asChild size="lg" className="h-20 text-lg justify-between">
          <Link href="/songs">
            <div className="flex items-center">
              <Music className="mr-4 h-6 w-6" />
              <span>Músicas</span>
            </div>
            {loading ? (
                <Skeleton className="h-6 w-10 rounded-md" />
            ) : (
                <Badge variant="secondary" className="text-base">{songs.length}</Badge>
            )}
          </Link>
        </Button>

        <Button asChild size="lg" className="h-20 text-lg justify-between">
          <Link href="/setlists">
             <div className="flex items-center">
              <ListMusic className="mr-4 h-6 w-6" />
              <span>Repertórios</span>
            </div>
             {loading ? (
                <Skeleton className="h-6 w-10 rounded-md" />
            ) : (
                <Badge variant="secondary" className="text-base">{setlists.length}</Badge>
            )}
          </Link>
        </Button>

        <Button onClick={handleLogout} size="lg" variant="destructive" className="h-16 text-lg justify-start mt-8">
            <LogOut className="mr-4 h-6 w-6" /> Sair
        </Button>
      </div>
    </div>
  );
}
