'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { identifySongKey, IdentifySongKeyOutput } from '@/ai/flows/identify-key';
import { Sparkles, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function KeyIdentifierForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentifySongKeyOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const chordProgression = formData.get('chordProgression') as string;
    const genre = formData.get('genre') as string;
    
    try {
      const res = await identifySongKey({ chordProgression, genre });
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
            <CardTitle className="font-headline text-xl">Identificador de Tom</CardTitle>
          </div>
          <CardDescription>
            Insira uma progressão de acordes e gênero para identificar o tom da música usando IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chordProgression">Progressão de Acordes</Label>
            <Textarea
              id="chordProgression"
              name="chordProgression"
              placeholder="ex: C G Am F"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Gênero (Opcional)</Label>
            <Input id="genre" name="genre" placeholder="ex: Pop, Rock" />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Analisando...' : 'Identificar Tom'}
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>

          {result && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle className="font-bold">Análise de IA Concluída</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p><strong>Tom Identificado:</strong> {result.key}</p>
                <p><strong>Confiança:</strong> {Math.round(result.confidence * 100)}%</p>
                <p><strong>Explicação:</strong> {result.explanation}</p>
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
