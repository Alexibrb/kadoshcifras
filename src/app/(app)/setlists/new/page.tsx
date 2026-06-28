
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuth } from '@/hooks/use-auth';
import type { Setlist } from '@/types';
import { ArrowLeft, Globe, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

export default function NewSetlistPage() {
  const router = useRouter();
  const { addDocument } = useFirestoreCollection<Setlist>('setlists');
  const { appUser } = useAuth();
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !appUser) {
        alert("Por favor, insira um nome para o repertório.");
        return;
    }
    setLoading(true);
    const newSetlist: Omit<Setlist, 'id'> = {
      name,
      songs: [],
      creatorId: appUser.id,
      creatorName: appUser.displayName,
      isPublic: isPublic,
      isVisible: isVisible,
      eventDate: eventDate ? new Date(eventDate + 'T23:59:59') : undefined,
    };
    const newSetlistId = await addDocument(newSetlist);
    if (newSetlistId) {
      router.push(`/setlists/${newSetlistId}`);
    } else {
      setLoading(false);
      alert("Ocorreu um erro ao criar o repertório.");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/setlists">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para os repertórios</span>
          </Link>
        </Button>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Criar Novo Repertório</h2>
      </div>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline">Detalhes do Repertório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Repertório</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Ensaio de Sábado, Show Acústico"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Data do Evento</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Após esta data, o repertório ficará oculto para outros usuários.</p>
              </div>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center space-x-4 rounded-md border p-4">
                   {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Repertório {isPublic ? 'Público (Editável por todos)' : 'Privado (Editável por você)'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isPublic ? 'Qualquer usuário poderá adicionar ou remover músicas.' : 'Apenas você e administradores poderão editar as músicas.'}
                      </p>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                </div>
                 <div className="flex items-center space-x-4 rounded-md border p-4">
                   {isVisible ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-primary" />}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Repertório {isVisible ? 'Visível' : 'Oculto'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isVisible ? 'Aparecerá na lista para outros usuários.' : 'Aparecerá na lista apenas para você.'}
                      </p>
                    </div>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={setIsVisible}
                    />
                </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar e Adicionar Músicas'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
