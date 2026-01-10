import { describe, it, expect, beforeEach } from "vitest";
import {
  Atom,
  TruthValue,
  ATOM_TYPE_COLORS,
  getAtomColor,
  isLinkType,
  isNodeType,
  getAtomTypes,
  filterAtoms,
  buildGraphData,
  atomToScheme,
  createAtomsMap,
  parseSchemeCommand,
  extractQuotedString,
  extractQuotedType,
  isValidTruthValue,
  createAtom,
  countAtomsByType,
  getAtomsByType,
  findAtom,
  getOutgoingAtoms,
  getIncomingLinks,
  SAMPLE_ATOMS,
} from "./atomspace";

describe("AtomSpace Utilities", () => {
  describe("getAtomColor", () => {
    it("should return correct color for ConceptNode", () => {
      expect(getAtomColor("ConceptNode")).toBe("#00f0ff");
    });

    it("should return correct color for PredicateNode", () => {
      expect(getAtomColor("PredicateNode")).toBe("#bd00ff");
    });

    it("should return correct color for InheritanceLink", () => {
      expect(getAtomColor("InheritanceLink")).toBe("#00ff88");
    });

    it("should return correct color for EvaluationLink", () => {
      expect(getAtomColor("EvaluationLink")).toBe("#ffaa00");
    });

    it("should return default color for unknown types", () => {
      expect(getAtomColor("UnknownType")).toBe("#888888");
      expect(getAtomColor("")).toBe("#888888");
      expect(getAtomColor("RandomNode")).toBe("#888888");
    });

    it("should have all defined colors accessible", () => {
      Object.keys(ATOM_TYPE_COLORS).forEach((type) => {
        expect(getAtomColor(type)).toBe(ATOM_TYPE_COLORS[type]);
      });
    });
  });

  describe("isLinkType", () => {
    it("should return true for link types", () => {
      expect(isLinkType("InheritanceLink")).toBe(true);
      expect(isLinkType("EvaluationLink")).toBe(true);
      expect(isLinkType("MemberLink")).toBe(true);
      expect(isLinkType("ListLink")).toBe(true);
      expect(isLinkType("SimilarityLink")).toBe(true);
    });

    it("should return false for node types", () => {
      expect(isLinkType("ConceptNode")).toBe(false);
      expect(isLinkType("PredicateNode")).toBe(false);
      expect(isLinkType("VariableNode")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isLinkType("")).toBe(false);
      expect(isLinkType("Link")).toBe(true); // Edge case: just "Link"
      expect(isLinkType("NotALink")).toBe(true); // Ends with "Link"
      expect(isLinkType("Something")).toBe(false);
      expect(isLinkType("link")).toBe(false); // Case sensitive
    });
  });

  describe("isNodeType", () => {
    it("should return true for node types", () => {
      expect(isNodeType("ConceptNode")).toBe(true);
      expect(isNodeType("PredicateNode")).toBe(true);
      expect(isNodeType("VariableNode")).toBe(true);
      expect(isNodeType("NumberNode")).toBe(true);
    });

    it("should return false for link types", () => {
      expect(isNodeType("InheritanceLink")).toBe(false);
      expect(isNodeType("EvaluationLink")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isNodeType("")).toBe(false);
      expect(isNodeType("Node")).toBe(true); // Edge case: just "Node"
      expect(isNodeType("NotANode")).toBe(true); // Ends with "Node"
      expect(isNodeType("Something")).toBe(false);
      expect(isNodeType("node")).toBe(false); // Case sensitive
    });
  });

  describe("getAtomTypes", () => {
    it("should return unique atom types", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
        { id: "3", type: "PredicateNode", name: "C" },
      ];
      const types = getAtomTypes(atoms);
      expect(types).toHaveLength(2);
      expect(types).toContain("ConceptNode");
      expect(types).toContain("PredicateNode");
    });

    it("should return empty array for empty input", () => {
      expect(getAtomTypes([])).toEqual([]);
    });

    it("should handle single atom", () => {
      const atoms: Atom[] = [{ id: "1", type: "ConceptNode", name: "A" }];
      expect(getAtomTypes(atoms)).toEqual(["ConceptNode"]);
    });

    it("should preserve order of first occurrence", () => {
      const atoms: Atom[] = [
        { id: "1", type: "PredicateNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
        { id: "3", type: "PredicateNode", name: "C" },
      ];
      const types = getAtomTypes(atoms);
      expect(types[0]).toBe("PredicateNode");
      expect(types[1]).toBe("ConceptNode");
    });
  });

  describe("filterAtoms", () => {
    const testAtoms: Atom[] = [
      { id: "1", type: "ConceptNode", name: "Cat" },
      { id: "2", type: "ConceptNode", name: "Dog" },
      { id: "3", type: "PredicateNode", name: "is-a" },
      { id: "4", type: "InheritanceLink", name: "Cat->Animal", outgoing: ["1", "5"] },
    ];

    it("should return all atoms with empty search and null type", () => {
      const result = filterAtoms(testAtoms, "", null);
      expect(result).toHaveLength(4);
    });

    it("should filter by name (case insensitive)", () => {
      // "cat" matches: Cat (name), Cat->Animal (name)
      const catResults = filterAtoms(testAtoms, "cat", null);
      expect(catResults.some((a) => a.name === "Cat")).toBe(true);
      expect(catResults.some((a) => a.name === "Cat->Animal")).toBe(true);
      // Case insensitivity check
      expect(filterAtoms(testAtoms, "DOG", null)).toHaveLength(1);
      expect(filterAtoms(testAtoms, "dog", null)).toHaveLength(1);
    });

    it("should filter by type in search query", () => {
      const result = filterAtoms(testAtoms, "concept", null);
      expect(result).toHaveLength(2); // Both ConceptNodes
    });

    it("should filter by selected type", () => {
      const result = filterAtoms(testAtoms, "", "ConceptNode");
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.type === "ConceptNode")).toBe(true);
    });

    it("should combine search and type filter", () => {
      const result = filterAtoms(testAtoms, "cat", "ConceptNode");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Cat");
    });

    it("should return empty array when nothing matches", () => {
      expect(filterAtoms(testAtoms, "xyz", null)).toHaveLength(0);
      expect(filterAtoms(testAtoms, "", "NonexistentType")).toHaveLength(0);
    });
  });

  describe("buildGraphData", () => {
    it("should build nodes from non-link atoms", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
        { id: "3", type: "InheritanceLink", name: "A->B", outgoing: ["1", "2"] },
      ];
      const graph = buildGraphData(atoms);
      expect(graph.nodes).toHaveLength(2);
      expect(graph.nodes.map((n) => n.id)).toContain("1");
      expect(graph.nodes.map((n) => n.id)).toContain("2");
    });

    it("should build links from link atoms with outgoing", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
        { id: "3", type: "InheritanceLink", name: "A->B", outgoing: ["1", "2"] },
      ];
      const graph = buildGraphData(atoms);
      expect(graph.links).toHaveLength(1);
      expect(graph.links[0].source).toBe("1");
      expect(graph.links[0].target).toBe("2");
      expect(graph.links[0].type).toBe("InheritanceLink");
    });

    it("should ignore links without enough outgoing atoms", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "InheritanceLink", name: "Bad", outgoing: ["1"] },
        { id: "3", type: "InheritanceLink", name: "Empty" },
      ];
      const graph = buildGraphData(atoms);
      expect(graph.links).toHaveLength(0);
    });

    it("should return empty graph for empty input", () => {
      const graph = buildGraphData([]);
      expect(graph.nodes).toHaveLength(0);
      expect(graph.links).toHaveLength(0);
    });

    it("should assign correct group based on type order", () => {
      const atoms: Atom[] = [
        { id: "1", type: "PredicateNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
      ];
      const graph = buildGraphData(atoms);
      expect(graph.nodes.find((n) => n.id === "1")?.group).toBe(0);
      expect(graph.nodes.find((n) => n.id === "2")?.group).toBe(1);
    });
  });

  describe("atomToScheme", () => {
    it("should generate Scheme for simple node", () => {
      const atom: Atom = { id: "1", type: "ConceptNode", name: "Cat" };
      expect(atomToScheme(atom)).toBe('(ConceptNode "Cat")');
    });

    it("should generate Scheme for link with outgoing", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "Cat" },
        { id: "2", type: "ConceptNode", name: "Animal" },
        { id: "3", type: "InheritanceLink", name: "Cat->Animal", outgoing: ["1", "2"] },
      ];
      const atomsMap = createAtomsMap(atoms);
      const result = atomToScheme(atoms[2], atomsMap);
      expect(result).toContain("InheritanceLink");
      expect(result).toContain('(ConceptNode "Cat")');
      expect(result).toContain('(ConceptNode "Animal")');
    });

    it("should use IDs when atomsMap is not provided", () => {
      const atom: Atom = { id: "3", type: "InheritanceLink", name: "X", outgoing: ["1", "2"] };
      const result = atomToScheme(atom);
      expect(result).toContain("1");
      expect(result).toContain("2");
    });
  });

  describe("createAtomsMap", () => {
    it("should create a map with atom IDs as keys", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
      ];
      const map = createAtomsMap(atoms);
      expect(map.size).toBe(2);
      expect(map.get("1")?.name).toBe("A");
      expect(map.get("2")?.name).toBe("B");
    });

    it("should return empty map for empty input", () => {
      expect(createAtomsMap([]).size).toBe(0);
    });

    it("should handle duplicate IDs (last one wins)", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "First" },
        { id: "1", type: "ConceptNode", name: "Second" },
      ];
      const map = createAtomsMap(atoms);
      expect(map.size).toBe(1);
      expect(map.get("1")?.name).toBe("Second");
    });
  });

  describe("parseSchemeCommand", () => {
    it("should parse simple command", () => {
      const result = parseSchemeCommand("(help)");
      expect(result).not.toBeNull();
      expect(result?.command).toBe("help");
      expect(result?.args).toEqual([]);
    });

    it("should parse command with quoted string argument", () => {
      const result = parseSchemeCommand('(Concept "Cat")');
      expect(result).not.toBeNull();
      expect(result?.command).toBe("Concept");
      expect(result?.args).toEqual(['"Cat"']);
    });

    it("should parse command with quoted type argument", () => {
      const result = parseSchemeCommand("(cog-get-atoms 'ConceptNode)");
      expect(result).not.toBeNull();
      expect(result?.command).toBe("cog-get-atoms");
      expect(result?.args).toEqual(["'ConceptNode"]);
    });

    it("should parse command with multiple arguments", () => {
      const result = parseSchemeCommand('(stv 0.5 0.9)');
      expect(result).not.toBeNull();
      expect(result?.command).toBe("stv");
      expect(result?.args).toEqual(["0.5", "0.9"]);
    });

    it("should return null for invalid input", () => {
      expect(parseSchemeCommand("")).toBeNull();
      expect(parseSchemeCommand("help")).toBeNull();
      expect(parseSchemeCommand("(")).toBeNull();
      expect(parseSchemeCommand(")")).toBeNull();
      expect(parseSchemeCommand("()")).toBeNull();
    });

    it("should handle whitespace in input", () => {
      const result = parseSchemeCommand("  (help)  ");
      expect(result).not.toBeNull();
      expect(result?.command).toBe("help");
    });

    it("should handle quoted strings with spaces", () => {
      const result = parseSchemeCommand('(Concept "Hello World")');
      expect(result).not.toBeNull();
      expect(result?.args[0]).toBe('"Hello World"');
    });
  });

  describe("extractQuotedString", () => {
    it("should extract string from double quotes", () => {
      expect(extractQuotedString('"Cat"')).toBe("Cat");
      expect(extractQuotedString('"Hello World"')).toBe("Hello World");
      expect(extractQuotedString('""')).toBe("");
    });

    it("should return null for non-quoted strings", () => {
      expect(extractQuotedString("Cat")).toBeNull();
      expect(extractQuotedString("'Cat'")).toBeNull();
      expect(extractQuotedString('"Cat')).toBeNull();
      expect(extractQuotedString('Cat"')).toBeNull();
    });
  });

  describe("extractQuotedType", () => {
    it("should extract type from quoted type expression", () => {
      expect(extractQuotedType("'ConceptNode")).toBe("ConceptNode");
      expect(extractQuotedType("'PredicateNode")).toBe("PredicateNode");
    });

    it("should return null for invalid expressions", () => {
      expect(extractQuotedType("ConceptNode")).toBeNull();
      expect(extractQuotedType("'")).toBeNull();
      expect(extractQuotedType("''")).toBeNull();
      expect(extractQuotedType('"ConceptNode"')).toBeNull();
    });
  });

  describe("isValidTruthValue", () => {
    it("should return true for valid truth values", () => {
      expect(isValidTruthValue({ strength: 0.5, confidence: 0.9 })).toBe(true);
      expect(isValidTruthValue({ strength: 0, confidence: 0 })).toBe(true);
      expect(isValidTruthValue({ strength: 1, confidence: 1 })).toBe(true);
    });

    it("should return false for invalid truth values", () => {
      expect(isValidTruthValue(null)).toBe(false);
      expect(isValidTruthValue(undefined)).toBe(false);
      expect(isValidTruthValue({})).toBe(false);
      expect(isValidTruthValue({ strength: 0.5 })).toBe(false);
      expect(isValidTruthValue({ confidence: 0.5 })).toBe(false);
      expect(isValidTruthValue({ strength: "0.5", confidence: 0.9 })).toBe(false);
      expect(isValidTruthValue({ strength: -0.1, confidence: 0.9 })).toBe(false);
      expect(isValidTruthValue({ strength: 1.1, confidence: 0.9 })).toBe(false);
      expect(isValidTruthValue({ strength: 0.5, confidence: -0.1 })).toBe(false);
      expect(isValidTruthValue({ strength: 0.5, confidence: 1.1 })).toBe(false);
    });
  });

  describe("createAtom", () => {
    it("should create atom with default truth value", () => {
      const atom = createAtom("1", "ConceptNode", "Cat");
      expect(atom.id).toBe("1");
      expect(atom.type).toBe("ConceptNode");
      expect(atom.name).toBe("Cat");
      expect(atom.tv).toEqual({ strength: 1.0, confidence: 0.9 });
      expect(atom.outgoing).toBeUndefined();
    });

    it("should create atom with custom truth value", () => {
      const tv: TruthValue = { strength: 0.5, confidence: 0.8 };
      const atom = createAtom("1", "ConceptNode", "Cat", tv);
      expect(atom.tv).toEqual(tv);
    });

    it("should create link with outgoing", () => {
      const atom = createAtom("3", "InheritanceLink", "Cat->Animal", undefined, ["1", "2"]);
      expect(atom.outgoing).toEqual(["1", "2"]);
    });
  });

  describe("countAtomsByType", () => {
    it("should count atoms by type", () => {
      const atoms: Atom[] = [
        { id: "1", type: "ConceptNode", name: "A" },
        { id: "2", type: "ConceptNode", name: "B" },
        { id: "3", type: "PredicateNode", name: "C" },
        { id: "4", type: "InheritanceLink", name: "D", outgoing: ["1", "2"] },
      ];
      const counts = countAtomsByType(atoms);
      expect(counts["ConceptNode"]).toBe(2);
      expect(counts["PredicateNode"]).toBe(1);
      expect(counts["InheritanceLink"]).toBe(1);
    });

    it("should return empty object for empty input", () => {
      expect(countAtomsByType([])).toEqual({});
    });
  });

  describe("getAtomsByType", () => {
    const atoms: Atom[] = [
      { id: "1", type: "ConceptNode", name: "A" },
      { id: "2", type: "ConceptNode", name: "B" },
      { id: "3", type: "PredicateNode", name: "C" },
    ];

    it("should return atoms of specified type", () => {
      const result = getAtomsByType(atoms, "ConceptNode");
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.type === "ConceptNode")).toBe(true);
    });

    it("should return empty array for non-existent type", () => {
      expect(getAtomsByType(atoms, "NonexistentType")).toHaveLength(0);
    });
  });

  describe("findAtom", () => {
    const atoms: Atom[] = [
      { id: "1", type: "ConceptNode", name: "Cat" },
      { id: "2", type: "PredicateNode", name: "Cat" },
      { id: "3", type: "ConceptNode", name: "Dog" },
    ];

    it("should find atom by name", () => {
      const result = findAtom(atoms, "Dog");
      expect(result).not.toBeUndefined();
      expect(result?.name).toBe("Dog");
    });

    it("should find atom by name and type", () => {
      const result = findAtom(atoms, "Cat", "PredicateNode");
      expect(result).not.toBeUndefined();
      expect(result?.type).toBe("PredicateNode");
    });

    it("should return first match when multiple exist", () => {
      const result = findAtom(atoms, "Cat");
      expect(result?.id).toBe("1"); // First Cat
    });

    it("should return undefined when not found", () => {
      expect(findAtom(atoms, "Elephant")).toBeUndefined();
      expect(findAtom(atoms, "Cat", "InheritanceLink")).toBeUndefined();
    });
  });

  describe("getOutgoingAtoms", () => {
    const atoms: Atom[] = [
      { id: "1", type: "ConceptNode", name: "Cat" },
      { id: "2", type: "ConceptNode", name: "Animal" },
      { id: "3", type: "InheritanceLink", name: "Cat->Animal", outgoing: ["1", "2"] },
    ];
    const atomsMap = createAtomsMap(atoms);

    it("should return outgoing atoms for a link", () => {
      const result = getOutgoingAtoms(atoms[2], atomsMap);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Cat");
      expect(result[1].name).toBe("Animal");
    });

    it("should return empty array for node without outgoing", () => {
      const result = getOutgoingAtoms(atoms[0], atomsMap);
      expect(result).toHaveLength(0);
    });

    it("should filter out missing atoms", () => {
      const link: Atom = { id: "4", type: "InheritanceLink", name: "X", outgoing: ["1", "99"] };
      const result = getOutgoingAtoms(link, atomsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Cat");
    });
  });

  describe("getIncomingLinks", () => {
    const atoms: Atom[] = [
      { id: "1", type: "ConceptNode", name: "Cat" },
      { id: "2", type: "ConceptNode", name: "Animal" },
      { id: "3", type: "InheritanceLink", name: "Cat->Animal", outgoing: ["1", "2"] },
      { id: "4", type: "EvaluationLink", name: "Eval", outgoing: ["1", "5"] },
    ];

    it("should return links that reference the atom", () => {
      const result = getIncomingLinks("1", atoms);
      expect(result).toHaveLength(2);
      expect(result.map((l) => l.id)).toContain("3");
      expect(result.map((l) => l.id)).toContain("4");
    });

    it("should return links referencing non-existent atom ids", () => {
      // Atom id "5" is referenced in link 4's outgoing, so it has 1 incoming link
      const result = getIncomingLinks("5", atoms);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("4");
    });

    it("should return empty array for atom with no incoming links", () => {
      // Atom id "99" is not referenced anywhere
      const result = getIncomingLinks("99", atoms);
      expect(result).toHaveLength(0);
    });
  });

  describe("SAMPLE_ATOMS", () => {
    it("should contain expected number of atoms", () => {
      expect(SAMPLE_ATOMS.length).toBe(14);
    });

    it("should have valid structure for all atoms", () => {
      SAMPLE_ATOMS.forEach((atom) => {
        expect(atom.id).toBeDefined();
        expect(atom.type).toBeDefined();
        expect(atom.name).toBeDefined();
        if (atom.tv) {
          expect(isValidTruthValue(atom.tv)).toBe(true);
        }
      });
    });

    it("should contain both nodes and links", () => {
      const nodes = SAMPLE_ATOMS.filter((a) => isNodeType(a.type));
      const links = SAMPLE_ATOMS.filter((a) => isLinkType(a.type));
      expect(nodes.length).toBeGreaterThan(0);
      expect(links.length).toBeGreaterThan(0);
    });

    it("should have valid outgoing references for links", () => {
      const atomIds = new Set(SAMPLE_ATOMS.map((a) => a.id));
      const links = SAMPLE_ATOMS.filter((a) => isLinkType(a.type) && a.outgoing);
      links.forEach((link) => {
        link.outgoing?.forEach((id) => {
          expect(atomIds.has(id)).toBe(true);
        });
      });
    });
  });
});

