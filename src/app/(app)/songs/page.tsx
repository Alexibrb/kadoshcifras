
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Song } from '@/types';
import { Music, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SongsPage() {
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const deleteSong = (id: string) => {
    setSongs(songs.filter((song) => song.id !== id));
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Minhas Músicas</h2>
        <Button asChild>
          <Link href="/songs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Nova Música
          </Link>
        </Button>
      </div>
      {isClient && songs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
          <div className="flex flex-col items-center gap-1 text-center">
            <Music className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-2xl font-bold tracking-tight">Você não tem nenhuma música</h3>
            <p className="text-sm text-muted-foreground">Comece criando uma nova música.</p>
            <Button className="mt-4" asChild>
              <Link href="/songs/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Música
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isClient &&
            songs.map((song) => (
              <Card key={song.id}>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="font-headline truncate">{song.title}</CardTitle>
                            <CardDescription>{song.artist}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/songs/${song.id}`}>Abrir</Link>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Excluir</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente a música
                                        e removerá seus dados de nossos servidores.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteSong(song.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
