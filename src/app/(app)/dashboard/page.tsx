
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, HardDriveDownload, Check, AlertCircle, RefreshCw } from 'lucide-react';
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
import { useEffect } from 'react';


export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  
  // Efeito para "aquecer" o cache offline. Isso incentiva o Firestore
  // a buscar esses dados e mantê-los disponíveis para uso offline.
  useEffect(() => {
    // A simples existência dos hooks `useFirestoreCollection` acima já 
    // inicia o processo de cache, então nenhuma ação extra é necessária aqui.
    console.log('Dashboard montado, iniciando cache de músicas e repertórios.');
  }, []);


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

        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modo Offline Automático</AlertTitle>
            <AlertDescription>
                As músicas e repertórios que você acessar ficarão disponíveis automaticamente para uso offline. Não é necessário baixar manualmente.
            </AlertDescription>
        </Alert>
        
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
