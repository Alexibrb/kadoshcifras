
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { type Song, type Setlist } from '@/types';
import { Music, PlusCircle, Trash2, ArrowUpDown, X, ListMusic } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';


type SortOption = 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'date-desc';

export default function SongsPage() {
  const { data: songs, loading: loadingSongs, deleteDocument } = useFirestoreCollection<Song>('songs');
  const { data: setlists, loading: loadingSetlists } = useFirestoreCollection<Setlist>('setlists');
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('title-asc');
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const loading = loadingSongs || loadingSetlists;

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const uniqueArtists = useMemo(() => {
    if (!isClient) return [];
    const artists = new Set(songs.map(song => song.artist).filter(Boolean));
    return ['all', ...Array.from(artists).sort()];
  }, [songs, isClient]);

  const uniqueCategories = useMemo(() => {
    if (!isClient) return [];
    const categories = new Set(songs.map(song => song.category).filter(Boolean));
    return ['all', ...Array.from(categories).sort()];
  }, [songs, isClient]);


  const filteredAndSortedSongs = useMemo(() => {
    if (!isClient) return [];

    let filtered = songs;

    if (searchQuery) {
        filtered = filtered.filter((song) =>
            song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }

    if (selectedArtist !== 'all') {
        filtered = filtered.filter((song) => song.artist === selectedArtist);
    }

    if (selectedCategory !== 'all') {
        filtered = filtered.filter((song) => song.category === selectedCategory);
    }

    return filtered.sort((a, b) => {
        switch (sortOrder) {
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'artist-asc':
            return (a.artist || '').localeCompare(b.artist || '');
          case 'artist-desc':
            return (b.artist || '').localeCompare(a.artist || '');
          case 'date-desc':
            return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
          default:
            return a.title.localeCompare(b.title);
        }
    });
  }, [songs, searchQuery, sortOrder, selectedArtist, selectedCategory, isClient]);


  const deleteSong = (id: string) => {
    deleteDocument(id);
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSortOrder('title-asc');
    setSelectedArtist('all');
    setSelectedCategory('all');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 flex-wrap gap-4">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Minhas Músicas</h2>
         <div className="flex items-center gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                <CardTitle className="text-sm font-medium">Total de Músicas</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold">{loading ? '...' : songs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                <CardTitle className="text-sm font-medium">Total de Repertórios</CardTitle>
                <ListMusic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold">{loading ? '...' : setlists.length}</div>
              </CardContent>
            </Card>
        </div>
      </div>

       <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
            <Input
                placeholder="Buscar por título ou artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto md:w-48"
            />
            <Select onValueChange={setSelectedArtist} value={selectedArtist}>
                <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                    <SelectValue placeholder="Filtrar por artista" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Artistas</SelectItem>
                    {uniqueArtists.filter(a => a !== 'all').map(artist => (
                       <SelectItem key={artist} value={artist}>{artist}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                    <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                     {uniqueCategories.filter(c => c !== 'all').map(category => (
                       <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSortOrder(value as SortOption)} value={sortOrder}>
                <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="title-asc">Título (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Título (Z-A)</SelectItem>
                    <SelectItem value="artist-asc">Artista (A-Z)</SelectItem>
                    <SelectItem value="artist-desc">Artista (Z-A)</SelectItem>
                    <SelectItem value="date-desc">Mais Recentes</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="ghost" onClick={handleClearFilters} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" />
                Limpar
            </Button>
            <Button asChild className="w-full sm:w-auto ml-auto">
                <Link href="/songs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Nova Música</span>
                    <span className="md:hidden">Adicionar</span>
                </Link>
            </Button>
        </div>
      </Card>


      {loading && isClient ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-3 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </Card>
            ))}
        </div>
      ) : isClient && songs.length === 0 ? (
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
      ) : isClient && filteredAndSortedSongs.length === 0 ? (
         <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
            <div className="flex flex-col items-center gap-1 text-center">
                <Music className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight">Nenhuma música encontrada</h3>
                <p className="text-sm text-muted-foreground">Tente ajustar seus filtros de busca ou adicione uma nova música.</p>
                <Button variant="ghost" onClick={handleClearFilters} className="mt-4">
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                </Button>
            </div>
         </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isClient &&
            filteredAndSortedSongs.map((song) => (
              <Card key={song.id} className="p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-grow overflow-hidden">
                    <Button asChild variant="link" className="p-0 h-auto justify-start">
                        <Link href={`/songs/${song.id}`} className="truncate">
                            <p className="font-semibold text-base truncate">{song.title}</p>
                        </Link>
                    </Button>
                     <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="flex items-center shrink-0">
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
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
