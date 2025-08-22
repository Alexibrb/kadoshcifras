
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ListMusic, LogOut, Music, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useRequireAuth, useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';


const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { href: '/songs', icon: Music, label: 'Músicas' },
    { href: '/setlists', icon: ListMusic, label: 'Repertórios' },
]

function Header() {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-accent text-accent-foreground">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <Logo />
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-1">
                       {navLinks.map(link => {
                           const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                           return (
                               <Button
                                 key={link.href}
                                 asChild
                                 variant={isActive ? 'secondary' : 'ghost'}
                                 size="icon"
                                 className={cn(
                                    "text-accent-foreground hover:bg-secondary hover:text-secondary-foreground",
                                    isActive && "bg-secondary text-secondary-foreground"
                                  )}
                               >
                                   <Link href={link.href}>
                                       <link.icon className="h-5 w-5" />
                                       <span className="sr-only">{link.label}</span>
                                   </Link>
                               </Button>
                           )
                       })}
                       <ThemeToggle />
                    </nav>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full text-accent-foreground hover:bg-secondary hover:text-secondary-foreground">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.photoURL ?? `https://placehold.co/100x100.png?text=${user?.displayName?.charAt(0)}`} alt="Avatar do Usuário" data-ai-hint="person music" />
                            <AvatarFallback><User /></AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.displayName ?? 'Usuário'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user?.email ?? ''}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                             <LogOut className="mr-2 h-4 w-4" />
                             <span>Sair</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}

function Footer() {
    return (
        <footer className="w-full bg-background border-t">
            <div className="container flex h-14 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                    Versão 1.0.2025 - Desenvolvedor Alex Alves
                </p>
            </div>
        </footer>
    )
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useRequireAuth();

    if (loading || !user) {
        return (
             <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-accent text-accent-foreground">
                    <div className="container flex h-16 items-center justify-end space-x-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </header>
                <main className="flex-1 p-8">
                    <Skeleton className="w-full h-[80vh]" />
                </main>
             </div>
        );
    }

  return (
    <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
            {children}
        </main>
        <Footer />
    </div>
  );
}
