import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface StatusCardProps {
  title: string;
  status: "pass" | "fail" | "warn";
  value?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatusCard({ title, status, value, icon, className }: StatusCardProps) {
  const statusColor = {
    pass: "text-green-500 border-green-500/30 bg-green-500/5",
    fail: "text-red-500 border-red-500/30 bg-red-500/5",
    warn: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
  };

  const StatusIcon = {
    pass: CheckCircle2,
    fail: XCircle,
    warn: AlertTriangle,
  }[status];

  return (
    <div className={cn("cyber-card p-4 flex flex-col justify-between h-full min-h-[120px]", className)}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-primary opacity-80">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-mono font-bold tracking-tight glitch-text">
          {value || status.toUpperCase()}
        </div>
        <StatusIcon className={cn("w-6 h-6", statusColor[status].split(" ")[0])} />
      </div>
      <div className={cn("mt-3 h-1 w-full bg-muted overflow-hidden")}>
        <div className={cn("h-full w-full", status === "pass" ? "bg-green-500" : status === "fail" ? "bg-red-500" : "bg-yellow-500")} />
      </div>
    </div>
  );
}

interface TerminalBlockProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function TerminalBlock({ title, children, className }: TerminalBlockProps) {
  return (
    <div className={cn("border border-border bg-[#05080a] font-mono text-sm overflow-hidden", className)}>
      <div className="bg-border/30 px-4 py-2 flex items-center justify-between border-b border-border">
        <span className="text-xs text-muted-foreground uppercase">{title}</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-gray-300">
        <pre>{children}</pre>
      </div>
    </div>
  );
}

interface DataGridProps {
  data: { label: string; value: string | number; status?: "normal" | "highlight" }[];
  title: string;
}

export function DataGrid({ data, title }: DataGridProps) {
  return (
    <div className="cyber-card">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="font-mono text-sm text-primary uppercase">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {data.map((item, i) => (
          <div key={i} className="flex justify-between px-4 py-3 hover:bg-primary/5 transition-colors group">
            <span className="text-sm text-muted-foreground font-mono group-hover:text-foreground transition-colors">
              {item.label}
            </span>
            <span className={cn(
              "text-sm font-mono font-bold",
              item.status === "highlight" ? "text-primary" : "text-foreground"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
