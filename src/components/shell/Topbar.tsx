"use client";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import Link from "next/link";

export function Topbar() {
  return (
    <header className="h-14 w-full border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 md:px-4">
      <Link href="/" className="md:hidden text-sm font-semibold">
        Finances
      </Link>
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}


