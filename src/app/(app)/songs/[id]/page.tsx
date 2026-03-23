'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song, type MetadataItem, Setlist, PedalSettings, ColorSettings } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save, PlayCircle, PanelTopClose, PanelTopOpen, ChevronLeft, ChevronRight, Check, File, Play, Pause, X, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { transposeContent, transposeChord } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/use-auth';
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

const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'];
const SILENT_AUDIO_BASE64 = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAgD8AAIA/AAABAAgAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const songId = params.id as string;
  const fromSetlistId = searchParams.get('fromSetlist');
  const initialTranspose = parseInt(searchParams.get('transpose') || '0', 10);

  const { appUser, loading: authLoading } = useAuth();
  const { data: song, loading: loadingSong, updateDocument: updateSongDoc } = useFirestoreDocument<Song>('songs', appUser?.isApproved ? songId : null);
  const { data: setlist, updateDocument: updateSetlistDoc } = useFirestoreDocument<Setlist>('setlists', fromSetlistId);
  
  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', { prevPage: ',', nextPage: '.', prevSong: '[', nextSong: ']' });
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);
  const requestRef = useRef<number>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [editedSong, setEditedSong] = useState<Song | null>(null);
  
  const { data: artists } = useFirestoreCollection<MetadataItem>('artists', 'name');
  const finalFontSize = appUser?.fontSize ?? 14;

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
        const audio = new Audio(SILENT_AUDIO_BASE64);
        audio.loop = true;
        silentAudioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    if (song) setEditedSong(song);
  }, [song]);

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
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
    }
    setTimeout(() => { if (api) api.scrollTo(current - 1, false); }, 150);
  }, [api, current]);

  const contentToDisplay = useMemo(() => {
    const content = isEditing ? editedSong?.content : song?.content;
    return content ? transposeContent(content, transpose) : '';
  }, [song, editedSong, transpose, isEditing]);

  const songParts = useMemo(() => contentToDisplay.split(/\n\s*\n\s*\n/), [contentToDisplay]);

  // Observer para rastrear a página na rolagem contínua
  useEffect(() => {
    if (!isContinuousMode || !isClient) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.getAttribute('data-part-index') || '0', 10);
          setCurrent(idx + 1);
        }
      });
    }, { root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'), threshold: 0, rootMargin: '-10% 0px -85% 0px' });
    document.querySelectorAll('[data-part-index]').forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [isContinuousMode, isClient, songParts]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); }
  }, [api, isContinuousMode]);

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

  // Media Session
  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator) || !song) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist });
    navigator.mediaSession.setActionHandler('play', () => {
      if (silentAudioRef.current) silentAudioRef.current.play().catch(() => {});
      setIsAutoScrolling(true);
      setIsContinuousMode(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      setIsAutoScrolling(false);
      if (silentAudioRef.current) silentAudioRef.current.pause();
    });
    return () => {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [isClient, song]);

  useEffect(() => {
    if (isClient && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isAutoScrolling ? 'playing' : 'paused';
    }
  }, [isAutoScrolling, isClient]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return;
    if (e.key === pedalSettings.nextSong) { e.preventDefault(); toggleAutoScroll(); }
    else if (e.key === pedalSettings.prevSong) { e.preventDefault(); if (isContinuousMode) setIsAutoScrolling(false); }
    else if (!isAutoScrolling && showChords) {
        if (e.key === pedalSettings.nextPage) api?.scrollNext();
        else if (e.key === pedalSettings.prevPage) api?.scrollPrev();
    }
  }, [api, isEditing, pedalSettings, isAutoScrolling, isContinuousMode, toggleAutoScroll, showChords]);

  if (!isClient || authLoading || loadingSong || !song) return <div className="flex-1 flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 h-screen outline-none overflow-hidden relative" onKeyDownCapture={handleKeyDown} tabIndex={-1}>
      {!isEditing && (
        <Card className="mb-4 bg-accent/5">
          <CardContent className={cn("transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
            {isPanelVisible ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <Button asChild variant="outline" size="icon"><Link href={fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs'}><ArrowLeft className="h-4 w-4" /></Link></Button>
                  <div className="text-center flex-1">
                    <h1 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{song.title}</h1>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 text-xs text-primary"><Edit className="mr-1 h-3 w-3" /> Editar</Button>
                  </div>
                  <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon"><PanelTopClose className="h-5 w-5" /></Button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <div className="flex items-center gap-1 border rounded-md p-1 bg-background h-10 w-48">
                        <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.max(-12, t - 1))} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                        <Badge variant="secondary" className="flex-1 text-center justify-center">Tom: {transpose > 0 ? '+' : ''}{transpose}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => setTranspose(t => Math.min(12, t + 1))} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-center justify-between border rounded-md p-1 px-3 bg-background h-10 w-40">
                        <Label className="text-xs">Cifras</Label>
                        <Switch checked={showChords} onCheckedChange={setShowChords} />
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between h-8">
                <Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href="/songs"><ArrowLeft className="h-4 w-4" /></Link></Button>
                <h1 className="text-sm font-bold truncate flex-1 text-center">{song.title}</h1>
                <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        {isContinuousMode || !showChords ? (
          <ScrollArea ref={scrollAreaRef} className="h-full bg-white dark:bg-black rounded-lg">
            <div className="p-4 md:p-8">
              {songParts.map((part, idx) => <div key={idx} data-part-index={idx}><SongDisplay content={part} showChords={showChords} style={{ fontSize: `${finalFontSize}px` }} /></div>)}
            </div>
          </ScrollArea>
        ) : (
          <div className="relative flex-1">
             <div className="text-center text-xs text-muted-foreground mb-2">Página {current} de {songParts.length}</div>
             <Carousel className="w-full h-full" setApi={setApi} opts={{ watchDrag: true }}>
                <CarouselContent className="h-full">
                  {songParts.map((part, index) => (
                    <CarouselItem key={index} className="h-full">
                      <ScrollArea className="h-full p-4 md:p-8 bg-white dark:bg-black rounded-lg border">
                        <SongDisplay content={part} showChords={showChords} style={{ fontSize: `${finalFontSize}px` }} />
                      </ScrollArea>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-50">
            <div className="max-w-xl mx-auto flex items-center gap-4 p-2 rounded-lg border bg-muted/20">
                {!isContinuousMode && showChords ? (
                    <Button onClick={toggleAutoScroll} className="h-9 gap-2 px-8 w-36"><Play className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Iniciar</span></Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant={isAutoScrolling ? "destructive" : "default"} onClick={toggleAutoScroll} className="h-9 w-36">{isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                        {showChords && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline" className="h-9 w-12"><X className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Parar Rolagem?</AlertDialogTitle><AlertDialogDescription>Deseja voltar ao modo de slides na página atual?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={stopAutoScroll}>Sim, Parar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                )}
                {(isContinuousMode || !showChords) && (
                    <div className="flex-1 flex items-center gap-3">
                        <Slider value={[scrollSpeed]} onValueChange={(v) => setScrollSpeed(v[0])} max={100} min={1} className="flex-1" />
                        <span className="text-[10px] font-mono font-bold w-10 text-primary">{scrollSpeed}</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
