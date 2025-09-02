
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
    prevPage: ',',
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });
  
  const [prevPageKey, setPrevPageKey] = useState(settings.prevPage);
  const [nextPageKey, setNextPageKey] = useState(settings.nextPage);
  const [prevSongKey, setPrevSongKey] = useState(settings.prevSong);
  const [nextSongKey, setNextSongKey] = useState(settings.nextSong);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrevPageKey(settings.prevPage);
    setNextPageKey(settings.nextPage);
    setPrevSongKey(settings.prevSong);
    setNextSongKey(settings.nextSong);
  }, [settings]);

  const handleSave = () => {
    setSettings({ 
      prevPage: prevPageKey, 
      nextPage: nextPageKey,
      prevSong: prevSongKey,
      nextSong: nextSongKey,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, field: 'prevPage' | 'nextPage' | 'prevSong' | 'nextSong') => {
    e.preventDefault();
    const key = e.key;
    switch(field) {
        case 'prevPage': setPrevPageKey(key); break;
        case 'nextPage': setNextPageKey(key); break;
        case 'prevSong': setPrevSongKey(key); break;
        case 'nextSong': setNextSongKey(key); break;
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
            Configure as teclas para avançar/retroceder páginas e músicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Alert>
             <Info className="h-4 w-4" />
             <AlertDescription>
                Clique no campo e pressione a tecla desejada no seu teclado ou pedal para configurar.
             </AlertDescription>
           </Alert>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="prevPageKey">Página Anterior</Label>
                <Input
                id="prevPageKey"
                value={prevPageKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'prevPage')}
                readOnly
                placeholder="Pressione uma tecla"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nextPageKey">Próxima Página</Label>
                <Input
                id="nextPageKey"
                value={nextPageKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'nextPage')}
                readOnly
                placeholder="Pressione uma tecla"
                />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="prevSongKey">Música Anterior</Label>
                <Input
                id="prevSongKey"
                value={prevSongKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'prevSong')}
                readOnly
                placeholder="Pressione uma tecla"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nextSongKey">Próxima Música</Label>
                <Input
                id="nextSongKey"
                value={nextSongKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'nextSong')}
                readOnly
                placeholder="Pressione uma tecla"
                />
            </div>
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
