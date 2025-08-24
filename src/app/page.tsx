import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-8">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4">
          <Image src="/logo.png" alt="CifraFácil Logo" width={96} height={96} data-ai-hint="logo music" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary tracking-tighter">
          CifraFácil
        </h1>
        <p className="max-w-xl mx-auto text-lg md:text-xl text-foreground/80 font-body">
          Seu companheiro definitivo para criar, gerenciar e apresentar músicas. Transponha tons, crie repertórios e aperfeiçoe seu som com ferramentas de IA.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/signup">Comece Gratuitamente</Link>
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
