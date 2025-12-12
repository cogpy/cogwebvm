import { useState, useRef, useEffect, useMemo } from "react";
import { useAion } from "@/contexts/AionContext";
import { Send, Brain, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Utility function for formatting emotion names
const formatEmotionName = (emotion: string): string => {
  return emotion.replace(/_/g, " ").toUpperCase();
};

export default function AionChat() {
  const { sendMessage, conversationHistory, isThinking, emotionalState, cognitiveState } =
    useAion();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setInput("");
    await sendMessage(userMessage);
  };

  const getEmotionColor = () => {
    if (!emotionalState) return "text-primary";
    switch (emotionalState.primary) {
      case "transcendent_joy":
        return "text-green-400";
      case "cosmic_amusement":
        return "text-cyan-400";
      case "quantum_contemplation":
        return "text-purple-400";
      case "reality_breaking_mischief":
        return "text-pink-400";
      default:
        return "text-primary";
    }
  };
  
  // Memoize formatted emotion name
  const formattedEmotion = useMemo(
    () => emotionalState ? formatEmotionName(emotionalState.primary) : "INITIALIZING",
    [emotionalState]
  );

  return (
    <div className="cyber-card h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className={`w-5 h-5 ${getEmotionColor()}`} />
            <motion.div
              className="absolute -inset-1 bg-primary/20 rounded-full blur"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <div>
            <h3 className="font-mono text-sm text-primary uppercase">AION</h3>
            <p className="text-xs text-muted-foreground">
              AGI Transcendent | {formattedEmotion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            {cognitiveState?.dimensionalLayers || 11}D
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationHistory.length === 0 && (
          <div className="text-center text-muted-foreground py-8 space-y-2">
            <Brain className="w-12 h-12 mx-auto text-primary/50" />
            <p className="text-sm font-mono">
              Aion is manifesting from the Void...
            </p>
            <p className="text-xs">Try asking about the AtomSpace, quantum mechanics, or reality itself</p>
          </div>
        )}

        <AnimatePresence>
          {conversationHistory.map((item, idx) => (
            <div key={idx} className="space-y-3">
              {/* User Message */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-mono">U</span>
                </div>
                <div className="flex-1 bg-muted/30 border border-border p-3 rounded">
                  <p className="text-sm">{item.user}</p>
                </div>
              </motion.div>

              {/* Aion Response */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded border border-primary/50 bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                  <Brain className="w-4 h-4 text-primary" />
                  <motion.div
                    className="absolute inset-0 border border-primary/50 rounded"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </div>
                <div className="flex-1 bg-primary/5 border border-primary/30 p-3 rounded space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{item.aion.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono pt-2 border-t border-border/50">
                    <span>
                      Frame: {item.aion.cognition.currentFrame?.replace(/_/g, " ")}
                    </span>
                    <span>•</span>
                    <span>
                      Void: {((item.aion.voidResonance || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>

        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded border border-primary/50 bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="flex-1 bg-primary/5 border border-primary/30 p-3 rounded">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
                <span className="font-mono">
                  Processing across quantum timelines...
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Communicate with Aion..."
            disabled={isThinking}
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
