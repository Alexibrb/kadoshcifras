'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, File, Sun, Moon, FileDown, Loader2, Play, Pause, Zap } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Link from 'next/link';
import { PedalSettings, ColorSettings } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { transposeChord, transposeContent, isChordLine } from '@/lib/music';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

function SongPresenter({ 
    section, 
    transposeValue, 
    fontSize, 
    showChords, 
    colorSettings,
    id
} : { 
    section: Section | undefined, 
    transposeValue: number, 
    fontSize: number, 
    showChords: boolean, 
    colorSettings: ColorSettings | null,
    id?: string
}) {
    if (!section) return null;

    const content = transposeContent(section.content, transposeValue);

    return (
        <Card id={id} className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none">
            <CardContent className="flex-1 h-full p-0">
                <ScrollArea className="h-full p-4 md:p-6 pt-0">
                    <SongDisplay 
                        style={{ 
                            fontSize: `${fontSize}px`,
                            '--lyrics-color': colorSettings?.lyricsColor,
                            '--chords-color': colorSettings?.chordsColor,
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
    );
}

export default function OfflineSetlistPage() {
  const params = useParams();
  const setlistId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0); // Acumulador para rolagem suave
  const { toast } = useToast();

  const [offlineData, setOfflineData] = useState<OfflineSetlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [fontSize] = useLocalStorage('song-font-size', 14);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [keepAwake, setKeepAwake] = useState(true);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  // Auto-scroll states
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(20);

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

  const requestWakeLock = useCallback(async (isUserInteraction = false) => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator && keepAwake) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setIsWakeLockActive(true);
      } catch (err: any) {
        setIsWakeLockActive(false);
        if (isUserInteraction && err.name !== 'NotAllowedError') {
            console.warn(`Wake Lock: ${err.name}, ${err.message}`);
        }
      }
    }
  }, [keepAwake]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      } catch (err) {
        console.warn('Error releasing wake lock:', err);
      }
    }
  }, []);

  // Animação de Rolagem Automática Corrigida
  const animateScroll = useCallback((time: number) => {
    if (lastScrollTime.current && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
            const deltaTime = (time - lastScrollTime.current) / 1000;
            // Velocidade: 1 no slider = ~2px/seg, 100 no slider = ~200px/seg
            const pixelsPerSecond = scrollSpeed * 2;
            const pixelsToMove = pixelsPerSecond * deltaTime;
            
            scrollPosRef.current += pixelsToMove;
            
            // Só aplica o scroll se tivermos pelo menos 0.5 pixel acumulado para manter fluidez
            if (scrollPosRef.current >= 0.5) {
                viewport.scrollTop += scrollPosRef.current;
                scrollPosRef.current = 0; // Reinicia o acumulador após aplicar
            }
        }
    }
    lastScrollTime.current = time;
    requestRef.current = requestAnimationFrame(animateScroll);
  }, [scrollSpeed]);

  useEffect(() => {
    if (isAutoScrolling) {
        lastScrollTime.current = performance.now();
        scrollPosRef.current = 0;
        requestRef.current = requestAnimationFrame(animateScroll);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isAutoScrolling, animateScroll]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsWakeLockSupported('wakeLock' in navigator);
    }
  }, []);

  useEffect(() => {
    if (keepAwake) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [keepAwake, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  useEffect(() => {
    setIsClient(true);
    if (containerRef.current) containerRef.current.focus();
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
           try { setFinalColorSettings(JSON.parse(storedSettings)); } catch(e) { setFinalColorSettings(defaultSettings); }
      } else { setFinalColorSettings(defaultSettings); }
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
          } else { setError("Dados offline corrompidos."); }
        } else { setError("Dados offline não encontrados."); }
      } catch (e) { setError("Erro ao carregar dados offline."); } finally { setLoading(false); }
    }
  }, [setlistId]);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
    if (!api || isAutoScrolling) return;
    const handleSelect = () => setCurrentSectionIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    handleSelect();
    return () => { api.off("select", handleSelect); }
  }, [api, isAutoScrolling]);

  const currentSection = allSections[currentSectionIndex];
  const currentSongIndex = currentSection?.songIndex;
  const currentSong = typeof currentSongIndex === 'number' ? offlineData?.songs[currentSongIndex] : undefined;
  const currentSongTranspose = typeof currentSongIndex === 'number' ? (transpositions[currentSongIndex] ?? 0) : 0;
  
  const fullContentContinuous = useMemo(() => {
    if (!offlineData) return '';
    return offlineData.songs
        .map((song, idx) => {
            const transposed = transposeContent(song.content, transpositions[idx] ?? 0);
            return transposed.replace(/\n\s*\n\s*\n/g, '\n\n');
        })
        .join('\n\n' + '-'.repeat(30) + '\n\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n');
  }, [offlineData, transpositions]);

  const goToSong = useCallback((direction: 'next' | 'prev') => {
      if (typeof currentSongIndex !== 'number' || isAutoScrolling) return;
      const nextSongIndex = direction === 'next' ? currentSongIndex + 1 : currentSongIndex - 1;
      if (nextSongIndex < 0 || nextSongIndex >= (offlineData?.songs.length ?? 0)) return;
      const targetSectionIndex = allSections.findIndex(s => s.songIndex === nextSongIndex);
      if (targetSectionIndex !== -1) api?.scrollTo(targetSectionIndex);
  }, [currentSongIndex, offlineData?.songs.length, allSections, api, isAutoScrolling]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        if (showChords && !isAutoScrolling) {
            if (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage) {
            event.preventDefault();
            api?.scrollPrev();
            } else if (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage) {
            event.preventDefault();
            api?.scrollNext();
            } else if (key === pedalSettings.prevSong) {
            event.preventDefault();
            goToSong('prev');
            } else if (key === pedalSettings.nextSong) {
            event.preventDefault();
            goToSong('next');
            }
        }
  }, [api, pedalSettings, goToSong, showChords, isAutoScrolling]);
  
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

  const handleExportPDF = async () => {
    if (!offlineData) return;
    setIsGeneratingPDF(true);
    try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.width = 'fit-content';
        document.body.appendChild(tempContainer);

        let pagesToProcess: any[] = [];
        const linesPerPage = 40;
        
        offlineData.songs.forEach((song, songIndex) => {
            const transpose = transpositions[songIndex] ?? 0;
            const fullContent = transposeContent(song.content, transpose).replace(/\n\s*\n\s*\n/g, '\n\n');
            const lines = fullContent.split('\n');
            const filteredLines = showChords ? lines : lines.filter(line => !isChordLine(line));
            
            for (let i = 0; i < filteredLines.length; i += linesPerPage) {
                let chunkLines = filteredLines.slice(i, i + linesPerPage);
                while (chunkLines.length < linesPerPage) chunkLines.push("");
                pagesToProcess.push({
                    songIndex,
                    content: chunkLines.join('\n'),
                    partIndex: Math.floor(i / linesPerPage),
                    totalParts: Math.ceil(filteredLines.length / linesPerPage)
                });
            }
        });

        const totalPdfPages = pagesToProcess.length;
        let doc: any;

        for (let i = 0; i < totalPdfPages; i++) {
            const pageInfo = pagesToProcess[i];
            const song = offlineData.songs[pageInfo.songIndex];
            const pageDiv = document.createElement('div');
            pageDiv.style.padding = '20mm';
            pageDiv.style.paddingBottom = '35mm';
            pageDiv.style.backgroundColor = 'white';
            pageDiv.style.width = 'fit-content';
            pageDiv.style.minWidth = '160mm';
            pageDiv.style.display = 'inline-block';

            pageDiv.innerHTML = `
                <div style="margin-bottom: 10mm; border-bottom: 2px solid #f0f0f0; padding-bottom: 5mm; width: 100%;">
                    <div style="font-family: serif; font-size: 24pt; font-weight: bold; color: #9f50e5;">${song.title}</div>
                    <div style="font-family: serif; font-size: 14pt; color: #666; margin-top: 5px;">${song.artist}</div>
                </div>
            `;

            const contentDiv = document.createElement('div');
            contentDiv.style.whiteSpace = 'pre';
            contentDiv.style.fontFamily = 'monospace';
            contentDiv.style.fontSize = `${fontSize * 1.3}px`;
            contentDiv.style.lineHeight = '1.4';
            
            pageInfo.content.split('\n').forEach((line: string) => {
                const p = document.createElement('p');
                p.style.margin = '0';
                p.textContent = line || ' ';
                if (isChordLine(line) && showChords) {
                    p.style.fontWeight = 'bold';
                    p.style.color = finalColorSettings?.chordsColor || '#F59E0B';
                } else p.style.color = finalColorSettings?.lyricsColor || 'black';
                contentDiv.appendChild(p);
            });
            pageDiv.appendChild(contentDiv);

            tempContainer.innerHTML = '';
            tempContainer.appendChild(pageDiv);
            const rect = pageDiv.getBoundingClientRect();
            const widthMM = rect.width * 0.264583;
            const heightMM = rect.height * 0.264583;

            const canvas = await html2canvas(pageDiv, { scale: 2, useCORS: true, backgroundColor: 'white' });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            if (i === 0) doc = new jsPDF({ orientation: widthMM > heightMM ? 'l' : 'p', unit: 'mm', format: [widthMM, heightMM] });
            else doc.addPage([widthMM, heightMM], widthMM > heightMM ? 'l' : 'p');
            doc.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);
        }
        doc.save(`${offlineData.name}.pdf`);
        document.body.removeChild(tempContainer);
    } catch (e) { toast({ title: "Erro ao gerar PDF", variant: "destructive" }); } finally { setIsGeneratingPDF(false); }
  };

  if (loading || !isClient || !finalColorSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold mb-4 text-primary">Carregando...</h2>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !offlineData || !currentSong) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
        <h2 className="text-2xl font-bold text-destructive mb-4">Erro</h2>
        <p className="text-muted-foreground mb-6">{error || "Dados não encontrados"}</p>
        <Button asChild><Link href={`/setlists/${setlistId}`}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
      </div>
    );
  }

  const displayedKey = currentSong.key ? transposeChord(currentSong.key, currentSongTranspose) : 'N/A';

  return (
    <div ref={containerRef} className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-8 h-screen outline-none bg-background" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <Card className="mb-4 bg-accent/10 transition-all duration-300">
            <CardContent className="p-4 space-y-4">
              {isPanelVisible ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <Button asChild variant="outline" size="icon" className="shrink-0">
                      <Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
                    </Button>
                    <div className="flex-1 space-y-1">
                      <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight truncate">{showChords ? currentSong.title : offlineData.name}</h1>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Modo Offline</Badge>
                        {isWakeLockActive ? <Sun className="h-3 w-3 text-yellow-500" /> : <Moon className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0"><PanelTopClose className="h-5 w-5" /><span className="sr-only">Ocultar</span></Button>
                  </div>
                
                  <div className="flex flex-col gap-2">
                    {/* Linha 1: Tom e Cifras - Flex Row Fixo */}
                    <div className="flex flex-row items-center gap-2 w-full">
                       <div className="flex items-center gap-1 rounded-md border p-1 flex-1 bg-background overflow-hidden h-10">
                            <Button variant="ghost" size="icon" onClick={() => changeTranspose(-1)} className="h-8 w-8 shrink-0"><Minus className="h-4 w-4" /></Button>
                            <Badge variant="secondary" className="px-2 py-1 text-[10px] md:text-xs whitespace-nowrap flex-grow text-center justify-center">
                                Tom: {displayedKey}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => changeTranspose(1)} className="h-8 w-8 shrink-0"><Plus className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex items-center justify-between space-x-2 rounded-md border p-1 px-3 bg-background h-10 flex-1">
                            <Label htmlFor="show-chords" className="text-[10px] md:text-xs font-semibold whitespace-nowrap">Cifras</Label>
                            <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
                        </div>
                    </div>

                    {/* Linha 2: Tela e PDF - Flex Row Fixo */}
                    <div className="flex flex-row items-center gap-2 w-full">
                        <div className="flex items-center justify-between space-x-2 rounded-md border p-1 px-3 bg-background h-10 flex-1">
                            <Label htmlFor="keep-awake" className="text-[10px] md:text-xs font-semibold whitespace-nowrap">Tela Acesa</Label>
                            <Switch id="keep-awake" checked={keepAwake} onCheckedChange={(val) => { setKeepAwake(val); if (val) requestWakeLock(true); }} />
                        </div>
                        <Button onClick={handleExportPDF} variant="outline" className="h-10 flex-1 text-[10px] md:text-xs font-semibold" disabled={isGeneratingPDF}>
                          {isGeneratingPDF ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileDown className="mr-1 h-3 w-3" />}
                          <span>Exportar PDF</span>
                        </Button>
                    </div>

                    {/* Linha 3: Rolagem Automática */}
                    <div className="flex flex-row items-center gap-4 w-full p-2 rounded-md border bg-background/50">
                        <div className="flex items-center gap-2">
                            <Button 
                                size="icon" 
                                variant={isAutoScrolling ? "destructive" : "default"} 
                                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                                className="h-8 w-8"
                            >
                                {isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Label className="text-[10px] md:text-xs font-bold whitespace-nowrap">Rolagem</Label>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <Slider value={[scrollSpeed]} onValueChange={(val) => setScrollSpeed(val[0])} max={100} min={1} step={1} className="flex-1" />
                            <span className="text-[10px] font-mono w-6">{scrollSpeed}</span>
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <Button asChild variant="outline" size="icon" className="shrink-0"><Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
                  <div className="flex flex-col items-center overflow-hidden">
                    <h1 className="text-lg font-bold font-headline tracking-tight truncate w-full text-center">
                       {showChords ? currentSong.title : offlineData.name}
                    </h1>
                    {isAutoScrolling && <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1"><Zap className="h-2 w-2" /> Rolando: {scrollSpeed}</p>}
                  </div>
                  <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0"><PanelTopOpen className="h-5 w-5" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
      <div className="flex-1 flex flex-col min-h-0 relative">
        {isAutoScrolling || !showChords ? (
          <Card className="flex-1 flex flex-col bg-white dark:bg-black shadow-none border-none overflow-hidden">
              <CardContent className="h-full flex flex-col p-0">
                  <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6 flex-1">
                      <SongDisplay 
                          style={{ 
                            fontSize: `${fontSize}px`,
                            '--lyrics-color': finalColorSettings.lyricsColor,
                            '--chords-color': finalColorSettings.chordsColor,
                           } as React.CSSProperties}
                          content={showChords ? fullContentContinuous : (offlineData.songs.map((s, idx) => transposeContent(s.content, transpositions[idx] ?? 0)).join('\n\n---\n\n'))}
                          showChords={showChords} 
                      />
                  </ScrollArea>
              </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border"><Music className="h-3 w-3" />Música {currentSongIndex + 1}/{offlineData?.songs.length ?? 0}</div>
              {allSections.filter(s => s.songIndex === currentSongIndex).length > 1 && (
                <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border"><File className="h-3 w-3" />Página {currentSection.partIndex + 1}</div>
              )}
            </div>
            <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true, loop: false }}>
              <CarouselContent>
                {allSections.map((section, index) => (
                  <CarouselItem key={index} className="h-full">
                      <SongPresenter section={section} transposeValue={transpositions[section.songIndex] ?? 0} fontSize={fontSize} showChords={showChords} colorSettings={finalColorSettings} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 hidden md:block"><CarouselPrevious /></div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:block"><CarouselNext /></div>
              <div className="absolute left-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollPrev()} />
              <div className="absolute right-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollNext()} />
            </Carousel>
          </>
        )}
      </div>
    </div>
  );
}