describe("REPL Command Simulation", () => {
  let atoms: Atom[];

  beforeEach(() => {
    atoms = [...SAMPLE_ATOMS];
  });

  describe("(help) command", () => {
    it("should be parseable", () => {
      const cmd = parseSchemeCommand("(help)");
      expect(cmd?.command).toBe("help");
    });
  });

  describe("(count-all) command", () => {
    it("should count all atoms", () => {
      const cmd = parseSchemeCommand("(count-all)");
      expect(cmd?.command).toBe("count-all");
      expect(atoms.length).toBe(14);
    });
  });

  describe("(cog-get-atoms) command", () => {
    it("should parse type argument", () => {
      const cmd = parseSchemeCommand("(cog-get-atoms 'ConceptNode)");
      expect(cmd?.command).toBe("cog-get-atoms");
      const type = extractQuotedType(cmd?.args[0] || "");
      expect(type).toBe("ConceptNode");
    });

    it("should return atoms of specified type", () => {
      const type = "ConceptNode";
      const result = getAtomsByType(atoms, type);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((a) => a.type === type)).toBe(true);
    });
  });

  describe("(Concept) command", () => {
    it("should parse name argument", () => {
      const cmd = parseSchemeCommand('(Concept "Cat")');
      expect(cmd?.command).toBe("Concept");
      const name = extractQuotedString(cmd?.args[0] || "");
      expect(name).toBe("Cat");
    });

    it("should find existing concept", () => {
      const name = "Cat";
      const result = findAtom(atoms, name, "ConceptNode");
      expect(result).not.toBeUndefined();
    });

    it("should allow creating new concept", () => {
      const name = "NewConcept";
      const existing = findAtom(atoms, name, "ConceptNode");
      expect(existing).toBeUndefined();

      const newAtom = createAtom(String(atoms.length + 1), "ConceptNode", name);
      atoms.push(newAtom);

      const found = findAtom(atoms, name, "ConceptNode");
      expect(found).not.toBeUndefined();
      expect(found?.name).toBe(name);
    });
  });
});

describe("Graph Visualization Data", () => {
  it("should generate valid graph from SAMPLE_ATOMS", () => {
    const graph = buildGraphData(SAMPLE_ATOMS);

    // Should have nodes for all non-link atoms
    const expectedNodes = SAMPLE_ATOMS.filter((a) => !isLinkType(a.type)).length;
    expect(graph.nodes.length).toBe(expectedNodes);

    // Should have links for all link atoms with valid outgoing
    const expectedLinks = SAMPLE_ATOMS.filter(
      (a) => isLinkType(a.type) && a.outgoing && a.outgoing.length >= 2
    ).length;
    expect(graph.links.length).toBe(expectedLinks);
  });

  it("should have all required node properties", () => {
    const graph = buildGraphData(SAMPLE_ATOMS);
    graph.nodes.forEach((node) => {
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.type).toBeDefined();
      expect(typeof node.group).toBe("number");
      expect(typeof node.val).toBe("number");
    });
  });

  it("should have all required link properties", () => {
    const graph = buildGraphData(SAMPLE_ATOMS);
    graph.links.forEach((link) => {
      expect(link.source).toBeDefined();
      expect(link.target).toBeDefined();
      expect(link.type).toBeDefined();
    });
  });
});
