import { useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import WebVMTerminal, { WebVMTerminalRef } from "@/components/WebVMTerminal";
import { StatusCard } from "@/components/ui/CyberComponents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Cpu, 
  HardDrive, 
  Network, 
  FileText,
  Upload,
  Download,
  Play,
  Code,
  Settings,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

export default function WebVMPage() {
  const terminalRef = useRef<WebVMTerminalRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [commandHistory, setCommandHistory] = useState<Array<{cmd: string, output: string, time: Date}>>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [filePath, setFilePath] = useState('/home/user/test.txt');

  const handleVMReady = useCallback((cx: any) => {
    setIsReady(true);
    console.log('WebVM is ready', cx);
  }, []);

  const handleVMError = useCallback((error: Error) => {
    console.error('WebVM error:', error);
  }, []);

  const runCommand = async () => {
    if (!currentCommand.trim() || !terminalRef.current) return;
    
    try {
      const output = await terminalRef.current.runCommand(currentCommand);
      setCommandHistory(prev => [...prev, {
        cmd: currentCommand,
        output,
        time: new Date()
      }]);
      setCurrentCommand('');
    } catch (error) {
      console.error('Command error:', error);
    }
  };

  const writeFile = async () => {
    if (!filePath.trim() || !terminalRef.current) return;
    
    try {
      await terminalRef.current.writeFile(filePath, fileContent);
      setCommandHistory(prev => [...prev, {
        cmd: `Write to ${filePath}`,
        output: 'File written successfully',
        time: new Date()
      }]);
    } catch (error) {
      console.error('Write error:', error);
    }
  };

  const readFile = async () => {
    if (!filePath.trim() || !terminalRef.current) return;
    
    try {
      const content = await terminalRef.current.readFile(filePath);
      setFileContent(content);
      setCommandHistory(prev => [...prev, {
        cmd: `Read from ${filePath}`,
        output: content,
        time: new Date()
      }]);
    } catch (error) {
      console.error('Read error:', error);
    }
  };

  const resetVM = async () => {
    if (terminalRef.current) {
      await terminalRef.current.reset();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
              <Terminal className="w-8 h-8 text-primary" />
              WEBVM <span className="text-primary">CONSOLE</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Full Linux environment running in your browser via WebAssembly
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isReady && (
              <Badge className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                VM Running
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={resetVM}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard 
            title="RUNTIME" 
            status="pass" 
            value="CheerpX" 
            icon={<Cpu />} 
          />
          <StatusCard 
            title="OS" 
            status="pass" 
            value="Debian Linux" 
            icon={<Terminal />} 
          />
          <StatusCard 
            title="STORAGE" 
            status="pass" 
            value="IndexedDB" 
            icon={<HardDrive />} 
          />
          <StatusCard 
            title="NETWORK" 
            status="warn" 
            value="Tailscale Ready" 
            icon={<Network />} 
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Terminal */}
          <div className="lg:col-span-2">
            <WebVMTerminal
              ref={terminalRef}
              onReady={handleVMReady}
              onError={handleVMError}
              autoStart={false}
              diskImage="debian"
              cacheId="cogwebvm-cache"
              showStats={true}
            />
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            <Card className="cyber-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  QUICK COMMANDS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter command..."
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runCommand()}
                    disabled={!isReady}
                  />
                  <Button onClick={runCommand} disabled={!isReady}>
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {['ls -la', 'pwd', 'whoami', 'uname -a', 'cat /etc/os-release', 'free -h'].map((cmd) => (
                    <Button
                      key={cmd}
                      variant="outline"
                      size="sm"
                      className="text-xs font-mono"
                      onClick={() => setCurrentCommand(cmd)}
                      disabled={!isReady}
                    >
                      {cmd}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="cyber-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  FILE OPERATIONS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="File path..."
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  disabled={!isReady}
                />
                <Textarea
                  placeholder="File content..."
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  rows={4}
                  disabled={!isReady}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={readFile} disabled={!isReady}>
                    <Download className="w-4 h-4 mr-1" />
                    Read
                  </Button>
                  <Button variant="outline" size="sm" onClick={writeFile} disabled={!isReady}>
                    <Upload className="w-4 h-4 mr-1" />
                    Write
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Command History */}
            <Card className="cyber-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">HISTORY</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {commandHistory.slice(-10).reverse().map((item, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded text-xs font-mono">
                        <div className="text-primary">$ {item.cmd}</div>
                        <div className="text-muted-foreground truncate">{item.output.substring(0, 100)}</div>
                        <div className="text-muted-foreground/50 text-[10px]">
                          {item.time.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                    {commandHistory.length === 0 && (
                      <div className="text-muted-foreground text-center py-4">
                        No commands yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Panel */}
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              ABOUT WEBVM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="features">
              <TabsList>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="tech">Technology</TabsTrigger>
                <TabsTrigger value="limits">Limitations</TabsTrigger>
              </TabsList>
              <TabsContent value="features" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Full Linux', desc: 'Complete Debian environment' },
                    { title: 'Persistent', desc: 'Changes saved in browser' },
                    { title: 'Networking', desc: 'Tailscale VPN support' },
                    { title: 'Graphics', desc: 'X11 display available' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 border border-border rounded">
                      <div className="font-mono font-bold text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="tech" className="mt-4">
                <div className="prose prose-sm dark:prose-invert">
                  <p>
                    WebVM is powered by <strong>CheerpX</strong>, a WebAssembly-based x86 virtualization engine.
                    It runs unmodified Linux binaries directly in the browser using advanced JIT compilation.
                  </p>
                  <ul>
                    <li>x86 to WebAssembly JIT compilation</li>
                    <li>Ext2 filesystem with IndexedDB persistence</li>
                    <li>Linux syscall emulation</li>
                    <li>Network via Tailscale WebSocket proxy</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="limits" className="mt-4">
                <div className="prose prose-sm dark:prose-invert">
                  <ul>
                    <li>32-bit x86 only (no 64-bit yet)</li>
                    <li>No hardware acceleration</li>
                    <li>Limited network without Tailscale</li>
                    <li>Performance depends on browser</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
