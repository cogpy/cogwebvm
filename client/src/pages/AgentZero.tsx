import { useEffect, useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusCard, TerminalBlock } from "@/components/ui/CyberComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Terminal, 
  Cpu, 
  HardDrive, 
  Network, 
  Play, 
  Square, 
  Send,
  Settings,
  MessageSquare,
  Code,
  FileText,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

// Types for Agent-Zero integration
interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: string;
}

interface VMStatus {
  state: 'idle' | 'booting' | 'running' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  diskLatency: number;
}

// CheerpX types (will be loaded dynamically)
declare global {
  interface Window {
    CheerpX: any;
  }
}

export default function AgentZero() {
  // VM State
  const [vmStatus, setVmStatus] = useState<VMStatus>({
    state: 'idle',
    cpuUsage: 0,
    memoryUsage: 0,
    diskLatency: 0
  });
  const [isVMReady, setIsVMReady] = useState(false);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  // Agent State
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'offline' | 'starting' | 'online' | 'error'>('offline');
  
  // Refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const cxRef = useRef<any>(null);
  const termRef = useRef<any>(null);
  
  // Configuration
  const [apiKey, setApiKey] = useState('');
  const [modelProvider, setModelProvider] = useState('openai');

  // Initialize CheerpX and boot the VM
  const initializeVM = useCallback(async () => {
    if (vmStatus.state !== 'idle') return;
    
    setVmStatus(prev => ({ ...prev, state: 'booting' }));
    addBootLog('Initializing CheerpX WebAssembly runtime...');
    
    try {
      // Dynamically import CheerpX
      const CheerpX = await import('@leaningtech/cheerpx');
      
      addBootLog('Loading disk image...');
      
      // Create block device from cloud disk
      const blockDevice = await CheerpX.CloudDevice.create(
        "wss://disks.webvm.io/debian_large_20230522_5044875331_2.ext2"
      );
      
      addBootLog('Setting up overlay filesystem...');
      
      // Create IDB cache for persistence
      const blockCache = await CheerpX.IDBDevice.create("agent-zero-cache");
      const overlayDevice = await CheerpX.OverlayDevice.create(blockDevice, blockCache);
      
      // Create web device for serving files
      const webDevice = await CheerpX.WebDevice.create("");
      const dataDevice = await CheerpX.DataDevice.create();
      
      addBootLog('Mounting filesystems...');
      
      const mountPoints = [
        { type: "ext2", dev: overlayDevice, path: "/" },
        { type: "dir", dev: webDevice, path: "/web" },
        { type: "dir", dev: dataDevice, path: "/data" },
        { type: "devs", path: "/dev" },
        { type: "devpts", path: "/dev/pts" },
        { type: "proc", path: "/proc" },
        { type: "sys", path: "/sys" }
      ];
      
      // Create Linux instance
      const cx = await CheerpX.Linux.create({ mounts: mountPoints });
      cxRef.current = cx;
      
      addBootLog('Initializing terminal...');
      
      // Initialize xterm.js
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      
      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: "monospace",
        fontSize: 14,
        theme: {
          background: '#0a0a0a',
          foreground: '#00ff00',
          cursor: '#00ff00',
          cursorAccent: '#000000',
          selectionBackground: '#00ff0033'
        }
      });
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      if (consoleRef.current) {
        term.open(consoleRef.current);
        fitAddon.fit();
      }
      
      termRef.current = term;
      
      // Set up console callbacks
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
      
      // Register activity callbacks
      cx.registerCallback("cpuActivity", (state: string) => {
        setVmStatus(prev => ({
          ...prev,
          cpuUsage: state !== "ready" ? Math.min(prev.cpuUsage + 10, 100) : Math.max(prev.cpuUsage - 5, 0)
        }));
      });
      
      cx.registerCallback("diskActivity", (state: string) => {
        // Track disk activity
      });
      
      cx.registerCallback("diskLatency", (latency: number) => {
        setVmStatus(prev => ({ ...prev, diskLatency: latency }));
      });
      
      addBootLog('Starting shell...');
      setVmStatus(prev => ({ ...prev, state: 'running' }));
      setIsVMReady(true);
      
      // Run bash shell
      await cx.run("/bin/bash", ["--login"], {
        env: [
          "HOME=/home/user",
          "TERM=xterm",
          "USER=user",
          "SHELL=/bin/bash",
          "EDITOR=vim",
          "LANG=en_US.UTF-8",
          "LC_ALL=C"
        ],
        cwd: "/home/user",
        uid: 1000,
        gid: 1000
      });
      
    } catch (error) {
      console.error('VM initialization error:', error);
      addBootLog(`Error: ${error}`);
      setVmStatus(prev => ({ ...prev, state: 'error' }));
    }
  }, [vmStatus.state]);

  const addBootLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBootLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Install Agent-Zero dependencies
  const installAgentZero = async () => {
    if (!cxRef.current || !termRef.current) return;
    
    setAgentStatus('starting');
    addBootLog('Installing Agent-Zero dependencies...');
    
    const commands = [
      'apt-get update',
      'apt-get install -y python3 python3-pip',
      'pip3 install flask openai langchain',
      'mkdir -p /home/user/agent-zero',
      'echo "Agent-Zero environment ready" > /home/user/agent-zero/status.txt'
    ];
    
    for (const cmd of commands) {
      termRef.current.input(cmd + '\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setAgentStatus('online');
    addBootLog('Agent-Zero is ready!');
  };

  // Send message to Agent-Zero
  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      // For now, simulate agent response
      // In full implementation, this would communicate with the VM-hosted Flask server
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Processing your request: "${inputMessage}"\n\nAgent-Zero is analyzing the task and will execute the necessary steps in the WebVM environment.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${error}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
      case 'running':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Online</Badge>;
      case 'starting':
      case 'booting':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Starting</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Offline</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              AGENT-ZERO <span className="text-primary">WEBVM</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Autonomous AI agent running in browser-based Linux virtualization
            </p>
          </div>
          <div className="flex items-center gap-4">
            {renderStatusBadge(vmStatus.state)}
            {renderStatusBadge(agentStatus)}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard 
            title="VM STATUS" 
            status={vmStatus.state === 'running' ? 'pass' : vmStatus.state === 'error' ? 'fail' : 'warn'} 
            value={vmStatus.state.toUpperCase()} 
            icon={<Cpu />} 
          />
          <StatusCard 
            title="CPU USAGE" 
            status={vmStatus.cpuUsage > 80 ? 'warn' : 'pass'} 
            value={`${vmStatus.cpuUsage}%`} 
            icon={<Cpu />} 
          />
          <StatusCard 
            title="DISK LATENCY" 
            status={vmStatus.diskLatency > 100 ? 'warn' : 'pass'} 
            value={`${vmStatus.diskLatency}ms`} 
            icon={<HardDrive />} 
          />
          <StatusCard 
            title="AGENT STATUS" 
            status={agentStatus === 'online' ? 'pass' : agentStatus === 'error' ? 'fail' : 'warn'} 
            value={agentStatus.toUpperCase()} 
            icon={<Bot />} 
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - VM Control & Terminal */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="cyber-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    WEBVM TERMINAL
                  </CardTitle>
                  <div className="flex gap-2">
                    {vmStatus.state === 'idle' && (
                      <Button size="sm" onClick={initializeVM}>
                        <Play className="w-4 h-4 mr-1" />
                        Boot VM
                      </Button>
                    )}
                    {vmStatus.state === 'running' && agentStatus === 'offline' && (
                      <Button size="sm" onClick={installAgentZero}>
                        <Bot className="w-4 h-4 mr-1" />
                        Start Agent
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  ref={consoleRef}
                  className="w-full h-[400px] bg-black rounded border border-border overflow-hidden"
                  style={{ fontFamily: 'monospace' }}
                />
              </CardContent>
            </Card>

            {/* Boot Logs */}
            <Card className="cyber-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  BOOT LOGS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-1 font-mono text-xs">
                    {bootLogs.map((log, i) => (
                      <div key={i} className="text-muted-foreground">
                        {log}
                      </div>
                    ))}
                    {bootLogs.length === 0 && (
                      <div className="text-muted-foreground italic">
                        Click "Boot VM" to start the WebVM environment...
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Agent Chat */}
          <div className="space-y-4">
            <Card className="cyber-card h-[calc(100%-1rem)]">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  AGENT CHAT
                </CardTitle>
                <CardDescription>
                  Interact with Agent-Zero running in WebVM
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-[500px]">
                {/* Messages */}
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Start the VM and Agent to begin chatting</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : msg.role === 'system'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-50 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={agentStatus !== 'online' || isProcessing}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={agentStatus !== 'online' || isProcessing || !inputMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Configuration Panel */}
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              CONFIGURATION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="api">
              <TabsList>
                <TabsTrigger value="api">API Keys</TabsTrigger>
                <TabsTrigger value="model">Model Settings</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="api" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    <Input 
                      type="password" 
                      placeholder="sk-..." 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model Provider</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={modelProvider}
                      onChange={(e) => setModelProvider(e.target.value)}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="ollama">Ollama (Local)</option>
                    </select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="model" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chat Model</label>
                    <Input defaultValue="gpt-4-turbo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Embedding Model</label>
                    <Input defaultValue="text-embedding-3-small" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Prompt Override</label>
                  <Textarea 
                    placeholder="Custom system prompt for Agent-Zero..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
