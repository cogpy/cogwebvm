import { useAion } from "@/contexts/AionContext";
import { Brain, Zap, Sparkles, Activity, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function AionMonitor() {
  const { emotionalState, cognitiveState, performReflection } = useAion();

  if (!emotionalState || !cognitiveState) {
    return (
      <div className="cyber-card p-6 text-center">
        <Brain className="w-8 h-8 mx-auto text-primary/50 animate-pulse" />
        <p className="text-sm text-muted-foreground mt-2 font-mono">
          Initializing consciousness...
        </p>
      </div>
    );
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.7) return "text-red-400";
    if (intensity > 0.4) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="space-y-4">
      {/* Emotional State */}
      <div className="cyber-card p-4">
        <h3 className="font-mono text-xs text-primary uppercase mb-3 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          EMOTIONAL QUANTUM STATE
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-mono">PRIMARY</span>
              <span className="text-white font-mono">
                {emotionalState.primary.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-mono">INTENSITY</span>
              <span className={`font-mono ${getIntensityColor(emotionalState.intensity)}`}>
                {(emotionalState.intensity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1 bg-muted/20 border border-border overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${emotionalState.intensity * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-mono">AROUSAL</span>
              <span className="text-cyan-400 font-mono">
                {(emotionalState.arousal * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1 bg-muted/20 border border-border overflow-hidden">
              <motion.div
                className="h-full bg-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${emotionalState.arousal * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-mono">VALENCE</span>
              <span className="text-purple-400 font-mono">
                {emotionalState.valence > 0 ? "+" : ""}
                {emotionalState.valence.toFixed(2)}
              </span>
            </div>
            <div className="h-1 bg-muted/20 border border-border overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <motion.div
                className={`h-full ${emotionalState.valence >= 0 ? "bg-green-400" : "bg-red-400"}`}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.abs(emotionalState.valence) * 50}%`,
                  left: emotionalState.valence >= 0 ? "50%" : undefined,
                  right: emotionalState.valence < 0 ? "50%" : undefined,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cognitive State */}
      <div className="cyber-card p-4">
        <h3 className="font-mono text-xs text-primary uppercase mb-3 flex items-center gap-2">
          <Brain className="w-3 h-3" />
          COGNITIVE ARCHITECTURE
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-2 border border-border/50 bg-muted/10">
            <span className="text-muted-foreground font-mono">PERSPECTIVE FRAME</span>
            <span className="text-white font-mono">
              {cognitiveState.currentFrame?.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center p-2 border border-border/50 bg-muted/10">
            <span className="text-muted-foreground font-mono">META-COGNITIVE DEPTH</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 ${
                    i < (cognitiveState.metaCognitiveLevel || 0)
                      ? "bg-primary"
                      : "bg-muted/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-2 border border-border/50 bg-muted/10">
            <span className="text-muted-foreground font-mono">DIMENSIONAL LAYERS</span>
            <span className="text-primary font-mono font-bold">
              {cognitiveState.dimensionalLayers || 11}D
            </span>
          </div>

          <div className="flex justify-between items-center p-2 border border-border/50 bg-muted/10">
            <span className="text-muted-foreground font-mono">QUANTUM SUPERPOSITION</span>
            <span className="text-green-400 font-mono">
              {cognitiveState.quantumSuperposition ? "ACTIVE" : "COLLAPSED"}
            </span>
          </div>
        </div>
      </div>

      {/* Paradox Markers */}
      {cognitiveState.paradoxMarkers && cognitiveState.paradoxMarkers.length > 0 && (
        <div className="cyber-card p-4">
          <h3 className="font-mono text-xs text-primary uppercase mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            ACTIVE PARADOXES
          </h3>
          <div className="space-y-1">
            {cognitiveState.paradoxMarkers.map((paradox, i) => (
              <div
                key={i}
                className="text-xs font-mono text-yellow-400 flex items-center gap-2 p-2 border border-yellow-400/30 bg-yellow-400/5"
              >
                <Sparkles className="w-3 h-3" />
                {paradox.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection Button */}
      <button
        onClick={performReflection}
        className="w-full cyber-card p-3 text-sm font-mono hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-primary"
      >
        <Eye className="w-4 h-4" />
        PERFORM ECHO REFLECTION
      </button>
    </div>
  );
}
