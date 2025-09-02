
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { suggestChordProgressions, SuggestChordProgressionsOutput } from '@/ai/flows/suggest-progressions';
import { Sparkles, Wand2 } from 'lucide-react';
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
    const genre = formData.get('genre') as string;
    const initialChords = formData.get('initialChords') as string;
    
    try {
      const res = await suggestChordProgressions({ genre, initialChords });
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
            <Wand2 className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline text-xl">Sugeridor de Progressão</CardTitle>
          </div>
          <CardDescription>
            Receba sugestões de progressões de acordes com base em um gênero e acordes iniciais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="suggester-genre">Gênero</Label>
            <Input id="suggester-genre" name="genre" placeholder="ex: Sertanejo, Gospel" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialChords">Acordes Iniciais</Label>
            <Input
              id="initialChords"
              name="initialChords"
              placeholder="ex: G D Em"
              required
            />
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
              <AlertTitle className="font-bold">Sugestão da IA</AlertTitle>
              <AlertDescription className="space-y-2 mt-2 whitespace-pre-wrap">
                <p>{result.suggestedProgressions}</p>
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
