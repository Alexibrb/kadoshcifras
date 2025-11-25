
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, File } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { PedalSettings, ColorSettings } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { transposeChord, transposeContent } from '@/lib/music';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface OfflineSong {
    title: string;
    artist: string;
    content: string;
    key?: string;
    initialTranspose: number;
}

interface OfflineSetlist {
    name: string;
    songs: OfflineSong[];
}

interface Section {
    songIndex: number;
    partIndex: number;
    content: string;
    isLastSectionOfSong: boolean;
    isLastSectionOfSetlist: boolean;
}

export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);

  const [offlineData, setOfflineData] = useState<OfflineSetlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [transpositions, setTranspositions] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [finalColorSettings, setFinalColorSettings] = useState<ColorSettings | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (containerRef.current) {
        containerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const defaultSettings: ColorSettings = {
          lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
          chordsColor: isDarkMode ? '#F59E0B' : '#000000',
      };
      
      const storedSettings = localStorage.getItem('user-color-settings');
      if (storedSettings) {
           setFinalColorSettings(JSON.parse(storedSettings));
      } else {
          setFinalColorSettings(defaultSettings);
      }
    }
}, [isClient]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoading(true);
      try {
        const storageKey = `offline-setlist-${setlistId}`;
        const item = localStorage.getItem(storageKey);
        if (item) {
          const parsedData = JSON.parse(item) as OfflineSetlist;
          if (parsedData && typeof parsedData.name === 'string' && Array.isArray(parsedData.songs)) {
              setOfflineData(parsedData);
              setTranspositions(parsedData.songs.map(s => s.initialTranspose || 0));
              setError(null);
          } else {
              setError("Dados offline corrompidos ou em formato inválido. Por favor, gere o repertório novamente.");
          }
        } else {
          setError("Dados offline não encontrados. Por favor, volte e clique em 'Abrir Repertório' na página do repertório.");
        }
      } catch (e) {
        console.error("Erro ao ler do localStorage:", e);
        setError("Não foi possível carregar os dados offline. O formato pode ser inválido. Tente gerar novamente.");
      } finally {
        setLoading(false);
      }
    }
  }, [setlistId]);
  

  const allSections = useMemo((): Section[] => {
    if (!offlineData) return [];
    
    const sections: Section[] = [];
    offlineData.songs.forEach((song, songIndex) => {
        const parts = song.content.split(/\n\s*\n\s*\n/);
        parts.forEach((part, partIndex) => {
            sections.push({
                songIndex: songIndex,
                partIndex: partIndex,
                content: part,
                isLastSectionOfSong: partIndex === parts.length - 1,
                isLastSectionOfSetlist: partIndex === parts.length - 1 && songIndex === offlineData.songs.length - 1,
            });
        });
    });
    return sections;
  }, [offlineData]);

   useEffect(() => {
    if (!api) return;
    const handleSelect = () => setCurrentSectionIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    handleSelect();
    return () => { api.off("select", handleSelect); }
  }, [api]);

  const currentSection = allSections[currentSectionIndex];
  const currentSongIndex = currentSection?.songIndex;
  const currentSong = typeof currentSongIndex === 'number' ? offlineData?.songs[currentSongIndex] : undefined;
  const currentSongTranspose = typeof currentSongIndex === 'number' ? (transpositions[currentSongIndex] ?? 0) : 0;

  const totalPagesOfSong = useMemo(() => {
    if (typeof currentSongIndex !== 'number') return 0;
    return allSections.filter(s => s.songIndex === currentSongIndex).length;
  }, [allSections, currentSongIndex]);

  const currentPageOfSong = currentSection ? currentSection.partIndex + 1 : 0;

  const goToSong = useCallback((direction: 'next' | 'prev') => {
      if (typeof currentSongIndex !== 'number') return;
      
      const nextSongIndex = direction === 'next' ? currentSongIndex + 1 : currentSongIndex - 1;
      
      if (nextSongIndex < 0 || nextSongIndex >= (offlineData?.songs.length ?? 0)) return;

      const targetSectionIndex = allSections.findIndex(s => s.songIndex === nextSongIndex);
      if (targetSectionIndex !== -1) {
          api?.scrollTo(targetSectionIndex);
      }
  }, [currentSongIndex, offlineData?.songs.length, allSections, api]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        if (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage) {
          event.preventDefault();
          api?.scrollPrev();
        } else if (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage) {
          event.preventDefault();
          api?.scrollNext();
        }
        else if (key === pedalSettings.prevSong) {
          event.preventDefault();
          goToSong('prev');
        } else if (key === pedalSettings.nextSong) {
          event.preventDefault();
          goToSong('next');
        }
  }, [api, pedalSettings, goToSong]);
  
  const changeTranspose = (change: number) => {
    if (typeof currentSongIndex !== 'number') return;
    setTranspositions(prev => {
        const newTranspositions = [...prev];
        const currentTranspose = newTranspositions[currentSongIndex];
        const newTransposeValue = Math.min(12, Math.max(-12, currentTranspose + change));
        newTranspositions[currentSongIndex] = newTransposeValue;
        return newTranspositions;
    });
  };
  
  const increaseFontSize = useCallback(() => setFontSize(s => Math.min(32, s + 1)), [setFontSize]);
  const decreaseFontSize = useCallback(() => setFontSize(s => Math.max(8, s - 1)), [setFontSize]);

  const renderPanel = () => {
    if (!offlineData || !currentSong) return null;

    const displayedKey = currentSong.key ? transposeChord(currentSong.key, currentSongTranspose) : 'N/A';

    return (
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
                      <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight">{currentSong.title}</h1>
                      <p className="text-muted-foreground text-sm">Modo de Apresentação Offline</p>
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
                  <h1 className="text-lg font-bold font-headline tracking-tight truncate">
                     {currentSong.title}
                  </h1>
                  <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0">
                    <PanelTopOpen className="h-5 w-5" />
                    <span className="sr-only">Mostrar Controles</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
    );
  }

  if (loading || !isClient || !finalColorSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold mb-4">Carregando Dados Offline...</h2>
      </div>
    );
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
  
  if (!offlineData || !currentSong) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold mb-4">Dados Offline Não Encontrados ou Inválidos</h2>
        <p className="text-muted-foreground">Gere os dados na página do repertório antes de acessar o modo de apresentação.</p>
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
    <div ref={containerRef} className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none bg-background" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      {renderPanel()}
      <div className="flex-1 flex flex-col min-h-0">
           <div className="text-center mb-4 text-sm text-muted-foreground font-semibold flex justify-center items-center gap-4 pt-0">
              <div className="flex items-center gap-2 rounded-md border p-1 bg-background max-w-fit">
                  <Label className="text-sm pl-1 whitespace-nowrap sr-only">Tam. da Fonte</Label>
                  <Button variant="ghost" onClick={decreaseFontSize} className="h-7 w-7 px-1">
                      <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium tabular-nums">{fontSize}px</span>
                  <Button variant="ghost" onClick={increaseFontSize} className="h-7 w-7 px-1">
                      <Plus className="h-4 w-4" />
                  </Button>
              </div>
               <span className="flex items-center gap-1.5">
                  <Music className="h-4 w-4" />
                  {currentSongIndex + 1} de {offlineData?.songs.length ?? 0}
              </span>
              {totalPagesOfSong > 1 && (
                <>
                  <span className="text-muted-foreground/50 mx-1">&bull;</span>
                  <span className="flex items-center gap-1.5">
                      <File className="h-4 w-4" />
                      {currentPageOfSong} de {totalPagesOfSong}
                  </span>
                </>
              )}
          </div>
         <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true, loop: false }}>
            <CarouselContent>
              {allSections.map((section, index) => {
                  const transposeValue = transpositions[section.songIndex] ?? 0;
                  const content = transposeContent(section.content, transposeValue);
                  
                  return (
                    <CarouselItem key={index} className="h-full">
                      <Card className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none">
                        <CardContent className="flex-1 h-full p-0">
                          <ScrollArea className="h-full p-4 md:p-6 pt-0">
                            <SongDisplay 
                                style={{ 
                                    fontSize: `${fontSize}px`,
                                    '--lyrics-color': finalColorSettings.lyricsColor,
                                    '--chords-color': finalColorSettings.chordsColor,
                                } as React.CSSProperties} 
                                content={content} 
                                showChords={showChords} 
                            />
                            {section.isLastSectionOfSong && !section.isLastSectionOfSetlist && (
                                <div className="mt-8 text-center text-muted-foreground">
                                    <Separator className="my-4" />
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                       <Music className="h-4 w-4" />
                                       <span>Fim da Música</span>
                                    </div>
                                </div>
                            )}
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
