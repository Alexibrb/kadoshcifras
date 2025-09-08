
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createUserDocument } from '@/services/user-service';


export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (user) {
        // Atualiza o perfil no Firebase Auth
        await updateProfile(user, {
            displayName: name,
        });

        // CRUCIAL: Cria o documento do usuário no Firestore e aguarda a conclusão.
        await createUserDocument(user, { displayName: name });
      }
      
      // Agora é seguro redirecionar, pois o documento do usuário foi criado.
      router.push('/pending-approval');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            setError("Este endereço de e-mail já está em uso. Tente fazer o <a href='/login' class='font-bold underline'>login</a>.");
        } else if (error.code === 'auth/invalid-email') {
            setError("O formato do e-mail é inválido.");
        } else if (error.code === 'auth/weak-password') {
            setError("A senha é muito fraca. Tente uma mais forte.");
        } else {
            setError("Ocorreu um erro ao criar a conta. Por favor, tente novamente.");
            console.error("Signup Error:", error);
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="justify-center mb-2" />
        <CardTitle className="font-headline text-2xl">Crie uma Conta</CardTitle>
        <CardDescription>Comece sua jornada musical com o CifrasKadosh.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" type="text" placeholder="Seu Nome" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="voce@exemplo.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
           {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Cadastro</AlertTitle>
              <AlertDescription dangerouslySetInnerHTML={{ __html: error }} />
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? 'Criando conta...' : 'Cadastre-se'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
