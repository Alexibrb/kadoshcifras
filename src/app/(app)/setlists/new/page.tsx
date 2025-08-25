
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFirestoreCollection } from '@/hooks/use-authenticated-firestore-collection';
import { useAuth } from '@/hooks/use-auth';
import type { Setlist } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewSetlistPage() {
  const router = useRouter();
  const { addDocument } = useAuthenticatedFirestoreCollection<Setlist>('setlists');
  const { appUser } = useAuth();
  const [name, setName] = useState('');
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
      songIds: [],
      creatorId: appUser.id,
      creatorName: appUser.displayName,
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
        <CardHeader>
          <CardTitle className="font-headline">Nome do Repertório</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Ensaio de Sábado, Show Acústico"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar e Adicionar Músicas'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
