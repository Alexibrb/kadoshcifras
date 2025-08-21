import { ListMusic } from 'lucide-react';

export default function SetlistsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Setlists</h2>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
        <div className="flex flex-col items-center gap-2 text-center">
          <ListMusic className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">Setlist management is coming soon!</h3>
          <p className="text-sm text-muted-foreground">
            Soon you&apos;ll be able to create and organize your setlists for practices and performances.
          </p>
        </div>
      </div>
    </div>
  );
}
