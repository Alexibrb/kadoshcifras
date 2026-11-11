
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Check, AlignLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '../ui/skeleton';

export function MaxCharsSettingsForm() {
  const { appUser, loading: authLoading } = useAuth();
  const { updateDocument } = useFirestoreCollection('users');

  const [maxChars, setMaxChars] = useState(0); // 0 significa desativado
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (appUser?.maxCharsPerLine !== undefined) {
      setMaxChars(appUser.maxCharsPerLine);
    }
  }, [appUser]);

  const handleSave = async () => {
    if (!appUser) return;
    
    await updateDocument(appUser.id, { maxCharsPerLine: maxChars });
    
    // Sincroniza localmente
    localStorage.setItem('song-max-chars', JSON.stringify(maxChars));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = async () => {
    if (!appUser) return;
    const defaultValue = 0;
    setMaxChars(defaultValue);
    await updateDocument(appUser.id, { maxCharsPerLine: defaultValue });
    localStorage.setItem('song-max-chars', JSON.stringify(defaultValue));
  }

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlignLeft className="w-6 h-6 text-primary" />
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
          <AlignLeft className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">Largura da Linha (Caracteres)</CardTitle>
        </div>
        <CardDescription>
          Limite o número de letras por linha para evitar quebras desordenadas em telas pequenas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-4">
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Caracteres por Linha</Label>
                <span className="font-mono font-bold text-primary text-lg bg-primary/10 px-3 py-1 rounded-md">
                    {maxChars === 0 ? "Desativado" : maxChars}
                </span>
            </div>
            <Slider 
                value={[maxChars]} 
                onValueChange={(val) => setMaxChars(val[0])} 
                max={100} 
                min={0} 
                step={5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold px-1">
                <span>Livre</span>
                <span>100 Caracteres</span>
            </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-xs text-muted-foreground leading-relaxed">
            <strong>Dica:</strong> Para celulares, um valor entre 35 e 45 é ideal. Isso garante que a cifra e a letra quebrem juntas, mantendo o alinhamento perfeito. Use "0" para deixar o texto livre.
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
