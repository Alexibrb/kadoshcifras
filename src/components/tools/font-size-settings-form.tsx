
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Type } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '../ui/skeleton';

const FONT_SIZES = [10, 12, 14];

export function FontSizeSettingsForm() {
  const { appUser, loading: authLoading } = useAuth();
  const { updateDocument } = useFirestoreCollection('users');

  const [selectedSize, setSelectedSize] = useState('14');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (appUser?.fontSize) {
      setSelectedSize(appUser.fontSize.toString());
    }
  }, [appUser]);

  const handleSave = () => {
    if (!appUser) return;
    const newSize = parseInt(selectedSize, 10);
    updateDocument(appUser.id, { fontSize: newSize });
    
    // Also update local storage for offline page
    localStorage.setItem('song-font-size', JSON.stringify(newSize));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = () => {
    if (!appUser) return;
    const defaultSize = 14;
    setSelectedSize(defaultSize.toString());
    updateDocument(appUser.id, { fontSize: defaultSize });
     localStorage.setItem('song-font-size', JSON.stringify(defaultSize));
  }

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="w-6 h-6 text-primary" />
            <Skeleton className="h-6 w-40" />
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
          <Type className="w-6 h-6 text-primary" />
          <CardTitle className="font-headline text-xl">Tamanho da Fonte</CardTitle>
        </div>
        <CardDescription>
          Escolha o tamanho da fonte para a exibição de músicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedSize}
          onValueChange={setSelectedSize}
          className="grid grid-cols-3 gap-4"
        >
          {FONT_SIZES.map(size => (
            <div key={size}>
              <RadioGroupItem value={size.toString()} id={`fs-${size}`} className="sr-only" />
              <Label
                htmlFor={`fs-${size}`}
                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedSize === size.toString() ? 'border-primary' : ''}`}
              >
                <span className="text-2xl font-bold">{size}px</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave} disabled={!appUser}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvo!
            </>
          ) : (
            'Salvar Tamanho'
          )}
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={!appUser}>Restaurar Padrão</Button>
      </CardFooter>
    </Card>
  );
}
