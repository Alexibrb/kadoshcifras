
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { transposeContent } from '@/lib/music';
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


export default function SongPage() {
  const router = useRouter();
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
  
  // States for editing
  const [editedTitle, setEditedTitle] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedGenre, setEditedGenre] = useState('');
  const [editedKey, setEditedKey] = useState('');
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    setIsClient(true);
    const currentSong = songs.find((s) => s.id === songId);
    if (currentSong) {
        setSong(currentSong);
        setEditedTitle(currentSong.title);
        setEditedArtist(currentSong.artist);
        setEditedCategory(currentSong.category || '');
        setEditedGenre(currentSong.genre || '');
        setEditedKey(currentSong.key || '');
        setEditedContent(currentSong.content);
    }
  }, [songs, songId]);

  const handleStartEditing = () => {
    if (!song) return;
    setEditedTitle(song.title);
    setEditedArtist(song.artist);
    setEditedCategory(song.category || '');
    setEditedGenre(song.genre || '');
    setEditedKey(song.key || '');
    setEditedContent(song.content);
    setIsEditing(true);
  }

  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft" || event.key === 'PageUp') {
          event.preventDefault()
          api?.scrollPrev()
        } else if (event.key === "ArrowRight" || event.key === 'PageDown') {
          event.preventDefault()
          api?.scrollNext()
        }
      },
      [api]
    )
  
  const transposedContent = useMemo(() => {
    if (!song) return '';
    const contentToTranspose = isEditing ? editedContent : song.content;
    return transposeContent(contentToTranspose, transpose);
  }, [song, editedContent, transpose, isEditing]);

  const songParts = useMemo(() => {
    if (showChords) {
      return transposedContent.split(/\n---\n/);
    }
    return [transposedContent.replace(/\n---\n/g, '\n\n')];
  }, [transposedContent, showChords]);


  if (isClient && !song) {
    notFound();
  }
  
  if (!isClient || !song) {
    return null; 
  }

  const handleSave = () => {
    if (!song) return;

    const newContent = transposeContent(editedContent, transpose);
    const newKey = transposeContent(editedKey, transpose);

    const updatedSong: Song = {
      ...song,
      title: editedTitle,
      artist: editedArtist,
      category: editedCategory,
      genre: editedGenre,
      key: newKey,
      content: newContent,
    };

    setSongs(
      songs.map((s) => (s.id === song.id ? updatedSong : s))
    );
    
    setSong(updatedSong);
    setEditedContent(newContent);
    setEditedKey(newKey);
    setTranspose(0);
    setIsEditing(false);
  };

  const increaseTranspose = () => setTranspose(t => Math.min(12, t + 1));
  const decreaseTranspose = () => setTranspose(t => Math.max(-12, t - 1));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/songs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar para as músicas</span>
            </Link>
          </Button>
          {!isEditing ? (
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-headline tracking-tight">{song.title}</h1>
                <p className="text-muted-foreground text-sm">{song.artist}</p>
                {song.key && <Badge variant="outline">Tom: {transposeContent(song.key, transpose)}</Badge>}
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
      
      {isEditing && (
        <Card className="mb-4">
            <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="artist">Artista</Label>
                    <Select value={editedArtist} onValueChange={setEditedArtist}>
                        <SelectTrigger><SelectValue placeholder="Selecione um artista" /></SelectTrigger>
                        <SelectContent>
                            {artists.map(art => <SelectItem key={art} value={art}>{art}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={editedCategory} onValueChange={setEditedCategory}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="genre">Gênero</Label>
                    <Select value={editedGenre} onValueChange={setEditedGenre}>
                        <SelectTrigger><SelectValue placeholder="Selecione um gênero" /></SelectTrigger>
                        <SelectContent>
                           {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="key">Tom</Label>
                    <Input id="key" value={transposeContent(editedKey, transpose)} onChange={(e) => setEditedKey(transposeContent(e.target.value, -transpose))} />
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
          </div>
          <div className="flex items-center space-x-2 rounded-md border p-2 py-1">
            <Label htmlFor="show-chords" className="text-sm">Mostrar Cifras</Label>
            <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
          </div>
      </div>

      {isEditing ? (
        <Card>
          <CardContent className="p-4 md:p-6">
              <Textarea
                value={transposedContent}
                onChange={(e) => {
                  setEditedContent(transposeContent(e.target.value, -transpose));
                }}
                className="min-h-[60vh] font-code text-base"
                style={{ whiteSpace: 'pre', overflowX: 'auto' }}
              />
          </CardContent>
        </Card>
      ) : showChords ? (
        <Carousel className="w-full" onKeyDownCapture={handleKeyDown} tabIndex={0} setApi={setApi}>
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
