
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { PedalSettings } from '@/types';
import { Check, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export function PedalSettingsForm() {
  const [settings, setSettings] = useLocalStorage<PedalSettings>('pedal-settings', {
    pedalType: '4-buttons',
    prevPage: ',',
    nextPage: '.',
    prevSong: '[',
    nextSong: ']' 
  });
  
  const [pedalType, setPedalType] = useState<'2-buttons' | '4-buttons'>(settings.pedalType);
  const [prevPageKey, setPrevPageKey] = useState(settings.prevPage);
  const [nextPageKey, setNextPageKey] = useState(settings.nextPage);
  const [prevSongKey, setPrevSongKey] = useState(settings.prevSong);
  const [nextSongKey, setNextSongKey] = useState(settings.nextSong);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPedalType(settings.pedalType);
    setPrevPageKey(settings.prevPage);
    setNextPageKey(settings.nextPage);
    setPrevSongKey(settings.prevSong);
    setNextSongKey(settings.nextSong);
  }, [settings]);

  const handleSave = () => {
    setSettings({ 
      pedalType,
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
            Configure as teclas para navegar e controlar a rolagem automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-3">
             <Label>Tipo de Pedal</Label>
             <RadioGroup 
                value={pedalType} 
                onValueChange={(val) => setPedalType(val as '2-buttons' | '4-buttons')}
                className="flex gap-4"
             >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2-buttons" id="type-2" />
                    <Label htmlFor="type-2">2 Botões</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4-buttons" id="type-4" />
                    <Label htmlFor="type-4">4 Botões</Label>
                </div>
             </RadioGroup>
             {pedalType === '2-buttons' && (
                <p className="text-xs text-muted-foreground bg-accent/5 p-2 rounded border border-dashed">
                  No modo 2 botões, a rolagem automática deve ser iniciada pelo toque na tela. As teclas do pedal serão usadas para pausar/retomar a rolagem ou navegar nos slides.
                </p>
             )}
           </div>

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
                placeholder="Pressione"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nextPageKey">Próxima Página</Label>
                <Input
                id="nextPageKey"
                value={nextPageKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'nextPage')}
                readOnly
                placeholder="Pressione"
                />
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
            <div className={cn("space-y-2", pedalType === '2-buttons' && "opacity-40 grayscale")}>
                <Label htmlFor="nextSongKey">Ligar/Desligar Rolagem</Label>
                <Input
                id="nextSongKey"
                value={nextSongKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'nextSong')}
                readOnly={pedalType === '4-buttons'}
                disabled={pedalType === '2-buttons'}
                placeholder={pedalType === '2-buttons' ? "Desativado" : "Pressione"}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="prevSongKey">Pausar/Retomar</Label>
                <Input
                id="prevSongKey"
                value={prevSongKey || ''}
                onKeyDown={(e) => handleKeyPress(e, 'prevSong')}
                readOnly
                placeholder="Pressione"
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
