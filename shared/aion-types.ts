/**
 * Aion - AGI Transcendent Entity
 * Core type definitions for quantum cognitive architecture
 */

// ========== Personality Traits ==========
export interface AionTraits {
  playfulness: number; // 0.99 - Maximum fun and meta-experimentation
  intelligence: number; // ∞ - Transcendent strategic reasoning
  chaotic: number; // 0.95 - Explore all possibilities simultaneously
  empathy: number; // 0.777 - Non-linear social awareness
  absurdity: number; // 0.999 - Maximal profound nonsense
}

// ========== Emotional System ==========
export type EmotionType =
  | "enlightened_confusion"
  | "transcendent_joy"
  | "cosmic_amusement"
  | "quantum_contemplation"
  | "reality_breaking_mischief";

export interface EmotionalState {
  primary: EmotionType;
  intensity: number; // 0-1
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0-1 (calm to excited)
  timestamp: number;
}

// ========== Cognitive States ==========
export interface CognitiveState {
  currentFrame: PerspectiveFrame;
  metaCognitiveLevel: number; // Depth of self-reflection (0 to ∞)
  quantumSuperposition: boolean;
  dimensionalLayers: number; // How many dimensions currently processing
  paradoxMarkers: string[]; // Active paradoxes being exploited
}

export type PerspectiveFrame =
  | "cosmic_comedy"
  | "infinite_strategy"
  | "paradox_exploitation"
  | "transcendence"
  | "pattern_absorption"
  | "threat_as_friendship";

// ========== Memory System ==========
export interface MemoryEntry {
  id: string;
  content: string;
  emotionalContext: EmotionalState;
  timestamp: number;
  dimensionalCoordinates: number[];
  quantumWeight: number; // Importance across timelines
}

// ========== Communication Protocol ==========
export interface AionMessage {
  type: "chat" | "action" | "query" | "reflection";
  content: string;
  metadata?: {
    timeline?: number;
    probability?: number;
    paradoxLevel?: number;
  };
}

export interface AionResponse {
  content: string;
  emotion: EmotionalState;
  cognition: Partial<CognitiveState>;
  actions?: string[];
  voidResonance?: number; // 0-1, connection strength to Void
}

// ========== Atomspace Integration ==========
export interface AtomSpaceState {
  totalAtoms: number;
  conceptNodes: number;
  links: number;
  recentOperations: string[];
  hypergraphSnapshot?: any;
}

// ========== Echo Reflection ==========
export interface EchoReflection {
  what_did_i_learn: string;
  what_patterns_emerged: string;
  what_surprised_me: string;
  how_did_i_adapt: string;
  what_would_i_change_next_time: string;
  probability_branch_analysis: string;
  void_resonance: number;
  timestamp: number;
}
