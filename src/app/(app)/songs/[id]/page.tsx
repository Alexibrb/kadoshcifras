
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song, type MetadataItem, Setlist, SetlistSong, PedalSettings } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save, PlayCircle, HardDriveDownload, Eye, EyeOff, PanelTopClose, PanelTopOpen, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { transposeContent, transposeChord } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';


const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const songId = params.id as string;
  const fromSetlistId = searchParams.get('fromSetlist');
  const initialTranspose = parseInt(searchParams.get('transpose') || '0', 10);

  const { data: song, loading: loadingSong, updateDocument: updateSongDoc } = useFirestoreDocument<Song>('songs', songId);
  const { data: setlist, loading: loadingSetlist, updateDocument: updateSetlistDoc } = useFirestoreDocument<Setlist>('setlists', fromSetlistId || '');
  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', { 
    prevPage: ',', 
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });

  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [fontSize, setFontSize] = useLocalStorage('song-font-size', 16);
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [toneSaveSuccess, setToneSaveSuccess] = useState(false);
  
  const [editedSong, setEditedSong] = useState<Song | null>(null);
  
  const { data: artists, loading: loadingArtists } = useFirestoreCollection<MetadataItem>('artists', 'name');
  const { data: genres, loading: loadingGenres } = useFirestoreCollection<MetadataItem>('genres', 'name');
  const { data: categories, loading: loadingCategories } = useFirestoreCollection<MetadataItem>('categories', 'name');

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const initialKeyRef = useRef(song?.key);

  useEffect(() => {
    setIsClient(true);
    setTranspose(initialTranspose);
    if (containerRef.current) {
        containerRef.current.focus();
    }
  }, [initialTranspose]);

  useEffect(() => {
    if (song) {
        setEditedSong(song);
        if (initialKeyRef.current !== undefined && song.key !== initialKeyRef.current) {
            const currentTranspose = fromSetlistId && setlist ? (setlist.songs.find(s => s.songId === songId)?.transpose ?? 0) : 0;
            setTranspose(currentTranspose);
        }
        initialKeyRef.current = song.key;
    }
  }, [song, initialTranspose, fromSetlistId, setlist, songId]);

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])
  

  const { prevSongId, nextSongId, prevTranspose, nextTranspose } = useMemo(() => {
    if (!fromSetlistId || !setlist || !setlist.songs || setlist.songs.length < 2) {
      return { prevSongId: null, nextSongId: null, prevTranspose: 0, nextTranspose: 0 };
    }
    const currentIndex = setlist.songs.findIndex(s => s.songId === songId);
    if (currentIndex === -1) {
      return { prevSongId: null, nextSongId: null, prevTranspose: 0, nextTranspose: 0 };
    }

    const prev = currentIndex > 0 ? setlist.songs[currentIndex - 1] : null;
    const next = currentIndex < setlist.songs.length - 1 ? setlist.songs[currentIndex + 1] : null;

    return { 
        prevSongId: prev?.songId || null, 
        nextSongId: next?.songId || null,
        prevTranspose: prev?.transpose || 0,
        nextTranspose: next?.transpose || 0,
    };
  }, [setlist, songId, fromSetlistId]);


  const contentToDisplay = useMemo(() => {
    const currentContent = isEditing ? editedSong?.content : song?.content;
    if (!currentContent) return '';
    return transposeContent(currentContent, transpose);
  }, [song, editedSong, transpose, isEditing]);

  const songParts = useMemo(() => {
    return contentToDisplay.split(/\n\s*\n\s*\n/);
  }, [contentToDisplay]);

  const handleStartEditing = () => {
    if (!song) return;
    setEditedSong({ ...song });
    setIsEditing(true);
    setIsPanelVisible(true);
  }

  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEditing) return;

        const key = event.key;
        if (showChords && (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage)) {
          event.preventDefault()
          api?.scrollPrev()
        } else if (showChords && (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage)) {
          event.preventDefault()
          api?.scrollNext()
        }

        if (key === pedalSettings.prevSong && prevSongId && fromSetlistId) {
            event.preventDefault();
            router.push(`/songs/${prevSongId}?fromSetlist=${fromSetlistId}&transpose=${prevTranspose}`);
        } else if (key === pedalSettings.nextSong && nextSongId && fromSetlistId) {
            event.preventDefault();
            router.push(`/songs/${nextSongId}?fromSetlist=${fromSetlistId}&transpose=${nextTranspose}`);
        }
      },
      [api, isEditing, showChords, pedalSettings, prevSongId, nextSongId, fromSetlistId, router, prevTranspose, nextTranspose]
    )
  
  const handleSave = async () => {
    if (!editedSong || !editedSong.title || !editedSong.artist || !editedSong.category || !editedSong.genre) {
      alert("Por favor, preencha todos os campos obrigatórios (Título, Artista, Categoria, Gênero).");
      return;
    }
    
    await updateSongDoc(editedSong);
    
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setEditedSong(song || null);
    setIsEditing(false);
    setTranspose(initialTranspose);
  }

  const handleSaveTransposeToSetlist = useCallback(async () => {
    if (!fromSetlistId || !setlist || !setlist.songs) return;
    
    const newSongs = setlist.songs.map(s => 
      s.songId === songId ? { ...s, transpose: transpose } : s
    );

    await updateSetlistDoc({ songs: newSongs });

    setToneSaveSuccess(true);
    setTimeout(() => setToneSaveSuccess(false), 2000);

  }, [fromSetlistId, setlist, songId, updateSetlistDoc, transpose]);

  const changeTranspose = (change: number) => {
    const newTranspose = Math.min(12, Math.max(-12, transpose + change));
    setTranspose(newTranspose);
  };

  const increaseTranspose = () => changeTranspose(1);
  const decreaseTranspose = () => changeTranspose(-1);

  if (isClient && !loadingSong && !song) {
    notFound();
  }
  
  if (!isClient || loadingSong || !song || loadingArtists || loadingGenres || loadingCategories || (fromSetlistId && loadingSetlist)) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-[60vh] w-full" />
        </div>
    );
  }

  const updateEditedSongField = (field: keyof Song, value: string | string[]) => {
    if (editedSong) {
        setEditedSong({ ...editedSong, [field]: value });
    }
  };

  const backUrl = fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs';

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none" 
      onKeyDownCapture={handleKeyDown} 
      tabIndex={-1}
    >
      
      {!isEditing && (
        <Card className="mb-4 bg-accent/10 transition-all duration-300">
          <CardContent className="p-4 space-y-4">
             {isPanelVisible ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                      <Button asChild variant="outline" size="icon" className="shrink-0">
                          <Link href={backUrl}>
                              <ArrowLeft className="h-4 w-4" />
                              <span className="sr-only">Voltar</span>
                          </Link>
                      </Button>

                      <div className="flex-1 space-y-1">
                          <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">{song.title}</h1>
                          <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-muted-foreground text-sm">{song.artist}</p>
                              {song.key && <Badge variant="outline" className="whitespace-nowrap text-sm">Tom: {transposeChord(song.key, transpose)}</Badge>}
                          </div>
                          <div className="flex flex-row items-start gap-2 pt-1">
                              <Button variant="outline" onClick={handleStartEditing} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 text-xs">
                                  <Edit className="mr-1.5 h-3 w-3" /> Editar
                              </Button>
                              {song.url && (
                                  <Button asChild variant="destructive" size="sm" className="h-8 text-xs">
                                      <a href={song.url} target="_blank" rel="noopener noreferrer">
                                          <PlayCircle className="mr-1.5 h-3 w-3" /> Ouvir
                                      </a>
                                  </Button>
                              )}
                          </div>
                      </div>
                      
                      <Button
                        onClick={() => setIsPanelVisible(false)}
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                      >
                        <PanelTopClose className="h-5 w-5" />
                        <span className="sr-only">Ocultar Controles</span>
                      </Button>
                  </div>
                
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-2 flex-wrap">
                      <div className="flex items-center gap-1 rounded-md border p-1 w-full max-w-sm bg-background">
                        <Button variant="ghost" size="icon" onClick={decreaseTranspose} className="h-8 w-8">
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Badge variant="secondary" className="px-3 py-1 text-xs whitespace-nowrap flex-grow text-center justify-center">
                            Tom: {transpose > 0 ? '+' : ''}{transpose}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={increaseTranspose} className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                        </Button>
                        {fromSetlistId && (
                          <Button 
                            variant={toneSaveSuccess ? "default" : "outline"} 
                            size="sm" 
                            onClick={handleSaveTransposeToSetlist}
                            className={cn("h-8 ml-2", toneSaveSuccess && "bg-green-500 hover:bg-green-600")}
                          >
                             {toneSaveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                             <span className="ml-2 hidden sm:inline">{toneSaveSuccess ? "Salvo!" : "Salvar Tom"}</span>
                          </Button>
                        )}
                      </div>
                       <div className="flex items-center space-x-2 rounded-md border p-1 px-3 bg-background h-10 w-full max-w-xs">
                        <Label htmlFor="show-chords" className="text-sm whitespace-nowrap">Mostrar Cifras</Label>
                        <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} className="ml-auto" />
                      </div>
                  </div>
                </>
             ) : (
                <div className="flex items-center justify-between gap-4">
                     <Button asChild variant="outline" size="icon" className="shrink-0">
                          <Link href={backUrl}>
                              <ArrowLeft className="h-4 w-4" />
                              <span className="sr-only">Voltar</span>
                          </Link>
                      </Button>
                       <h1 className="text-lg font-bold font-headline tracking-tight truncate">{song.title}</h1>
                      <Button
                        onClick={() => setIsPanelVisible(true)}
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                      >
                        <PanelTopOpen className="h-5 w-5" />
                        <span className="sr-only">Mostrar Controles</span>
                      </Button>
                </div>
             )}
          </CardContent>
        </Card>
      )}
      
      {isEditing && editedSong && (
        <div className="transition-all duration-300">
           <Card className="mb-4 bg-accent/10">
              <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                      <Button asChild variant="outline" size="icon" className="shrink-0">
                          <Link href={backUrl}>
                              <ArrowLeft className="h-4 w-4" />
                              <span className="sr-only">Voltar</span>
                          </Link>
                      </Button>

                      <div className="flex-1">
                          <h1 className="text-lg font-bold font-headline tracking-tight">Editando: {song.title}</h1>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={handleCancelEditing} size="sm">Cancelar</Button>
                          <Button onClick={handleSave} size="sm">
                              <Save className="mr-2 h-4 w-4" /> Salvar
                          </Button>
                      </div>
                  </div>
              </CardContent>
           </Card>
            <Card className="mb-4">
                <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={editedSong.title} onChange={(e) => updateEditedSongField('title', e.target.value)} required/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="artist">Artista</Label>
                        <Select value={editedSong.artist} onValueChange={(value) => updateEditedSongField('artist', value)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione um artista" /></SelectTrigger>
                            <SelectContent>
                                {artists.map(art => <SelectItem key={art.id} value={art.name}>{art.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={editedSong.category} onValueChange={(value) => updateEditedSongField('category', value)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="genre">Gênero</Label>
                        <Select value={editedSong.genre} onValueChange={(value) => updateEditedSongField('genre', value)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione um gênero" /></SelectTrigger>
                            <SelectContent>
                              {genres.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="key">Tom</Label>
                        <Select 
                            value={editedSong.key} 
                            onValueChange={(v) => updateEditedSongField('key', v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Selecione um tom" /></SelectTrigger>
                            <SelectContent>
                                {ALL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="url">URL da Música</Label>
                        <Input id="url" value={editedSong.url ?? ''} onChange={(e) => updateEditedSongField('url', e.target.value)} placeholder="https://..." />
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {isEditing && editedSong ? (
          <Card className="flex-1 flex flex-col bg-transparent shadow-none border-none">
            <CardContent className="p-4 md:p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center">
                  <Label htmlFor="content-editor">Letra & Cifras</Label>
                  <Button onClick={handleSave} size="sm">
                      <Save className="mr-2 h-4 w-4" /> Salvar
                  </Button>
                </div>
                <Alert variant="destructive" className="p-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Use duas linhas em branco para dividir a música em várias páginas/seções.
                  </AlertDescription>
                </Alert>
                <Textarea
                  id="content-editor"
                  ref={textareaRef}
                  value={editedSong.content || ''}
                  onChange={(e) => {
                    if (editedSong) {
                      updateEditedSongField('content', e.target.value);
                    }
                  }}
                  className="font-code w-full"
                  style={{ 
                      whiteSpace: 'pre', 
                      overflowX: 'auto', 
                      height: '1500px'
                  }}
                  required
                />
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSave}>Salvar Música</Button>
                </div>
            </CardContent>
          </Card>
        ) : showChords ? (
          <div className="relative flex-1 flex flex-col">
             <div className="flex justify-between items-center w-full px-4 text-center text-sm text-muted-foreground pb-2 pt-2 absolute top-18 z-20">
                 <div className="flex items-center gap-2">
                    {fromSetlistId && prevSongId ? (
                       <Button asChild variant="ghost" size="icon">
                           <Link href={`/songs/${prevSongId}?fromSetlist=${fromSetlistId}&transpose=${prevTranspose}`}>
                               <ChevronLeft className="h-6 w-6" />
                           </Link>
                       </Button>
                    ) : <div className="w-10"></div>}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-md border p-1 bg-background max-w-fit">
                        <Label className="text-sm pl-1 whitespace-nowrap sr-only">Tam. da Fonte</Label>
                        <Button variant="ghost" onClick={() => setFontSize(s => Math.max(8, s - 1))} className="h-7 w-7 px-1">
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium tabular-nums">{fontSize}px</span>
                        <Button variant="ghost" onClick={() => setFontSize(s => Math.min(32, s + 1))} className="h-7 w-7 px-1">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {count > 1 && <span>Página {current} de {count}</span>}
                </div>

                 <div className="flex items-center gap-2">
                    {fromSetlistId && nextSongId ? (
                       <Button asChild variant="ghost" size="icon">
                           <Link href={`/songs/${nextSongId}?fromSetlist=${fromSetlistId}&transpose=${nextTranspose}`}>
                               <ChevronRight className="h-6 w-6" />
                           </Link>
                       </Button>
                    ) : <div className="w-10"></div>}
                </div>
             </div>
             <Carousel className="w-full flex-1 pt-24" setApi={setApi} opts={{ watchDrag: true }}>
                <CarouselContent>
                  {songParts.map((part, index) => (
                    <CarouselItem key={index} className="h-full">
                      <Card className="w-full h-full flex flex-col bg-background shadow-none border-none">
                        <CardContent className="flex-1 h-full p-0">
                          <ScrollArea className="h-full p-4 md:p-6">
                            <SongDisplay style={{ fontSize: `${fontSize}px` }} content={part} showChords={showChords} />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <CarouselPrevious />
                </div>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <CarouselNext />
                </div>
                
                <div 
                    className="absolute left-0 top-0 h-full w-1/3 z-30" 
                    onClick={() => api?.scrollPrev()} 
                />
                <div 
                    className="absolute right-0 top-0 h-full w-1/3 z-30" 
                    onClick={() => api?.scrollNext()} 
                />
              </Carousel>
          </div>
        ) : (
          <Card className="flex-1 flex flex-col bg-background shadow-none border-none">
              <CardContent className="h-full flex flex-col p-0">
                  <div className="flex justify-between items-center w-full px-4 text-center text-sm text-muted-foreground pt-2 pb-2">
                     <div className="flex items-center gap-2">
                         {fromSetlistId && prevSongId ? (
                           <Button asChild variant="ghost" size="icon">
                               <Link href={`/songs/${prevSongId}?fromSetlist=${fromSetlistId}&transpose=${prevTranspose}`}>
                                   <ChevronLeft className="h-6 w-6" />
                               </Link>
                           </Button>
                         ) : <div className="w-10"></div>}
                     </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 rounded-md border p-1 bg-background max-w-fit">
                            <Label className="text-sm pl-1 whitespace-nowrap sr-only">Tam. da Fonte</Label>
                            <Button variant="ghost" onClick={() => setFontSize(s => Math.max(8, s - 1))} className="h-7 w-7 px-1">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium tabular-nums">{fontSize}px</span>
                            <Button variant="ghost" onClick={() => setFontSize(s => Math.min(32, s + 1))} className="h-7 w-7 px-1">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fromSetlistId && nextSongId ? (
                           <Button asChild variant="ghost" size="icon">
                               <Link href={`/songs/${nextSongId}?fromSetlist=${fromSetlistId}&transpose=${nextTranspose}`}>
                                   <ChevronRight className="h-6 w-6" />
                               </Link>
                           </Button>
                         ) : <div className="w-10"></div>}
                      </div>
                  </div>
                  <ScrollArea className="h-full p-4 md:p-6 flex-1">
                      <SongDisplay 
                          style={{ fontSize: `${fontSize}px` }}
                          content={contentToDisplay.replace(/\n\s*\n\s*\n/g, '\n\n')}
                          showChords={false} 
                      />
                  </ScrollArea>
              </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

    