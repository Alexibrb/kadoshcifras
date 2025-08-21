import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Music } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-8">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full">
          <Music className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary tracking-tighter">
          Music Pal
        </h1>
        <p className="max-w-xl mx-auto text-lg md:text-xl text-foreground/80 font-body">
          Your ultimate companion for creating, managing, and performing music. Transpose keys, build setlists, and perfect your sound with AI-powered tools.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="font-bold">
            <Link href="/signup">Get Started for Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-bold">
            <Link href="/login">I have an account</Link>
          </Button>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Music Pal. All Rights Reserved.</p>
      </footer>
    </main>
  );
}
