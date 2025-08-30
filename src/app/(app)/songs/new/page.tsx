
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Song, MetadataItem } from '@/types';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { useAuthenticatedFirestoreCollection } from '@/hooks/use-authenticated-firestore-collection';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';


const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

export default function NewSongPage() {
  const router = useRouter();
  const { addDocument: addSong } = useFirestoreCollection<Song>('songs');
  const { data: categories, addDocument: addCategory } = useAuthenticatedFirestoreCollection<MetadataItem>('categories', 'name');
  const { data: genres, addDocument: addGenre } = useAuthenticatedFirestoreCollection<MetadataItem>('genres', 'name');
  const { data: artists, addDocument: addArtist } = useAuthenticatedFirestoreCollection<MetadataItem>('artists', 'name');

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
      url,
    };
    const newSongId = await addSong(newSong);
    if (newSongId) {
      router.push(`/songs/${newSongId}`);
    } else {
      router.push('/songs');
    }
  };
  
  const renderMetadataDialog = (
      type: 'artist' | 'category' | 'genre',
      isOpen: boolean,
      setIsOpen: (open: boolean) => void,
      value: string,
      setValue: (val: string) => void,
      handler: () => void
    ) => {
        const typeLabels = {
            artist: { title: 'Artista', desc: 'adicionar à lista' },
            category: { title: 'Categoria', desc: 'adicionar à lista' },
            genre: { title: 'Gênero', desc: 'adicionar à lista' }
        };
        const currentLabels = typeLabels[type];
        return (
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon"><PlusCircle className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Adicionar Novo {currentLabels.title}</DialogTitle>
                    <DialogDescription>
                        Digite o nome do novo {currentLabels.title.toLowerCase()} que você deseja {currentLabels.desc}.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={`new-${type}-name`} className="text-right">
                        Nome
                        </Label>
                        <Input id={`new-${type}-name`} value={value} onChange={(e) => setValue(e.target.value)} className="col-span-3" />
                    </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={handler}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
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
                      {artists.map(art => <SelectItem key={art.id} value={art.name}>{art.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {renderMetadataDialog('artist', isArtistDialogOpen, setIsArtistDialogOpen, newArtist, setNewArtist, handleAddArtist)}
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
                          {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderMetadataDialog('category', isCategoryDialogOpen, setIsCategoryDialogOpen, newCategory, setNewCategory, handleAddCategory)}
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
                          {genres.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderMetadataDialog('genre', isGenreDialogOpen, setIsGenreDialogOpen, newGenre, setNewGenre, handleAddGenre)}
                    </div>
                </div>
            </div>
             <div className="grid md:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                    <Label htmlFor="url">URL da Música (YouTube, Spotify, etc.)</Label>
                    <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                </div>
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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite ou cole sua cifra aqui"
                className="font-code"
                required
                style={{ whiteSpace: 'pre', overflowX: 'auto', minHeight: '1000px' }}
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
