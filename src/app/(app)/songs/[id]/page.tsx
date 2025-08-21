'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Song } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { transposeContent } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';

export default function SongPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(0);
  
  const songId = params.id;
  
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/songs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar para as músicas</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{song.title}</h1>
            <p className="text-muted-foreground">{song.artist}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border p-1">
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
          {isEditing ? (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[60vh] font-code text-base"
            />
          ) : (
            <SongDisplay content={transposedContent} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
