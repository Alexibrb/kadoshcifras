
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song, type MetadataItem } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
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


const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const fromSetlistId = searchParams.get('fromSetlist');

  const { data: song, loading: loadingSong } = useFirestoreDocument<Song>('songs', songId);
  const { updateDocument } = useFirestoreCollection<Song>('songs');
  
  const { data: artists, loading: loadingArtists } = useFirestoreCollection<MetadataItem>('artists', 'name');
  const { data: genres, loading: loadingGenres } = useFirestoreCollection<MetadataItem>('genres', 'name');
  const { data: categories, loading: loadingCategories } = useFirestoreCollection<MetadataItem>('categories', 'name');
  
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useLocalStorage('song-font-size', 12);
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  
  const [editedSong, setEditedSong] = useState<Song | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (song) {
        setEditedSong(song);
    }
  }, [song]);

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
  }

  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isEditing && showChords) {
            if (event.key === "ArrowLeft" || event.key === 'PageUp') {
              event.preventDefault()
              api?.scrollPrev()
            } else if (event.key === "ArrowRight" || event.key === 'PageDown') {
              event.preventDefault()
              api?.scrollNext()
            }
        }
      },
      [api, isEditing, showChords]
    )
  
  const handleSave = async () => {
    if (!editedSong || !editedSong.title || !editedSong.artist || !editedSong.category || !editedSong.genre) {
      alert("Por favor, preencha todos os campos obrigatórios (Título, Artista, Categoria, Gênero).");
      return;
    }
    
    await updateDocument(editedSong.id, editedSong);
    
    setTranspose(0);
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setEditedSong(song || null);
    setIsEditing(false);
    setTranspose(0);
  }

  if (isClient && !loadingSong && !song) {
    notFound();
  }
  
  if (!isClient || loadingSong || !song || loadingArtists || loadingGenres || loadingCategories) {
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

  const handleSaveKey = async () => {
    if (!song || transpose === 0) return;
    
    const newKey = song.key ? transposeChord(song.key, transpose) : '';
    const newContent = transposeContent(song.content, transpose);

    await updateDocument(song.id, { key: newKey, content: newContent });
    setTranspose(0);
  };

  const increaseTranspose = () => setTranspose(t => Math.min(12, t + 1));
  const decreaseTranspose = () => setTranspose(t => Math.max(-12, t - 1));
  
  const backUrl = fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs';


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-32" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <Card className="mb-4 bg-accent/10">
        <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
                 <Button asChild variant="outline" size="icon" className="shrink-0">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                    </Link>
                </Button>

                {!isEditing ? (
                    <div className="flex-1 space-y-1">
                        <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">{song.title}</h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-muted-foreground text-sm">{song.artist}</p>
                            {song.key && <Badge variant="outline" className="whitespace-nowrap text-sm">Tom: {transposeContent(song.key, transpose)}</Badge>}
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
                ) : (
                    <div className="flex-1">
                         <h1 className="text-lg font-bold font-headline tracking-tight">Editando: {song.title}</h1>
                    </div>
                )}
                 {isEditing && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleCancelEditing} size="sm">Cancelar</Button>
                        <Button onClick={handleSave} size="sm">
                            <Save className="mr-2 h-4 w-4" /> Salvar
                        </Button>
                    </div>
                )}
            </div>
          
            {!isEditing && (
                 <div className="flex justify-center pt-2">
                    <div className="flex items-center gap-2 rounded-md border p-1 w-full max-w-xs bg-background">
                        <Label className="text-sm pl-1 whitespace-nowrap">Tam. da Fonte</Label>
                        <Button variant="secondary" onClick={() => setFontSize(s => Math.max(8, s - 1))} className="h-6 px-2">
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-full text-center">{fontSize}px</span>
                        <Button variant="secondary" onClick={() => setFontSize(s => Math.min(32, s + 1))} className="h-6 px-2">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      {isEditing && editedSong ? (
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
      ) : null}

      {isEditing && editedSong ? (
        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
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
                className="font-code"
                style={{ 
                    whiteSpace: 'pre', 
                    overflowX: 'auto', 
                    minHeight: '1000px',
                    fontSize: `${fontSize}px` 
                }}
                required
              />
              <div className="flex justify-end">
                <Button onClick={handleSave}>Salvar Música</Button>
              </div>
          </CardContent>
        </Card>
      ) : showChords ? (
        <div className="relative">
          <Carousel className="w-full" setApi={setApi} opts={{ watchDrag: true }}>
              <CarouselContent>
                {songParts.map((part, index) => (
                  <CarouselItem key={index}>
                    <Card>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[60vh] p-4 md:p-6">
                          <SongDisplay style={{ fontSize: `${fontSize}px` }} content={part} showChords={showChords} />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {/* Controles de toque */}
              <div className="absolute inset-0 flex justify-between z-10">
                <div className="w-1/3 h-full" onClick={() => api?.scrollPrev()} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full" onClick={() => api?.scrollNext()} />
              </div>
              {/* Botões de desktop */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block">
                <CarouselPrevious />
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                <CarouselNext />
              </div>
            </Carousel>
        </div>
      ) : (
         <Card>
            <CardContent className="p-0">
                <ScrollArea className="h-[60vh] p-4 md:p-6">
                    <SongDisplay 
                        style={{ fontSize: `${fontSize}px` }}
                        content={contentToDisplay.replace(/\n\s*\n\s*\n/g, '\n\n')}
                        showChords={false} 
                    />
                </ScrollArea>
            </CardContent>
         </Card>
      )}
      
      {!isEditing && (
        <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-none border-t border-x-0 bg-accent">
          <CardContent className="p-2 flex flex-col justify-center items-center gap-2">
             <div className="text-center text-sm text-foreground font-bold">
                {count > 1 && `Página ${current} de ${count}`}
              </div>
              <div className="flex flex-row justify-center items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border p-1 bg-background">
                    <Button variant="ghost" size="icon" onClick={decreaseTranspose} className="h-8 w-8">
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary" className="px-3 py-1 text-xs whitespace-nowrap">
                        Tom: {transpose > 0 ? '+' : ''}{transpose}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={increaseTranspose} className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleSaveKey} disabled={transpose === 0} className="ml-2 h-8 w-8">
                        <Save className="h-4 w-4" />
                        <span className="sr-only">Salvar Tom</span>
                    </Button>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-1 px-2 bg-background h-10">
                  <Label htmlFor="show-chords" className="text-xs whitespace-nowrap">Mostrar Cifras</Label>
                  <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
                </div>
              </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
