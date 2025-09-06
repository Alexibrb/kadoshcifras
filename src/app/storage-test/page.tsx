
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Beaker, Trash2 } from 'lucide-react';

export default function StorageTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [songSizeKB, setSongSizeKB] = useState(3);

  const runTest = useCallback(() => {
    setIsRunning(true);
    setLogs([]);

    // We run the test in a timeout to allow the UI to update first
    setTimeout(() => {
        const localLogs: string[] = [];
        const addLog = (message: string) => {
            console.log(message);
            localLogs.push(message);
        };

        try {
            // Clear previous test items
            let i = 0;
            while(localStorage.getItem("song_" + i)) {
                localStorage.removeItem("song_" + i);
                i++;
            }
            addLog(`Limpou ${i} itens de testes anteriores.`);

            const songText = "A".repeat(songSizeKB * 1024); 
            let count = 0;
            
            addLog(`Iniciando teste com músicas de ${songSizeKB} KB...`);
            
            while (true) {
                localStorage.setItem("song_" + count, songText);
                count++;
                if (count % 100 === 0) {
                   addLog(`... salvou ${count} músicas ...`);
                }
            }
        } catch (e) {
            const finalCount = Object.keys(localStorage).filter(k => k.startsWith('song_')).length;
            addLog("🚨 Limite atingido!");
            addLog(`Foram salvas aproximadamente: ${finalCount} músicas de ~${songSizeKB} KB cada.`);
            addLog(`Total aproximado no localStorage: ${(finalCount * songSizeKB / 1024).toFixed(2)} MB`);
            if (e instanceof Error) {
                 addLog(`Erro: ${e.message}`);
            }
        } finally {
            setLogs(localLogs);
            setIsRunning(false);
        }
    }, 100);
  }, [songSizeKB]);
  
  const clearStorage = () => {
    let i = 0;
    while(localStorage.getItem("song_" + i)) {
        localStorage.removeItem("song_" + i);
        i++;
    }
    setLogs([`Limpou ${i} itens de teste do localStorage.`]);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Beaker className="w-6 h-6 text-primary" />
            <CardTitle>Teste de Estresse do LocalStorage</CardTitle>
          </div>
          <CardDescription>
            Este teste preenche o `localStorage` do seu navegador com dados para descobrir qual é o seu limite de armazenamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="songSize">Tamanho de cada "música" (em KB)</Label>
            <Input 
                id="songSize" 
                type="number" 
                value={songSizeKB} 
                onChange={(e) => setSongSizeKB(parseInt(e.target.value, 10) || 1)}
                className="w-32"
            />
          </div>
          <Alert>
            <AlertTitle>Como funciona?</AlertTitle>
            <AlertDescription>
              Clique em "Iniciar Teste" para começar a salvar dados no `localStorage`. O teste para quando o navegador retorna um erro, indicando que o limite foi atingido. Os navegadores geralmente têm um limite entre 5 e 10 MB.
            </AlertDescription>
          </Alert>
          {logs.length > 0 && (
            <div className="mt-4 w-full h-64 rounded-md bg-muted p-4 overflow-y-auto font-mono text-sm">
              <pre>{logs.join('\n')}</pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button onClick={runTest} disabled={isRunning}>
            {isRunning ? 'Executando...' : 'Iniciar Teste'}
          </Button>
           <Button onClick={clearStorage} variant="destructive" disabled={isRunning}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar Dados do Teste
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
