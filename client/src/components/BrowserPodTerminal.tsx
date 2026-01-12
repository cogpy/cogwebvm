import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, Play, Square, RefreshCw, Loader2 } from "lucide-react";

interface BrowserPodTerminalProps {
  onReady?: () => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
  projectPath?: string;
}

interface PodStatus {
  state: 'idle' | 'booting' | 'running' | 'error';
  message: string;
}

export default function BrowserPodTerminal({
  onReady,
  onError,
  autoStart = false,
  projectPath = "/project"
}: BrowserPodTerminalProps) {
  const [status, setStatus] = useState<PodStatus>({ state: 'idle', message: 'Ready to start' });
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<any>(null);
  const termRef = useRef<any>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const initializePod = useCallback(async () => {
    if (status.state !== 'idle') return;

    setStatus({ state: 'booting', message: 'Initializing BrowserPod...' });
    addLog('Starting BrowserPod runtime...');

    try {
      // Dynamically import BrowserPod
      // Note: In production, this would use the actual BrowserPod package
      const { BrowserPod } = await import('@leaningtech/browserpod').catch(() => {
        // Fallback to loading from CDN if package not available
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://rt.browserpod.io/0.9.7/browserpod.js';
          script.onload = () => resolve({ BrowserPod: (window as any).BrowserPod });
          document.head.appendChild(script);
        });
      });

      if (!BrowserPod) {
        throw new Error('BrowserPod failed to load');
      }

      addLog('BrowserPod runtime loaded');
      setStatus({ state: 'booting', message: 'Booting pod...' });

      // Initialize the pod
      // Note: API key would be configured via environment variable
      const apiKey = import.meta.env.VITE_BROWSERPOD_API_KEY || '';
      
      const pod = await BrowserPod.boot({
        apiKey,
        // Use local mode if no API key
        local: !apiKey
      });

      podRef.current = pod;
      addLog('Pod booted successfully');

      // Create terminal
      if (terminalRef.current) {
        const terminal = await pod.createDefaultTerminal(terminalRef.current);
        termRef.current = terminal;
        addLog('Terminal created');
      }

      // Set up portal handler for web server preview
      pod.onPortal(({ url, port }: { url: string; port: number }) => {
        addLog(`Portal available at ${url} (port ${port})`);
      });

      setStatus({ state: 'running', message: 'Pod is running' });
      addLog('BrowserPod is ready');
      
      onReady?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus({ state: 'error', message: errorMessage });
      addLog(`Error: ${errorMessage}`);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [status.state, addLog, onReady, onError]);

  const stopPod = useCallback(async () => {
    if (podRef.current) {
      try {
        // BrowserPod cleanup
        podRef.current = null;
        termRef.current = null;
        setStatus({ state: 'idle', message: 'Pod stopped' });
        addLog('Pod stopped');
      } catch (error) {
        addLog(`Error stopping pod: ${error}`);
      }
    }
  }, [addLog]);

  const runCommand = useCallback(async (command: string, args: string[] = []) => {
    if (!podRef.current) {
      addLog('Pod not running');
      return;
    }

    try {
      addLog(`Running: ${command} ${args.join(' ')}`);
      await podRef.current.run(command, args, {
        echo: true,
        terminal: termRef.current,
        cwd: projectPath
      });
    } catch (error) {
      addLog(`Command error: ${error}`);
    }
  }, [projectPath, addLog]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && status.state === 'idle') {
      initializePod();
    }
  }, [autoStart, status.state, initializePod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (podRef.current) {
        stopPod();
      }
    };
  }, [stopPod]);

  const getStatusBadge = () => {
    switch (status.state) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'booting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Booting</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  return (
    <Card className="cyber-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            BROWSERPOD TERMINAL
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {status.state === 'idle' && (
              <Button size="sm" variant="outline" onClick={initializePod}>
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            {status.state === 'running' && (
              <Button size="sm" variant="outline" onClick={stopPod}>
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
            {status.state === 'error' && (
              <Button size="sm" variant="outline" onClick={() => setStatus({ state: 'idle', message: 'Ready' })}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{status.message}</p>
      </CardHeader>
      <CardContent>
        <div 
          ref={terminalRef}
          className="w-full h-[300px] bg-black rounded border border-border overflow-hidden"
          style={{ fontFamily: 'monospace' }}
        >
          {status.state === 'idle' && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Click "Start" to initialize BrowserPod</p>
            </div>
          )}
        </div>
        
        {/* Logs */}
        <div className="mt-4 p-2 bg-muted/20 rounded border border-border max-h-[100px] overflow-auto">
          <div className="space-y-1 font-mono text-xs">
            {logs.slice(-10).map((log, i) => (
              <div key={i} className="text-muted-foreground">{log}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export utility functions for external use
export const useBrowserPod = () => {
  const podRef = useRef<any>(null);
  
  const boot = async (apiKey?: string) => {
    const { BrowserPod } = await import('@leaningtech/browserpod').catch(() => ({
      BrowserPod: (window as any).BrowserPod
    }));
    
    if (!BrowserPod) {
      throw new Error('BrowserPod not available');
    }
    
    podRef.current = await BrowserPod.boot({
      apiKey,
      local: !apiKey
    });
    
    return podRef.current;
  };
  
  const run = async (command: string, args: string[] = [], options: any = {}) => {
    if (!podRef.current) {
      throw new Error('Pod not booted');
    }
    return podRef.current.run(command, args, options);
  };
  
  const createFile = async (path: string, content: string) => {
    if (!podRef.current) {
      throw new Error('Pod not booted');
    }
    return podRef.current.writeFile(path, content);
  };
  
  const readFile = async (path: string) => {
    if (!podRef.current) {
      throw new Error('Pod not booted');
    }
    return podRef.current.readFile(path);
  };
  
  return { boot, run, createFile, readFile, pod: podRef.current };
};
