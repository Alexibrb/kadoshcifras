
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { type Setlist } from '@/types';
import { ListMusic, PlusCircle, Trash2, User, Globe, Lock, Eye, EyeOff, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
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
} from "@/components/ui/alert-dialog"
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SetlistsPage() {
  const { appUser, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  // Busca os repertórios do PRÓPRIO usuário
  const { data: mySetlistsData, loading: loadingMySetlists } = useFirestoreCollection<Setlist>(
    'setlists',
    undefined,
    appUser ? [['creatorId', '==', appUser.id]] : [['id', '==', 'none']]
  );

  // Busca os repertórios que sejam VISÍVEIS
  const { data: otherSetlistsData, loading: loadingOtherSetlists } = useFirestoreCollection<Setlist>(
    'setlists',
    undefined,
    [['isVisible', '==', true]]
  );

  const { deleteDocument } = useFirestoreCollection<Setlist>('setlists');

  const loading = authLoading || loadingMySetlists || loadingOtherSetlists || !isClient;

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const setlists = useMemo(() => {
    if (!isClient || !appUser) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filtra outros repertórios para remover os expirados
    const filteredOthers = otherSetlistsData.filter(s => {
        if (s.creatorId === appUser.id) return false;
        
        if (s.eventDate) {
            let eventDate: Date;
            if (typeof (s.eventDate as any).toDate === 'function') {
                eventDate = (s.eventDate as any).toDate();
            } else {
                eventDate = new Date(s.eventDate as any);
            }
            // Se a data do evento já passou, oculta para os outros
            if (eventDate < now) return false;
        }
        
        return true;
    });

    const combined = [...mySetlistsData, ...filteredOthers];
    const uniqueSetlists = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    return uniqueSetlists.sort((a,b) => a.name.localeCompare(b.name));
  }, [mySetlistsData, otherSetlistsData, appUser, isClient]);


  const deleteSetlist = (id: string) => {
    deleteDocument(id);
  };

  const getEventDateText = (eventDate: any) => {
      if (!eventDate) return null;
      let date: Date;
      if (typeof eventDate.toDate === 'function') {
          date = eventDate.toDate();
      } else {
          date = new Date(eventDate);
      }
      return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Repertórios</h2>
         <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/setlists/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Novo Repertório
              </Link>
            </Button>
        </div>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : setlists.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
          <div className="flex flex-col items-center gap-1 text-center">
            <ListMusic className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-2xl font-bold tracking-tight">Você não tem nenhum repertório</h3>
            <p className="text-sm text-muted-foreground">Comece criando um novo repertório para seus shows e ensaios.</p>
            <Button className="mt-4" asChild>
              <Link href="/setlists/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Repertório
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setlists.map((setlist) => {
              const canDelete = appUser?.role === 'admin' || appUser?.id === setlist.creatorId;
              const hasSongs = (setlist.songs?.length || 0) > 0;
              const dateText = getEventDateText(setlist.eventDate);

              return (
              <Card 
                key={setlist.id} 
                className={cn(
                    "p-4 flex flex-col border-l-4 transition-all hover:shadow-md",
                    hasSongs ? "border-l-primary" : "border-l-muted-foreground/30"
                )}
              >
                <div className="flex items-start justify-between gap-4 flex-grow">
                  <div className="flex-grow overflow-hidden">
                     <Link href={`/setlists/${setlist.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg truncate font-headline">{setlist.name}</p>
                        </div>
                     </Link>
                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1.5">
                            {setlist.isPublic ? <Globe className="h-3.5 w-3.5 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
                            {setlist.isVisible === false ? <EyeOff className="h-3.5 w-3.5 shrink-0" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
                            <span className={cn("text-xs", hasSongs ? "text-foreground font-medium" : "text-muted-foreground")}>
                                {setlist.songs?.length || 0} músicas
                            </span>
                        </div>
                        {dateText && (
                            <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                <Calendar className="h-3 w-3" />
                                {dateText}
                            </div>
                        )}
                     </div>
                     {setlist.creatorName && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <User className="h-2.5 w-2.5" />
                            <span>{setlist.creatorName}</span>
                        </div>
                     )}
                  </div>
                  <div className="flex items-center shrink-0">
                    {canDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Excluir</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o repertório.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSetlist(setlist.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </div>
                </div>
              </Card>
            )})}
        </div>
      )}
    </div>
  );
}
