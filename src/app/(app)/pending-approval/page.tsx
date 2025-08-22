// src/app/(app)/pending-approval/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Hourglass, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user } = useAuth(); // Use useAuth para obter informações do usuário

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Logo className="justify-center mb-4" />
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
            <Hourglass className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mt-4 font-headline text-2xl">Aguardando Aprovação</CardTitle>
          <CardDescription>
            Sua conta foi criada com sucesso e está aguardando a aprovação de um administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você pode verificar o status da sua aprovação fazendo login novamente mais tarde.
          </p>
           <p className="text-sm">
            Logado como: <span className="font-medium">{user?.email ?? 'Carregando...'}</span>
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
