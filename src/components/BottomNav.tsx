import { useLocation, useNavigate } from "react-router-dom";
import { Home, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/more", label: "More", icon: MoreHorizontal },
  { path: "/insights", label: "Insights", icon: BarChart3 },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[0.65rem] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
