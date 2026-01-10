/**
 * AtomSpace utilities for OpenCog Dashboard
 * Shared between client and server
 */

// Atom type definitions
export interface TruthValue {
  strength: number;
  confidence: number;
}

export interface Atom {
  id: string;
  type: string;
  name: string;
  tv?: TruthValue;
  outgoing?: string[];
}

export interface GraphNode {
  id: string;
  group: number;
  val: number;
  name: string;
  type: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Atom type color mapping
export const ATOM_TYPE_COLORS: Record<string, string> = {
  ConceptNode: "#00f0ff",
  PredicateNode: "#bd00ff",
  InheritanceLink: "#00ff88",
  EvaluationLink: "#ffaa00",
  ListLink: "#ff6b6b",
  MemberLink: "#ff8800",
  SimilarityLink: "#00ff00",
  SetLink: "#ffff00",
  VariableNode: "#ff00ff",
  NumberNode: "#00ffff",
  default: "#888888",
};

/**
 * Get the color for an atom type
 */
export function getAtomColor(type: string): string {
  return ATOM_TYPE_COLORS[type] || ATOM_TYPE_COLORS.default;
}

/**
 * Check if an atom type is a link (ends with "Link")
 */
export function isLinkType(type: string): boolean {
  return type.endsWith("Link");
}

/**
 * Check if an atom type is a node (ends with "Node")
 */
export function isNodeType(type: string): boolean {
  return type.endsWith("Node");
}

/**
 * Get unique atom types from a list of atoms
 */
export function getAtomTypes(atoms: Atom[]): string[] {
  return Array.from(new Set(atoms.map((a) => a.type)));
}

/**
 * Filter atoms by search query and type
 */
export function filterAtoms(
  atoms: Atom[],
  searchQuery: string,
  selectedType: string | null
): Atom[] {
  return atoms.filter((atom) => {
    const matchesSearch =
      searchQuery === "" ||
      atom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atom.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === null || atom.type === selectedType;
    return matchesSearch && matchesType;
  });
}

/**
 * Build graph data from atoms for visualization
 */
export function buildGraphData(atoms: Atom[]): GraphData {
  const atomTypes = getAtomTypes(atoms);

  const nodes: GraphNode[] = atoms
    .filter((a) => !isLinkType(a.type))
    .map((atom) => ({
      id: atom.id,
      group: atomTypes.indexOf(atom.type),
      val: 10,
      name: atom.name,
      type: atom.type,
    }));

  const links: GraphLink[] = atoms
    .filter((a) => isLinkType(a.type) && a.outgoing && a.outgoing.length >= 2)
    .map((atom) => ({
      source: atom.outgoing![0],
      target: atom.outgoing![1],
      type: atom.type,
    }));

  return { nodes, links };
}

/**
 * Generate Scheme representation for an atom
 */
export function atomToScheme(atom: Atom, atomsMap?: Map<string, Atom>): string {
  if (atom.outgoing && atom.outgoing.length > 0) {
    const outgoingStr = atom.outgoing
      .map((id) => {
        if (atomsMap) {
          const outAtom = atomsMap.get(id);
          if (outAtom) {
            return `(${outAtom.type} "${outAtom.name}")`;
          }
        }
        return id;
      })
      .join("\n  ");
    return `(${atom.type}\n  ${outgoingStr})`;
  }
  return `(${atom.type} "${atom.name}")`;
}

/**
 * Create an atoms map for fast lookup
 */
export function createAtomsMap(atoms: Atom[]): Map<string, Atom> {
  return new Map(atoms.map((a) => [a.id, a]));
}

/**
 * Parse a Scheme expression and extract command and arguments
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  raw: string;
}

export function parseSchemeCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  // Must start with ( and end with )
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
    return null;
  }

  // Remove outer parentheses
  const content = trimmed.slice(1, -1).trim();

  if (!content) {
    return null;
  }

  // Split into tokens, handling quoted strings
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' && (i === 0 || content[i - 1] !== "\\")) {
      inQuote = !inQuote;
      current += char;
    } else if ((char === " " || char === "\t" || char === "\n") && !inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    return null;
  }

  return {
    command: tokens[0],
    args: tokens.slice(1),
    raw: trimmed,
  };
}

/**
 * Extract string from quoted Scheme string
 */
export function extractQuotedString(str: string): string | null {
  const match = str.match(/^"([^"]*)"$/);
  return match ? match[1] : null;
}

