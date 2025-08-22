
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { transposeContent, transposeChord } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const defaultCategories = ['Hinário', 'Adoração', 'Ceia', 'Alegre', 'Cantor Cristão', 'Harpa Cristã', 'Outros'];
const defaultGenres = ['Gospel', 'Worship', 'Pop', 'Rock', 'Reggae'];
const defaultArtists = ['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Anderson Freire', 'Bruna Karla', 'Isaias Saad', 'Midian Lima', 'Outros'];
const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];


export default function SongPage() {
  const params = useParams();
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [artists, setArtists] = useLocalStorage<string[]>('song-artists', defaultArtists);
  const [genres, setGenres] = useLocalStorage<string[]>('song-genres', defaultGenres);
  const [categories, setCategories] = useLocalStorage<string[]>('song-categories', defaultCategories);
  
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [api, setApi] = useState<CarouselApi>()
  
  const songId = params.id as string;
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [editedSong, setEditedSong] = useState<Song | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsClient(true);
    const currentSong = songs.find((s) => s.id === songId);
    if (currentSong) {
        setSong(currentSong);
    }
  }, [songs, songId]);

  useEffect(() => {
    if (isEditing && textareaRef.current && editedSong) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editedSong?.content]);


  const handleStartEditing = () => {
    if (!song) return;
    setEditedSong({ ...song });
    setIsEditing(true);
  }

  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isEditing) {
            if (event.key === "ArrowLeft" || event.key === 'PageUp') {
              event.preventDefault()
              api?.scrollPrev()
            } else if (event.key === "ArrowRight" || event.key === 'PageDown') {
              event.preventDefault()
              api?.scrollNext()
            }
        }
      },
      [api, isEditing]
    )
  
  const contentToDisplay = useMemo(() => {
    const currentContent = song?.content;
    if (!currentContent) return '';
    return transposeContent(currentContent, transpose);
  }, [song, transpose]);


  const songParts = useMemo(() => {
    if (showChords) {
      return contentToDisplay.split(/\n---\n/);
    }
    const contentWithoutChords = contentToDisplay
      .split('\n')
      .filter(line => !isChordLine(line))
      .join('\n');

    return [contentWithoutChords.replace(/\n---\n/g, '\n\n')];
  }, [contentToDisplay, showChords]);

  const isChordLine = (line: string) => {
    // Implemente a lógica para detectar se uma linha contém apenas cifras
    // Esta é uma implementação de exemplo
    const trimmedLine = line.trim();
    if (!trimmedLine) return false;
    const parts = trimmedLine.split(/\s+/);
    return parts.every(part => /^[A-G](b|#)?(m|maj|min|dim|aug|sus|°|[0-9])*/.test(part));
  }


  if (isClient && !song) {
    notFound();
  }
  
  if (!isClient || !song) {
    return null; 
  }

  const handleSave = () => {
    if (!editedSong) return;

    const updatedSongs = songs.map((s) => (s.id === editedSong.id ? editedSong : s));
    setSongs(updatedSongs);
    setSong(editedSong);
    
    setTranspose(0);
    setIsEditing(false);
    setEditedSong(null);
  };

  const updateEditedSongField = (field: keyof Song, value: string | string[]) => {
    if (editedSong) {
        setEditedSong({ ...editedSong, [field]: value });
    }
  };

  const handleSaveKey = () => {
    if (!song || transpose === 0) return;
    
    const newKey = song.key ? transposeChord(song.key, transpose) : '';
    const newContent = transposeContent(song.content, transpose);

    const updatedSong = { 
        ...song, 
        key: newKey,
        content: newContent
    };

    const updatedSongs = songs.map((s) => (s.id === updatedSong.id ? updatedSong : s));
    setSongs(updatedSongs);
    setSong(updatedSong);
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
            <Button onClick={handleSave} size="sm">
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button variant="outline" onClick={handleStartEditing} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>
      
      {isEditing && editedSong && (
        <Card className="mb-4">
            <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" value={editedSong.title} onChange={(e) => updateEditedSongField('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="artist">Artista</Label>
                    <Select value={editedSong.artist} onValueChange={(value) => updateEditedSongField('artist', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione um artista" /></SelectTrigger>
                        <SelectContent>
                            {artists.map(art => <SelectItem key={art} value={art}>{art}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={editedSong.category} onValueChange={(value) => updateEditedSongField('category', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="genre">Gênero</Label>
                    <Select value={editedSong.genre} onValueChange={(value) => updateEditedSongField('genre', value)}>
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
      )}

      <div className="flex justify-center items-center gap-4 my-4">
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
               {transpose !== 0 && !isEditing && (
                <Button variant="outline" size="icon" onClick={handleSaveKey} className="ml-2">
                    <Save className="h-4 w-4" />
                    <span className="sr-only">Salvar Tom</span>
                </Button>
              )}
          </div>
          <div className="flex items-center space-x-2 rounded-md border p-2 py-1">
            <Label htmlFor="show-chords" className="text-sm">Mostrar Cifras</Label>
            <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
          </div>
      </div>

      {isEditing && editedSong ? (
        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="content-editor">Letra &amp; Cifras</Label>
                <Button onClick={handleSave} size="sm">
                    <Save className="mr-2 h-4 w-4" /> Salvar
                </Button>
              </div>
              <Textarea
                id="content-editor"
                ref={textareaRef}
                value={editedSong.content || ''}
                onChange={(e) => {
                  if (editedSong) {
                    updateEditedSongField('content', e.target.value);
                  }
                }}
                className="font-code text-base overflow-hidden resize-none"
                style={{ whiteSpace: 'pre', overflowX: 'auto' }}
              />
              <p className="text-sm text-muted-foreground">
                Use "---" em uma nova linha para dividir a música em várias páginas/seções.
              </p>
              <div className="flex justify-end">
                <Button onClick={handleSave}>Salvar Música</Button>
              </div>
          </CardContent>
        </Card>
      ) : showChords ? (
        <Carousel className="w-full" opts={{ watchDrag: false }} setApi={setApi}>
            <CarouselContent>
              {songParts.map((part, index) => (
                <CarouselItem key={index}>
                  <Card>
                    <CardContent className="p-4 md:p-6 min-h-[60vh] flex flex-col">
                        <SongDisplay content={part} showChords={showChords} />
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
      ) : (
        <Card>
            <CardContent className="p-0">
                <ScrollArea className="h-[70vh] p-4 md:p-6">
                    <SongDisplay content={songParts[0]} showChords={false} />
                </ScrollArea>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
