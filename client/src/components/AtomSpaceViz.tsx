import { useEffect, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { useCogServer } from "@/contexts/CogServerContext";
import { Loader2 } from "lucide-react";

interface GraphData {
  nodes: { id: string; group: number; val: number; name: string }[];
  links: { source: string; target: string; type: string }[];
}

export default function AtomSpaceViz() {
  const { isConnected, sendMessage, lastMessage } = useCogServer();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const fgRef = useRef<any>(null);

  // Initial dummy data for visualization when not connected or empty
  const initialData = {
    nodes: [
      { id: "ConceptNode:Animal", group: 1, val: 20, name: "Animal" },
      { id: "ConceptNode:Mammal", group: 1, val: 15, name: "Mammal" },
      { id: "ConceptNode:Cat", group: 1, val: 10, name: "Cat" },
      { id: "ConceptNode:Dog", group: 1, val: 10, name: "Dog" },
      { id: "ConceptNode:Human", group: 1, val: 10, name: "Human" },
      { id: "ConceptNode:Socrates", group: 2, val: 5, name: "Socrates" },
      { id: "PredicateNode:eats", group: 3, val: 5, name: "eats" },
      { id: "ConceptNode:Food", group: 1, val: 10, name: "Food" },
    ],
    links: [
      { source: "ConceptNode:Mammal", target: "ConceptNode:Animal", type: "InheritanceLink" },
      { source: "ConceptNode:Cat", target: "ConceptNode:Mammal", type: "InheritanceLink" },
      { source: "ConceptNode:Dog", target: "ConceptNode:Mammal", type: "InheritanceLink" },
      { source: "ConceptNode:Human", target: "ConceptNode:Mammal", type: "InheritanceLink" },
      { source: "ConceptNode:Socrates", target: "ConceptNode:Human", type: "InheritanceLink" },
      { source: "ConceptNode:Cat", target: "ConceptNode:Food", type: "EvaluationLink" },
    ]
  };

  useEffect(() => {
    // If connected, we could request real graph data
    // For now, we'll use the initial data to demonstrate visualization
    setGraphData(initialData);
  }, [isConnected]);

  return (
    <div className="relative w-full h-[400px] bg-black/50 border border-border overflow-hidden rounded-lg group">
      {/* Quantum scanline effect */}
      <div className="scanline" />
      
      {/* Quantum glow overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 quantum-shift">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      </div>
      
      {!isConnected && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-xs font-mono consciousness-wave">
          OFFLINE MODE - DEMO DATA
        </div>
      )}
      
      {isConnected && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-500 text-xs font-mono quantum-pulse">
          LIVE ATOMSPACE
        </div>
      )}
      
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={6}
        linkColor={() => "#00f0ff"}
        linkOpacity={0.3}
        nodeOpacity={0.9}
        onNodeClick={node => {
          // Aim at node from outside it
          const distance = 40;
          if (node.x === undefined || node.y === undefined || node.z === undefined) return;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

          fgRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
          );
        }}
      />
      
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="text-xs font-mono text-primary/70 data-flow-bg px-2 py-1">
          NODES: {graphData.nodes.length} | LINKS: {graphData.links.length}
        </div>
      </div>
      
      {/* Hypergraph corner decoration */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 pointer-events-none" />
    </div>
  );
}
