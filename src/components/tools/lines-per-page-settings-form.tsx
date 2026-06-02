
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Check, Columns } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '../ui/skeleton';

export function LinesPerPageSettingsForm() {
  const { appUser, loading: authLoading } = useAuth();
  const { updateDocument } = useFirestoreCollection('users');

  const [linesPerPage, setLinesPerPage] = useState(14);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (appUser?.linesPerPage) {
      setLinesPerPage(appUser.linesPerPage);
    }
  }, [appUser]);

  const handleSave = async () => {
    if (!appUser) return;
    
    await updateDocument(appUser.id, { linesPerPage });
    
    // Sincroniza localmente para uso imediato e offline
    localStorage.setItem('song-lines-per-page', JSON.stringify(linesPerPage));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = async () => {
    if (!appUser) return;
    const defaultLines = 14;
    setLinesPerPage(defaultLines);
    await updateDocument(appUser.id, { linesPerPage: defaultLines });
    localStorage.setItem('song-lines-per-page', JSON.stringify(defaultLines));
  }

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Columns className="w-6 h-6 text-primary" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Columns className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">Linhas por Página</CardTitle>
        </div>
        <CardDescription>
          Ajuste o limite de linhas automáticas por página conforme o tamanho da sua tela.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-4">
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Quantidade de Linhas</Label>
                <span className="font-mono font-bold text-primary text-lg bg-primary/10 px-3 py-1 rounded-md">
                    {linesPerPage}
                </span>
            </div>
            <Slider 
                value={[linesPerPage]} 
                onValueChange={(val) => setLinesPerPage(val[0])} 
                max={40} 
                min={6} 
                step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold px-1">
                <span>Páginas Curtas (6)</span>
                <span>Páginas Longas (40)</span>
            </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-xs text-muted-foreground leading-relaxed">
            <strong>Dica:</strong> Se você usa um tablet ou monitor grande, aumente o valor. Em celulares menores, valores entre 10 e 14 costumam funcionar melhor. O sistema nunca separará uma cifra da sua letra, mesmo que ultrapasse este limite.
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave} disabled={!appUser}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvo!
            </>
          ) : (
            'Salvar Configuração'
          )}
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={!appUser}>Restaurar Padrão</Button>
      </CardFooter>
    </Card>
  );
}
