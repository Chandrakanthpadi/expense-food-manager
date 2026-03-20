import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  accentColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
}

export function CollapsibleSection({ title, icon, accentColor, children, defaultOpen = false, count }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg bg-card shadow-sm shadow-foreground/[0.03] border border-border/60 overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-foreground/[0.05]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.99] transition-transform duration-100"
      >
        <span className={cn("flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground", accentColor)}>
          {icon}
        </span>
        <span className="flex-1 font-semibold text-[0.95rem] tracking-tight">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">{count}</span>
        )}
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
