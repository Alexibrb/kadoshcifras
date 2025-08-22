
'use client';
import { Button } from '@/components/ui/button';
import { LogOut, Music, ListMusic } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-center mb-4">
          Bem-vindo, {user?.displayName ?? 'Músico'}!
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
        <Button onClick={handleLogout} size="lg" variant="destructive" className="h-16 text-lg justify-start">
            <LogOut className="mr-4 h-6 w-6" /> Sair
        </Button>
      </div>
    </div>
  );
}
