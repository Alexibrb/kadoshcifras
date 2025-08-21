'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Song } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewSongPage() {
  const router = useRouter();
  const [songs, setSongs] = useLocalStorage<Song[]>('songs', []);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSong: Song = {
      id: crypto.randomUUID(),
      title,
      artist,
      genre,
      content,
    };
    setSongs([...songs, newSong]);
    router.push(`/songs/${newSong.id}`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/songs">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para as músicas</span>
          </Link>
        </Button>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Adicionar uma Nova Música</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Detalhes da Música</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Garota de Ipanema" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">Artista</Label>
                <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="ex: Tom Jobim" required />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="genre">Gênero</Label>
                <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="ex: Bossa Nova" />
              </div>
            <div className="space-y-2">
              <Label htmlFor="content">Letra & Cifras</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Verso 1:&#10;[C]Olha que coisa mais [G]linda, mais cheia de graça"
                className="h-64 font-code"
                required
              />
               <p className="text-sm text-muted-foreground">
                Envolva as cifras em colchetes, como [C] ou [Gmaj7].
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar Música</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
