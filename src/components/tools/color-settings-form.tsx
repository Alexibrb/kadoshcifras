
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ColorSettings } from '@/types';
import { Check, Settings, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { User } from '@/types';

const DEFAULT_COLORS: ColorSettings = {
  textColor: '#000000',
  chordColor: '#1e40af', // Cor padrão (azul escuro)
  backgroundColor: '#ffffff',
};

export function ColorSettingsForm() {
  const { appUser, loading: authLoading } = useAuth();
  const { updateDocument } = useFirestoreCollection<User>('users');
  
  const [colors, setColors] = useState<ColorSettings>(DEFAULT_COLORS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (appUser?.colorSettings) {
      setColors(appUser.colorSettings);
    } else {
      setColors(DEFAULT_COLORS);
    }
    setLoading(false);
  }, [appUser, authLoading]);

  const handleColorChange = (field: keyof ColorSettings, value: string) => {
    setColors(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!appUser) return;
    setLoading(true);
    await updateDocument(appUser.id, { colorSettings: colors });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = async () => {
    if (!appUser) return;
    setLoading(true);
    setColors(DEFAULT_COLORS);
    await updateDocument(appUser.id, { colorSettings: DEFAULT_COLORS });
    setLoading(false);
  }

  const isLoading = loading || authLoading;

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline text-xl">Configurações de Cores</CardTitle>
          </div>
          <CardDescription>
            Personalize as cores do aplicativo. As configurações são salvas em sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="backgroundColor">Fundo</Label>
                <div className="relative">
                   <Input
                     id="backgroundColor"
                     type="color"
                     value={colors.backgroundColor || ''}
                     onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                     className="p-1 h-10 w-full"
                     disabled={isLoading}
                   />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="textColor">Letra</Label>
                <div className="relative">
                   <Input
                     id="textColor"
                     type="color"
                     value={colors.textColor || ''}
                     onChange={(e) => handleColorChange('textColor', e.target.value)}
                     className="p-1 h-10 w-full"
                     disabled={isLoading}
                   />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="chordColor">Cifra</Label>
                 <div className="relative">
                   <Input
                     id="chordColor"
                     type="color"
                     value={colors.chordColor || ''}
                     onChange={(e) => handleColorChange('chordColor', e.target.value)}
                     className="p-1 h-10 w-full"
                     disabled={isLoading}
                   />
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleSave} disabled={isLoading}>
            {saved ? (
                <>
                 <Check className="mr-2 h-4 w-4" /> Salvo!
                </>
            ) : (
                'Salvar Cores'
            )}
          </Button>
          <Button onClick={handleReset} variant="ghost" disabled={isLoading}>
            Restaurar Padrão
          </Button>
        </CardFooter>
    </Card>
  );
}
