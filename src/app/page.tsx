import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-8">
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-headline text-muted-foreground tracking-tight">
          Bem-vindo ao
        </h2>
        <div className="inline-flex items-center justify-center">
          <Image src="/logocifrafacil.png" alt="CifraFácil Logo" width={350} height={350} data-ai-hint="logo music" />
        </div>
        <p className="max-w-xl mx-auto text-lg md:text-xl text-foreground/80 font-body">
          Seu companheiro definitivo para criar, gerenciar e apresentar músicas. Transponha tons, crie repertórios facilmente.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/signup">Cadastre-se</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-bold">
            <Link href="/login">Eu tenho uma conta</Link>
          </Button>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CifraFácil. Todos os Direitos Reservados.</p>
      </footer>
    </main>
  );
}
