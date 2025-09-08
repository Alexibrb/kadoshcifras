
// src/app/(offline)/setlists/[id]/offline/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { PedalSettings, Song } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { transposeChord, transposeContent } from '@/lib/music';
import { Badge } from '@/components/ui/badge';

interface OfflineSong extends Omit<Song, 'id' | 'createdAt'> {
    initialTranspose: number;
}

interface OfflineSetlist {
    name: string;
    songs: OfflineSong[];
}


export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;

  const [isClient, setIsClient] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineSetlist | null>(null);
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
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentSongTranspose, setCurrentSongTranspose] = useState(0);
  
  useEffect(() => {
    setIsClient(true);
    try {
      const storageKey = `offline-setlist-${setlistId}`;
      const item = localStorage.getItem(storageKey);
      if (item) {
        const parsedData = JSON.parse(item);
        if (parsedData && parsedData.name && parsedData.songs) {
            setOfflineData(parsedData);
            if(parsedData.songs.length > 0) {
                setCurrentSongTranspose(parsedData.songs[0].initialTranspose);
            }
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

    const handleSelect = () => {
        const newIndex = api.selectedScrollSnap();
        setCurrentSongIndex(newIndex);
        if (offlineData && offlineData.songs[newIndex]) {
            setCurrentSongTranspose(offlineData.songs[newIndex].initialTranspose);
        }
    }
    
    api.on("select", handleSelect);
    // Seta o estado inicial
    handleSelect();

    return () => {
        api.off("select", handleSelect);
    }
  }, [api, offlineData]);

  const currentSong = useMemo(() => {
    if (!offlineData || !offlineData.songs) return null;
    return offlineData.songs[currentSongIndex];
  }, [offlineData, currentSongIndex]);

  const contentToDisplay = useMemo(() => {
    if (!currentSong) return '';
    // A transposição agora usa o estado `currentSongTranspose`
    return transposeContent(currentSong.content, currentSongTranspose);
  }, [currentSong, currentSongTranspose]);
  
  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        // As teclas do pedal/setas agora controlam o carrossel principal de MÚSICAS
        if (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevSong) {
          event.preventDefault()
          api?.scrollPrev()
        } else if (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextSong) {
          event.preventDefault()
          api?.scrollNext()
        }
      },
      [api, pedalSettings]
    )

  const changeTranspose = (change: number) => {
    const newTranspose = Math.min(12, Math.max(-12, currentSongTranspose + change));
    setCurrentSongTranspose(newTranspose);
  };
  

  if (!isClient) {
    return null; // Renderiza nada no servidor
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
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

  const displayedKey = currentSong?.key ? transposeChord(currentSong.key, currentSongTranspose) : 'N/A';

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
                    <Badge variant="outline" className="whitespace-nowrap text-sm mt-1">
                        Música: {currentSong?.title}
                    </Badge>
                  </div>
                  
                  <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0">
                    <PanelTopClose className="h-5 w-5" />
                    <span className="sr-only">Ocultar Controles</span>
                  </Button>
                </div>
              
                <div className="flex justify-center items-center gap-2 pt-2 flex-wrap">
                   <div className="flex items-center gap-1 rounded-md border p-1 w-full max-w-sm bg-background">
                        <Button variant="ghost" size="icon" onClick={() => changeTranspose(-1)} className="h-8 w-8">
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Badge variant="secondary" className="px-3 py-1 text-xs whitespace-nowrap flex-grow text-center justify-center">
                            Tom: {displayedKey} ({currentSongTranspose > 0 ? '+' : ''}{currentSongTranspose})
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => changeTranspose(1)} className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 rounded-md border p-1 bg-background max-w-xs">
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
         <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true }}>
            <CarouselContent>
              {offlineData.songs.map((song, index) => {
                  // A transposição é aplicada apenas à música atual com base no estado `currentSongTranspose`
                  const content = index === currentSongIndex ? contentToDisplay : transposeContent(song.content, song.initialTranspose);
                  return (
                    <CarouselItem key={index} className="h-full">
                      <Card className="w-full h-full flex flex-col bg-background shadow-none border-none">
                        <CardContent className="flex-1 h-full p-0">
                          <ScrollArea className="h-full p-4 md:p-6">
                            <SongDisplay 
                                style={{ fontSize: `${fontSize}px` }} 
                                content={content} 
                                showChords={showChords} 
                            />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  )
                })}
            </CarouselContent>
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden md:block">
              <CarouselPrevious />
            </div>
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:block">
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
    </div>
  );
}
