
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
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


const defaultCategories = ['Hinário', 'Adoração', 'Ceia', 'Alegre', 'Cantor Cristão', 'Harpa Cristã', 'Outros'];
const defaultGenres = ['Gospel', 'Worship', 'Pop', 'Rock', 'Reggae'];
const defaultArtists = ['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Anderson Freire', 'Bruna Karla', 'Isaias Saad', 'Midian Lima', 'Outros'];
const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function SongPage() {
  const params = useParams();
  const songId = params.id as string;
  const { data: song, loading: loadingSong } = useFirestoreDocument<Song>('songs', songId);
  const { updateDocument } = useFirestoreCollection<Song>('songs');
  
  const [artists, setArtists] = useLocalStorage<string[]>('song-artists', defaultArtists);
  const [genres, setGenres] = useLocalStorage<string[]>('song-genres', defaultGenres);
  const [categories, setCategories] = useLocalStorage<string[]>('song-categories', defaultCategories);
  
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [fontSize, setFontSize] = useLocalStorage('song-font-size', 12);
  const [api, setApi] = useState<CarouselApi>()
  
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
  
  if (!isClient || loadingSong || !song) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-[70vh] w-full" />
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/songs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar para as músicas</span>
            </Link>
          </Button>
          {!isEditing ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-baseline gap-2">
                    <h1 className="text-xl font-bold font-headline tracking-tight">{song.title}</h1>
                    <p className="text-muted-foreground text-sm whitespace-nowrap">{song.artist}</p>
                </div>
                {song.key && <Badge variant="outline" className="whitespace-nowrap">Tom: {transposeContent(song.key, transpose)}</Badge>}
            </div>
           ) : null}
        </div>
        <div className="flex items-center gap-2">
           {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEditing} size="sm">Cancelar</Button>
              <Button onClick={handleSave} size="sm">
                <Save className="mr-2 h-4 w-4" /> Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleStartEditing} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>
      
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
                            {artists.map(art => <SelectItem key={art} value={art}>{art}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={editedSong.category} onValueChange={(value) => updateEditedSongField('category', value)} required>
                        <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="genre">Gênero</Label>
                    <Select value={editedSong.genre} onValueChange={(value) => updateEditedSongField('genre', value)} required>
                        <SelectTrigger><SelectValue placeholder="Selecione um gênero" /></SelectTrigger>
                        <SelectContent>
                           {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
            </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center items-center flex-wrap gap-4 my-4">
            <div className="flex items-center gap-2 rounded-md border p-1">
                <Button variant="ghost" size="icon" onClick={decreaseTranspose}>
                    <Minus className="h-4 w-4" />
                </Button>
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                    Tom: {transpose > 0 ? '+' : ''}{transpose}
                </Badge>
                <Button variant="ghost" size="icon" onClick={increaseTranspose}>
                    <Plus className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleSaveKey} disabled={transpose === 0} className="ml-2">
                    <Save className="h-4 w-4" />
                    <span className="sr-only">Salvar Tom</span>
                </Button>
            </div>
            <div className="flex flex-col items-center space-y-1 rounded-md border p-2 py-1">
              <Label htmlFor="show-chords" className="text-sm">Mostrar Cifras</Label>
              <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
            </div>
            <div className="flex items-center gap-1 rounded-md border p-1">
                <Label className="text-sm pl-1">Tam.</Label>
                <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(8, s - 1))} className="h-6 w-6">
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-6 text-center">{fontSize}px</span>
                <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(32, s + 1))} className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}

      {isEditing && editedSong ? (
        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="content-editor">Letra &amp; Cifras</Label>
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
                    minHeight: '400px',
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
                        <ScrollArea className="h-[70vh] p-4 md:p-6">
                          <SongDisplay style={{ fontSize: `${fontSize}px` }} content={part} showChords={showChords} />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                <CarouselPrevious className="hidden md:flex" />
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                <CarouselNext className="hidden md:flex" />
              </div>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-4 md:hidden">
                <CarouselPrevious />
                <CarouselNext />
              </div>
            </Carousel>
        </div>
      ) : (
         <Card>
            <CardContent className="p-0">
                <ScrollArea className="h-[70vh] p-4 md:p-6">
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
  );
}
