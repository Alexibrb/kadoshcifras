
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Song } from '@/types';
import { Music, PlusCircle, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


type SortOption = 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'date-desc';

export default function SongsPage() {
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('date-desc');


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const filteredAndSortedSongs = useMemo(() => {
    if (!isClient) return [];

    return songs
      .filter((song) =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        switch (sortOrder) {
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'artist-asc':
            return a.artist.localeCompare(b.artist);
          case 'artist-desc':
            return b.artist.localeCompare(a.artist);
          case 'date-desc':
            // Se as músicas não tiverem uma data, elas permanecerão na ordem original.
            // Para uma ordenação real por data, seria necessário adicionar um timestamp ao objeto Song.
            return songs.indexOf(b) - songs.indexOf(a);
          default:
            return 0;
        }
      });
  }, [songs, searchQuery, sortOrder, isClient]);


  const deleteSong = (id: string) => {
    setSongs(songs.filter((song) => song.id !== id));
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 flex-wrap gap-4">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Minhas Músicas</h2>
        <div className="flex items-center gap-2">
            <Input
                placeholder="Buscar por título ou artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64"
            />
            <Select onValueChange={(value) => setSortOrder(value as SortOption)} defaultValue={sortOrder}>
                <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date-desc">Mais Recentes</SelectItem>
                    <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                    <SelectItem value="artist-asc">Artista (A-Z)</SelectItem>
                    <SelectItem value="artist-desc">Artista (Z-A)</SelectItem>
                </SelectContent>
            </Select>
            <Button asChild>
                <Link href="/songs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Nova Música</span>
                </Link>
            </Button>
        </div>
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
            filteredAndSortedSongs.map((song) => (
              <Card key={song.id} className="flex flex-col">
                <CardHeader className="flex-grow">
                    <CardTitle className="font-headline text-lg truncate">{song.title}</CardTitle>
                    <CardDescription>{song.artist}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end items-center gap-1 p-4 pt-0">
                    <Button asChild variant="default" size="sm" className="flex-grow">
                        <Link href={`/songs/${song.id}`}>Abrir</Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
