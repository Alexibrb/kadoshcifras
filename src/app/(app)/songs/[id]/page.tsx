
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Song, type MetadataItem, Setlist, SetlistSong, PedalSettings, ColorSettings } from '@/types';
import { ArrowLeft, Edit, Minus, Plus, Save, PlayCircle, Eye, EyeOff, PanelTopClose, PanelTopOpen, ChevronLeft, ChevronRight, Check, File, Music, Play, Pause, X, Zap, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { transposeContent, transposeChord } from '@/lib/music';
import { Textarea } from '@/components/ui/textarea';
import { SongDisplay } from '@/components/song-display';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const ALL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

const SILENT_AUDIO_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

export default function SongPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const songId = params.id as string;
  const fromSetlistId = searchParams.get('fromSetlist');
  const initialTranspose = parseInt(searchParams.get('transpose') || '0', 10);

  const { appUser, loading: authLoading } = useAuth();
  
  const { data: song, loading: loadingSong, updateDocument: updateSongDoc } = useFirestoreDocument<Song>(
    'songs', 
    appUser?.isApproved ? songId : null
  );
  
  const { data: setlist, loading: loadingSetlist, updateDocument: updateSetlistDoc } = useFirestoreDocument<Setlist>(
    'setlists', 
    (appUser?.isApproved && fromSetlistId) ? fromSetlistId : null
  );
  
  const [pedalSettings] = useLocalStorage<PedalSettings>('pedal-settings', { 
    prevPage: ',', 
    nextPage: '.',
    prevSong: '[',
    nextSong: ']',
  });
  
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [transpose, setTranspose] = useState(initialTranspose);
  const [showChords, setShowChords] = useLocalStorage('song-show-chords', true);
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(1)
  const [count, setCount] = useState(0)
  const [isPanelVisible, setIsPanelVisible] = useLocalStorage('song-panel-visible', true);
  const [toneSaveSuccess, setToneSaveSuccess] = useState(false);
  
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(10);
  const lastScrollTime = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);
  const requestRef = useRef<number>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [editedSong, setEditedSong] = useState<Song | null>(null);
  
  const { data: artists, loading: loadingArtists } = useFirestoreCollection<MetadataItem>('artists', 'name', appUser?.isApproved ? [] : [['id', '==', 'disabled']]);
  const { data: genres, loading: loadingGenres } = useFirestoreCollection<MetadataItem>('genres', 'name', appUser?.isApproved ? [] : [['id', '==', 'disabled']]);
  const { data: categories, loading: loadingCategories } = useFirestoreCollection<MetadataItem>('categories', 'name', appUser?.isApproved ? [] : [['id', '==', 'disabled']]);

  const containerRef = useRef<HTMLDivElement>(null);
  const initialKeyRef = useRef(song?.key);

  const finalFontSize = useMemo(() => appUser?.fontSize ?? 14, [appUser]);

  const finalColorSettings: ColorSettings | null = useMemo(() => {
    if (!isClient) return null;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const defaultSettings: ColorSettings = {
        lyricsColor: isDarkMode ? '#FFFFFF' : '#000000',
        chordsColor: isDarkMode ? '#F59E0B' : '#000000',
    };
    const userSettings = appUser?.colorSettings;
    if (userSettings && userSettings.lyricsColor && userSettings.chordsColor) {
        return userSettings;
    }
    return defaultSettings;
  }, [appUser, isClient]);

  useEffect(() => {
    setIsClient(true);
    setTranspose(initialTranspose);
    if (containerRef.current) {
        containerRef.current.focus();
    }
    // Setup silent audio for media session keep-alive
    if (typeof window !== 'undefined') {
      silentAudioRef.current = new Audio(SILENT_AUDIO_BASE64);
      if (silentAudioRef.current) silentAudioRef.current.loop = true;
    }
  }, [initialTranspose]);

  // Media Session Control
  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator) || !song) return;

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: 'CifrasKadosh',
          artwork: [{ src: 'https://placehold.co/512x512/9f50e5/ffffff?text=K', sizes: '512x512', type: 'image/png' }]
        });

        const handlePlay = () => {
          setIsAutoScrolling(true);
          setIsContinuousMode(true);
        };

        const handlePause = () => {
          setIsAutoScrolling(false);
        };

        navigator.mediaSession.setActionHandler('play', handlePlay);
        navigator.mediaSession.setActionHandler('pause', handlePause);
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (!isContinuousMode && api) api.scrollPrev();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (!isContinuousMode && api) api.scrollNext();
        });
    } catch (e) {
        console.error("Error setting up MediaSession:", e);
    }

    return () => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
        }
    };
  }, [isClient, song, api, isContinuousMode]);

  // Update Media Session State
  useEffect(() => {
    if (isClient && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isAutoScrolling ? 'playing' : 'paused';
      if (isAutoScrolling) {
        silentAudioRef.current?.play().catch(() => {});
      } else {
        silentAudioRef.current?.pause();
      }
    }
  }, [isAutoScrolling, isClient]);

  useEffect(() => {
    if (song) {
        setEditedSong(song);
        if (initialKeyRef.current !== undefined && song.key !== initialKeyRef.current) {
            const currentTranspose = fromSetlistId && setlist ? (setlist.songs.find(s => s.songId === songId)?.transpose ?? 0) : 0;
            setTranspose(currentTranspose);
        }
        initialKeyRef.current = song.key;
    }
  }, [song, initialTranspose, fromSetlistId, setlist, songId]);

  useEffect(() => {
    if (!api || isContinuousMode) return;
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1)
    }
    api.on("select", onSelect);
    return () => {
        api.off("select", onSelect);
    }
  }, [api, isContinuousMode])

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
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        lastScrollTime.current = 0;
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isAutoScrolling, animateScroll]);

  const { prevSongId, nextSongId, prevTranspose, nextTranspose } = useMemo(() => {
    if (!fromSetlistId || !setlist || !setlist.songs || setlist.songs.length < 2) {
      return { prevSongId: null, nextSongId: null, prevTranspose: 0, nextTranspose: 0 };
    }
    const currentIndex = setlist.songs.findIndex(s => s.songId === songId);
    if (currentIndex === -1) {
      return { prevSongId: null, nextSongId: null, prevTranspose: 0, nextTranspose: 0 };
    }
    const prev = currentIndex > 0 ? setlist.songs[currentIndex - 1] : null;
    const next = currentIndex < setlist.songs.length - 1 ? setlist.songs[currentIndex + 1] : null;
    return { 
        prevSongId: prev?.songId || null, 
        nextSongId: next?.songId || null,
        prevTranspose: prev?.transpose || 0,
        nextTranspose: next?.transpose || 0,
    };
  }, [setlist, songId, fromSetlistId]);

  const contentToDisplay = useMemo(() => {
    const currentContent = isEditing ? editedSong?.content : song?.content;
    if (!currentContent) return '';
    return transposeContent(currentContent, transpose);
  }, [song, editedSong, transpose, isEditing]);

  const songParts = useMemo(() => {
    return contentToDisplay.split(/\n\s*\n\s*\n/);
  }, [contentToDisplay]);

  useEffect(() => {
    if (!isContinuousMode || !isClient) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const partIdx = parseInt(entry.target.getAttribute('data-part-index') || '0', 10);
            setCurrent(partIdx + 1);
          }
        });
      },
      {
        root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'),
        threshold: 0,
        rootMargin: '-10% 0px -85% 0px'
      }
    );

    const parts = document.querySelectorAll('[data-part-index]');
    parts.forEach(p => observer.observe(p));

    return () => observer.disconnect();
  }, [isContinuousMode, isClient, songParts]);

  const toggleAutoScroll = useCallback(() => {
    // Force silent audio unlock on user interaction
    silentAudioRef.current?.play().catch(() => {});
    
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
    silentAudioRef.current?.pause();
    
    setTimeout(() => {
      if (api) {
        api.scrollTo(current - 1, false);
      }
    }, 150);
  }, [api, current]);

  const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEditing) return;
        const key = event.key;

        if (key === pedalSettings.nextSong) {
            event.preventDefault();
            toggleAutoScroll();
            return;
        }

        if (key === pedalSettings.prevSong) {
            event.preventDefault();
            if (isContinuousMode) {
                setIsAutoScrolling(false);
            }
            return;
        }

        if (!isAutoScrolling) {
            if (showChords && (key === "ArrowLeft" || key === 'PageUp' || key === pedalSettings.prevPage)) {
                event.preventDefault()
                api?.scrollPrev()
            } else if (showChords && (key === "ArrowRight" || key === 'PageDown' || key === pedalSettings.nextPage)) {
                event.preventDefault()
                api?.scrollNext()
            }
        }
      },
      [api, isEditing, showChords, pedalSettings, isContinuousMode, isAutoScrolling, toggleAutoScroll]
    )
  
  const handleSave = async () => {
    if (!editedSong || !editedSong.title || !editedSong.artist || !editedSong.category || !editedSong.genre) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    await updateSongDoc(editedSong);
    setIsEditing(false);
    setIsMetadataExpanded(false);
  };

  const handleSaveTransposeToSetlist = useCallback(async () => {
    if (!fromSetlistId || !setlist || !setlist.songs) return;
    const newSongs = setlist.songs.map(s => 
      s.songId === songId ? { ...s, transpose: transpose } : s
    );
    await updateSetlistDoc({ songs: newSongs });
    setToneSaveSuccess(true);
    setTimeout(() => setToneSaveSuccess(false), 2000);
  }, [fromSetlistId, setlist, songId, updateSetlistDoc, transpose]);

  const changeTranspose = (change: number) => {
    const newTranspose = Math.min(12, Math.max(-12, transpose + change));
    setTranspose(newTranspose);
  };

  if (isClient && !loadingSong && !song && !authLoading) {
    notFound();
  }
  
  if (!isClient || authLoading || loadingSong || !song || !finalColorSettings || loadingArtists || loadingGenres || loadingCategories || (fromSetlistId && loadingSetlist)) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-[60vh] w-full" />
        </div>
    );
  }

  const backUrl = fromSetlistId ? `/setlists/${fromSetlistId}` : '/songs';

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col p-4 md:p-8 pt-6 pb-24 h-screen outline-none overflow-hidden relative" 
      onKeyDownCapture={handleKeyDown} 
      tabIndex={-1}
    >
      {!isEditing && (
        <div className={cn("flex flex-col gap-2 shrink-0 transition-all", isPanelVisible ? "mb-4" : "mb-1")}>
          <Card className="bg-accent/10 transition-all duration-300">
            <CardContent className={cn("transition-all", isPanelVisible ? "p-4 space-y-4" : "p-1.5")}>
               {isPanelVisible ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                        <Button asChild variant="outline" size="icon" className="shrink-0">
                            <Link href={backUrl}><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
                        </Button>
                        <div className="flex-1 space-y-1 text-center">
                            <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-widest truncate">{song.title}</h1>
                            <div className="flex flex-row items-center justify-center gap-2">
                                <Button variant="outline" onClick={() => { setIsEditing(true); setIsMetadataExpanded(false); }} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 text-xs">
                                    <Edit className="mr-1.5 h-3 w-3" /> Editar
                                </Button>
                                {song.url && (
                                    <Button asChild variant="destructive" size="sm" className="h-8 text-xs">
                                        <a href={song.url} target="_blank" rel="noopener noreferrer"><PlayCircle className="mr-1.5 h-3 w-3" /> Ouvir</a>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Button onClick={() => setIsPanelVisible(false)} variant="ghost" size="icon" className="shrink-0"><PanelTopClose className="h-5 w-5" /></Button>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-2 flex-wrap">
                        <div className="flex items-center gap-1 rounded-md border p-1 w-full max-w-sm bg-background">
                          <Button variant="ghost" size="icon" onClick={() => changeTranspose(-1)} className="h-8 w-8"><Minus className="h-4 w-4" /></Button>
                          <Badge variant="secondary" className="px-3 py-1 text-xs whitespace-nowrap flex-grow text-center justify-center">Tom: {transpose > 0 ? '+' : ''}{transpose}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => changeTranspose(1)} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                          {fromSetlistId && (
                            <Button variant={toneSaveSuccess ? "default" : "outline"} size="sm" onClick={handleSaveTransposeToSetlist} className={cn("h-8 ml-2", toneSaveSuccess && "bg-green-500")}>
                               {toneSaveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                               <span className="ml-2 hidden sm:inline">{toneSaveSuccess ? "Salvo!" : "Salvar Tom"}</span>
                            </Button>
                          )}
                        </div>
                         <div className="flex items-center justify-between space-x-2 rounded-md border p-1 px-3 bg-background h-10 w-full max-w-xs">
                          <Label htmlFor="show-chords" className="text-sm whitespace-nowrap">Mostrar Cifras</Label>
                          <Switch id="show-chords" checked={showChords} onCheckedChange={setShowChords} />
                        </div>
                    </div>
                  </>
               ) : (
                  <div className="flex items-center justify-between gap-4 h-8">
                       <Button asChild variant="outline" size="icon" className="shrink-0 h-8 w-8"><Link href={backUrl}><ArrowLeft className="h-4 w-4" /></Link></Button>
                       <div className="flex flex-col items-center overflow-hidden flex-1">
                          <h1 className="text-base font-bold font-headline tracking-tight truncate w-full text-center">{song.title}</h1>
                       </div>
                       <Button onClick={() => setIsPanelVisible(true)} variant="ghost" size="icon" className="shrink-0 h-8 w-8"><PanelTopOpen className="h-5 w-5" /></Button>
                  </div>
               )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {isEditing && editedSong && (
        <div className="transition-all duration-300 shrink-0">
           <Card className="mb-2 bg-accent/10 border-none shadow-none">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                  <Button variant="outline" onClick={() => { setIsEditing(false); setIsMetadataExpanded(false); }} size="sm">Cancelar</Button>
                  <div className="flex-1 flex flex-col items-center">
                    <h1 className="text-xs font-bold font-headline truncate opacity-70">Editando: {song.title}</h1>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                        className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                    >
                        {isMetadataExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                        Informações da Música
                    </Button>
                  </div>
                  <Button onClick={handleSave} size="sm"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
              </CardContent>
           </Card>
           
           {isMetadataExpanded && (
             <Card className="mb-4 animate-in slide-in-from-top-2 duration-200">
                <CardContent className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label>Título</Label><Input value={editedSong.title} onChange={(e) => setEditedSong({...editedSong, title: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Artista</Label><Input value={editedSong.artist} onChange={(e) => setEditedSong({...editedSong, artist: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Tom</Label><Select value={editedSong.key} onValueChange={(v) => setEditedSong({...editedSong, key: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{ALL_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
            </Card>
           )}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative">
        {isEditing ? (
           <div className="h-full flex flex-col">
              <Alert variant="destructive" className="p-2 mb-2 bg-destructive/5 border-destructive/20 text-destructive">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-[10px] leading-tight">
                  Dica: Duas linhas em branco criam uma nova página para o modo de apresentação.
                </AlertDescription>
              </Alert>
              <Textarea
                id="content"
                value={editedSong?.content || ''}
                onChange={(e) => setEditedSong(prev => prev ? {...prev, content: e.target.value} : null)}
                placeholder="Digite ou cole sua cifra aqui"
                className="flex-1 font-code resize-none focus-visible:ring-1 text-base leading-relaxed"
                style={{ whiteSpace: 'pre', overflowX: 'auto' }}
              />
           </div>
        ) : (isContinuousMode || !showChords) ? (
          <Card className="flex-1 flex flex-col bg-white dark:bg-black shadow-none border-none overflow-hidden">
              <CardContent className="h-full flex flex-col p-0">
                  <ScrollArea ref={scrollAreaRef} className="h-full p-4 md:p-6 flex-1">
                      <div className="mb-6 border-l-4 border-primary/20 pl-4 py-2">
                          <h2 className="text-2xl font-bold font-headline text-primary">{song.title}</h2>
                          <p className="text-sm text-muted-foreground">{song.artist}</p>
                      </div>
                      <div className="flex flex-col">
                        {songParts.map((part, idx) => (
                          <div key={idx} data-part-index={idx}>
                             <SongDisplay 
                                style={{ 
                                  fontSize: `${finalFontSize}px`,
                                  '--lyrics-color': finalColorSettings.lyricsColor,
                                  '--chords-color': finalColorSettings.chordsColor,
                                } as React.CSSProperties}
                                content={part}
                                showChords={showChords} 
                            />
                          </div>
                        ))}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
        ) : (
          <div className="relative flex-1 flex flex-col">
             <div className="flex justify-center items-center gap-4 text-center text-sm text-muted-foreground pt-2 pb-4">
                 <Button asChild variant="ghost" size="icon" disabled={!fromSetlistId || !prevSongId}>
                    {fromSetlistId && prevSongId ? <Link href={`/songs/${prevSongId}?fromSetlist=${fromSetlistId}&transpose=${prevTranspose}`}><ChevronLeft className="h-6 w-6" /></Link> : <ChevronLeft className="h-6 w-6 opacity-0" />}
                 </Button>
                 {count > 1 && <span className="flex items-center gap-1.5"><File className="h-4 w-4" /> {current} de {count}</span>}
                 <Button asChild variant="ghost" size="icon" disabled={!fromSetlistId || !nextSongId}>
                    {fromSetlistId && nextSongId ? <Link href={`/songs/${nextSongId}?fromSetlist=${fromSetlistId}&transpose=${nextTranspose}`}><ChevronRight className="h-6 w-6" /></Link> : <ChevronRight className="h-6 w-6 opacity-0" />}
                 </Button>
             </div>
             <Carousel className="w-full flex-1" setApi={setApi} opts={{ watchDrag: true }}>
                <CarouselContent>
                  {songParts.map((part, index) => (
                    <CarouselItem key={index} className="h-full">
                      <Card className="w-full h-full flex flex-col bg-white dark:bg-black shadow-none border-none">
                        <CardContent className="flex-1 h-full p-0">
                          <ScrollArea className="h-full p-4 md:p-6">
                            <SongDisplay 
                                style={{ 
                                  fontSize: `${finalFontSize}px`, 
                                  '--lyrics-color': finalColorSettings.lyricsColor,
                                  '--chords-color': finalColorSettings.chordsColor,
                                } as React.CSSProperties}
                                content={part} 
                                showChords={showChords}
                            />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute left-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollPrev()} />
                <div className="absolute right-0 top-0 h-full w-1/3 z-10" onClick={() => api?.scrollNext()} />
              </Carousel>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
            <div className="max-w-screen-xl mx-auto flex flex-row items-center gap-4 w-full p-2 rounded-md border bg-muted/30 shadow-sm">
                <div className="flex items-center gap-2">
                    {!isContinuousMode && showChords ? (
                        <Button size="sm" variant="default" onClick={toggleAutoScroll} className="h-8 gap-2 px-6">
                            <Play className="h-4 w-4" /><span className="text-[10px] md:text-xs font-bold">Rolagem</span>
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant={isAutoScrolling ? "destructive" : "default"} onClick={toggleAutoScroll} className="h-8 w-16">
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
                {(isContinuousMode || !showChords) && (
                    <div className="flex-1 flex items-center gap-2">
                        <Slider value={[scrollSpeed]} onValueChange={(val) => setScrollSpeed(val[0])} max={100} min={1} step={1} className="flex-1" />
                        <span className="text-[10px] font-mono font-bold w-12 text-primary">{scrollSpeed}</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
