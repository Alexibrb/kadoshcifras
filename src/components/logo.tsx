import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2 text-accent-foreground", className)}>
      <Music className="h-6 w-6" />
      <span className="font-headline text-xl font-bold tracking-tight">
        CifrasKadosh
      </span>
    </Link>
  );
}
