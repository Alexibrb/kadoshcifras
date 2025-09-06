
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, Check, RefreshCw, WifiOff, Wifi } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { syncOfflineData } from '@/services/offline-service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Simples localStorage para a última sincronização
const setLastSyncTime = (time: Date) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('lastSyncTime', time.toISOString());
    }
}
const getLastSyncTime = (): Date | null => {
     if (typeof window === 'undefined') return null;
     const time = localStorage.getItem('lastSyncTime');
     return time ? new Date(time) : null;
}


export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchLastSync = () => {
    const time = getLastSyncTime();
    setLastSyncTimeState(time);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      fetchLastSync();
    }
    
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      toast({
          title: online ? "Conectado" : "Modo Offline",
          description: online ? "Você está online. Os dados são em tempo real." : "Você está offline. Exibindo dados salvos localmente.",
          action: online ? <Wifi /> : <WifiOff />,
      });
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [toast]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleSync = async () => {
    if (!isOnline) {
       toast({
        variant: "destructive",
        title: "Offline",
        description: "Você precisa estar online para sincronizar os dados.",
      })
      return;
    }
    setIsSyncing(true);
     toast({
        title: "Sincronização iniciada",
        description: "Baixando todas as músicas e repertórios para uso offline...",
      })
    try {
      await syncOfflineData();
      const newSyncTime = new Date();
      setLastSyncTime(newSyncTime);
      setLastSyncTimeState(newSyncTime);
       toast({
        title: "Sincronização Concluída",
        description: "Seus dados estão prontos para uso offline.",
        action: <Check />,
      })
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: "Não foi possível baixar os dados. Tente novamente.",
      })
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  }
  
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
                    ? 'Os dados estão sendo sincronizados em tempo real.'
                    : 'Os dados visualizados anteriormente estão disponíveis offline.'
                }
            </AlertDescription>
        </Alert>
        
        <div className="p-4 border rounded-lg space-y-3">
            <div className="flex flex-col items-center gap-2">
                <Button onClick={handleSync} disabled={isSyncing || !isOnline} size="lg" className="w-full h-16 text-lg">
                  <RefreshCw className={`mr-2 h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar para Uso Offline'}
                </Button>
                {lastSyncTime && (
                   <p className="text-xs text-muted-foreground text-center mt-2">
                     Última sincronização: {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR })}
                   </p>
                )}
            </div>
             <p className="text-xs text-muted-foreground text-center">
               Clique para baixar todas as músicas e repertórios para acessar quando estiver sem internet.
            </p>
        </div>


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
