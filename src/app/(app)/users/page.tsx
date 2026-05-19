
// src/app/(app)/users/page.tsx
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Save, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
  const { data: users, loading: loadingUsers, updateDocument } = useFirestoreCollection<User>('users', 'createdAt');
  const { data: appSettings, loading: loadingSettings, updateDocument: updateSettings } = useFirestoreDocument<AppSettings>('settings', 'app');
  const { isAdmin, loading: loadingAuth } = useRequireAuth();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
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

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
        await updateSettings({ adminWhatsApp: whatsappNumber });
        toast({
            title: "Configurações Salvas",
            description: "O número do WhatsApp foi atualizado com sucesso.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível atualizar as configurações.",
        });
    } finally {
        setIsSavingSettings(false);
    }
  };
  
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [users]);

  if (loadingUsers || loadingAuth || loadingSettings) {
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
            <p className="text-muted-foreground">Administre usuários e configurações globais do aplicativo.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Configurações Globais */}
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Notificações
                </CardTitle>
                <CardDescription>Configure para onde as notificações de novos cadastros serão enviadas.</CardDescription>
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
                    <p className="text-[10px] text-muted-foreground">Use formato internacional: Código do País + DDD + Número.</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full">
                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configurações
                </Button>
            </CardFooter>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Lista de Usuários</CardTitle>
                <CardDescription>Aprove ou gerencie permissões.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Aprovado</TableHead>
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
                    <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                            <Switch
                            id={`approval-switch-${user.id}`}
                            checked={user.isApproved}
                            onCheckedChange={(checked) => handleApprovalChange(user.id, checked)}
                            disabled={user.id === currentUser?.uid}
                            />
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {users.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        Nenhum usuário encontrado.
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
