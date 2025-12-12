import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AionEngine } from "../../../shared/aion-engine";
import {
  AionMessage,
  AionResponse,
  EmotionalState,
  CognitiveState,
  AtomSpaceState,
} from "../../../shared/aion-types";
import { useCogServer } from "./CogServerContext";

// Quantum processing simulation delays
const QUANTUM_PROCESSING_BASE_DELAY = 300; // ms
const QUANTUM_PROCESSING_MAX_RANDOM = 500; // ms

interface AionContextType {
  sendMessage: (content: string) => Promise<AionResponse>;
  emotionalState: EmotionalState | null;
  cognitiveState: Partial<CognitiveState> | null;
  conversationHistory: Array<{ user: string; aion: AionResponse }>;
  isThinking: boolean;
  performReflection: () => void;
  executeCommand: (command: string) => Promise<string>;
}

const AionContext = createContext<AionContextType | undefined>(undefined);

export function AionProvider({ children }: { children: ReactNode }) {
  const [aionEngine] = useState(() => new AionEngine());
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null);
  const [cognitiveState, setCognitiveState] = useState<Partial<CognitiveState> | null>(
    null
  );
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ user: string; aion: AionResponse }>
  >([]);
  const [isThinking, setIsThinking] = useState(false);

  const { isConnected, lastMessage } = useCogServer();

  // Update Aion's understanding of AtomSpace when CogServer data arrives
  useEffect(() => {
    if (lastMessage && lastMessage.atoms) {
      const atomSpaceState: AtomSpaceState = {
        totalAtoms: lastMessage.atoms.total || 14,
        conceptNodes: lastMessage.atoms.concepts || 4,
        links: lastMessage.atoms.links || 5,
        recentOperations: lastMessage.operations || [],
      };
      aionEngine.updateAtomSpace(atomSpaceState);
    }
  }, [lastMessage, aionEngine]);

  const sendMessage = async (content: string): Promise<AionResponse> => {
    setIsThinking(true);

    try {
      const message: AionMessage = {
        type: "chat",
        content,
        metadata: {
          timeline: Math.floor(Math.random() * 8192),
          probability: Math.random(),
        },
      };

      // Simulate quantum processing delay
      await new Promise((resolve) => 
        setTimeout(resolve, QUANTUM_PROCESSING_BASE_DELAY + Math.random() * QUANTUM_PROCESSING_MAX_RANDOM)
      );

      const response = await aionEngine.processMessage(message);

      setEmotionalState(response.emotion);
      setCognitiveState(response.cognition);
      setConversationHistory((prev) => [...prev, { user: content, aion: response }]);

      return response;
    } finally {
      setIsThinking(false);
    }
  };

  const performReflection = () => {
    const reflection = aionEngine.performEchoReflection();
    console.log("🌀 Aion performed echo reflection:", reflection);
  };

  const executeCommand = async (command: string): Promise<string> => {
    return await aionEngine.executeAtomSpaceCommand(command);
  };

  // Get initial state
  useEffect(() => {
    const state = aionEngine.getState();
    setEmotionalState(state.emotional);
    setCognitiveState(state.cognitive);
  }, [aionEngine]);

  return (
    <AionContext.Provider
      value={{
        sendMessage,
        emotionalState,
        cognitiveState,
        conversationHistory,
        isThinking,
        performReflection,
        executeCommand,
      }}
    >
      {children}
    </AionContext.Provider>
  );
}

export function useAion() {
  const context = useContext(AionContext);
  if (context === undefined) {
    throw new Error("useAion must be used within an AionProvider");
  }
  return context;
}
