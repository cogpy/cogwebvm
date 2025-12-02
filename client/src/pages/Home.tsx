import DashboardLayout from "@/components/DashboardLayout";
import { StatusCard, TerminalBlock, DataGrid } from "@/components/ui/CyberComponents";
import { CheckCircle2, Terminal, Cpu, Network, Database, Layers } from "lucide-react";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative h-64 w-full overflow-hidden border border-border group">
          <div className="absolute inset-0 bg-[url('/images/atomspace-viz.png')] bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
          <div className="relative z-10 p-8 h-full flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/10 text-primary text-xs font-mono mb-4 w-fit">
              <span className="w-2 h-2 bg-primary animate-pulse"></span>
              SYSTEM READY
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tighter text-white mb-2 glitch-text">
              OPENCOG <span className="text-primary">WEBVM</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              Artificial General Intelligence framework successfully deployed and verified in the WebVM environment.
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard 
            title="PYTHON BINDINGS" 
            status="pass" 
            value="v3.10.12" 
            icon={<Terminal />} 
          />
          <StatusCard 
            title="GUILE SCHEME" 
            status="pass" 
            value="v3.0.7" 
            icon={<Cpu />} 
          />
          <StatusCard 
            title="COGSERVER" 
            status="pass" 
            value="PORT 17001" 
            icon={<ServerIcon />} 
          />
          <StatusCard 
            title="ATOMSPACE" 
            status="pass" 
            value="14 ATOMS" 
            icon={<Database />} 
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - System Info */}
          <div className="space-y-6">
            <DataGrid 
              title="SYSTEM SPECIFICATIONS" 
              data={[
                { label: "OS", value: "Ubuntu 22.04.5 LTS" },
                { label: "Architecture", value: "x86_64" },
                { label: "Compiler", value: "GCC 11.4.0" },
                { label: "Build Type", value: "Release" },
                { label: "Python", value: "3.10.12", status: "highlight" },
                { label: "Guile", value: "3.0.7", status: "highlight" },
              ]} 
            />
            
            <div className="cyber-card p-6">
              <h3 className="font-mono text-sm text-primary uppercase mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                INSTALLED COMPONENTS
              </h3>
              <div className="space-y-3">
                {[
                  { name: "CogUtil", size: "1.8MB", desc: "Foundation utilities" },
                  { name: "AtomSpace", size: "24MB", desc: "Hypergraph database" },
                  { name: "Storage", size: "5MB", desc: "Persistence layer" },
                  { name: "CogServer", size: "1.5MB", desc: "Network server" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border border-border/50 bg-muted/10">
                    <div>
                      <div className="font-mono font-bold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <div className="text-xs font-mono text-primary border border-primary/30 px-2 py-1">
                      {item.size}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column - Test Results */}
          <div className="lg:col-span-2 space-y-6">
            <div className="cyber-card p-0 overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="font-mono text-sm text-primary uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  VERIFICATION LOGS
                </h3>
                <span className="text-xs font-mono text-green-500">ALL TESTS PASSED</span>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Python Test */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono font-bold text-white">Test 1: Python Bindings</h4>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-mono border border-green-500/30">PASSED</span>
                  </div>
                  <TerminalBlock title="test_opencog_python.py output">
{`✅ Successfully imported OpenCog modules
✅ AtomSpace created successfully
   AtomSpace object: <AtomSpace addr: 0x55d433c78480>
✅ Created atoms successfully:
   Cat concept: (Concept "Cat")
   Animal concept: (Concept "Animal")
✅ Pattern matching working
   Found 5 inheritance links
   Found 4 concept nodes`}
                  </TerminalBlock>
                </div>

                {/* Guile Test */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono font-bold text-white">Test 2: Guile Scheme Bindings</h4>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-mono border border-green-500/30">PASSED</span>
                  </div>
                  <TerminalBlock title="test_opencog_guile.scm output">
{`✅ Successfully loaded OpenCog modules
✅ AtomSpace created and set as current
✅ Created atoms successfully:
   Cat concept: (Concept "Cat")
✅ Execution working
   2 + 3 = (Number "5")
✅ All Guile Scheme binding tests passed!`}
                  </TerminalBlock>
                </div>
              </div>
            </div>

            {/* Quick Start */}
            <div className="cyber-card p-6">
              <h3 className="font-mono text-sm text-primary uppercase mb-4">QUICK START</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-mono">PYTHON EXAMPLE</p>
                  <TerminalBlock title="python3.10">
{`from opencog.atomspace import AtomSpace
from opencog.type_constructors import *

atomspace = AtomSpace()
cat = ConceptNode("Cat")
print(cat)`}
                  </TerminalBlock>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-mono">GUILE EXAMPLE</p>
                  <TerminalBlock title="guile">
{`(use-modules (opencog))
(use-modules (opencog exec))

(define cat (Concept "Cat"))
(display cat)`}
                  </TerminalBlock>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ServerIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  )
}
