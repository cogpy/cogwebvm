import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useCogServer } from "@/contexts/CogServerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ForceGraph3D from "react-force-graph-3d";
import {
  Search,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  Database,
  Eye,
  Code,
  ChevronRight,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Atom {
  id: string;
  type: string;
  name: string;
  tv?: { strength: number; confidence: number };
  outgoing?: string[];
}

interface GraphData {
  nodes: { id: string; group: number; val: number; name: string; type: string }[];
  links: { source: string; target: string; type: string }[];
}

interface ReplHistoryItem {
  type: "input" | "output" | "error";
  content: string;
  timestamp: Date;
}

// Sample atoms for demonstration
const SAMPLE_ATOMS: Atom[] = [
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

const ATOM_TYPE_COLORS: Record<string, string> = {
  ConceptNode: "#00f0ff",
  PredicateNode: "#bd00ff",
  InheritanceLink: "#00ff88",
  EvaluationLink: "#ffaa00",
  ListLink: "#ff6b6b",
  default: "#888888",
};

export default function AtomSpaceExplorer() {
  const { isConnected, sendMessage, lastMessage } = useCogServer();
  const [atoms, setAtoms] = useState<Atom[]>(SAMPLE_ATOMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [replHistory, setReplHistory] = useState<ReplHistoryItem[]>([
    { type: "output", content: "OpenCog Scheme REPL ready.\nType (help) for available commands.", timestamp: new Date() },
  ]);
  const [replInput, setReplInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const fgRef = useRef<any>(null);
  const replEndRef = useRef<HTMLDivElement>(null);

  // Get unique atom types
  const atomTypes = Array.from(new Set(atoms.map((a) => a.type)));

  // Filter atoms based on search and type
  const filteredAtoms = atoms.filter((atom) => {
    const matchesSearch =
      searchQuery === "" ||
      atom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      atom.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === null || atom.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Build graph data from atoms
  useEffect(() => {
    const nodes = atoms
      .filter((a) => !a.type.includes("Link"))
      .map((atom) => ({
        id: atom.id,
        group: atomTypes.indexOf(atom.type),
        val: 10,
        name: atom.name,
        type: atom.type,
      }));

    const links = atoms
      .filter((a) => a.type.includes("Link") && a.outgoing)
      .map((atom) => ({
        source: atom.outgoing![0],
        target: atom.outgoing![1],
        type: atom.type,
      }));

    setGraphData({ nodes, links });
  }, [atoms]);

  // Scroll to bottom of REPL
  useEffect(() => {
    replEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replHistory]);

  // Handle REPL input
  const handleReplSubmit = useCallback(() => {
    if (!replInput.trim()) return;

    const input = replInput.trim();
    setReplHistory((prev) => [
      ...prev,
      { type: "input", content: input, timestamp: new Date() },
    ]);
    setReplInput("");
    setIsExecuting(true);

    // Simulate execution (in real implementation, this would send to CogServer)
    setTimeout(() => {
      let output: ReplHistoryItem;

      // Parse and simulate some basic Scheme commands
      if (input === "(help)") {
        output = {
          type: "output",
          content: `Available commands:
  (cog-atomspace)     - Get current atomspace
  (cog-get-atoms 'ConceptNode) - List all ConceptNodes
  (Concept "name")    - Create/get ConceptNode
  (Inheritance A B)   - Create InheritanceLink
  (count-all)         - Count all atoms
  (clear)             - Clear atomspace`,
          timestamp: new Date(),
        };
      } else if (input === "(count-all)") {
        output = {
          type: "output",
          content: `Atom count: ${atoms.length}`,
          timestamp: new Date(),
        };
      } else if (input === "(cog-atomspace)") {
        output = {
          type: "output",
          content: `#<AtomSpace addr: 0x55d433c78480>`,
          timestamp: new Date(),
        };
      } else if (input.startsWith("(cog-get-atoms")) {
        const typeMatch = input.match(/'(\w+)/);
        const type = typeMatch ? typeMatch[1] : "ConceptNode";
        const matchingAtoms = atoms.filter((a) => a.type === type);
        output = {
          type: "output",
          content: matchingAtoms.length > 0
            ? matchingAtoms.map((a) => `(${a.type} "${a.name}")`).join("\n")
            : `No atoms of type ${type} found.`,
          timestamp: new Date(),
        };
      } else if (input.startsWith("(Concept")) {
        const nameMatch = input.match(/"([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          const existing = atoms.find((a) => a.type === "ConceptNode" && a.name === name);
          if (existing) {
            output = {
              type: "output",
              content: `(ConceptNode "${name}")`,
              timestamp: new Date(),
            };
          } else {
            const newAtom: Atom = {
              id: String(atoms.length + 1),
              type: "ConceptNode",
              name,
              tv: { strength: 1.0, confidence: 0.9 },
            };
            setAtoms((prev) => [...prev, newAtom]);
            output = {
              type: "output",
              content: `Created: (ConceptNode "${name}")`,
              timestamp: new Date(),
            };
          }
        } else {
          output = {
            type: "error",
            content: "Syntax error: expected (Concept \"name\")",
            timestamp: new Date(),
          };
        }
      } else if (input === "(clear)") {
        setAtoms(SAMPLE_ATOMS);
        output = {
          type: "output",
          content: "AtomSpace cleared and reset to sample data.",
          timestamp: new Date(),
        };
      } else {
        output = {
          type: "error",
          content: `Unknown command or syntax error: ${input}`,
          timestamp: new Date(),
        };
      }

      setReplHistory((prev) => [...prev, output]);
      setIsExecuting(false);
    }, 300);
  }, [replInput, atoms]);

  // Handle keyboard events in REPL
  const handleReplKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplSubmit();
    }
  };

  const getNodeColor = (node: any) => {
    return ATOM_TYPE_COLORS[node.type] || ATOM_TYPE_COLORS.default;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              ATOMSPACE EXPLORER
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse, search, and interact with the AtomSpace hypergraph
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isConnected ? "default" : "secondary"} className="font-mono">
              {isConnected ? "CONNECTED" : "OFFLINE MODE"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setAtoms(SAMPLE_ATOMS)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              RESET
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Atom Browser */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search atoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-mono bg-background"
              />
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(null)}
                className="font-mono text-xs"
              >
                ALL ({atoms.length})
              </Button>
              {atomTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="font-mono text-xs"
                  style={{
                    borderColor: ATOM_TYPE_COLORS[type] || ATOM_TYPE_COLORS.default,
                    color: selectedType === type ? undefined : ATOM_TYPE_COLORS[type],
                  }}
                >
                  {type.replace("Node", "").replace("Link", "")} (
                  {atoms.filter((a) => a.type === type).length})
                </Button>
              ))}
            </div>

            {/* Atom List */}
            <Card className="border-border">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {filteredAtoms.map((atom) => (
                    <div
                      key={atom.id}
                      onClick={() => setSelectedAtom(atom)}
                      className={cn(
                        "p-3 rounded cursor-pointer transition-all border border-transparent",
                        selectedAtom?.id === atom.id
                          ? "bg-primary/10 border-primary/50"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ATOM_TYPE_COLORS[atom.type] || ATOM_TYPE_COLORS.default }}
                          />
                          <span className="font-mono text-sm font-medium">{atom.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {atom.type}
                        </Badge>
                        {atom.tv && (
                          <span className="text-xs text-muted-foreground font-mono">
                            TV: {atom.tv.strength.toFixed(2)}/{atom.tv.confidence.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAtoms.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No atoms found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Right Panel - Visualization & REPL */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs defaultValue="visualization" className="w-full">
              <TabsList className="grid w-full grid-cols-3 font-mono">
                <TabsTrigger value="visualization" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  VISUALIZATION
                </TabsTrigger>
                <TabsTrigger value="repl" className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  SCHEME REPL
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  DETAILS
                </TabsTrigger>
              </TabsList>

              {/* Visualization Tab */}
              <TabsContent value="visualization" className="mt-4">
                <Card className="border-border overflow-hidden">
                  <div className="relative w-full h-[500px] bg-black/50">
                    {!isConnected && (
                      <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-xs font-mono">
                        DEMO DATA
                      </div>
                    )}
                    <ForceGraph3D
                      ref={fgRef}
                      graphData={graphData}
                      nodeLabel="name"
                      nodeColor={getNodeColor}
                      linkDirectionalArrowLength={3.5}
                      linkDirectionalArrowRelPos={1}
                      backgroundColor="rgba(0,0,0,0)"
                      nodeRelSize={6}
                      linkColor={() => "#00f0ff"}
                      linkOpacity={0.3}
                      onNodeClick={(node: any) => {
                        const atom = atoms.find((a) => a.id === node.id);
                        if (atom) setSelectedAtom(atom);

                        const distance = 40;
                        if (node.x === undefined || node.y === undefined || node.z === undefined) return;
                        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

                        fgRef.current?.cameraPosition(
                          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                          node,
                          3000
                        );
                      }}
                    />
                    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                      <div className="text-xs font-mono text-primary/70">
                        NODES: {graphData.nodes.length} | LINKS: {graphData.links.length}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* REPL Tab */}
              <TabsContent value="repl" className="mt-4">
                <Card className="border-border overflow-hidden">
                  <div className="bg-[#05080a] font-mono text-sm">
                    {/* REPL Header */}
                    <div className="bg-border/30 px-4 py-2 flex items-center justify-between border-b border-border">
                      <span className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        OPENCOG SCHEME REPL
                      </span>
                      <div className="flex items-center gap-2">
                        {isExecuting && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplHistory([{ type: "output", content: "REPL cleared.", timestamp: new Date() }])}
                          className="h-6 px-2 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* REPL Output */}
                    <ScrollArea className="h-[350px]">
                      <div className="p-4 space-y-2">
                        {replHistory.map((item, i) => (
                          <div key={i} className="font-mono">
                            {item.type === "input" && (
                              <div className="flex items-start gap-2 text-primary">
                                <span className="text-primary/70">scheme&gt;</span>
                                <span>{item.content}</span>
                              </div>
                            )}
                            {item.type === "output" && (
                              <pre className="text-gray-300 whitespace-pre-wrap pl-4">{item.content}</pre>
                            )}
                            {item.type === "error" && (
                              <pre className="text-red-400 whitespace-pre-wrap pl-4">{item.content}</pre>
                            )}
                          </div>
                        ))}
                        <div ref={replEndRef} />
                      </div>
                    </ScrollArea>

                    {/* REPL Input */}
                    <div className="border-t border-border p-3 flex items-center gap-2">
                      <span className="text-primary/70 text-sm">scheme&gt;</span>
                      <Input
                        value={replInput}
                        onChange={(e) => setReplInput(e.target.value)}
                        onKeyDown={handleReplKeyDown}
                        placeholder="Enter Scheme expression..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 font-mono text-sm h-8"
                        disabled={isExecuting}
                      />
                      <Button
                        size="sm"
                        onClick={handleReplSubmit}
                        disabled={isExecuting || !replInput.trim()}
                        className="h-8"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-4">
                <Card className="border-border p-6">
                  {selectedAtom ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: ATOM_TYPE_COLORS[selectedAtom.type] || ATOM_TYPE_COLORS.default }}
                          />
                          <h3 className="text-xl font-mono font-bold">{selectedAtom.name}</h3>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAtom(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground font-mono uppercase">Type</label>
                          <div className="font-mono text-lg">{selectedAtom.type}</div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground font-mono uppercase">ID</label>
                          <div className="font-mono text-lg">{selectedAtom.id}</div>
                        </div>
                      </div>

                      {selectedAtom.tv && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground font-mono uppercase">Truth Value</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/20 border border-border">
                              <div className="text-xs text-muted-foreground">Strength</div>
                              <div className="text-2xl font-mono font-bold text-primary">
                                {selectedAtom.tv.strength.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-3 bg-muted/20 border border-border">
                              <div className="text-xs text-muted-foreground">Confidence</div>
                              <div className="text-2xl font-mono font-bold text-primary">
                                {selectedAtom.tv.confidence.toFixed(3)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedAtom.outgoing && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground font-mono uppercase">Outgoing Set</label>
                          <div className="space-y-2">
                            {selectedAtom.outgoing.map((outId) => {
                              const outAtom = atoms.find((a) => a.id === outId);
                              return (
                                <div
                                  key={outId}
                                  className="p-2 bg-muted/20 border border-border flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                                  onClick={() => outAtom && setSelectedAtom(outAtom)}
                                >
                                  <span className="font-mono">{outAtom?.name || outId}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {outAtom?.type || "Unknown"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Scheme Representation */}
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground font-mono uppercase">Scheme Representation</label>
                        <div className="p-4 bg-[#05080a] border border-border font-mono text-sm text-primary">
                          {selectedAtom.outgoing
                            ? `(${selectedAtom.type}\n  ${selectedAtom.outgoing
                                .map((id) => {
                                  const a = atoms.find((atom) => atom.id === id);
                                  return a ? `(${a.type} "${a.name}")` : id;
                                })
                                .join("\n  ")})`
                            : `(${selectedAtom.type} "${selectedAtom.name}")`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-mono">Select an atom to view details</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
