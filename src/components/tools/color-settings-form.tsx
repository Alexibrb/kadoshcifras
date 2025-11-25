
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ColorSettings } from '@/types';
import { Check, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '../ui/skeleton';

export function ColorSettingsForm() {
  const { appUser, loading: authLoading } = useAuth();
  const { updateDocument } = useFirestoreCollection('users');

  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const defaultSettings: ColorSettings = useMemo(() => ({
    lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
    chordsColor: isDarkMode ? '#F59E0B' : '#000000',
  }), [isDarkMode]);

  const [lyricsColor, setLyricsColor] = useState(defaultSettings.lyricsColor);
  const [chordsColor, setChordsColor] = useState(defaultSettings.chordsColor);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isClient) return;

    if (appUser) {
      const currentSettings = appUser.colorSettings;
      setLyricsColor(currentSettings?.lyricsColor ?? defaultSettings.lyricsColor);
      setChordsColor(currentSettings?.chordsColor ?? defaultSettings.chordsColor);
    } else if (!authLoading) {
      setLyricsColor(defaultSettings.lyricsColor);
      setChordsColor(defaultSettings.chordsColor);
    }
  }, [appUser, authLoading, defaultSettings, isClient]);


  const handleSave = async () => {
    if (!appUser || !lyricsColor || !chordsColor) return;
    
    const newSettings: ColorSettings = {
      lyricsColor,
      chordsColor,
    };

    await updateDocument(appUser.id, { colorSettings: newSettings });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = async () => {
    if (!appUser) return;
    setLyricsColor(defaultSettings.lyricsColor);
    setChordsColor(defaultSettings.chordsColor);
    await updateDocument(appUser.id, { colorSettings: defaultSettings });
  }

  if (authLoading || !isClient) {
     return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Palette className="w-6 h-6 text-primary" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">Cores de Exibição</CardTitle>
        </div>
        <CardDescription>
          Personalize as cores da letra e das cifras.
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
        </div>
        <div className="space-y-2 rounded-md border p-4 bg-background">
            <Label className="text-sm text-muted-foreground">Pré-visualização</Label>
            <div className="p-2">
                <p className="font-bold text-lg" style={{ color: chordsColor }}>G#m7 C#7</p>
                <p className="text-lg" style={{ color: lyricsColor }}>Exemplo de letra da música</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave} disabled={!appUser}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvo!
            </>
          ) : (
            'Salvar Cores'
          )}
        </Button>
         <Button variant="ghost" onClick={handleReset} disabled={!appUser}>Restaurar Padrão</Button>
      </CardFooter>
    </Card>
  );
}
