
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic, HardDriveDownload, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { Song, Setlist } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cacheAllDataForOffline } from '@/services/offline-service';
import { useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DashboardPage() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const { data: songs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    setDownloadError(null);
    try {
      // Passa o appUser para a função de cache
      await cacheAllDataForOffline(appUser);
      setDownloadSuccess(true);
    } catch (error) {
      console.error("Failed to cache data for offline use:", error);
      setDownloadError("Ocorreu um erro ao tentar baixar os dados. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const loading = loadingSongs || loadingSetlists;

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-center mb-4">
          Bem-vindo, {user?.displayName ?? 'Músico'}!
        </h2>
        
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

        <Button onClick={handleDownload} size="lg" variant="outline" className="h-20 text-lg justify-start" disabled={isDownloading}>
            {isDownloading ? (
                <>
                    <HardDriveDownload className="mr-4 h-6 w-6 animate-pulse" /> Baixando dados...
                </>
            ) : (
                 <>
                    <HardDriveDownload className="mr-4 h-6 w-6" /> Baixar para Uso Offline
                </>
            )}
        </Button>

        {downloadSuccess && (
            <Alert variant="default" className="bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600">
                <Check className="h-4 w-4 text-green-700 dark:text-green-300" />
                <AlertTitle className="text-green-800 dark:text-green-200">Sucesso!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                    Todos os dados foram baixados. O aplicativo está pronto para ser usado offline.
                </AlertDescription>
            </Alert>
        )}
        {downloadError && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro no Download</AlertTitle>
                <AlertDescription>
                    {downloadError}
                </AlertDescription>
            </Alert>
        )}


        <Button onClick={handleLogout} size="lg" variant="destructive" className="h-16 text-lg justify-start mt-8">
            <LogOut className="mr-4 h-6 w-6" /> Sair
        </Button>
      </div>
    </div>
  );
}
