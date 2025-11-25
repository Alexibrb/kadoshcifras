
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
    const { user: authUser, appUser } = useAuth(); // Use authUser to distinguish from component User
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
                       {appUser?.role === 'admin' && adminNavLinks.map(link => {
                           const isActive = pathname === link.href || pathname.startsWith(link.href);
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
                            <AvatarImage src={authUser?.photoURL ?? `https://placehold.co/100x100.png?text=${appUser?.displayName?.charAt(0)}`} alt="Avatar do Usuário" data-ai-hint="person music" />
                            <AvatarFallback><User /></AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{appUser?.displayName ?? 'Usuário'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {authUser?.email ?? ''}
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
    const { loading, appUser } = useRequireAuth();
    const pathname = usePathname();

    // Regex to check if the path is /songs/[id]
    const isSongDisplayPage = /^\/songs\/[^/]+$/.test(pathname);

    useEffect(() => {
        if (appUser?.colorSettings?.backgroundColor && (isSongDisplayPage || pathname.includes('/offline'))) {
            document.body.style.backgroundColor = appUser.colorSettings.backgroundColor;
        } else {
            // Revert to default background color when not on a song page
             document.body.style.backgroundColor = '';
        }

        // Cleanup function to remove style when component unmounts or path changes
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, [appUser, pathname, isSongDisplayPage]);

    if (loading) {
        return (
             <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-accent text-accent-foreground">
                    <div className="container flex h-16 items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Skeleton className="h-6 w-6" />
                         <Skeleton className="h-5 w-28" />
                       </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                           <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
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
        {!isSongDisplayPage && <Footer />}
    </div>
  );
}
