'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { LayoutDashboard, ListMusic, LogOut, Music, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/songs')} tooltip="Songs">
                  <Link href="/songs">
                    <Music />
                    <span>Songs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/setlists')} tooltip="Setlists">
                  <Link href="/setlists">
                    <ListMusic />
                    <span>Setlists</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/tools')} tooltip="AI Tools">
                  <Link href="/tools">
                    <Sparkles />
                    <span>AI Tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <Separator />
          <SidebarFooter>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person music" />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">John Doe</span>
                <span className="text-muted-foreground">john.doe@email.com</span>
              </div>
            </div>
            <Button asChild variant="ghost" size="icon" className="group-data-[collapsible=icon]:w-full">
              <Link href="/">
                <LogOut />
                <span className="sr-only">Log Out</span>
              </Link>
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
