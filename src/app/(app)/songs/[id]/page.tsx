
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, use } from 'react';
import { transposeContent } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SongPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [api, setApi] = useState<CarouselApi>()
  
  const songId = use(params).id;
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    setIsClient(true);
    const currentSong = songs.find((s) => s.id === songId);
    if (currentSong) {
        setSong(currentSong);
        setEditedContent(currentSong.content);
    }
  }, [songs, songId]);

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
    // Usa o conteúdo editado se estiver editando, senão o conteúdo original
    const contentToTranspose = isEditing ? editedContent : song.content;
    return transposeContent(contentToTranspose, transpose);
  }, [song, editedContent, transpose, isEditing]);

  const songParts = useMemo(() => {
    if (showChords) {
      return transposedContent.split(/\n---\n/);
    }
    // Quando as cifras estão ocultas, tratamos a música como uma parte única.
    return [transposedContent.replace(/\n---\n/g, '\n\n')];
  }, [transposedContent, showChords]);


  if (isClient && !song) {
    notFound();
  }
  
  if (!isClient || !song) {
    return null; // ou um esqueleto de carregamento
  }

  const handleSave = () => {
    if (!song) return;

    // Aplica a transposição ao conteúdo antes de salvar
    const newContent = transposeContent(editedContent, transpose);

    const newKey = song.key ? transposeContent(song.key, transpose) : undefined;

    setSongs(
      songs.map((s) => (s.id === song.id ? { ...s, content: newContent, key: newKey } : s))
    );
    
    // Reseta o estado local
    setSong(s => s ? { ...s, content: newContent, key: newKey } : undefined);
    setEditedContent(newContent);
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-headline tracking-tight">{song.title}</h1>
            <p className="text-muted-foreground text-sm">{song.artist}</p>
            {song.key && <Badge variant="outline">Tom: {transposeContent(song.key, transpose)}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isEditing ? (
            <Button onClick={handleSave} size="sm">
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

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
                  // Como a transposição é aplicada visualmente, precisamos "destranspor"
                  // para salvar a alteração de texto corretamente.
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
        // Visualização contínua para cantores (sem cifras)
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
