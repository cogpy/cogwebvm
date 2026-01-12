import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

// Types
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: string;
  thinking?: string;
}

export interface AgentConfig {
  apiKey: string;
  modelProvider: 'openai' | 'anthropic' | 'ollama' | 'openrouter';
  chatModel: string;
  embeddingModel: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
}

export interface VMState {
  status: 'idle' | 'booting' | 'running' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  diskLatency: number;
  processCount: number;
}

interface AgentZeroContextType {
  // VM State
  vmState: VMState;
  setVmState: (state: VMState | ((prev: VMState) => VMState)) => void;
  
  // Agent State
  messages: AgentMessage[];
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  
  // Processing State
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  
  // Configuration
  config: AgentConfig;
  updateConfig: (config: Partial<AgentConfig>) => void;
  
  // CheerpX Reference
  setCx: (cx: any) => void;
  getCx: () => any;
  
  // Terminal Reference
  setTerminal: (term: any) => void;
  getTerminal: () => any;
  
  // Commands
  runCommand: (command: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
}

const defaultConfig: AgentConfig = {
  apiKey: '',
  modelProvider: 'openai',
  chatModel: 'gpt-4-turbo',
  embeddingModel: 'text-embedding-3-small',
  temperature: 0.7,
  maxTokens: 4096
};

const defaultVmState: VMState = {
  status: 'idle',
  cpuUsage: 0,
  memoryUsage: 0,
  diskLatency: 0,
  processCount: 0
};

const AgentZeroContext = createContext<AgentZeroContextType | null>(null);

export function AgentZeroProvider({ children }: { children: ReactNode }) {
  const [vmState, setVmState] = useState<VMState>(defaultVmState);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(defaultConfig);
  
  const cxRef = useRef<any>(null);
  const termRef = useRef<any>(null);

  const addMessage = useCallback((message: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const setCx = useCallback((cx: any) => {
    cxRef.current = cx;
  }, []);

  const getCx = useCallback(() => cxRef.current, []);

  const setTerminal = useCallback((term: any) => {
    termRef.current = term;
  }, []);

  const getTerminal = useCallback(() => termRef.current, []);

  const runCommand = useCallback(async (command: string): Promise<string> => {
    const term = termRef.current;
    if (!term || !cxRef.current) {
      throw new Error('VM not ready');
    }

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
  }, []);

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    const term = termRef.current;
    if (!term) {
      throw new Error('Terminal not ready');
    }
    
    // Escape content for shell
    const escaped = content.replace(/'/g, "'\\''");
    const command = `cat > ${path} << 'AGENT_ZERO_EOF'\n${content}\nAGENT_ZERO_EOF`;
    term.input(command + '\n');
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    return runCommand(`cat ${path}`);
  }, [runCommand]);

  const value: AgentZeroContextType = {
    vmState,
    setVmState,
    messages,
    addMessage,
    clearMessages,
    isProcessing,
    setIsProcessing,
    config,
    updateConfig,
    setCx,
    getCx,
    setTerminal,
    getTerminal,
    runCommand,
    writeFile,
    readFile
  };

  return (
    <AgentZeroContext.Provider value={value}>
      {children}
    </AgentZeroContext.Provider>
  );
}

export function useAgentZero() {
  const context = useContext(AgentZeroContext);
  if (!context) {
    throw new Error('useAgentZero must be used within an AgentZeroProvider');
  }
  return context;
}

// Hook for just the VM state
export function useVMState() {
  const { vmState, setVmState } = useAgentZero();
  return { vmState, setVmState };
}

// Hook for just the messages
export function useAgentMessages() {
  const { messages, addMessage, clearMessages, isProcessing, setIsProcessing } = useAgentZero();
  return { messages, addMessage, clearMessages, isProcessing, setIsProcessing };
}

// Hook for configuration
export function useAgentConfig() {
  const { config, updateConfig } = useAgentZero();
  return { config, updateConfig };
}
