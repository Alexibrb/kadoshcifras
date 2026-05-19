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
import { Save, Loader2, MessageSquare, Trash2, Bug, ShieldCheck, ShieldAlert, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
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

export default function UsersPage() {
  const { data: users, loading: loadingUsers, updateDocument } = useFirestoreCollection<User>('users', 'createdAt');
  const { data: appSettings, loading: loadingSettings, updateDocument: updateSettings } = useFirestoreDocument<AppSettings>('settings', 'app');
  const { isAdmin, loading: loadingAuth, appUser } = useRequireAuth();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Estado para gerenciar a exclusão com segurança
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
      // Exclui o documento do usuário usando o ID confirmado no Firestore
      const userRef = doc(db, 'users', userToDelete.id);
      await deleteDoc(userRef);
      
      toast({
        title: "Sucesso",
        description: `Usuário ${userToDelete.displayName} removido permanentemente.`,
      });
      setUserToDelete(null);
    } catch (error: any) {
      console.error("ERRO DE EXCLUSÃO:", error);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "O Firestore negou a exclusão. Verifique se seu papel é exatamente 'admin' no banco.",
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
            description: "O número de WhatsApp foi atualizado com sucesso.",
        });
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
    } finally {
        setIsSavingSettings(false);
    }
  };
  
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [users]);

  if (!isMounted || loadingUsers || loadingAuth || loadingSettings) {
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

  const idMismatch = currentUser && appUser && currentUser.uid !== appUser.id;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold font-headline tracking-tight">Gerenciamento do Sistema</h2>
            <div className="text-muted-foreground text-sm">Administre usuários e configurações globais do aplicativo.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="gap-2">
            <Bug className="h-4 w-4" />
            {showDebug ? 'Ocultar Depuração' : 'Depurar Permissões'}
        </Button>
      </div>

      {showDebug && (
        <Card className={`border-orange-500 bg-orange-500/5 ${idMismatch ? 'ring-2 ring-destructive animate-pulse' : ''}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Bug className="h-4 w-4" /> Log de Depuração (Admin)
                </CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-muted-foreground flex items-center gap-1"><Fingerprint className="h-3 w-3" /> UID Autenticado (Auth):</div>
                        <div className="font-bold break-all">{currentUser?.uid}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-muted-foreground flex items-center gap-1"><Fingerprint className="h-3 w-3" /> ID do Documento (Firestore):</div>
                        <div className="font-bold break-all">{appUser?.id}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2 py-2 border-y border-orange-500/20">
                    <div className="text-muted-foreground">Os IDs coincidem?</div>
                    <Badge variant={!idMismatch ? "default" : "destructive"}>
                        {!idMismatch ? "SIM (Correto)" : "NÃO (Erro de Mapeamento!)"}
                    </Badge>
                </div>
                
                {idMismatch && (
                   <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 text-[11px] leading-relaxed">
                      <strong>ALERTA CRÍTICO:</strong> Seu UID de autenticação não coincide com o ID do seu documento no Firestore. 
                      Isso impossibilita a exclusão pelas regras de segurança.
                   </div>
                )}

                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Papel (Role):</div>
                    <div className="mt-1 flex items-center gap-2">
                        <Badge variant={appUser?.role === 'admin' ? 'default' : 'destructive'}>
                            {appUser?.role || 'null'}
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Status de Aprovação:</div>
                    <div className="flex items-center gap-2 mt-1">
                        {appUser?.isApproved ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                        <div className="font-bold">{appUser?.isApproved ? 'Aprovado' : 'Pendente'}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Notificações
                </CardTitle>
                <div className="text-muted-foreground text-sm">Configuração de WhatsApp para novos cadastros.</div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp do Admin</Label>
                    <Input 
                        id="whatsapp"
                        placeholder="Ex: 5511999999999"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                    />
                    <div className="text-[10px] text-muted-foreground">Formato: 55 + DDD + Número.</div>
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
                <CardTitle className="font-headline">Lista de Usuários</CardTitle>
                <div className="text-muted-foreground text-sm">Gerencie aprovações e cargos.</div>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Aprovado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedUsers.map((u) => (
                    <TableRow key={u.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{u.displayName}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
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
                        <div className="flex items-center gap-2">
                            <Switch
                            id={`approval-switch-${u.id}`}
                            checked={u.isApproved}
                            onCheckedChange={(checked) => handleApprovalChange(u.id, checked)}
                            disabled={u.id === currentUser?.uid}
                            />
                        </div>
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
                            <span className="sr-only">Excluir usuário</span>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {users.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        Nenhum usuário cadastrado.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
      
      {/* Diálogo de confirmação de exclusão com correção de hidratação (asChild no AlertDialogDescription) */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Usuário permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                          Deseja excluir <strong>{userToDelete?.displayName}</strong> ({userToDelete?.email})? 
                          Esta ação removerá o acesso dele imediatamente e não poderá ser desfeita.
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
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Excluir
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}