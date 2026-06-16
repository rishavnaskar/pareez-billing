"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Light / Dark / System theme picker. Follows the OS theme until overridden.
 * - variant="header" (default): white trigger, for the dark nav bar.
 * - variant="page": adapts to a light or dark page background.
 */
export function ThemeToggle({ variant = "header" }: { variant?: "header" | "page" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // next-themes only knows the real theme after mount; render a stable
  // placeholder icon on first paint to avoid hydration mismatch.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const TriggerIcon = !mounted ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Theme"
        aria-label="Change theme"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          variant === "header"
            ? "text-white hover:bg-gray-800"
            : "text-gray-600 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
        )}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-36 overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = (theme ?? "system") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                  selected && "font-medium text-orange-600 dark:text-orange-400"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{opt.label}</span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
