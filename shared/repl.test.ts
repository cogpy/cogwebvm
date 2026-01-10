import { describe, it, expect, beforeEach } from "vitest";
import {
  createReplState,
  executeSchemeCommand,
  isValidSchemeExpression,
  ReplState,
} from "./repl";
import { SAMPLE_ATOMS } from "./atomspace";

describe("REPL Utilities", () => {
  let state: ReplState;

  beforeEach(() => {
    state = createReplState();
  });

  describe("createReplState", () => {
    it("should create state with sample atoms", () => {
      expect(state.atoms.length).toBe(SAMPLE_ATOMS.length);
      expect(state.nextId).toBe(SAMPLE_ATOMS.length + 1);
    });

    it("should create independent copy of atoms", () => {
      state.atoms.push({ id: "999", type: "ConceptNode", name: "Test" });
      const newState = createReplState();
      expect(newState.atoms.length).toBe(SAMPLE_ATOMS.length);
    });
  });

  describe("executeSchemeCommand", () => {
    describe("invalid commands", () => {
      it("should reject non-parenthesized input", () => {
        const result = executeSchemeCommand("help", state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("Syntax error");
      });

      it("should reject unknown commands", () => {
        const result = executeSchemeCommand("(unknown-command)", state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("Unknown command");
      });
    });

    describe("(help)", () => {
      it("should return help text", () => {
        const result = executeSchemeCommand("(help)", state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("Available Commands");
        expect(result.output).toContain("Concept");
        expect(result.output).toContain("cog-get-atoms");
      });
    });

    describe("(count-all)", () => {
      it("should count all atoms", () => {
        const result = executeSchemeCommand("(count-all)", state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("Total atoms:");
        expect(result.output).toContain(String(SAMPLE_ATOMS.length));
      });

      it("should show type breakdown", () => {
        const result = executeSchemeCommand("(count-all)", state);
        expect(result.output).toContain("ConceptNode");
        expect(result.output).toContain("InheritanceLink");
      });
    });

    describe("(cog-atomspace)", () => {
      it("should return atomspace info", () => {
        const result = executeSchemeCommand("(cog-atomspace)", state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("#<AtomSpace");
        expect(result.output).toContain("addr:");
      });
    });

    describe("(cog-get-atoms)", () => {
      it("should list atoms by type", () => {
        const result = executeSchemeCommand(
          "(cog-get-atoms 'ConceptNode)",
          state
        );
        expect(result.success).toBe(true);
        expect(result.output).toContain("ConceptNode");
        expect(result.atoms).toBeDefined();
        expect(result.atoms!.length).toBeGreaterThan(0);
      });

      it("should return empty for non-existent type", () => {
        const result = executeSchemeCommand(
          "(cog-get-atoms 'NonexistentType)",
          state
        );
        expect(result.success).toBe(true);
        expect(result.output).toContain("No atoms");
      });

      it("should require type argument", () => {
        const result = executeSchemeCommand("(cog-get-atoms)", state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("Usage");
      });
    });

    describe("(Concept)", () => {
      it("should return existing concept", () => {
        const result = executeSchemeCommand('(Concept "Cat")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain('ConceptNode "Cat"');
        expect(result.atoms).toBeDefined();
      });

      it("should create new concept", () => {
        const initialCount = state.atoms.length;
        const result = executeSchemeCommand('(Concept "NewConcept")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("Created");
        expect(result.newAtom).toBeDefined();
        expect(state.atoms.length).toBe(initialCount + 1);
      });

      it("should require name argument", () => {
        const result = executeSchemeCommand("(Concept)", state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("Usage");
      });
    });

    describe("(Predicate)", () => {
      it("should return existing predicate", () => {
        const result = executeSchemeCommand('(Predicate "is-a")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain('PredicateNode "is-a"');
      });

      it("should create new predicate", () => {
        const result = executeSchemeCommand('(Predicate "new-pred")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("Created");
        expect(result.newAtom?.type).toBe("PredicateNode");
      });
    });

    describe("(Inheritance)", () => {
      it("should create inheritance link", () => {
        const result = executeSchemeCommand(
          '(Inheritance "Cat" "Animal")',
          state
        );
        expect(result.success).toBe(true);
        expect(result.output).toContain("InheritanceLink");
      });

      it("should create atoms if they don't exist", () => {
        const result = executeSchemeCommand(
          '(Inheritance "NewA" "NewB")',
          state
        );
        expect(result.success).toBe(true);
        // Should have created NewA, NewB, and the link
        const newA = state.atoms.find(
          (a) => a.name === "NewA" && a.type === "ConceptNode"
        );
        const newB = state.atoms.find(
          (a) => a.name === "NewB" && a.type === "ConceptNode"
        );
        expect(newA).toBeDefined();
        expect(newB).toBeDefined();
      });

      it("should require two arguments", () => {
        const result = executeSchemeCommand('(Inheritance "A")', state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("Usage");
      });
    });

    describe("(clear)", () => {
      it("should reset to sample data", () => {
        // Add some atoms
        executeSchemeCommand('(Concept "TestAtom")', state);
        expect(state.atoms.length).toBe(SAMPLE_ATOMS.length + 1);

        // Clear
        const result = executeSchemeCommand("(clear)", state);
        expect(result.success).toBe(true);
        expect(state.atoms.length).toBe(SAMPLE_ATOMS.length);
        expect(state.nextId).toBe(SAMPLE_ATOMS.length + 1);
      });
    });

    describe("(cog-incoming-set)", () => {
      it("should return incoming links for atom", () => {
        const result = executeSchemeCommand(
          '(cog-incoming-set "Mammal")',
          state
        );
        expect(result.success).toBe(true);
        expect(result.atoms).toBeDefined();
        // Mammal has multiple incoming inheritance links
        expect(result.atoms!.length).toBeGreaterThan(0);
      });

      it("should return empty for atom with no incoming", () => {
        // Animal is at the top of the hierarchy
        const result = executeSchemeCommand(
          '(cog-incoming-set "Animal")',
          state
        );
        expect(result.success).toBe(true);
        // Animal has one incoming link (Mammal->Animal)
        expect(result.output).toContain("InheritanceLink");
      });

      it("should handle non-existent atom", () => {
        const result = executeSchemeCommand(
          '(cog-incoming-set "Nonexistent")',
          state
        );
        expect(result.success).toBe(false);
        expect(result.output).toContain("not found");
      });
    });

    describe("(cog-outgoing-set)", () => {
      it("should return outgoing atoms for link", () => {
        const result = executeSchemeCommand(
          '(cog-outgoing-set "Cat->Mammal")',
          state
        );
        expect(result.success).toBe(true);
        expect(result.atoms).toBeDefined();
        expect(result.atoms!.length).toBe(2);
      });

      it("should return empty for non-link", () => {
        const result = executeSchemeCommand('(cog-outgoing-set "Cat")', state);
        expect(result.success).toBe(true);
        expect(result.output).toBe("()");
      });
    });

    describe("(display)", () => {
      it("should display atom with TV", () => {
        const result = executeSchemeCommand('(display "Cat")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("ConceptNode");
        expect(result.output).toContain("Cat");
        expect(result.output).toContain("stv");
      });

      it("should display link with outgoing", () => {
        const result = executeSchemeCommand('(display "Cat->Mammal")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("Outgoing");
      });
    });

    describe("(cog-tv)", () => {
      it("should return truth value for atom", () => {
        const result = executeSchemeCommand('(cog-tv "Cat")', state);
        expect(result.success).toBe(true);
        expect(result.output).toContain("stv");
        expect(result.output).toMatch(/\d+\.\d+/);
      });

      it("should handle non-existent atom", () => {
        const result = executeSchemeCommand('(cog-tv "Nonexistent")', state);
        expect(result.success).toBe(false);
        expect(result.output).toContain("not found");
      });
    });
  });

  describe("isValidSchemeExpression", () => {
    it("should accept valid expressions", () => {
      expect(isValidSchemeExpression("(help)")).toBe(true);
      expect(isValidSchemeExpression('(Concept "Cat")')).toBe(true);
      expect(isValidSchemeExpression("(cog-get-atoms 'ConceptNode)")).toBe(
        true
      );
      expect(isValidSchemeExpression("  (help)  ")).toBe(true);
    });

    it("should reject invalid expressions", () => {
      expect(isValidSchemeExpression("")).toBe(false);
      expect(isValidSchemeExpression("help")).toBe(false);
      expect(isValidSchemeExpression("(")).toBe(false);
      expect(isValidSchemeExpression(")")).toBe(false);
      expect(isValidSchemeExpression("(help")).toBe(false);
      expect(isValidSchemeExpression("help)")).toBe(false);
    });

    it("should handle nested parentheses", () => {
      expect(isValidSchemeExpression("((nested))")).toBe(true);
      expect(isValidSchemeExpression("(a (b (c)))")).toBe(true);
      expect(isValidSchemeExpression("(a (b)")).toBe(false);
    });

    it("should handle quoted strings", () => {
      expect(isValidSchemeExpression('(test "hello (world)")')).toBe(true);
      expect(isValidSchemeExpression('(test ")")')).toBe(true);
    });
  });
});

describe("REPL State Management", () => {
  it("should maintain state across commands", () => {
    const state = createReplState();
    const initialCount = state.atoms.length;

    // Create a new concept
    executeSchemeCommand('(Concept "TestConcept")', state);
    expect(state.atoms.length).toBe(initialCount + 1);

    // Create another
    executeSchemeCommand('(Concept "TestConcept2")', state);
    expect(state.atoms.length).toBe(initialCount + 2);

    // Query should show new atoms
    const result = executeSchemeCommand("(cog-get-atoms 'ConceptNode)", state);
    expect(result.output).toContain("TestConcept");
    expect(result.output).toContain("TestConcept2");
  });

  it("should increment nextId correctly", () => {
    const state = createReplState();
    const initialId = state.nextId;

    executeSchemeCommand('(Concept "Test1")', state);
    expect(state.nextId).toBe(initialId + 1);

    executeSchemeCommand('(Concept "Test2")', state);
    expect(state.nextId).toBe(initialId + 2);
  });
});
