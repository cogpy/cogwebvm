import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Terminal, Activity, Network, Server, Cpu, Database, FolderOpen, Bot, Monitor } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "OVERVIEW", icon: Activity },
    { href: "/agent-zero", label: "AGENT-ZERO", icon: Bot },
    { href: "/webvm", label: "WEBVM", icon: Monitor },
    { href: "/files", label: "FILE STORAGE", icon: FolderOpen },
    { href: "/python", label: "PYTHON BINDINGS", icon: Terminal },
    { href: "/guile", label: "GUILE SCHEME", icon: Cpu },
    { href: "/cogserver", label: "COGSERVER", icon: Server },
    { href: "/atomspace", label: "ATOMSPACE", icon: Database },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground overflow-hidden">
      {/* Scanline Overlay */}
      <div className="scanline fixed inset-0 z-50 pointer-events-none"></div>

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 border border-primary flex items-center justify-center">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg tracking-tighter text-primary">COGWEBVM</h1>
              <p className="text-xs text-muted-foreground font-mono">AGENT-ZERO v1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const isHighlighted = item.href === "/agent-zero" || item.href === "/webvm";
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-mono transition-all cursor-pointer border border-transparent",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : isHighlighted
                      ? "text-primary/80 hover:text-primary hover:bg-primary/5 hover:border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-muted-foreground/20"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 bg-primary animate-pulse" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-card/50 border border-border p-3 text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">STATUS:</span>
              <span className="text-green-500">ONLINE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">RUNTIME:</span>
              <span>CheerpX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MODE:</span>
              <span className="text-primary">BROWSER</span>
            </div>
            <div className="w-full bg-muted h-1 mt-2">
              <div className="bg-primary h-full w-[100%] animate-pulse"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <span>SYSTEM</span>
            <span>/</span>
            <span className="text-foreground">WEBVM_ENV</span>
            <span>/</span>
            <span className="text-primary uppercase">{location === "/" ? "OVERVIEW" : location.substring(1).replace("-", "_")}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-mono">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              ALL SYSTEMS NOMINAL
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
