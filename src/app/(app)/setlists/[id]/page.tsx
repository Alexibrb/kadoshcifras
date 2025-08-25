
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type Setlist, type Song } from '@/types';
import { ArrowLeft, Music, PlusCircle, Trash2, GripVertical, Check, ChevronsUpDown, Search, Lock } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';


export default function SetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  
  const { appUser } = useAuth();
  const { data: setlist, loading: loadingSetlist } = useFirestoreDocument<Setlist>('setlists', setlistId);
  const { data: allSongs, loading: loadingSongs } = useFirestoreCollection<Song>('songs', 'title');
  const { updateDocument } = useFirestoreCollection('setlists');

  const [isClient, setIsClient] = useState(false);
  const [orderedSongs, setOrderedSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => { setIsClient(true) }, []);

  const canEdit = useMemo(() => {
    if (!appUser || !setlist) return false;
    return appUser.role === 'admin' || appUser.id === setlist.creatorId;
  }, [appUser, setlist]);

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
    if (!setlist) return [];
    
    // Filtra músicas que já estão no repertório
    const songsNotInSetlist = allSongs.filter(song => !(setlist.songIds || []).includes(song.id));

    // Filtra com base na busca
    const filtered = songsNotInSetlist.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Ordena por título
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [setlist, allSongs, searchQuery]);


  const handleAddSong = async (songId: string) => {
    if (!songId || !setlist || !canEdit) return;
    const newSongIds = [...(setlist.songIds || []), songId];
    await updateDocument(setlistId, { songIds: newSongIds });
  };

  const handleRemoveSong = async (songId: string) => {
    if (!setlist || !canEdit) return;
    const newSongIds = (setlist.songIds || []).filter(id => id !== songId);
    await updateDocument(setlistId, { songIds: newSongIds });
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !canEdit) {
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

  if (!isClient || loadingSetlist || !setlist || !appUser) {
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
        <Card className={cn(!canEdit && "bg-muted/30 border-dashed")}>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              Adicionar Músicas
              {!canEdit && <Lock className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
                {canEdit ? "Busque por uma música e clique nela para adicioná-la." : "Você não tem permissão para editar este repertório."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <fieldset disabled={!canEdit} className="space-y-4">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                      placeholder="Buscar por título ou artista..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background"
                   />
                </div>

               <ScrollArea className="h-72 w-full rounded-md border bg-background">
                  <div className="p-4">
                      {availableSongs.length > 0 ? (
                          availableSongs.map((song) => (
                             <div
                               key={song.id}
                               className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                               onClick={() => handleAddSong(song.id)}
                             >
                                  <div>
                                      <p className="font-medium">{song.title}</p>
                                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <PlusCircle className="h-4 w-4" />
                                  </Button>
                             </div>
                          ))
                      ) : (
                          <p className="text-center text-sm text-muted-foreground py-4">
                              {loadingSongs ? "Carregando..." : "Nenhuma música encontrada."}
                          </p>
                      )}
                  </div>
               </ScrollArea>
             </fieldset>
          </CardContent>
        </Card>
        
        {/* Coluna de Músicas no Repertório */}
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Músicas no Repertório</CardTitle>
                <CardDescription>
                    {canEdit ? "Arraste para reordenar as músicas." : "Visualize as músicas do repertório."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isClient && orderedSongs.length > 0 ? (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="songs" isDropDisabled={!canEdit}>
                        {(provided) => (
                          <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {orderedSongs.map((song, index) => (
                               <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={!canEdit}>
                                {(provided, snapshot) => (
                                    <li
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`flex items-center justify-between p-2 rounded-md border bg-background ${canEdit && "hover:bg-accent/50"} ${snapshot.isDragging ? 'shadow-lg bg-accent/20' : ''}`}
                                      style={{...provided.draggableProps.style}}
                                    >
                                        <div className="flex items-center gap-2">
                                            {canEdit && <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />}
                                            <div>
                                                <Link href={`/songs/${song.id}?fromSetlist=${setlistId}`} className="font-medium hover:underline">{song.title}</Link>
                                                <p className="text-sm text-muted-foreground">{song.artist}</p>
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSong(song.id)} className="h-8 w-8">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
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
                         {canEdit && <p className="text-xs text-muted-foreground">Use o painel ao lado para adicionar músicas.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
