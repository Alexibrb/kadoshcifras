
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Check, Type } from 'lucide-react';

const FONT_SIZES = [10, 12, 14];

export function FontSizeSettingsForm() {
  const [fontSize, setFontSize] = useLocalStorage<number>('song-font-size', 14);
  const [selectedSize, setSelectedSize] = useState(fontSize.toString());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedSize(fontSize.toString());
  }, [fontSize]);

  const handleSave = () => {
    setFontSize(parseInt(selectedSize, 10));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleReset = () => {
    const defaultSize = 14;
    setFontSize(defaultSize);
    setSelectedSize(defaultSize.toString());
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
                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${selectedSize === size.toString() ? 'border-primary' : ''}`}
              >
                <span className="text-2xl font-bold">{size}px</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvo!
            </>
          ) : (
            'Salvar Tamanho'
          )}
        </Button>
        <Button variant="ghost" onClick={handleReset}>Restaurar Padrão</Button>
      </CardFooter>
    </Card>
  );
}
