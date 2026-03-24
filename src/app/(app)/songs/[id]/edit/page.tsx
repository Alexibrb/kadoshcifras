'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Song, MetadataItem } from '@/types';
import { ArrowLeft, AlertCircle, Save, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { useAuth } from '@/hooks/use-auth';

const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function EditSongPage() {
  const params = useParams();
  const songId = params.id as string;
  const router = useRouter();
  const { appUser } = useAuth();
  
  const { data: song, loading: loadingSong, updateDocument: updateSong } = useFirestoreDocument<Song>('songs', songId);
  
  const { data: categories } = useFirestoreCollection<MetadataItem>('categories', 'name');
  const { data: genres } = useFirestoreCollection<MetadataItem>('genres', 'name');
  const { data: artists } = useFirestoreCollection<MetadataItem>('artists', 'name');

  const [title, setTitle] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [key, setKey] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Carrega os dados existentes de forma robusta
  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setSelectedArtist(song.artist || '');
      setSelectedGenre(song.genre || '');
      setSelectedCategory(song.category || '');
      setKey(song.key || '');
      setContent(song.content || '');
      setUrl(song.url || '');
    }
  }, [song]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedArtist) return;
    
    setIsSaving(true);
    try {
      await updateSong({
        title,
        artist: selectedArtist,
        genre: selectedGenre,
        category: selectedCategory,
        key,
        content,
        url,
      });
      router.push(`/songs/${songId}`);
    } catch (error) {
      console.error("Erro ao salvar música:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSong || !appUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href={`/songs/${songId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold font-headline tracking-tight truncate max-w-[200px] md:max-w-none">
            Editar: {song?.title}
          </h2>
        </div>
        <Button onClick={handleSubmit} disabled={isSaving} size="sm">
          {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <Card className="border-none shadow-none bg-accent/5">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grid Compacta de Metadados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs uppercase text-muted-foreground font-bold">Título</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9 bg-background" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="artist" className="text-xs uppercase text-muted-foreground font-bold">Artista</Label>
                <Select value={selectedArtist} onValueChange={setSelectedArtist} required>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map(art => <SelectItem key={art.id} value={art.name}>{art.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="key" className="text-xs uppercase text-muted-foreground font-bold">Tom Original</Label>
                <Select value={key} onValueChange={setKey}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs uppercase text-muted-foreground font-bold">Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="genre" className="text-xs uppercase text-muted-foreground font-bold">Gênero</Label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="url" className="text-xs uppercase text-muted-foreground font-bold">URL YouTube</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 bg-background" placeholder="https://..." />
              </div>
            </div>

            {/* Área de Conteúdo - Expandida */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content" className="text-xs uppercase text-muted-foreground font-bold">Letra & Cifras</Label>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-dashed">
                  <AlertCircle className="h-3 w-3" />
                  Duas linhas em branco = Nova Página no PDF
                </div>
              </div>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-code min-h-[500px] whitespace-pre bg-background leading-relaxed shadow-inner"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
               <Button type="submit" disabled={isSaving} className="w-full md:w-auto font-bold uppercase tracking-wider">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
