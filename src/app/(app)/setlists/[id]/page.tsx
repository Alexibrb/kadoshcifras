
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type Setlist, type Song } from '@/types';
import { ArrowLeft, Music, PlusCircle, Trash2, GripVertical, Search } from 'lucide-react';
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
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function SetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  
  const { data: setlist, loading: loadingSetlist } = useFirestoreDocument<Setlist>('setlists', setlistId);
  const { data: allSongs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');
  const { updateDocument } = useFirestoreCollection('setlists');

  const [isClient, setIsClient] = useState(false);
  const [selectedSong, setSelectedSong] = useState('');
  const [orderedSongs, setOrderedSongs] = useState<Song[]>([]);
  const [songFilter, setSongFilter] = useState('');


  useEffect(() => { setIsClient(true) }, []);

  const songsInSetlist = useMemo(() => {
    if (!setlist || !setlist.songIds) return [];
    const songMap = new Map(allSongs.map(s => [s.id, s]));
    return setlist.songIds.map(id => songMap.get(id)).filter(Boolean) as Song[];
  }, [setlist, allSongs]);

  useEffect(() => {
    if (songsInSetlist.length > 0) {
      setOrderedSongs(songsInSetlist);
    } else {
      setOrderedSongs([]);
    }
  }, [songsInSetlist]);


  const availableSongs = useMemo(() => {
    if (!setlist) return allSongs;

    let songsNotInSetlist = allSongs.filter(song => !(setlist.songIds || []).includes(song.id));
    
    if (songFilter) {
      songsNotInSetlist = songsNotInSetlist.filter(song => 
        song.title.toLowerCase().includes(songFilter.toLowerCase()) ||
        song.artist.toLowerCase().includes(songFilter.toLowerCase())
      );
    }

    return songsNotInSetlist;
  }, [setlist, allSongs, songFilter]);


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
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const items = Array.from(orderedSongs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedSongs(items);
    const newSongIds = items.map(song => song.id);
    updateDocument(setlistId, { songIds: newSongIds });
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
            <p className="text-muted-foreground">{orderedSongs.length} música(s)</p>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna de Adicionar Músicas */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Adicionar Músicas ao Repertório</CardTitle>
            <CardDescription>Use o filtro para encontrar uma música e adicioná-la.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="song-filter">Filtrar por Título ou Artista</Label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="song-filter"
                        placeholder="Ex: Sonda-me..."
                        value={songFilter}
                        onChange={(e) => setSongFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
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
                         <SelectItem value="no-songs" disabled>
                           {songFilter ? 'Nenhum resultado encontrado' : 'Nenhuma música disponível'}
                         </SelectItem>
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
                {isClient && orderedSongs.length > 0 ? (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="songs">
                        {(provided) => (
                          <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {orderedSongs.map((song, index) => (
                               <Draggable key={song.id} draggableId={song.id} index={index}>
                                {(provided, snapshot) => (
                                    <li
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 ${snapshot.isDragging ? 'shadow-lg bg-accent/20' : ''}`}
                                      style={{...provided.draggableProps.style}}
                                    >
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                            <div>
                                                <Link href={`/songs/${song.id}?fromSetlist=${setlistId}`} className="font-medium hover:underline">{song.title}</Link>
                                                <p className="text-sm text-muted-foreground">{song.artist}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSong(song.id)} className="h-8 w-8">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </li>
                                )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                          </ul>
                        )}
                      </Droppable>
                    </DragDropContext>
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
