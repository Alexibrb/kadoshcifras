'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Minus, Plus, PanelTopClose, PanelTopOpen, Music, File, Sun, Moon, Loader2, Play, Pause, X } from 'lucide-react';
import { SongDisplay } from '@/components/song-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Link from 'next/link';
import { PedalSettings, ColorSettings } from '@/types';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { transposeChord, transposeContent } from '@/lib/music';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

const SILENT_AUDIO_BASE64 = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAgD8AAIA/AAABAAgAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

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
} : { 
    section: Section | undefined, 
    transposeValue: number, 
    fontSize: number, 
    showChords: boolean, 
    colorSettings: ColorSettings | null,
    song: OfflineSong | undefined,
}) {
    if (!section || !song) return null;

    const content = transposeContent(section.content, transposeValue);

    return (
        <Card className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none overflow-hidden">
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0); 
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [offlineData, setOfflineData] = useState<OfflineSetlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontSize] = useLocalStorage('song-font-size', 14);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [transpositions, setTranspositions] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [finalColorSettings, setFinalColorSettings] = useState<ColorSettings | null>(null);
  const [api, setApi] = useState<CarouselApi>();

  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', {
    prevPage: ',',
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });

  const requestWakeLock = useCallback(async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed');
      }
    }
  }, []);

  const animateScroll = useCallback((time: number) => {
    if (lastScrollTime.current > 0 && scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
            const deltaTime = (time - lastScrollTime.current) / 1000;
            const pixelsToMove = (scrollSpeed * 2) * deltaTime;
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
        requestRef.current = requestAnimationFrame(animateScroll);
    } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAutoScrolling, animateScroll]);

  useEffect(() => {
    setIsClient(true);
    requestWakeLock();
    if (typeof window !== 'undefined') {
        const audio = new Audio(SILENT_AUDIO_BASE64);
        audio.loop = true;
        silentAudioRef.current = audio;
    }
    return () => {
        if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [requestWakeLock]);

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

  const toggleAutoScroll = useCallback(() => {
    if (silentAudioRef.current) silentAudioRef.current.play().catch(() => {});
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
    if (silentAudioRef.current) silentAudioRef.current.pause();
    setTimeout(() => {
        if (api) api.scrollTo(currentSectionIndex, false);
    }, 150);
  }, [api, currentSectionIndex]);

  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator) || !offlineData || allSections.length === 0) return;
    const currentSec = allSections[currentSectionIndex] || allSections[0];
    const currentSong = offlineData.songs[currentSec.songIndex];

    navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: offlineData.name
    });

    navigator.mediaSession.setActionHandler('play', toggleAutoScroll);
    navigator.mediaSession.setActionHandler('pause', () => setIsAutoScrolling(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => api?.scrollPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => api?.scrollNext());

    return () => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
        }
    };
  }, [isClient, offlineData, currentSectionIndex, api, isContinuousMode, allSections, toggleAutoScroll]);

  useEffect(() => {
    if (isClient) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const storedSettings = localStorage.getItem('user-color-settings');
      if (storedSettings) {
           try { setFinalColorSettings(JSON.parse(storedSettings)); } catch(e) { setFinalColorSettings({ lyricsColor: isDarkMode ? '#FFF' : '#000', chordsColor: isDarkMode ? '#F59E0B' : '#000' }); }
      } else { setFinalColorSettings({ lyricsColor: isDarkMode ? '#FFF' : '#000', chordsColor: isDarkMode ? '#F59E0B' : '#000' }); }
    }
  }, [isClient]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoading(true);
      try {
        const item = localStorage.getItem(`offline-setlist-${setlistId}`);
        if (item) {
          const parsedData = JSON.parse(item) as OfflineSetlist;
          setOfflineData(parsedData);
          setTranspositions(parsedData.songs.map(s => s.initialTranspose || 0));
        } else { setError("Repertório não encontrado offline."); }
      } catch (e) { setError("Erro ao carregar dados."); } finally { setLoading(false); }
    }
  }, [setlistId]);
  
  useEffect(() => {
    if (!isContinuousMode || !isClient || !offlineData) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const idx = parseInt(entry.target.getAttribute('data-section-index') || '0', 10);
                setCurrentSectionIndex(idx);
            }
        });
    }, { root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'), threshold: 0, rootMargin: '-10% 0px -85% 0px' });
    document.querySelectorAll('[data-section-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isContinuousMode, isClient, offlineData, allSections]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    const onSelect = () => setCurrentSectionIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); }
  }, [api, isContinuousMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === pedalSettings.nextSong) { e.preventDefault(); toggleAutoScroll(); }
    else if (e.key === pedalSettings.prevSong) { e.preventDefault(); if (isContinuousMode) setIsAutoScrolling(false); }
    else if (showChords && !isAutoScrolling) {
        if (e.key === "ArrowLeft" || e.key === pedalSettings.prevPage) { e.preventDefault(); api?.scrollPrev(); }
        else if (e.key === "ArrowRight" || e.key === pedalSettings.nextPage) { e.preventDefault(); api?.scrollNext(); }
    }
  }, [api, pedalSettings, showChords, isAutoScrolling, isContinuousMode, toggleAutoScroll]);
  
  const changeTranspose = (change: number) => {
    const cur = allSections[currentSectionIndex];
    if (!cur) return;
    setTranspositions(prev => {
        const next = [...prev];
        next[cur.songIndex] = Math.min(12, Math.max(-12, (next[cur.songIndex] || 0) + change));
        return next;
    });
  };

  if (loading || !isClient || !finalColorSettings) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (error || !offlineData) return <div className="flex flex-col items-center justify-center h-screen"><p className="text-destructive mb-4">{error}</p><Button asChild><Link href={`/setlists/${setlistId}`}><ArrowLeft className="mr-2" />Voltar</Link></Button></div>;

  const currentSec = allSections[currentSectionIndex] || allSections[0];
  const currentSong = offlineData.songs[currentSec.songIndex];

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-24 h-screen outline-none bg-background overflow-hidden relative" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      <Card className={cn("mb-4 bg-accent/10 transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
        {isPanelVisible ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <Button asChild variant="outline" size="icon"><Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
              <div className="text-center flex-1">
                <h1 className="text-xl font-bold font-headline truncate">{currentSong.title}</h1>
                <div className="flex items-center justify-center gap-2"><Badge variant="outline">Offline</Badge></div>
              </div>
              <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon"><PanelTopClose className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-1 border rounded-md p-1 flex-1 bg-background h-10">
                    <Button variant="ghost" size="icon" onClick={() => changeTranspose(-1)}><Minus className="h-4 w-4" /></Button>
                    <Badge variant="secondary" className="flex-1 text-center justify-center">Tom: {currentSong.key ? transposeChord(currentSong.key, transpositions[currentSec.songIndex]) : 'N/A'}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => changeTranspose(1)}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center justify-between border rounded-md p-1 px-3 bg-background h-10 flex-1">
                    <Label className="text-xs">Cifras</Label>
                    <Switch checked={showChords} onCheckedChange={setShowChords} />
                </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between h-8">
            <Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href={`/setlists/${setlistId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
            <h1 className="text-sm font-bold truncate flex-1 text-center">{currentSong.title}</h1>
            <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
          </div>
        )}
      </Card>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {isContinuousMode || !showChords ? (
          <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6 bg-white dark:bg-black rounded-lg border">
              {offlineData.songs.map((song, songIdx) => (
                <div key={songIdx} className="flex flex-col mb-12">
                  <div className="mb-6 border-l-4 border-primary/20 pl-4">
                      <h2 className="text-2xl font-bold text-primary">{song.title}</h2>
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                  </div>
                  {allSections.filter(s => s.songIndex === songIdx).map((sec) => (
                    <div key={allSections.indexOf(sec)} data-section-index={allSections.indexOf(sec)}>
                        <SongDisplay 
                            style={{ fontSize: `${fontSize}px`, '--lyrics-color': finalColorSettings.lyricsColor, '--chords-color': finalColorSettings.chordsColor } as React.CSSProperties}
                            content={transposeContent(sec.content, transpositions[songIdx] || 0)}
                            showChords={showChords} 
                        />
                    </div>
                  ))}
                </div>
              ))}
          </ScrollArea>
        ) : (
          <Carousel className="w-full flex-1" setApi={setApi}>
            <CarouselContent>
              {allSections.map((section, index) => (
                <CarouselItem key={index}>
                    <SongPresenter 
                        section={section} 
                        transposeValue={transpositions[section.songIndex] || 0} 
                        fontSize={fontSize} 
                        showChords={showChords} 
                        colorSettings={finalColorSettings}
                        song={offlineData.songs[section.songIndex]}
                    />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur border-t z-50">
          <div className="max-w-xl mx-auto flex items-center gap-4 p-2 rounded-lg border bg-muted/20">
                {!isContinuousMode && showChords ? (
                    <Button onClick={toggleAutoScroll} className="h-9 w-36 gap-2"><Play className="h-4 w-4" />Iniciar</Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant={isAutoScrolling ? "destructive" : "default"} onClick={toggleAutoScroll} className="h-9 w-36">{isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                        {showChords && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline" className="h-9 w-12"><X className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Parar Rolagem?</AlertDialogTitle><AlertDialogDescription>Deseja voltar ao modo de slides exatamente nesta posição?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={stopAutoScroll}>Sim, Parar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                )}
              {(isContinuousMode || !showChords) && (
                  <div className="flex-1 flex items-center gap-3">
                      <Slider value={[scrollSpeed]} onValueChange={(val) => setScrollSpeed(val[0])} max={100} min={1} />
                      <span className="text-[10px] font-mono font-bold w-10 text-primary">{scrollSpeed}</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}