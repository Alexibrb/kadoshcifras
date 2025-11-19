
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type Setlist, type Song, type SetlistSong } from '@/types';
import { ArrowLeft, Music, Plus, Minus, PlusCircle, Trash2, GripVertical, Check, ChevronsUpDown, Search, Lock, Globe, Edit, Save, X, Eye, EyeOff, HardDriveDownload, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { transposeChord } from '@/lib/music';
import { useToast } from '@/hooks/use-toast';

export default function SetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const { appUser } = useAuth();
  const { data: setlist, loading: loadingSetlist, updateDocument: updateSetlistDoc } = useFirestoreDocument<Setlist>('setlists', setlistId);
  const { data: allSongs, loading: loadingSongs } = useFirestoreCollection<Song>('songs');

  const [isClient, setIsClient] = useState(false);
  const [hasOfflineVersion, setHasOfflineVersion] = useState(false);
  const [orderedSongs, setOrderedSongs] = useState<SetlistSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  useEffect(() => { 
    setIsClient(true);
    // Verifica se existe uma versão offline no localStorage
    if (typeof window !== 'undefined') {
      const offlineData = localStorage.getItem(`offline-setlist-${setlistId}`);
      setHasOfflineVersion(!!offlineData);
    }
  }, [setlistId]);
  
  useEffect(() => {
    if (setlist) {
        setEditedName(setlist.name);
        setOrderedSongs(setlist.songs || []);
    }
  }, [setlist]);

  const canEdit = useMemo(() => {
    if (!appUser || !setlist) return false;
    if (setlist.isPublic) return true;
    return appUser.role === 'admin' || appUser.id === setlist.creatorId;
  }, [appUser, setlist]);

  const canChangeSettings = useMemo(() => {
    if (!appUser || !setlist) return false;
    return appUser.role === 'admin' || appUser.id === setlist.creatorId;
  }, [appUser, setlist]);

  const songMap = useMemo(() => new Map(allSongs.map(s => [s.id, s])), [allSongs]);

  const availableSongs = useMemo(() => {
    if (!setlist) return [];
    
    const songIdsInSetlist = (setlist.songs || []).map(s => s.songId);
    const songsNotInSetlist = allSongs.filter(song => !songIdsInSetlist.includes(song.id));

    const filtered = songsNotInSetlist.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [setlist, allSongs, searchQuery]);


  const handleAddSong = async (songId: string) => {
    if (!songId || !setlist || !canEdit) return;
    const newSongs = [...(setlist.songs || []), { songId, transpose: 0 }];
    await updateSetlistDoc({ songs: newSongs });
  };

  const handleRemoveSong = async (indexToRemove: number) => {
    if (!setlist || !canEdit) return;
    const newSongs = [...(setlist.songs || [])];
    newSongs.splice(indexToRemove, 1);
    await updateSetlistDoc({ songs: newSongs });
  };
  
  const handleTransposeChange = async (indexToChange: number, change: number) => {
      if (!setlist || !canEdit) return;
      const newSongs = (setlist.songs || []).map((s, index) => {
          if (index === indexToChange) {
              const newTranspose = s.transpose + change;
              return { ...s, transpose: Math.max(-12, Math.min(12, newTranspose)) };
          }
          return s;
      });
      await updateSetlistDoc({ songs: newSongs });
  }

  const handlePublicToggle = async (isPublic: boolean) => {
    if (!canChangeSettings) return;
    await updateSetlistDoc({ isPublic });
  };
  
   const handleVisibilityToggle = async (isVisible: boolean) => {
    if (!canChangeSettings) return;
    await updateSetlistDoc({ isVisible });
  };
  
  const handleNameSave = async () => {
    if (!canChangeSettings || !editedName.trim()) return;
    await updateSetlistDoc({ name: editedName.trim() });
    setIsEditingName(false);
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      if (setlist) setEditedName(setlist.name);
    }
  }
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !canEdit) {
      return;
    }
    const items = Array.from(orderedSongs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedSongs(items);
    updateSetlistDoc({ songs: items });
  };

  const handleGenerateOffline = () => {
    if (!setlist || !songMap) return;

    const songsToProcess = setlist.songs || [];
    
    const offlineSongs = songsToProcess.map(setlistSong => {
      const song = songMap.get(setlistSong.songId);
      if (!song) {
        toast({
          title: "Erro de Sincronização",
          description: `A música com ID ${setlistSong.songId} não foi encontrada e será pulada.`,
          variant: "destructive"
        });
        return null;
      }
      
      return {
          title: song.title,
          artist: song.artist,
          content: song.content, // Salva o conteúdo original
          key: song.key,
          initialTranspose: setlistSong.transpose // Salva a transposição inicial do repertório
      };
    }).filter(Boolean); // Remove músicas não encontradas

    if (offlineSongs.length !== songsToProcess.length) {
      toast({
        title: "Atenção",
        description: "Algumas músicas não puderam ser processadas para o modo offline.",
        variant: "destructive"
      });
    }

    try {
      const storageKey = `offline-setlist-${setlistId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        name: setlist.name,
        songs: offlineSongs
      }));
      setHasOfflineVersion(true); // Update state to show the presentation button
      toast({
        title: "Repertório Salvo Offline!",
        description: "Você já pode acessar a página de apresentação.",
      });
    } catch (error) {
       console.error("Erro ao salvar no localStorage:", error);
       toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar o repertório para uso offline. O armazenamento pode estar cheio.",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenPresentationMode = () => {
    window.open(`/setlists/${setlistId}/offline`, '_blank');
  };

  if (isClient && !loadingSetlist && !setlist) {
    notFound();
  }

  if (isClient && setlist && appUser && setlist.isVisible === false && setlist.creatorId !== appUser.id && appUser.role !== 'admin') {
      notFound();
  }

  if (!isClient || loadingSetlist || !setlist || !appUser || loadingSongs) {
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
       <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/setlists">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para os repertórios</span>
              </Link>
            </Button>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {setlist.isPublic ? <Globe className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
                    {setlist.isVisible ? <Eye className="h-7 w-7" /> : <EyeOff className="h-7 w-7" />}
                </div>
                <div>
                    {!isEditingName ? (
                      <div className="flex items-center gap-2">
                         <h2 className="text-3xl font-bold font-headline tracking-tight">{setlist.name}</h2>
                         {canChangeSettings && (
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(true)}>
                              <Edit className="h-4 w-4" />
                           </Button>
                         )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input 
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleNameKeyDown}
                            className="text-2xl font-bold font-headline h-12"
                            autoFocus
                        />
                        <Button size="icon" className="h-10 w-10" onClick={handleNameSave}><Save className="h-5 w-5" /></Button>
                        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { setIsEditingName(false); setEditedName(setlist.name); }}><X className="h-5 w-5" /></Button>
                      </div>
                    )}
                    <p className="text-muted-foreground">{orderedSongs.length} música(s)</p>
                </div>
            </div>
          </div>
           <div className="flex items-center gap-4 flex-wrap">
              {canChangeSettings && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <Label htmlFor="public-switch" className="text-sm font-medium">
                      {setlist.isPublic ? 'Público' : 'Privado'}
                    </Label>
                    <Switch
                      id="public-switch"
                      checked={setlist.isPublic}
                      onCheckedChange={handlePublicToggle}
                    />
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <Label htmlFor="visibility-switch" className="text-sm font-medium">
                      {setlist.isVisible ? 'Visível' : 'Oculto'}
                    </Label>
                    <Switch
                      id="visibility-switch"
                      checked={setlist.isVisible}
                      onCheckedChange={handleVisibilityToggle}
                    />
                  </div>
                </div>
              )}
               <Button onClick={handleGenerateOffline} variant="secondary">
                    <HardDriveDownload className="mr-2 h-4 w-4" />
                    Gerar Offline
                </Button>
                 {isClient && hasOfflineVersion && (
                  <Button onClick={handleOpenPresentationMode} variant="default">
                    <MonitorPlay className="mr-2 h-4 w-4" />
                    Modo Apresentação
                  </Button>
                )}
            </div>
      </div>
      
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2">
        <div className="flex flex-col order-1 lg:order-1">
          <Card className="flex flex-col h-full">
              <CardHeader>
                  <CardTitle className="font-headline">Músicas no Repertório</CardTitle>
                  <CardDescription>
                      {canEdit ? "Arraste para reordenar. Ajuste o tom de cada música para este repertório." : "Visualize as músicas do repertório."}
                  </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                  {isClient && orderedSongs.length > 0 ? (
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="songs" isDropDisabled={!canEdit}>
                          {(provided) => (
                            <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {orderedSongs.map((setlistSong, index) => {
                                 const song = songMap.get(setlistSong.songId);
                                 if (!song) return null;
                                 
                                 const displayedKey = song.key ? transposeChord(song.key, setlistSong.transpose) : 'N/A';
                                 const draggableId = `${setlistSong.songId}-${index}`;

                                 return (
                                 <Draggable key={draggableId} draggableId={draggableId} index={index} isDragDisabled={!canEdit}>
                                  {(provided, snapshot) => (
                                      <li
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn('flex items-center justify-between p-2 rounded-md border bg-background', canEdit && "hover:bg-accent/50", snapshot.isDragging ? 'shadow-lg bg-accent/20' : '')}
                                        style={{...provided.draggableProps.style}}
                                      >
                                          <div className="flex items-center gap-2 flex-grow">
                                              {canEdit && <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />}
                                              <div className="flex-grow">
                                                  <Link href={`/songs/${song.id}?fromSetlist=${setlistId}&transpose=${setlistSong.transpose}`} className="font-medium hover:underline">{song.title}</Link>
                                                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {canEdit && (
                                              <div className="flex items-center gap-1 rounded-md border p-0.5 bg-background">
                                                  <Button variant="ghost" size="icon" onClick={() => handleTransposeChange(index, -1)} className="h-7 w-7"><Minus className="h-4 w-4" /></Button>
                                                  <span className="font-mono text-sm font-semibold w-12 text-center">{displayedKey} ({setlistSong.transpose > 0 ? '+' : ''}{setlistSong.transpose})</span>
                                                  <Button variant="ghost" size="icon" onClick={() => handleTransposeChange(index, 1)} className="h-7 w-7"><Plus className="h-4 w-4" /></Button>
                                              </div>
                                            )}
                                            {canEdit && (
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveSong(index)} className="h-8 w-8">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                          </div>
                                      </li>
                                  )}
                                  </Draggable>
                              )})}
                              {provided.placeholder}
                            </ul>
                          )}
                        </Droppable>
                      </DragDropContext>
                  ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-center h-full py-12 border-2 border-dashed rounded-lg">
                          <Music className="h-10 w-10 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma música neste repertório ainda.</p>
                           {canEdit && <p className="text-xs text-muted-foreground">Use o painel ao lado para adicionar músicas.</p>}
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>

        <div className="flex flex-col order-2 lg:order-2">
          <Card className={cn(!canEdit && "bg-muted/30 border-dashed", "h-full")}>
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
        </div>
      </div>
    </div>
  );
}
