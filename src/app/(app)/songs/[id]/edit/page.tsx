
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Song, MetadataItem } from '@/types';
import { ArrowLeft, AlertCircle, Save, Loader2 } from 'lucide-react';
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
  
  const { data: categories, addDocument: addCategory } = useFirestoreCollection<MetadataItem>('categories', 'name');
  const { data: genres, addDocument: addGenre } = useFirestoreCollection<MetadataItem>('genres', 'name');
  const { data: artists, addDocument: addArtist } = useFirestoreCollection<MetadataItem>('artists', 'name');

  const [title, setTitle] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [key, setKey] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newArtist, setNewArtist] = useState('');

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isGenreDialogOpen, setIsGenreDialogOpen] = useState(false);
  const [isArtistDialogOpen, setIsArtistDialogOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setSelectedArtist(song.artist);
      setSelectedGenre(song.genre || '');
      setSelectedCategory(song.category || '');
      setKey(song.key || '');
      setContent(song.content);
      setUrl(song.url || '');
    }
  }, [song]);

  const uniqueArtists = useMemo(() => {
    const seen = new Set();
    return artists.filter(item => {
      if (!item.name) return false;
      const duplicate = seen.has(item.name);
      seen.add(item.name);
      return !duplicate;
    });
  }, [artists]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set();
    return categories.filter(item => {
      if (!item.name) return false;
      const duplicate = seen.has(item.name);
      seen.add(item.name);
      return !duplicate;
    });
  }, [categories]);

  const uniqueGenres = useMemo(() => {
    const seen = new Set();
    return genres.filter(item => {
      if (!item.name) return false;
      const duplicate = seen.has(item.name);
      seen.add(item.name);
      return !duplicate;
    });
  }, [genres]);

  const handleAddArtist = async () => {
    if (newArtist) {
      await addArtist({ name: newArtist });
      setSelectedArtist(newArtist);
      setNewArtist('');
      setIsArtistDialogOpen(false);
    }
  };
  const handleAddCategory = async () => {
    if (newCategory) {
      await addCategory({ name: newCategory });
      setSelectedCategory(newCategory);
      setNewCategory('');
      setIsCategoryDialogOpen(false);
    }
  };
  const handleAddGenre = async () => {
    if (newGenre) {
      await addGenre({ name: newGenre });
      setSelectedGenre(newGenre);
      setNewGenre('');
      setIsGenreDialogOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedArtist || !selectedCategory || !selectedGenre) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    
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
      alert("Erro ao salvar música.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSong || !appUser) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href={`/songs/${songId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Editar Música</h2>
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">Artista</Label>
                <div className="flex gap-2">
                  <Select value={selectedArtist} onValueChange={setSelectedArtist} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um artista" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueArtists.map(art => <SelectItem key={art.id} value={art.name}>{art.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Dialog open={isArtistDialogOpen} onOpenChange={setIsArtistDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">+</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Novo Artista</DialogTitle></DialogHeader>
                      <Input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder="Nome do artista" />
                      <DialogFooter><Button type="button" onClick={handleAddArtist}>Adicionar</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <div className="flex gap-2">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {uniqueCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                        <DialogTrigger asChild><Button type="button" variant="outline" size="icon">+</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
                          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                          <DialogFooter><Button type="button" onClick={handleAddCategory}>Adicionar</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="genre">Gênero</Label>
                    <div className="flex gap-2">
                      <Select value={selectedGenre} onValueChange={setSelectedGenre} required>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {uniqueGenres.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog open={isGenreDialogOpen} onOpenChange={setIsGenreDialogOpen}>
                        <DialogTrigger asChild><Button type="button" variant="outline" size="icon">+</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Novo Gênero</DialogTitle></DialogHeader>
                          <Input value={newGenre} onChange={e => setNewGenre(e.target.value)} />
                          <DialogFooter><Button type="button" onClick={handleAddGenre}>Adicionar</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                </div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="key">Tom Original</Label>
                    <Select value={key} onValueChange={setKey}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ALL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="url">URL da Música (YouTube)</Label>
                    <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <Label htmlFor="content">Letra & Cifras</Label>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar Alterações
                  </Button>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use duas linhas em branco para dividir a música em seções/slides.
                </AlertDescription>
              </Alert>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-code h-[600px] whitespace-pre overflow-x-auto"
                required
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
