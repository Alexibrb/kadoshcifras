
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Email de redefinição de senha enviado! Por favor, verifique sua caixa de entrada.");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError("Nenhum usuário encontrado com este endereço de e-mail.");
      } else {
        setError("Ocorreu um erro ao enviar o e-mail. Por favor, tente novamente.");
      }
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="justify-center mb-2" />
        <CardTitle className="font-headline text-2xl">Recuperar Senha</CardTitle>
        <CardDescription>Insira seu e-mail para receber um link de redefinição de senha.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="voce@exemplo.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
           {success && (
            <Alert variant="default" className="border-green-500 text-green-700 dark:border-green-600 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Sucesso</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Lembrou sua senha?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Fazer Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
