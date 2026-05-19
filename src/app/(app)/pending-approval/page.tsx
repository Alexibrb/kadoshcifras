
// src/app/(app)/pending-approval/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Hourglass, LogOut, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreDocument } from '@/hooks/use-firestore-document';
import { type AppSettings } from '@/types';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: appSettings, loading: loadingSettings } = useFirestoreDocument<AppSettings>('settings', 'app');

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleNotifyAdmin = () => {
    // Busca o número configurado pelo admin no Firestore
    const adminPhone = appSettings?.adminWhatsApp || "5511999999999"; // Fallback se não configurado
    
    const message = encodeURIComponent(
      `Olá! Acabei de me cadastrar no CifrasKadosh e aguardo minha aprovação.\n\n` +
      `👤 Nome: ${user?.displayName || 'Não informado'}\n` +
      `📧 E-mail: ${user?.email}`
    );
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-primary/20">
        <CardHeader>
          <Logo className="justify-center mb-4" />
          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-2">
            <Hourglass className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="mt-4 font-headline text-2xl">Quase lá!</CardTitle>
          <CardDescription className="text-base">
            Sua conta foi criada, mas um administrador precisa aprovar seu acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
             <p className="text-muted-foreground">Logado como:</p>
             <p className="font-bold text-primary">{user?.email ?? 'Carregando...'}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Quer agilizar sua aprovação?</p>
            <Button 
                onClick={handleNotifyAdmin} 
                disabled={loadingSettings}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 gap-2"
            >
              {loadingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
              Avisar no WhatsApp
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="mt-8 text-xs text-muted-foreground uppercase tracking-widest">
        CifrasKadosh • Sistema de Acesso Restrito
      </p>
    </div>
  );
}
