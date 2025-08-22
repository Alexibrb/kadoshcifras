import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Music, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Painel</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle className="font-headline">Bem-vindo ao CifraFácil!</CardTitle>
            <CardDescription>
              Este é o seu espaço para gerenciar seu mundo musical. Explore as seções para adicionar músicas, criar repertórios e usar nossas ferramentas de IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/songs/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Música
                </Link>
              </Button>
               <Button asChild variant="secondary">
                <Link href="/setlists/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Repertório
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
