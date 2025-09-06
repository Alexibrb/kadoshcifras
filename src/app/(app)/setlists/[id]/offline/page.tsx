// src/app/(app)/setlists/[id]/offline/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [offlineData, setOfflineData] = useState<{name: string, content: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useLocalStorage('song-font-size', 16);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);

  useEffect(() => {
    setIsClient(true);
    try {
      const storageKey = `offline-setlist-${setlistId}`;
      const item = localStorage.getItem(storageKey);
      if (item) {
        setOfflineData(JSON.parse(item));
      } else {
        setError("Dados offline não encontrados. Por favor, gere novamente.");
      }
    } catch (e) {
      console.error("Erro ao ler do localStorage:", e);
      setError("Não foi possível carregar os dados offline.");
    }
  }, [setlistId]);

  if (!isClient) {
    return null; // Renderiza nada no servidor
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h2 className="text-2xl font-bold text-destructive mb-4">Erro ao Carregar</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href={`/setlists/${setlistId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Repertório
          </Link>
        </Button>
      </div>
    );
  }

  if (!offlineData) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Carregando Dados Offline...</h2>
        <p className="text-muted-foreground">Se esta mensagem persistir, tente voltar e gerar os dados novamente.</p>
         <Button asChild className="mt-6">
          <Link href={`/setlists/${setlistId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Repertório
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none">
       <Card className="mb-4 bg-accent/10 transition-all duration-300">
          <CardContent className="p-4 space-y-4">
            {isPanelVisible ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <Button asChild variant="outline" size="icon" className="shrink-0">
                    <Link href={`/setlists/${setlistId}`}>
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Voltar</span>
                    </Link>
                  </Button>

                  <div className="flex-1 space-y-1">
                    <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">{offlineData.name}</h1>
                    <p className="text-muted-foreground text-sm">Modo de Apresentação Offline</p>
                  </div>
                  
                  <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0">
                    <PanelTopClose className="h-5 w-5" />
                    <span className="sr-only">Ocultar Controles</span>
                  </Button>
                </div>
              
                <div className="flex justify-center items-center gap-4 pt-2 flex-wrap">
                  <div className="flex items-center gap-2 rounded-md border p-1 bg-background max-w-fit">
                    <Label className="text-sm pl-1 whitespace-nowrap sr-only">Tam. da Fonte</Label>
                    <Button variant="ghost" onClick={() => setFontSize(s => Math.max(8, s - 1))} className="h-7 w-7 px-1">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums">{fontSize}px</span>
                    <Button variant="ghost" onClick={() => setFontSize(s => Math.min(32, s + 1))} className="h-7 w-7 px-1">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-1 px-3 bg-background h-10">
                    <Label htmlFor="show-chords" className="text-sm whitespace-nowrap">Mostrar Cifras</Label>
                    <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} className="ml-auto" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <Button asChild variant="outline" size="icon" className="shrink-0">
                  <Link href={`/setlists/${setlistId}`}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Voltar</span>
                  </Link>
                </Button>
                <h1 className="text-lg font-bold font-headline tracking-tight truncate">{offlineData.name}</h1>
                <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0">
                  <PanelTopOpen className="h-5 w-5" />
                  <span className="sr-only">Mostrar Controles</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
      <Card className="flex-1 flex flex-col bg-background shadow-none border-none min-h-0">
        <CardContent className="h-full flex flex-col p-0">
          <ScrollArea className="h-full p-4 md:p-6 flex-1">
            <SongDisplay 
              style={{ fontSize: `${fontSize}px` }}
              content={offlineData.content}
              showChords={showChords} 
            />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}