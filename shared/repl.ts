/**
 * REPL utilities for OpenCog Scheme interpreter
 * Handles command execution in both demo and connected modes
 */

import {
  Atom,
  parseSchemeCommand,
  extractQuotedString,
  extractQuotedType,
  getAtomsByType,
  findAtom,
  createAtom,
  countAtomsByType,
  SAMPLE_ATOMS,
} from "./atomspace";

export interface ReplResult {
  success: boolean;
  output: string;
  atoms?: Atom[];
  newAtom?: Atom;
}

export interface ReplState {
  atoms: Atom[];
  nextId: number;
}

/**
 * Create initial REPL state with sample atoms
 */
export function createReplState(): ReplState {
  return {
    atoms: [...SAMPLE_ATOMS],
    nextId: SAMPLE_ATOMS.length + 1,
  };
}

/**
 * Execute a Scheme command in demo mode
 */
export function executeSchemeCommand(
  input: string,
  state: ReplState
): ReplResult {
  const cmd = parseSchemeCommand(input);

  if (!cmd) {
    return {
      success: false,
      output: `Syntax error: Invalid Scheme expression. Commands must be in parentheses, e.g., (help)`,
    };
  }

  const { command, args } = cmd;

  switch (command) {
    case "help":
      return executeHelp();

    case "count-all":
      return executeCountAll(state);

    case "cog-atomspace":
      return executeCogAtomspace();

    case "cog-get-atoms":
      return executeCogGetAtoms(args, state);

    case "Concept":
    case "ConceptNode":
      return executeConceptNode(args, state);

    case "Predicate":
    case "PredicateNode":
      return executePredicateNode(args, state);

    case "Inheritance":
    case "InheritanceLink":
      return executeInheritanceLink(args, state);

    case "clear":
      return executeClear(state);

    case "cog-incoming-set":
      return executeCogIncomingSet(args, state);

    case "cog-outgoing-set":
      return executeCogOutgoingSet(args, state);

    case "display":
      return executeDisplay(args, state);

    case "cog-tv":
      return executeCogTv(args, state);

    default:
      return {
        success: false,
        output: `Unknown command: ${command}\nType (help) for available commands.`,
      };
  }
}

function executeHelp(): ReplResult {
  return {
    success: true,
    output: `OpenCog Scheme REPL - Available Commands:

Atom Creation:
  (Concept "name")           Create/get ConceptNode
  (Predicate "name")         Create/get PredicateNode
  (Inheritance A B)          Create InheritanceLink

AtomSpace Queries:
  (cog-atomspace)            Get current atomspace info
  (cog-get-atoms 'Type)      List atoms by type
  (cog-incoming-set atom)    Get incoming links
  (cog-outgoing-set link)    Get outgoing atoms
  (cog-tv atom)              Get truth value

Utilities:
  (count-all)                Count all atoms
  (display atom)             Display atom representation
  (clear)                    Reset to sample data
  (help)                     Show this help message

Examples:
  (Concept "Cat")
  (cog-get-atoms 'ConceptNode)
  (Inheritance (Concept "Cat") (Concept "Animal"))`,
  };
}

function executeCountAll(state: ReplState): ReplResult {
  const counts = countAtomsByType(state.atoms);
  const total = state.atoms.length;

  const typeBreakdown = Object.entries(counts)
    .map(([type, count]) => `  ${type}: ${count}`)
    .join("\n");

  return {
    success: true,
    output: `Total atoms: ${total}\n\nBy type:\n${typeBreakdown}`,
  };
}

function executeCogAtomspace(): ReplResult {
  const addr = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return {
    success: true,
    output: `#<AtomSpace addr: 0x55d4${addr}>`,
  };
}

function executeCogGetAtoms(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: "Usage: (cog-get-atoms 'TypeName)",
    };
  }

  const type = extractQuotedType(args[0]);
  if (!type) {
    return {
      success: false,
      output: `Invalid type syntax. Use quoted type like 'ConceptNode`,
    };
  }

  const atoms = getAtomsByType(state.atoms, type);

  if (atoms.length === 0) {
    return {
      success: true,
      output: `No atoms of type ${type} found.`,
    };
  }

  const output = atoms
    .map((a) => {
      if (a.outgoing) {
        return `(${a.type} ...)`;
      }
      return `(${a.type} "${a.name}")`;
    })
    .join("\n");

  return {
    success: true,
    output,
    atoms,
  };
}

function executeConceptNode(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (Concept "name")',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: 'Name must be a quoted string, e.g., "Cat"',
    };
  }

  const existing = findAtom(state.atoms, name, "ConceptNode");
  if (existing) {
    return {
      success: true,
      output: `(ConceptNode "${name}")`,
      atoms: [existing],
    };
  }

  const newAtom = createAtom(String(state.nextId), "ConceptNode", name);
  state.atoms.push(newAtom);
  state.nextId++;

  return {
    success: true,
    output: `Created: (ConceptNode "${name}")`,
    newAtom,
  };
}

function executePredicateNode(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (Predicate "name")',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: 'Name must be a quoted string, e.g., "is-a"',
    };
  }

  const existing = findAtom(state.atoms, name, "PredicateNode");
  if (existing) {
    return {
      success: true,
      output: `(PredicateNode "${name}")`,
      atoms: [existing],
    };
  }

  const newAtom = createAtom(String(state.nextId), "PredicateNode", name, {
    strength: 1.0,
    confidence: 1.0,
  });
  state.atoms.push(newAtom);
  state.nextId++;

  return {
    success: true,
    output: `Created: (PredicateNode "${name}")`,
    newAtom,
  };
}

