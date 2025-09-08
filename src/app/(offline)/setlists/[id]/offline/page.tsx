
// src/app/(offline)/setlists/[id]/offline/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { PedalSettings } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;

  const [isClient, setIsClient] = useState(false);
  const [offlineData, setOfflineData] = useState<{name: string, content: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useLocalStorage('song-font-size', 16);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', { 
    prevPage: ',', 
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });

  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)


  useEffect(() => {
    setIsClient(true);
    try {
      const storageKey = `offline-setlist-${setlistId}`;
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsedData = JSON.parse(item);
        if (parsedData && parsedData.name && parsedData.content) {
            setOfflineData(parsedData);
        } else {
            setError("Dados offline corrompidos ou vazios. Por favor, gere novamente.");
        }
      } else {
        setError("Dados offline não encontrados. Por favor, gere novamente.");
      }
    } catch (e) {
      console.error("Erro ao ler do localStorage:", e);
      setError("Não foi possível carregar os dados offline.");
    }
  }, [setlistId]);
  
   useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const songParts = useMemo(() => {
    if (!offlineData?.content) return [];
    return offlineData.content.split(/\n\s*\n\s*\n/);
  }, [offlineData?.content]);
  
  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        if (showChords && (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage)) {
          event.preventDefault()
          api?.scrollPrev()
        } else if (showChords && (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage)) {
          event.preventDefault()
          api?.scrollNext()
        }
      },
      [api, showChords, pedalSettings]
    )

  if (!isClient) {
    return null; // Renderiza nada no servidor
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold text-destructive mb-4">Erro ao Carregar</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          {/* Este link agora é a única saída, garantindo que o usuário possa voltar */}
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
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
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
    <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none bg-background" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
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
        
      <div className="flex-1 flex flex-col min-h-0">
        {showChords ? (
          <div className="relative flex-1 flex flex-col">
             <div className="absolute top-0 left-0 right-0 z-20 flex justify-center items-center w-full px-4 text-center text-sm text-muted-foreground pb-2 pt-2">
                {count > 1 && <span>Página {current} de {count}</span>}
             </div>
             <Carousel className="w-full flex-1 pt-8" setApi={setApi} opts={{ watchDrag: true }}>
                <CarouselContent>
                  {songParts.map((part, index) => (
                    <CarouselItem key={index} className="h-full">
                      <Card className="w-full h-full flex flex-col bg-background shadow-none border-none">
                        <CardContent className="flex-1 h-full p-0">
                          <ScrollArea className="h-full p-4 md:p-6">
                            <SongDisplay style={{ fontSize: `${fontSize}px` }} content={part} showChords={showChords} />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <CarouselPrevious />
                </div>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <CarouselNext />
                </div>
                
                <div 
                    className="absolute left-0 top-0 h-full w-1/3 z-10" 
                    onClick={() => api?.scrollPrev()} 
                />
                <div 
                    className="absolute right-0 top-0 h-full w-1/3 z-10" 
                    onClick={() => api?.scrollNext()} 
                />
              </Carousel>
          </div>
        ) : (
          <Card className="flex-1 flex flex-col bg-background shadow-none border-none">
            <CardContent className="h-full flex flex-col p-0">
              <ScrollArea className="h-full p-4 md:p-6 flex-1">
                <SongDisplay 
                  style={{ fontSize: `${fontSize}px` }}
                  content={offlineData.content.replace(/\n\s*\n\s*\n/g, '\n\n')}
                  showChords={false} 
                />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
