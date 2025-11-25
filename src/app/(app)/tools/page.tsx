
'use client';
import { PedalSettingsForm } from "@/components/tools/pedal-settings-form";
import { ColorSettingsForm } from "@/components/tools/color-settings-form";
import { FontSizeSettingsForm } from "@/components/tools/font-size-settings-form";

export default function ToolsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Ferramentas e Configurações</h2>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <PedalSettingsForm />
         <ColorSettingsForm />
         <FontSizeSettingsForm />
       </div>
    </div>
  );
}
