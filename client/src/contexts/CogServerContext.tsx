import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { toast } from "sonner";

interface CogServerContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (msg: any) => void;
  connect: () => void;
  disconnect: () => void;
}

const CogServerContext = createContext<CogServerContextType | undefined>(undefined);

export function CogServerProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use the correct WebSocket URL based on current host
    // In WebVM, we need to connect to the exposed port
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // For local dev, use 18080. For production/preview, we might need a proxy or specific port
    // Assuming the dashboard is served on the same host
    const wsUrl = `${protocol}//${host}:18080/json`;

    console.log(`Connecting to CogServer at ${wsUrl}...`);
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ Connected to CogServer");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from CogServer");
        setIsConnected(false);
        wsRef.current = null;
        
        // Only attempt reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        } else {
          console.log("Max reconnect attempts reached. CogServer is unavailable.");
        }
      };

      ws.onerror = (error) => {
        console.warn("CogServer WebSocket connection failed (this is normal if CogServer is not running)");
        // Silently fail - CogServer is optional
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("Failed to create WebSocket connection:", e);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  };

  const sendMessage = (msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn("Cannot send message: WebSocket not connected");
      toast.error("Not connected to CogServer");
    }
  };

  useEffect(() => {
    // Only attempt connection once on mount
    if (!connectionAttempted) {
      setConnectionAttempted(true);
      connect();
    }
    return () => disconnect();
  }, [connectionAttempted]);

  return (
    <CogServerContext.Provider value={{ isConnected, lastMessage, sendMessage, connect, disconnect }}>
      {children}
    </CogServerContext.Provider>
  );
}

export function useCogServer() {
  const context = useContext(CogServerContext);
  if (context === undefined) {
    throw new Error("useCogServer must be used within a CogServerProvider");
  }
  return context;
}