function executeInheritanceLink(args: string[], state: ReplState): ReplResult {
  // For now, simplified - expect two atom references
  // In a real implementation, this would parse nested expressions
  if (args.length < 2) {
    return {
      success: false,
      output:
        'Usage: (Inheritance (Concept "A") (Concept "B"))\nSimplified: Provide two concept names',
    };
  }

  // Try to find or create the referenced atoms
  const name1 = extractQuotedString(args[0]);
  const name2 = extractQuotedString(args[1]);

  if (!name1 || !name2) {
    return {
      success: false,
      output: "Both arguments must be quoted atom names",
    };
  }

  let atom1 = findAtom(state.atoms, name1);
  let atom2 = findAtom(state.atoms, name2);

  if (!atom1) {
    atom1 = createAtom(String(state.nextId), "ConceptNode", name1);
    state.atoms.push(atom1);
    state.nextId++;
  }

  if (!atom2) {
    atom2 = createAtom(String(state.nextId), "ConceptNode", name2);
    state.atoms.push(atom2);
    state.nextId++;
  }

  const linkName = `${name1}->${name2}`;
  const existingLink = findAtom(state.atoms, linkName, "InheritanceLink");

  if (existingLink) {
    return {
      success: true,
      output: `(InheritanceLink\n  (${atom1.type} "${atom1.name}")\n  (${atom2.type} "${atom2.name}"))`,
      atoms: [existingLink],
    };
  }

  const newLink = createAtom(
    String(state.nextId),
    "InheritanceLink",
    linkName,
    { strength: 1.0, confidence: 0.9 },
    [atom1.id, atom2.id]
  );
  state.atoms.push(newLink);
  state.nextId++;

  return {
    success: true,
    output: `Created: (InheritanceLink\n  (${atom1.type} "${atom1.name}")\n  (${atom2.type} "${atom2.name}"))`,
    newAtom: newLink,
  };
}

function executeClear(state: ReplState): ReplResult {
  state.atoms = [...SAMPLE_ATOMS];
  state.nextId = SAMPLE_ATOMS.length + 1;

  return {
    success: true,
    output: "AtomSpace cleared and reset to sample data.",
    atoms: state.atoms,
  };
}

function executeCogIncomingSet(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (cog-incoming-set (Concept "name"))',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: "Provide a quoted atom name",
    };
  }

  const atom = findAtom(state.atoms, name);
  if (!atom) {
    return {
      success: false,
      output: `Atom "${name}" not found`,
    };
  }

  const incomingLinks = state.atoms.filter(
    (a) => a.outgoing?.includes(atom.id)
  );

  if (incomingLinks.length === 0) {
    return {
      success: true,
      output: "()",
    };
  }

  const output = incomingLinks.map((l) => `(${l.type} "${l.name}")`).join("\n");

  return {
    success: true,
    output: `(${output})`,
    atoms: incomingLinks,
  };
}

function executeCogOutgoingSet(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (cog-outgoing-set (Link "name"))',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: "Provide a quoted link name",
    };
  }

  const link = findAtom(state.atoms, name);
  if (!link || !link.outgoing) {
    return {
      success: true,
      output: "()",
    };
  }

  const outgoing = link.outgoing
    .map((id) => state.atoms.find((a) => a.id === id))
    .filter((a): a is Atom => a !== undefined);

  const output = outgoing.map((a) => `(${a.type} "${a.name}")`).join("\n");

  return {
    success: true,
    output: `(${output})`,
    atoms: outgoing,
  };
}

function executeDisplay(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (display (Concept "name"))',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: "Provide a quoted atom name",
    };
  }

  const atom = findAtom(state.atoms, name);
  if (!atom) {
    return {
      success: false,
      output: `Atom "${name}" not found`,
    };
  }

  let output = `(${atom.type} "${atom.name}")`;
  if (atom.tv) {
    output += `\n  ; TV: (stv ${atom.tv.strength.toFixed(3)} ${atom.tv.confidence.toFixed(3)})`;
  }
  if (atom.outgoing) {
    const outNames = atom.outgoing
      .map((id) => state.atoms.find((a) => a.id === id)?.name || id)
      .join(", ");
    output += `\n  ; Outgoing: [${outNames}]`;
  }

  return {
    success: true,
    output,
    atoms: [atom],
  };
}

function executeCogTv(args: string[], state: ReplState): ReplResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Usage: (cog-tv (Concept "name"))',
    };
  }

  const name = extractQuotedString(args[0]);
  if (!name) {
    return {
      success: false,
      output: "Provide a quoted atom name",
    };
  }

  const atom = findAtom(state.atoms, name);
  if (!atom) {
    return {
      success: false,
      output: `Atom "${name}" not found`,
    };
  }

  if (!atom.tv) {
    return {
      success: true,
      output: "(stv 1.000 0.000)",
    };
  }

  return {
    success: true,
    output: `(stv ${atom.tv.strength.toFixed(3)} ${atom.tv.confidence.toFixed(3)})`,
  };
}

/**
 * Validate if a string looks like a valid Scheme expression
 */
export function isValidSchemeExpression(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
    return false;
  }

  // Check balanced parentheses
  let depth = 0;
  let inQuote = false;

  for (const char of trimmed) {
    if (char === '"' && depth > 0) {
      inQuote = !inQuote;
    }
    if (!inQuote) {
      if (char === "(") depth++;
      if (char === ")") depth--;
    }
    if (depth < 0) return false;
  }

  return depth === 0;
}
