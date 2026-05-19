'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type User, type AppSettings } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Save, Loader2, MessageSquare, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Função auxiliar para converter com segurança valores de data do Firestore/App
const parseSafeDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // Se já for um objeto Date
  if (dateValue instanceof Date) return dateValue;
  
  // Se for um Timestamp do Firestore (objeto com toDate())
  if (typeof dateValue.toDate === 'function') return dateValue.toDate();
  
  // Se for um Timestamp do Firestore (objeto com seconds/nanoseconds)
  if (dateValue.seconds !== undefined) return new Date(dateValue.seconds * 1000);
  
  // Se for string ou número
  const d = new Date(dateValue);
  return isValid(d) ? d : null;
};

export default function UsersPage() {
  const { isAdmin, loading: loadingAuth } = useRequireAuth();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Só habilita a busca se for admin para evitar erros de permissão no console
  const { data: users, loading: loadingUsers, updateDocument } = useFirestoreCollection<User>(
    'users', 
    'createdAt', 
    [], 
    isAdmin === true
  );

  const { data: appSettings, loading: loadingSettings, updateDocument: updateSettings } = useFirestoreDocument<AppSettings>('settings', 'app');
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (appSettings?.adminWhatsApp) {
        setWhatsappNumber(appSettings.adminWhatsApp);
    }
  }, [appSettings]);

  useEffect(() => {
    if (!loadingAuth && !isAdmin) {
      router.push('/dashboard');
    }
  }, [loadingAuth, isAdmin, router]);

  const handleApprovalChange = (userId: string, isApproved: boolean) => {
    updateDocument(userId, { isApproved });
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'user') => {
    updateDocument(userId, { role });
  };

  const performDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const userRef = doc(db, 'users', userToDelete.id);
      await deleteDoc(userRef);
      
      toast({
        title: "Usuário Removido",
        description: `Dados de ${userToDelete.displayName} excluídos. Lembre-se de remover o e-mail no console Auth.`,
      });
      setUserToDelete(null);
    } catch (error: any) {
      console.error("ERRO DE EXCLUSÃO:", error);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "A operação foi negada pelo banco de dados.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
        await updateSettings({ adminWhatsApp: whatsappNumber });
        toast({
            title: "Configurações salvas",
            description: "O número de WhatsApp foi atualizado.",
        });
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
    } finally {
        setIsSavingSettings(false);
    }
  };
  
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const dateA = parseSafeDate(a.createdAt)?.getTime() || 0;
      const dateB = parseSafeDate(b.createdAt)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [users]);

  if (!isMounted || loadingAuth || (isAdmin && loadingUsers) || loadingSettings) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
        </div>
        <Card>
            <CardContent className="p-6">
                 <Skeleton className="h-[400px] w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tight">Gerenciamento do Sistema</h2>
            <div className="text-muted-foreground text-sm">Administre usuários e configurações globais.</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    WhatsApp Admin
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="whatsapp">Número para Notificação</Label>
                    <Input 
                        id="whatsapp"
                        placeholder="Ex: 5511999999999"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full">
                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar
                </Button>
            </CardFooter>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Membros do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome / E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Aprovado</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedUsers.map((u) => {
                    const registrationDate = parseSafeDate(u.createdAt);
                    
                    return (
                    <TableRow key={u.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{u.displayName}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            {registrationDate && (
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1 font-mono uppercase">
                                <Calendar className="h-2.5 w-2.5" />
                                {format(registrationDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Select
                        value={u.role}
                        onValueChange={(value: 'admin' | 'user') => handleRoleChange(u.id, value)}
                        disabled={u.id === currentUser?.uid}
                        >
                        <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                        <Switch
                            checked={u.isApproved}
                            onCheckedChange={(checked) => handleApprovalChange(u.id, checked)}
                            disabled={u.id === currentUser?.uid}
                        />
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={u.id === currentUser?.uid}
                            onClick={() => setUserToDelete(u)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                )})}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <div className="text-sm">
                            Deseja remover <strong>{userToDelete?.displayName}</strong>?
                        </div>
                        <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md text-destructive text-xs leading-relaxed">
                            <div className="font-bold uppercase mb-1">Aviso:</div>
                            Esta ação remove os dados do Firestore. O acesso no Console do Firebase (Auth) deve ser removido manualmente.
                        </div>
                      </div>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                      onClick={(e) => {
                          e.preventDefault();
                          performDeleteUser();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                  >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirmar Exclusão"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
