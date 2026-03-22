'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ListMusic, LogOut, Music, User, Users, Wrench } from 'lucide-react';
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
import { useEffect } from 'react';


const navLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { href: '/songs', icon: Music, label: 'Músicas' },
    { href: '/setlists', icon: ListMusic, label: 'Repertórios' },
    { href: '/tools', icon: Wrench, label: 'Ferramentas' },
];

const adminNavLinks = [
    { href: '/users', icon: Users, label: 'Usuários' },
];

function Header() {
    const pathname = usePathname();
    const { user: authUser, appUser } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-md">
            <div className="container flex flex-col py-2">
                {/* Linha 1: Logo e Usuário */}
                <div className="flex h-10 items-center justify-between">
                    <Logo className="text-primary scale-90 origin-left" />
                    <div className="flex items-center space-x-2">
                        <ThemeToggle />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all hover:ring-primary/40">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={authUser?.photoURL ?? `https://placehold.co/100x100.png?text=${appUser?.displayName?.charAt(0)}`} alt="Avatar" data-ai-hint="person music" />
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                              <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold leading-none">{appUser?.displayName ?? 'Usuário'}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                  {authUser?.email ?? ''}
                                </p>
                              </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                 <LogOut className="mr-2 h-4 w-4" />
                                 <span>Sair</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {/* Linha 2: Navegação (Apenas Ícones) */}
                <nav className="flex items-center justify-center space-x-2 mt-1 overflow-x-auto pb-1 scrollbar-hide">
                   {navLinks.map(link => {
                       const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                       return (
                           <Button
                             key={link.href}
                             asChild
                             variant={isActive ? 'secondary' : 'ghost'}
                             size="icon"
                             className={cn(
                                "h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors shrink-0",
                                isActive && "bg-primary/15 text-primary"
                              )}
                           >
                               <Link href={link.href} title={link.label}>
                                   <link.icon className="h-5 w-5" />
                               </Link>
                           </Button>
                       )
                   })}
                   {appUser?.role === 'admin' && adminNavLinks.map(link => {
                       const isActive = pathname === link.href || pathname.startsWith(link.href);
                       return (
                           <Button
                             key={link.href}
                             asChild
                             variant={isActive ? 'secondary' : 'ghost'}
                             size="icon"
                             className={cn(
                                "h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors shrink-0",
                                isActive && "bg-primary/15 text-primary"
                              )}
                           >
                               <Link href={link.href} title={link.label}>
                                   <link.icon className="h-5 w-5" />
                               </Link>
                           </Button>
                       )
                   })}
                </nav>
            </div>
        </header>
    )
}

function Footer() {
    return (
        <footer className="w-full bg-background border-t py-6">
            <div className="container flex flex-col items-center justify-center gap-2">
                <p className="text-sm text-muted-foreground">
                    CifrasKadosh • Versão 2.0.2026
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                    Desenvolvido por Alex Alves
                </p>
            </div>
        </footer>
    )
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { loading } = useRequireAuth();
    const pathname = usePathname();

    const isSongDisplayPage = /^\/songs\/[^/]+$/.test(pathname);

    if (loading) {
        return (
             <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-card">
                    <div className="container flex flex-col py-2 space-y-2">
                       <div className="flex items-center justify-between h-10">
                         <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <Skeleton className="h-4 w-24" />
                         </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                       </div>
                        <div className="flex items-center justify-center gap-4 h-9">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-8">
                    <Skeleton className="w-full h-[70vh] rounded-xl" />
                </main>
             </div>
        );
    }

  return (
    <div className="flex min-h-screen flex-col">
        {!isSongDisplayPage && <Header />}
        <main className="flex-1">
            {children}
        </main>
        {!isSongDisplayPage && <Footer />}
    </div>
  );
}
