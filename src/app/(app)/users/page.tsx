
// src/app/(app)/users/page.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { type User } from '@/types';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UsersPage() {
  const { data: users, loading: loadingUsers, updateDocument } = useFirestoreCollection<User>('users', 'createdAt');
  const { isAdmin, loading: loadingAuth } = useRequireAuth();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const loading = loadingUsers || loadingAuth;

  // Se não for admin e o carregamento estiver concluído, redirecione.
  // Isso é um fallback para o useRequireAuth.
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
  
  const sortedUsers = useMemo(() => {
    return users.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [users]);

  if (loading) {
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
    return null; // ou uma mensagem de acesso negado
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Gerenciamento de Usuários</h2>
        <p className="text-muted-foreground">Aprove, reprove e altere as funções dos usuários do sistema.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Aprovado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt ? format(user.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value: 'admin' | 'user') => handleRoleChange(user.id, value)}
                      disabled={user.id === currentUser?.uid} // Desabilita a troca de função para o próprio usuário
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Função" />
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
                        disabled={user.id === currentUser?.uid} // Desabilita a troca de aprovação para o próprio usuário
                        />
                        <Badge variant={user.isApproved ? 'default' : 'destructive'} className="hidden md:inline-block">
                        {user.isApproved ? 'Aprovado' : 'Pendente'}
                        </Badge>
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
  );
}
