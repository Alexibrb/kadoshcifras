
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { PedalSettings } from '@/types';
import { Check, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function PedalSettingsForm() {
  const [settings, setSettings] = useLocalStorage<PedalSettings>('pedal-settings', {
    prev: ',',
    next: '.',
  });
  const [prevKey, setPrevKey] = useState(settings.prev);
  const [nextKey, setNextKey] = useState(settings.next);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrevKey(settings.prev);
    setNextKey(settings.next);
  }, [settings]);

  const handleSave = () => {
    setSettings({ prev: prevKey, next: nextKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, field: 'prev' | 'next') => {
    e.preventDefault();
    if (field === 'prev') {
        setPrevKey(e.key);
    } else {
        setNextKey(e.key);
    }
  }

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline text-xl">Controles do Pedal</CardTitle>
          </div>
          <CardDescription>
            Configure as teclas para avançar e retroceder nas músicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Alert>
             <Info className="h-4 w-4" />
             <AlertDescription>
                Clique no campo e pressione a tecla desejada no seu teclado ou pedal para configurar.
             </AlertDescription>
           </Alert>
          <div className="space-y-2">
            <Label htmlFor="prevKey">Tecla para Voltar</Label>
            <Input
              id="prevKey"
              value={prevKey}
              onKeyDown={(e) => handleKeyPress(e, 'prev')}
              readOnly
              placeholder="Pressione uma tecla"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextKey">Tecla para Avançar</Label>
            <Input
              id="nextKey"
              value={nextKey}
              onKeyDown={(e) => handleKeyPress(e, 'next')}
              readOnly
              placeholder="Pressione uma tecla"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>
            {saved ? (
                <>
                 <Check className="mr-2 h-4 w-4" /> Salvo!
                </>
            ) : (
                'Salvar Configurações'
            )}
          </Button>
        </CardFooter>
    </Card>
  );
}
