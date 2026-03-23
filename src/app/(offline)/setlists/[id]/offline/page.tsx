'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, File, Sun, Moon, FileDown, Loader2, Play, Pause, Zap, X } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    song,
    id
} : { 
    section: Section | undefined, 
    transposeValue: number, 
    fontSize: number, 
    showChords: boolean, 
    colorSettings: ColorSettings | null,
    song: OfflineSong | undefined,
    id?: string
}) {
    if (!section || !song) return null;

    const content = transposeContent(section.content, transposeValue);

    return (
        <Card id={id} className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none overflow-hidden">
            <CardContent className="flex-1 h-full p-0">
                <ScrollArea className="h-full p-4 md:p-6">
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
  const scrollPosRef = useRef<number>(0); 
  const { toast } = useToast();
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);

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

  const animateScroll = useCallback((time: number) => {
    if (lastScrollTime.current > 0 && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
            const deltaTime = (time - lastScrollTime.current) / 1000;
            const pixelsPerSecond = scrollSpeed * 2;
            const pixelsToMove = pixelsPerSecond * deltaTime;
            
            scrollPosRef.current += pixelsToMove;
            
            if (scrollPosRef.current >= 0.5) {
                viewport.scrollTop += scrollPosRef.current;
                scrollPosRef.current = 0;
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
        silentAudioRef.current?.play().catch(() => {});
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        lastScrollTime.current = 0;
        silentAudioRef.current?.pause();
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
    // Setup silent audio for media session keep-alive
    silentAudioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    if (silentAudioRef.current) silentAudioRef.current.loop = true;
  }, []);

  // Media Session Control
  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator) || !offlineData) return;

    const currentSong = offlineData.songs[currentSectionIndex] || offlineData.songs[0];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: offlineData.name,
      artwork: [{ src: 'https://placehold.co/512x512/9f50e5/ffffff?text=K', sizes: '512x512', type: 'image/png' }]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      setIsAutoScrolling(true);
      setIsContinuousMode(true);
      silentAudioRef.current?.play().catch(() => {});
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      setIsAutoScrolling(false);
      silentAudioRef.current?.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (!isContinuousMode && api) {
        api.scrollPrev();
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (!isContinuousMode && api) {
        api.scrollNext();
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [isClient, offlineData, currentSectionIndex, api, isContinuousMode]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isAutoScrolling ? 'playing' : 'paused';
    }
  }, [isAutoScrolling]);

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
        const normalizedContent = song.content.replace(/\r\n/g, '\n');
        const parts = normalizedContent.split(/\n[\r\t ]*\n[\r\t ]*\n+/);
        
        parts.forEach((part, partIndex) => {
            const trimmedPart = part.trim();
            if (trimmedPart) {
                sections.push({
                    songIndex: songIndex,
                    partIndex: partIndex,
                    content: trimmedPart,
                    isLastSectionOfSong: partIndex === parts.length - 1,
                    isLastSectionOfSetlist: partIndex === parts.length - 1 && songIndex === offlineData.songs.length - 1,
                });
            }
        });
    });
    return sections;
  }, [offlineData]);

  useEffect(() => {
    if (!isContinuousMode || !isClient || !offlineData) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const songIndex = parseInt(entry.target.getAttribute('data-song-index') || '0', 10);
            const sectionIndex = allSections.findIndex(s => s.songIndex === songIndex);
            if (sectionIndex !== -1) {
              setCurrentSectionIndex(sectionIndex);
            }
          }
        });
      },
      {
        root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'),
        threshold: 0,
        rootMargin: '-10% 0px -85% 0px',
      }
    );

    const songElements = document.querySelectorAll('[data-song-index]');
    songElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isContinuousMode, isClient, offlineData, allSections]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    const handleSelect = () => setCurrentSectionIndex(api.selectedScrollSnap());
    api.on("select", handleSelect);
    handleSelect();
    return () => { api.off("select", handleSelect); }
  }, [api, isContinuousMode]);

  const currentSection = allSections[currentSectionIndex];
  const currentSongIndex = currentSection?.songIndex;
  const currentSong = typeof currentSongIndex === 'number' ? offlineData?.songs[currentSongIndex] : undefined;
  const currentSongTranspose = typeof currentSongIndex === 'number' ? (transpositions[currentSongIndex] ?? 0) : 0;
  
  const toggleAutoScroll = useCallback(() => {
    if (!isContinuousMode) {
        setIsContinuousMode(true);
        setIsAutoScrolling(true);
    } else {
        setIsAutoScrolling(!isAutoScrolling);
    }
  }, [isContinuousMode, isAutoScrolling]);

  const stopAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
    setIsContinuousMode(false);
    
    setTimeout(() => {
      if (api) {
        api.scrollTo(currentSectionIndex, false);
      }
    }, 150);
  }, [api, currentSectionIndex]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const key = event.key;
        
        if (key === pedalSettings.nextSong) {
            event.preventDefault();
            if (isContinuousMode) {
                setIsAutoScrolling(!isAutoScrolling);
            } else {
                setIsContinuousMode(true);
                setIsAutoScrolling(true);
            }
            return;
        }

        if (key === pedalSettings.prevSong) {
            event.preventDefault();
            if (isContinuousMode) {
                setIsAutoScrolling(false);
            }
            return;
        }

        if (showChords && !isAutoScrolling) {
            if (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage) {
            event.preventDefault();
            api?.scrollPrev();
            } else if (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage) {
            event.preventDefault();
            api?.scrollNext();
            }
        }
  }, [api, pedalSettings, showChords, isAutoScrolling, isContinuousMode]);
  
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
            else {
              doc.addPage([widthMM, heightMM], widthMM > heightMM ? 'l' : 'p');
            }

            const pageNum = i + 1;
            const targetPrev = pageNum > 1 ? pageNum - 1 : 1;
            const targetNext = pageNum < totalPdfPages ? pageNum + 1 : totalPdfPages;

            doc.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);

            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Página ${pageNum} de ${totalPdfPages}`, widthMM / 2, heightMM - 10, { align: 'center' });

            doc.setTextColor(159, 80, 229);
            doc.setFontSize(12);
            doc.text('← Anterior', (widthMM / 2) - 40, heightMM - 20, { align: 'center' });
            doc.link((widthMM / 2) - 55, heightMM - 25, 30, 10, { pageNumber: targetPrev });

            doc.text('Próxima →', (widthMM / 2) + 40, heightMM - 20, { align: 'center' });
            doc.link((widthMM / 2) + 25, heightMM - 25, 30, 10, { pageNumber: targetNext });
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
  const showContinuous = isContinuousMode || !showChords;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-24 h-screen outline-none bg-background overflow-hidden relative" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <div className={cn("flex flex-col gap-2 shrink-0 transition-all", isPanelVisible ? "mb-4" : "mb-1")}>
        <Card className="bg-accent/10 transition-all duration-300">
          <CardContent className={cn("transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
            {isPanelVisible ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <Button asChild variant="outline" size="icon" className="shrink-0">
                    <Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
                  </Button>
                  <div className="flex-1 space-y-1 text-center">
                    <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight truncate">
                       {currentSong.title}
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="text-xs">Modo Offline</Badge>
                      {isWakeLockActive ? <Sun className="h-3 w-3 text-yellow-500" /> : <Moon className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0"><PanelTopClose className="h-5 w-5" /><span className="sr-only">Ocultar</span></Button>
                </div>
              
                <div className="flex flex-col gap-2">
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
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 h-8">
                <Button asChild variant="outline" size="icon" className="shrink-0 h-8 w-8"><Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
                <div className="flex flex-col items-center overflow-hidden flex-1">
                  <h1 className="text-base font-bold font-headline tracking-tight truncate w-full text-center">
                     {currentSong.title}
                  </h1>
                </div>
                <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0 h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {showContinuous ? (
          <Card className="flex-1 flex flex-col bg-white dark:bg-black shadow-none border-none overflow-hidden">
              <CardContent className="h-full flex flex-col p-0">
                  <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6 flex-1">
                      <div className="flex flex-col gap-12">
                        {offlineData.songs.map((song, songIdx) => (
                          <div 
                            key={songIdx} 
                            data-song-index={songIdx} 
                            className="flex flex-col"
                          >
                            <div className="mb-6 flex flex-col border-l-4 border-primary/20 pl-4 py-2">
                                <h2 className="text-3xl font-bold font-headline text-primary">{song.title}</h2>
                                <p className="text-sm text-muted-foreground">{song.artist}</p>
                            </div>
                            <SongDisplay 
                                style={{ 
                                  fontSize: `${fontSize}px`,
                                  '--lyrics-color': finalColorSettings.lyricsColor,
                                  '--chords-color': finalColorSettings.chordsColor,
                                } as React.CSSProperties}
                                content={transposeContent(song.content, transpositions[songIdx] ?? 0).replace(/\n\s*\n\s*\n/g, '\n\n')}
                                showChords={showChords} 
                            />
                            {songIdx < offlineData.songs.length - 1 && (
                                <div className="mt-16 flex items-center gap-4 opacity-30">
                                    <Separator className="flex-1" />
                                    <Music className="h-4 w-4 shrink-0" />
                                    <Separator className="flex-1" />
                                </div>
                            )}
                          </div>
                        ))}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 px-2 shrink-0">
              <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border"><Music className="h-3 w-3" />Música {currentSongIndex + 1}/{offlineData?.songs.length ?? 0}</div>
              {allSections.filter(s => s.songIndex === currentSongIndex).length > 1 && (
                <div className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 border"><File className="h-3 w-3" />Página {currentSection.partIndex + 1}</div>
              )}
            </div>
            <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true, loop: false }}>
              <CarouselContent>
                {allSections.map((section, index) => (
                  <CarouselItem key={index} className="h-full">
                      <SongPresenter 
                        section={section} 
                        transposeValue={transpositions[section.songIndex] ?? 0} 
                        fontSize={fontSize} 
                        showChords={showChords} 
                        colorSettings={finalColorSettings}
                        song={offlineData.songs[section.songIndex]}
                      />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute left-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollPrev()} />
              <div className="absolute right-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollNext()} />
            </Carousel>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
          <div className="max-w-screen-xl mx-auto flex flex-row items-center gap-4 w-full p-2 rounded-md border bg-muted/30 shadow-sm">
              <div className="flex items-center gap-2">
                  {!isContinuousMode && showChords ? (
                      <Button 
                          size="sm" 
                          variant="default" 
                          onClick={toggleAutoScroll}
                          className="h-8 gap-2 px-6"
                      >
                          <Play className="h-4 w-4" />
                          <span className="text-[10px] md:text-xs font-bold">Rolagem</span>
                      </Button>
                  ) : (
                      <div className="flex items-center gap-2">
                          <Button 
                              size="icon" 
                              variant={isAutoScrolling ? "destructive" : "default"} 
                              onClick={toggleAutoScroll}
                              className="h-8 w-16"
                          >
                              {isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          {showChords && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-16"><X className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Parar Rolagem?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Deseja realmente parar a rolagem e retornar ao modo de pedal (slides)?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={stopAutoScroll}>Confirmar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          )}
                      </div>
                  )}
              </div>
              {showContinuous && (
                  <div className="flex-1 flex items-center gap-2">
                      <Slider value={[scrollSpeed]} onValueChange={(val) => setScrollSpeed(val[0])} max={100} min={1} step={1} className="flex-1" />
                      <span className="text-[10px] font-mono font-bold w-12 text-primary">{scrollSpeed}</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
