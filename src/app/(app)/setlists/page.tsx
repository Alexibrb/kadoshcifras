import { ListMusic } from 'lucide-react';

export default function SetlistsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Repertórios</h2>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 py-24">
        <div className="flex flex-col items-center gap-2 text-center">
          <ListMusic className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">O gerenciamento de repertórios chegará em breve!</h3>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá criar e organizar seus repertórios para ensaios e apresentações.
          </p>
        </div>
      </div>
    </div>
  );
}
