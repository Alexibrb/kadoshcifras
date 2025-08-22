
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, use } from 'react';
import { transposeContent } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function SongPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  
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
  
  const transposedContent = useMemo(() => {
    if (!song) return '';
    const contentToTranspose = isEditing ? editedContent : song.content;
    return transposeContent(contentToTranspose, transpose);
  }, [song, editedContent, transpose, isEditing]);

  const songParts = useMemo(() => {
    return transposedContent.split(/\n---\n/);
  }, [transposedContent]);


  if (isClient && !song) {
    notFound();
  }
  
  if (!isClient || !song) {
    return null; // ou um esqueleto de carregamento
  }

  const handleSave = () => {
    setSongs(
      songs.map((s) => (s.id === song.id ? { ...s, content: editedContent } : s))
    );
    setIsEditing(false);
  };

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
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isEditing ? (
            <Button onClick={handleSave} size="sm">
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} size="sm">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <Card>
          <CardContent className="p-4 md:p-6">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60vh] font-code text-base"
                style={{ whiteSpace: 'nowrap', overflowX: 'auto' }}
              />
          </CardContent>
        </Card>
      ) : (
        <Carousel className="w-full">
            <div className="flex justify-center items-center gap-4 mb-4">
                <CarouselPrevious className="relative top-auto left-auto -translate-y-0" />
                <div className="flex items-center gap-1 rounded-md border p-1 mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => setTranspose(transpose - 1)}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                        Tom: {transpose >= 0 ? '+' : ''}{transpose}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setTranspose(transpose + 1)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <CarouselNext className="relative top-auto right-auto -translate-y-0" />
            </div>
            <CarouselContent>
              {songParts.map((part, index) => (
                <CarouselItem key={index}>
                  <Card>
                    <CardContent className="p-4 md:p-6 min-h-[60vh] flex flex-col">
                       <SongDisplay content={part} />
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
      )}
    </div>
  );
}
