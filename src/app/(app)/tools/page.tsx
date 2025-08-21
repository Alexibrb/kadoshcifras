import { KeyIdentifierForm } from "@/components/tools/key-identifier-form";
import { ProgressionSuggesterForm } from "@/components/tools/progression-suggester-form";

export default function ToolsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Ferramentas de IA para Composição</h2>
      </div>
      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        <KeyIdentifierForm />
        <ProgressionSuggesterForm />
      </div>
    </div>
  );
}
