
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { Song } from '@/types';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const defaultCategories = ['Hinário', 'Adoração', 'Ceia', 'Alegre', 'Cantor Cristão', 'Harpa Cristã', 'Outros'];
const defaultGenres = ['Gospel', 'Worship', 'Pop', 'Rock', 'Reggae'];
const defaultArtists = ['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Anderson Freire', 'Bruna Karla', 'Isaias Saad', 'Midian Lima', 'Outros'];
const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function NewSongPage() {
  const router = useRouter();
  const { addDocument } = useFirestoreCollection<Song>('songs');
  const [categories, setCategories] = useLocalStorage<string[]>('song-categories', defaultCategories);
  const [genres, setGenres] = useLocalStorage<string[]>('song-genres', defaultGenres);
  const [artists, setArtists] = useLocalStorage<string[]>('song-artists', defaultArtists);

  const [title, setTitle] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [key, setKey] = useState('');
  const [content, setContent] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newArtist, setNewArtist] = useState('');

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isGenreDialogOpen, setIsGenreDialogOpen] = useState(false);
  const [isArtistDialogOpen, setIsArtistDialogOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      setSelectedCategory(newCategory);
    }
    setNewCategory('');
    setIsCategoryDialogOpen(false);
  };

  const handleAddGenre = () => {
    if (newGenre && !genres.includes(newGenre)) {
      const updatedGenres = [...genres, newGenre];
      setGenres(updatedGenres);
      setSelectedGenre(newGenre);
    }
    setNewGenre('');
    setIsGenreDialogOpen(false);
  };

  const handleAddArtist = () => {
    if (newArtist && !artists.includes(newArtist)) {
      const updatedArtists = [...artists, newArtist];
      setArtists(updatedArtists);
      setSelectedArtist(newArtist);
    }
    setNewArtist('');
    setIsArtistDialogOpen(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedArtist || !selectedCategory || !selectedGenre) {
        alert("Por favor, preencha todos os campos obrigatórios (Título, Artista, Categoria, Gênero).");
        return;
    }
    const newSong: Omit<Song, 'id'> = {
      title,
      artist: selectedArtist,
      genre: selectedGenre,
      category: selectedCategory,
      key,
      content,
    };
    const newSongId = await addDocument(newSong);
    if (newSongId) {
      router.push(`/songs/${newSongId}`);
    } else {
      // Opcional: mostrar um erro para o usuário.
      router.push('/songs');
    }
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Sonda-me, Usa-me" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist">Artista</Label>
                <div className="flex gap-2">
                  <Select value={selectedArtist} onValueChange={setSelectedArtist} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um artista" />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map(art => <SelectItem key={art} value={art}>{art}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Dialog open={isArtistDialogOpen} onOpenChange={setIsArtistDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Artista</DialogTitle>
                        <DialogDescription>
                          Digite o nome do novo artista que você deseja adicionar à lista.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-artist-name" className="text-right">
                            Nome
                          </Label>
                          <Input id="new-artist-name" value={newArtist} onChange={(e) => setNewArtist(e.target.value)} className="col-span-3" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={handleAddArtist}>Adicionar</Button>
                      </DialogFooter>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                            <DialogDescription>
                              Digite o nome da nova categoria que você deseja adicionar à lista.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="new-category-name" className="text-right">
                                Nome
                              </Label>
                              <Input id="new-category-name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="col-span-3" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" onClick={handleAddCategory}>Adicionar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="genre">Gênero</Label>
                    <div className="flex gap-2">
                      <Select value={selectedGenre} onValueChange={setSelectedGenre} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                       <Dialog open={isGenreDialogOpen} onOpenChange={setIsGenreDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Adicionar Novo Gênero</DialogTitle>
                            <DialogDescription>
                              Digite o nome do novo gênero que você deseja adicionar à lista.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="new-genre-name" className="text-right">
                                Nome
                              </Label>
                              <Input id="new-genre-name" value={newGenre} onChange={(e) => setNewGenre(e.target.value)} className="col-span-3" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" onClick={handleAddGenre}>Adicionar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="key">Tom Original</Label>
                <Select value={key} onValueChange={setKey}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um tom" />
                    </SelectTrigger>
                    <SelectContent>
                        {ALL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <Label htmlFor="content">Letra &amp; Cifras</Label>
                  <Button type="submit">Salvar Música</Button>
              </div>
              <Alert variant="destructive" className="p-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use duas linhas em branco para dividir a música em várias páginas/seções.
                </AlertDescription>
              </Alert>
              <Textarea
                id="content"
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite ou cole sua cifra aqui"
                className="font-code"
                required
                style={{ whiteSpace: 'pre', overflowX: 'auto', minHeight: '400px' }}
              />
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
