
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type Setlist, type Song } from '@/types';
import { ArrowLeft, Music, PlusCircle, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from '@/components/ui/skeleton';


export default function SetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  
  const { data: setlist, loading: loadingSetlist } = useFirestoreDocument<Setlist>('setlists', setlistId);
  const { data: allSongs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { updateDocument } = useFirestoreCollection('setlists');

  const [isClient, setIsClient] = useState(false);
  const [selectedSong, setSelectedSong] = useState('');

  useEffect(() => { setIsClient(true) }, []);

  const songsInSetlist = useMemo(() => {
    if (!setlist || !setlist.songIds) return [];
    return setlist.songIds.map(id => allSongs.find(s => s.id === id)).filter(Boolean) as Song[];
  }, [setlist, allSongs]);

  const availableSongs = useMemo(() => {
    if (!setlist || !setlist.songIds) return allSongs;
    return allSongs.filter(song => !setlist.songIds.includes(song.id));
  }, [setlist, allSongs]);


  const handleAddSong = async () => {
    if (!selectedSong || !setlist) return;
    const newSongIds = [...(setlist.songIds || []), selectedSong];
    await updateDocument(setlistId, { songIds: newSongIds });
    setSelectedSong('');
  };

  const handleRemoveSong = async (songId: string) => {
    if (!setlist) return;
    const newSongIds = (setlist.songIds || []).filter(id => id !== songId);
    await updateDocument(setlistId, { songIds: newSongIds });
  };
  
  if (isClient && !loadingSetlist && !setlist) {
    notFound();
  }

  if (!isClient || loadingSetlist || !setlist) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                </div>
            </div>
            <Skeleton className="h-[60vh] w-full" />
        </div>
    );
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center gap-4 mb-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/setlists">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para os repertórios</span>
          </Link>
        </Button>
        <div>
            <h2 className="text-3xl font-bold font-headline tracking-tight">{setlist.name}</h2>
            <p className="text-muted-foreground">{songsInSetlist.length} música(s)</p>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna de Adicionar Músicas */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Adicionar Músicas ao Repertório</CardTitle>
            <CardDescription>Selecione uma música da sua biblioteca para adicionar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                  <SelectTrigger>
                      <SelectValue placeholder="Selecione uma música" />
                  </SelectTrigger>
                  <SelectContent>
                      {loadingSongs ? (
                         <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : availableSongs.length > 0 ? (
                        availableSongs.map(song => (
                          <SelectItem key={song.id} value={song.id}>{song.title} - {song.artist}</SelectItem>
                        ))
                      ) : (
                         <SelectItem value="no-songs" disabled>Nenhuma música disponível</SelectItem>
                      )}
                  </SelectContent>
              </Select>
              <Button onClick={handleAddSong} disabled={!selectedSong}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Coluna de Músicas no Repertório */}
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Músicas no Repertório</CardTitle>
                <CardDescription>Arraste para reordenar as músicas.</CardDescription>
            </CardHeader>
            <CardContent>
                {songsInSetlist.length > 0 ? (
                    <ul className="space-y-2">
                        {songsInSetlist.map((song, index) => (
                            <li key={song.id} className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50">
                                <div className="flex items-center gap-2">
                                     <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                     <div>
                                        <Link href={`/songs/${song.id}`} className="font-medium hover:underline">{song.title}</Link>
                                        <p className="text-sm text-muted-foreground">{song.artist}</p>
                                     </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSong(song.id)} className="h-8 w-8">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center py-12 border-2 border-dashed rounded-lg">
                        <Music className="h-10 w-10 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhuma música neste repertório ainda.</p>
                        <p className="text-xs text-muted-foreground">Use o painel ao lado para adicionar músicas.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

