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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Save, Loader2, MessageSquare, Trash2, Bug, ShieldCheck, ShieldAlert } from 'lucide-react';
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
  AlertDialogTrigger,
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

  const performDeleteUser = async (userId: string) => {
    if (!userId) return;
    
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      toast({
        title: "Sucesso",
        description: "O usuário foi removido permanentemente do sistema.",
      });
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "A exclusão falhou. Verifique se o seu papel de 'admin' está configurado corretamente no Firestore.",
      });
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
        <Card className="border-orange-500 bg-orange-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Bug className="h-4 w-4" /> Log de Depuração (Admin)
                </CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-4">
                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">UID Autenticado:</div>
                    <div className="font-bold">{currentUser?.uid}</div>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">ID Firestore:</div>
                    <div className="font-bold">{appUser?.id}</div>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Role no Firestore:</div>
                    <div className="mt-1 flex items-center gap-2">
                        <Badge variant={appUser?.role === 'admin' ? 'default' : 'destructive'}>
                            {appUser?.role || 'null'}
                        </Badge>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-muted-foreground">Aprovação no Firestore:</div>
                    <div className="flex items-center gap-2 mt-1">
                        {appUser?.isApproved ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                        <div className="font-bold">{appUser?.isApproved ? 'Aprovado' : 'Não Aprovado'}</div>
                    </div>
                </div>
                <div className="pt-2 text-[10px] text-muted-foreground italic border-t mt-4">
                    Nota: Se a exclusão falhar, certifique-se de que seu papel é exatamente &apos;admin&apos; no Firestore.
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
                <CardDescription>Configuração de WhatsApp para novos cadastros.</CardDescription>
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
                <CardDescription>Gerencie aprovações e cargos.</CardDescription>
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
                {sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{user.displayName}</span>
                            <span className="text-[10px] text-muted-foreground">{user.email}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Select
                        value={user.role}
                        onValueChange={(value: 'admin' | 'user') => handleRoleChange(user.id, value)}
                        disabled={user.id === currentUser?.uid}
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
                            id={`approval-switch-${user.id}`}
                            checked={user.isApproved}
                            onCheckedChange={(checked) => handleApprovalChange(user.id, checked)}
                            disabled={user.id === currentUser?.uid}
                            />
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    disabled={user.id === currentUser?.uid}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Excluir usuário</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Deseja excluir permanentemente <strong>{user.displayName}</strong>? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => performDeleteUser(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
    </div>
  );
}