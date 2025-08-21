'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { suggestChordProgressions, SuggestChordProgressionsOutput } from '@/ai/flows/suggest-progressions';
import { Music, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function ProgressionSuggesterForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestChordProgressionsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const initialChords = formData.get('initialChords') as string;
    const genre = formData.get('genre') as string;
    
    try {
      const res = await suggestChordProgressions({ initialChords, genre });
      setResult(res);
    } catch (e: any) {
        setError(e.message || "Ocorreu um erro inesperado.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline text-xl">Sugeridor de Progressão</CardTitle>
          </div>
          <CardDescription>
            Obtenha ideias de progressão de acordes com IA com base em um gênero e seus acordes iniciais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggester-initialChords">Acordes Iniciais</Label>
            <Input
              id="suggester-initialChords"
              name="initialChords"
              placeholder="ex: Am G C"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggester-genre">Gênero</Label>
            <Input id="suggester-genre" name="genre" placeholder="ex: Indie Folk" required />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Pensando...' : 'Sugerir Progressões'}
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>

          {result && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle className="font-bold">Sugestões da IA</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap mt-2">
                {result.suggestedProgressions}
              </AlertDescription>
            </Alert>
          )}

          {error && (
             <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
