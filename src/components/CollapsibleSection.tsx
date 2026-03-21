import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  accentColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
  collapsible?: boolean;
}

export function CollapsibleSection({ title, icon, accentColor, children, count, collapsible = false, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg bg-card shadow-sm shadow-foreground/[0.03] border border-border/60 overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-foreground/[0.05]">
      <div
        className={cn("flex items-center gap-3 px-4 py-3.5", collapsible && "cursor-pointer select-none")}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground", accentColor)}>
          {icon}
        </span>
        <span className="flex-1 font-semibold text-[0.95rem] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">{count}</span>
        )}
        {collapsible && (
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        )}
      </div>
      {(!collapsible || open) && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}
