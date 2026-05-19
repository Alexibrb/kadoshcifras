
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
import { Save, Loader2, MessageSquare, Trash2, Calendar, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
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
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (dateValue.seconds !== undefined) return new Date(dateValue.seconds * 1000);
  const d = new Date(dateValue);
  return isValid(d) ? d : null;
};

export default function UsersPage() {
  const { isAdmin, loading: loadingAuth } = useRequireAuth();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const { data: users, loading: loadingUsers, updateDocument } = useFirestoreCollection<User>(
    'users', 
    'createdAt', 
    [], 
    isAdmin === true
  );

  const { data: appSettings, loading: loadingSettings, updateDocument: updateSettings } = useFirestoreDocument<AppSettings>('settings', 'app');
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para controlar quais usuários estão expandidos
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMounted(true);
    if (appSettings) {
        setWhatsappNumber(appSettings.adminWhatsApp || '');
        setPixKey(appSettings.adminPixKey || '');
    }
  }, [appSettings]);

  useEffect(() => {
    if (!loadingAuth && !isAdmin) {
      router.push('/dashboard');
    }
  }, [loadingAuth, isAdmin, router]);

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

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
        await updateSettings({ 
          adminWhatsApp: whatsappNumber,
          adminPixKey: pixKey 
        });
        toast({
            title: "Configurações salvas",
            description: "As informações do sistema foram atualizadas.",
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
                    Configurações Globais
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-xs font-bold uppercase">WhatsApp Admin</Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          id="whatsapp"
                          placeholder="Ex: 5511999999999"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="pl-9"
                      />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pix" className="text-xs font-bold uppercase">Chave Pix Doação</Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          id="pix"
                          placeholder="E-mail, CPF ou Aleatória"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className="pl-9"
                      />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full">
                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configurações
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
                    <TableHead>Membro</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedUsers.map((u) => {
                    const registrationDate = parseSafeDate(u.createdAt);
                    const isExpanded = expandedUsers[u.id];
                    
                    return (
                    <TableRow key={u.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 p-0 hover:bg-transparent" 
                                  onClick={() => toggleExpand(u.id)}
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                                <span className="font-semibold text-sm">{u.displayName}</span>
                            </div>
                            
                            {isExpanded && (
                              <div className="pl-8 mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <span className="text-[10px] text-muted-foreground block select-all">{u.email}</span>
                                {registrationDate && (
                                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-mono uppercase">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {format(registrationDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </div>
                                )}
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
