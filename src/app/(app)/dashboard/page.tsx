
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-center mb-4">
          CifraFácil
        </h2>
        <Button asChild size="lg" className="h-16 text-lg justify-start">
          <Link href="/songs">
            <Music className="mr-4 h-6 w-6" /> Músicas
          </Link>
        </Button>
        <Button asChild size="lg" className="h-16 text-lg justify-start">
          <Link href="/setlists">
            <ListMusic className="mr-4 h-6 w-6" /> Repertórios
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-16 text-lg justify-start">
          <Link href="/">
            <LogOut className="mr-4 h-6 w-6" /> Sair
          </Link>
        </Button>
      </div>
    </div>
  );
}
