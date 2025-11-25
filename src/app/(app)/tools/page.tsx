
'use client';
import { KeyIdentifierForm } from "@/components/tools/key-identifier-form";
import { ProgressionSuggesterForm } from "@/components/tools/progression-suggester-form";
import { PedalSettingsForm } from "@/components/tools/pedal-settings-form";
import { ColorSettingsForm } from "@/components/tools/color-settings-form";

export default function ToolsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Ferramentas e Configurações</h2>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <KeyIdentifierForm />
         <ProgressionSuggesterForm />
         <PedalSettingsForm />
         <ColorSettingsForm />
       </div>
    </div>
  );
}
