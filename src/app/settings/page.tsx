"use client";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ImportExport } from "@/components/common/ImportExport";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Theme</div>
          <ThemeToggle />
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Data</div>
          <ImportExport />
        </div>
      </div>
    </div>
  );
}


