"use client";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-14 w-full border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 md:px-4">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md touch-manipulation"
            aria-label="Open menu"
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/" className="md:hidden text-sm font-semibold">
          Finances
        </Link>
      </div>
      <div className="flex-1" />
      {userEmail && (
        <div className="flex items-center gap-2 md:gap-3 mr-2 md:mr-3">
          <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden sm:inline truncate max-w-[120px] md:max-w-none">
            {userEmail}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs px-2 md:px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation"
          >
            Sign Out
          </button>
        </div>
      )}
      <ThemeToggle />
    </header>
  );
}


