import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { subscribeSyncStatus, flushQueue } from "@/lib/syncQueue";
import { cn } from "@/lib/utils";

export function SyncStatusBadge() {
  const [state, setState] = useState({ pending: 0, online: true, syncing: false });

  useEffect(() => subscribeSyncStatus(setState), []);

  if (state.online && state.pending === 0 && !state.syncing) return null;

  const Icon = !state.online ? CloudOff : state.syncing ? RefreshCw : Cloud;
  const label = !state.online
    ? state.pending > 0 ? `Offline · ${state.pending}` : "Offline"
    : state.syncing ? "Syncing…" : `${state.pending} pending`;

  return (
    <button
      onClick={() => state.online && flushQueue()}
      className={cn(
        "h-8 px-2 flex items-center gap-1.5 text-xs font-medium rounded-md transition-all",
        !state.online ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
      )}
      title={!state.online ? "Offline — changes will sync when online" : "Tap to sync now"}
    >
      <Icon className={cn("w-3.5 h-3.5", state.syncing && "animate-spin")} />
      <span>{label}</span>
    </button>
  );
}
