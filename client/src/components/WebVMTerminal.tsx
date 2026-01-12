import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Terminal, 
  Play, 
  Square, 
  RefreshCw, 
  Loader2, 
  Cpu, 
  HardDrive,
  Network,
  Download
} from "lucide-react";

// CheerpX configuration
const DISK_IMAGES = {
  debian: "wss://disks.webvm.io/debian_large_20230522_5044875331_2.ext2",
  alpine: "wss://disks.webvm.io/alpine_20230522_5044875331.ext2"
};

interface WebVMTerminalProps {
  onReady?: (cx: any) => void;
  onError?: (error: Error) => void;
  autoStart?: boolean;
  diskImage?: keyof typeof DISK_IMAGES | string;
  cacheId?: string;
  showStats?: boolean;
}

interface VMStats {
  cpuUsage: number;
  diskLatency: number;
  memoryUsage: number;
  processCount: number;
}

export interface WebVMTerminalRef {
  runCommand: (command: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  getCx: () => any;
  reset: () => Promise<void>;
}

const WebVMTerminal = forwardRef<WebVMTerminalRef, WebVMTerminalProps>(({
  onReady,
  onError,
  autoStart = false,
  diskImage = 'debian',
  cacheId = 'webvm-cache',
  showStats = true
}, ref) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [stats, setStats] = useState<VMStats>({
    cpuUsage: 0,
    diskLatency: 0,
    memoryUsage: 0,
    processCount: 0
  });
  
  const consoleRef = useRef<HTMLDivElement>(null);
  const cxRef = useRef<any>(null);
  const termRef = useRef<any>(null);
  const blockCacheRef = useRef<any>(null);
  const cpuActivityEventsRef = useRef<Array<{t: number, state: string}>>([]);

  // CPU activity tracking
  const computeCpuActivity = useCallback(() => {
    const events = cpuActivityEventsRef.current;
    const curTime = Date.now();
    const limitTime = curTime - 10000;
    
    // Clean old events
    while (events.length > 1 && events[0].t < limitTime) {
      events.shift();
    }
    
    let totalActiveTime = 0;
    let lastActiveTime = limitTime;
    let lastWasActive = false;
    
    for (const e of events) {
      const eTime = Math.max(e.t, limitTime);
      if (e.state === "ready") {
        totalActiveTime += (eTime - lastActiveTime);
        lastWasActive = false;
      } else {
        lastActiveTime = eTime;
        lastWasActive = true;
      }
    }
    
    if (lastWasActive) {
      totalActiveTime += (curTime - lastActiveTime);
    }
    
    return Math.ceil((totalActiveTime / 10000) * 100);
  }, []);

  const initializeVM = useCallback(async () => {
    if (status !== 'idle') return;
    
    setStatus('loading');
    setLoadingProgress(0);
    setLoadingMessage('Loading CheerpX runtime...');
    
    try {
      // Import CheerpX
      const CheerpX = await import('@leaningtech/cheerpx');
      setLoadingProgress(10);
      setLoadingMessage('Creating block device...');
      
      // Get disk URL
      const diskUrl = diskImage in DISK_IMAGES 
        ? DISK_IMAGES[diskImage as keyof typeof DISK_IMAGES]
        : diskImage;
      
      // Create block device
      let blockDevice;
      try {
        blockDevice = await CheerpX.CloudDevice.create(diskUrl);
      } catch (e) {
        // Fallback to HTTP if WebSocket fails
        if (diskUrl.startsWith('wss:')) {
          blockDevice = await CheerpX.CloudDevice.create(
            'https:' + diskUrl.substring(4)
          );
        } else {
          throw e;
        }
      }
      
      setLoadingProgress(30);
      setLoadingMessage('Setting up cache...');
      
      // Create IDB cache
      const blockCache = await CheerpX.IDBDevice.create(cacheId);
      blockCacheRef.current = blockCache;
      
      // Create overlay device
      const overlayDevice = await CheerpX.OverlayDevice.create(blockDevice, blockCache);
      
      setLoadingProgress(50);
      setLoadingMessage('Mounting filesystems...');
      
      // Create additional devices
      const webDevice = await CheerpX.WebDevice.create("");
      const dataDevice = await CheerpX.DataDevice.create();
      
      // Mount points
      const mountPoints = [
        { type: "ext2", dev: overlayDevice, path: "/" },
        { type: "dir", dev: webDevice, path: "/web" },
        { type: "dir", dev: dataDevice, path: "/data" },
        { type: "devs", path: "/dev" },
        { type: "devpts", path: "/dev/pts" },
        { type: "proc", path: "/proc" },
        { type: "sys", path: "/sys" }
      ];
      
      setLoadingProgress(70);
      setLoadingMessage('Creating Linux instance...');
      
      // Create Linux instance
      const cx = await CheerpX.Linux.create({ mounts: mountPoints });
      cxRef.current = cx;
      
      // Register callbacks
      cx.registerCallback("cpuActivity", (state: string) => {
        cpuActivityEventsRef.current.push({ t: Date.now(), state });
        setStats(prev => ({ ...prev, cpuUsage: computeCpuActivity() }));
      });
      
      cx.registerCallback("diskLatency", (latency: number) => {
        setStats(prev => ({ ...prev, diskLatency: Math.ceil(latency) }));
      });
      
      cx.registerCallback("processCreated", () => {
        setStats(prev => ({ ...prev, processCount: prev.processCount + 1 }));
      });
      
      setLoadingProgress(85);
      setLoadingMessage('Initializing terminal...');
      
      // Initialize xterm.js
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      
      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: 14,
        lineHeight: 1.2,
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          selectionBackground: '#3fb95033',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
          brightBlack: '#6e7681',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc'
        }
      });
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      
      if (consoleRef.current) {
        term.open(consoleRef.current);
        fitAddon.fit();
        
        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          fitAddon.fit();
        });
        resizeObserver.observe(consoleRef.current);
      }
      
      termRef.current = term;
      
      // Set up console I/O
      const writeData = (buf: ArrayBuffer, vt: number) => {
        if (vt === 1) {
          term.write(new Uint8Array(buf));
        }
      };
      
      const cxReadFunc = cx.setCustomConsole(writeData, term.cols, term.rows);
      
      term.onData((str: string) => {
        for (let i = 0; i < str.length; i++) {
          cxReadFunc(str.charCodeAt(i));
        }
      });
      
      setLoadingProgress(100);
      setLoadingMessage('Starting shell...');
      setStatus('running');
      
      onReady?.(cx);
      
      // Run bash
      await cx.run("/bin/bash", ["--login"], {
        env: [
          "HOME=/home/user",
          "TERM=xterm-256color",
          "USER=user",
          "SHELL=/bin/bash",
          "EDITOR=vim",
          "LANG=en_US.UTF-8",
          "LC_ALL=C",
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        cwd: "/home/user",
        uid: 1000,
        gid: 1000
      });
      
    } catch (error) {
      console.error('WebVM initialization error:', error);
      setStatus('error');
      setLoadingMessage(error instanceof Error ? error.message : String(error));
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [status, diskImage, cacheId, computeCpuActivity, onReady, onError]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    runCommand: async (command: string): Promise<string> => {
      if (!cxRef.current || !termRef.current) {
        throw new Error('VM not ready');
      }
      
      const term = termRef.current;
      const sentinel = `# CMD_END_${Date.now()}`;
      
      return new Promise((resolve) => {
        let output = '';
        const buffer = term.buffer.active;
        const marker = term.registerMarker();
        const startLine = marker.line;
        marker.dispose();
        
        const disposer = term.onWriteParsed(() => {
          const curLength = buffer.length;
          let newOutput = '';
          
          for (let i = startLine + 1; i < curLength; i++) {
            const line = buffer.getLine(i)?.translateToString(true, 0, term.cols) || '';
            if (line.includes(sentinel)) {
              disposer.dispose();
              resolve(output.trim());
              return;
            }
            newOutput += line + '\n';
          }
          output = newOutput;
        });
        
        term.input(command + '\n');
        term.input(`echo "${sentinel}"\n`);
      });
    },
    
    writeFile: async (path: string, content: string): Promise<void> => {
      if (!cxRef.current) {
        throw new Error('VM not ready');
      }
      // Use echo to write file
      const escaped = content.replace(/'/g, "'\\''");
      const command = `echo '${escaped}' > ${path}`;
      termRef.current?.input(command + '\n');
    },
    
    readFile: async (path: string): Promise<string> => {
      if (!cxRef.current || !termRef.current) {
        throw new Error('VM not ready');
      }
      
      const term = termRef.current;
      const sentinel = `# FILE_END_${Date.now()}`;
      
      return new Promise((resolve) => {
        let output = '';
        const buffer = term.buffer.active;
        const marker = term.registerMarker();
        const startLine = marker.line;
        marker.dispose();
        
        const disposer = term.onWriteParsed(() => {
          const curLength = buffer.length;
          let newOutput = '';
          
          for (let i = startLine + 1; i < curLength; i++) {
            const line = buffer.getLine(i)?.translateToString(true, 0, term.cols) || '';
            if (line.includes(sentinel)) {
              disposer.dispose();
              resolve(output.trim());
              return;
            }
            newOutput += line + '\n';
          }
          output = newOutput;
        });
        
        term.input(`cat ${path}\n`);
        term.input(`echo "${sentinel}"\n`);
      });
    },
    
    getCx: () => cxRef.current,
    
    reset: async (): Promise<void> => {
      if (blockCacheRef.current) {
        await blockCacheRef.current.reset();
        window.location.reload();
      }
    }
  }), []);

  // Auto-start
  useEffect(() => {
    if (autoStart && status === 'idle') {
      initializeVM();
    }
  }, [autoStart, status, initializeVM]);

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'loading':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading</Badge>;
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
            WEBVM TERMINAL
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {status === 'idle' && (
              <Button size="sm" variant="outline" onClick={initializeVM}>
                <Play className="w-4 h-4 mr-1" />
                Boot
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading Progress */}
        {status === 'loading' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{loadingMessage}</span>
              <span>{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} className="h-2" />
          </div>
        )}
        
        {/* Terminal */}
        <div 
          ref={consoleRef}
          className="w-full h-[400px] bg-[#0d1117] rounded border border-border overflow-hidden"
          style={{ fontFamily: "'Fira Code', monospace" }}
        >
          {status === 'idle' && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click "Boot" to start WebVM</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Stats */}
        {showStats && status === 'running' && (
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs">
              <Cpu className="w-4 h-4 text-primary" />
              <span>CPU: {stats.cpuUsage}%</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs">
              <HardDrive className="w-4 h-4 text-primary" />
              <span>Disk: {stats.diskLatency}ms</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs">
              <Network className="w-4 h-4 text-primary" />
              <span>Processes: {stats.processCount}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded text-xs">
              <Download className="w-4 h-4 text-primary" />
              <span>Cached</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

WebVMTerminal.displayName = 'WebVMTerminal';

export default WebVMTerminal;
