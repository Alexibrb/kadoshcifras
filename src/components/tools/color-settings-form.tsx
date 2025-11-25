
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { ColorSettings } from '@/types';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ColorSettingsForm() {
  const isDarkMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, []);

  const [settings, setSettings] = useLocalStorage<ColorSettings>('color-settings', {
    lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
    chordsColor: isDarkMode ? '#F59E0B' : '#000000',
    backgroundColor: isDarkMode ? '#0a0a0a' : '#f7f2fa',
  });

  const [lyricsColor, setLyricsColor] = useState(settings.lyricsColor);
  const [chordsColor, setChordsColor] = useState(settings.chordsColor);
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor);
  const [saved, setSaved] = useState(false);

  // Sincroniza o estado local se as configurações do localStorage mudarem (ex: outra aba)
  useEffect(() => {
    setLyricsColor(settings.lyricsColor);
    setChordsColor(settings.chordsColor);
    setBackgroundColor(settings.backgroundColor);
  }, [settings]);

  const handleSave = () => {
    setSettings({
      lyricsColor,
      chordsColor,
      backgroundColor,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = () => {
    // Detecta o tema atual para definir os padrões corretos
    const isDarkMode = document.documentElement.classList.contains('dark');
    const defaultSettings = {
       lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
       chordsColor: isDarkMode ? '#F59E0B' : '#000000', // Âmbar para modo escuro, preto para claro
       backgroundColor: isDarkMode ? '#0a0a0a' : '#f7f2fa',
    }
    setLyricsColor(defaultSettings.lyricsColor);
    setChordsColor(defaultSettings.chordsColor);
    setBackgroundColor(defaultSettings.backgroundColor);
    setSettings(defaultSettings);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">Cores de Exibição</CardTitle>
        </div>
        <CardDescription>
          Personalize as cores da letra, cifras e fundo para melhor visualização.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lyricsColor">Cor da Letra</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lyricsColor"
                type="color"
                value={lyricsColor}
                onChange={(e) => setLyricsColor(e.target.value)}
                className="p-1 h-10 w-14"
              />
              <span className="font-mono text-sm">{lyricsColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chordsColor">Cor da Cifra</Label>
             <div className="flex items-center gap-2">
                <Input
                    id="chordsColor"
                    type="color"
                    value={chordsColor}
                    onChange={(e) => setChordsColor(e.target.value)}
                    className="p-1 h-10 w-14"
                />
                <span className="font-mono text-sm">{chordsColor}</span>
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="backgroundColor">Cor do Fundo</Label>
             <div className="flex items-center gap-2">
                <Input
                    id="backgroundColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="p-1 h-10 w-14"
                />
                <span className="font-mono text-sm">{backgroundColor}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-md border p-4" style={{ backgroundColor: backgroundColor }}>
            <Label className="text-sm text-muted-foreground">Pré-visualização</Label>
            <div className="p-2">
                <p className="font-bold text-lg" style={{ color: chordsColor }}>G#m7 C#7</p>
                <p className="text-lg" style={{ color: lyricsColor }}>Exemplo de letra da música</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvo!
            </>
          ) : (
            'Salvar Cores'
          )}
        </Button>
         <Button variant="ghost" onClick={handleReset}>Restaurar Padrão</Button>
      </CardFooter>
    </Card>
  );
}