/**
 * Extract type from quoted type expression (e.g., 'ConceptNode)
 */
export function extractQuotedType(str: string): string | null {
  const match = str.match(/^'(\w+)$/);
  return match ? match[1] : null;
}

/**
 * Validate truth value
 */
export function isValidTruthValue(tv: unknown): tv is TruthValue {
  if (!tv || typeof tv !== "object") return false;
  const tvObj = tv as Record<string, unknown>;
  return (
    typeof tvObj.strength === "number" &&
    typeof tvObj.confidence === "number" &&
    tvObj.strength >= 0 &&
    tvObj.strength <= 1 &&
    tvObj.confidence >= 0 &&
    tvObj.confidence <= 1
  );
}

/**
 * Create a new atom with default truth value
 */
export function createAtom(
  id: string,
  type: string,
  name: string,
  tv?: TruthValue,
  outgoing?: string[]
): Atom {
  return {
    id,
    type,
    name,
    tv: tv || { strength: 1.0, confidence: 0.9 },
    outgoing,
  };
}

/**
 * Count atoms by type
 */
export function countAtomsByType(atoms: Atom[]): Record<string, number> {
  return atoms.reduce((acc, atom) => {
    acc[atom.type] = (acc[atom.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Get atoms by type
 */
export function getAtomsByType(atoms: Atom[], type: string): Atom[] {
  return atoms.filter((a) => a.type === type);
}

/**
 * Find atom by name and type
 */
export function findAtom(
  atoms: Atom[],
  name: string,
  type?: string
): Atom | undefined {
  return atoms.find(
    (a) => a.name === name && (type === undefined || a.type === type)
  );
}

/**
 * Get outgoing atoms for a link
 */
export function getOutgoingAtoms(
  link: Atom,
  atomsMap: Map<string, Atom>
): Atom[] {
  if (!link.outgoing) return [];
  return link.outgoing
    .map((id) => atomsMap.get(id))
    .filter((a): a is Atom => a !== undefined);
}

/**
 * Get incoming links for an atom (links that reference this atom)
 */
export function getIncomingLinks(atomId: string, atoms: Atom[]): Atom[] {
  return atoms.filter(
    (a) => isLinkType(a.type) && a.outgoing?.includes(atomId)
  );
}

/**
 * Sample atoms for demonstration/testing
 */
export const SAMPLE_ATOMS: Atom[] = [
  { id: "1", type: "ConceptNode", name: "Animal", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "2", type: "ConceptNode", name: "Mammal", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "3", type: "ConceptNode", name: "Cat", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "4", type: "ConceptNode", name: "Dog", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "5", type: "ConceptNode", name: "Human", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "6", type: "ConceptNode", name: "Socrates", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "7", type: "PredicateNode", name: "is-a", tv: { strength: 1.0, confidence: 1.0 } },
  { id: "8", type: "PredicateNode", name: "eats", tv: { strength: 1.0, confidence: 1.0 } },
  { id: "9", type: "ConceptNode", name: "Food", tv: { strength: 1.0, confidence: 0.9 } },
  { id: "10", type: "InheritanceLink", name: "Mammal->Animal", outgoing: ["2", "1"] },
  { id: "11", type: "InheritanceLink", name: "Cat->Mammal", outgoing: ["3", "2"] },
  { id: "12", type: "InheritanceLink", name: "Dog->Mammal", outgoing: ["4", "2"] },
  { id: "13", type: "InheritanceLink", name: "Human->Mammal", outgoing: ["5", "2"] },
  { id: "14", type: "InheritanceLink", name: "Socrates->Human", outgoing: ["6", "5"] },
];
