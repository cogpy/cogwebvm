import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CogServerProvider } from "./contexts/CogServerContext";
import Home from "./pages/Home";
import FileManager from "./pages/FileManager";
import AtomSpaceExplorer from "./pages/AtomSpaceExplorer";
import AgentZero from "./pages/AgentZero";
import WebVMPage from "./pages/WebVM";

// Get base path from Vite config
const base = import.meta.env.BASE_URL || '/';

function Routes() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/files"} component={FileManager} />
      <Route path={"/atomspace"} component={AtomSpaceExplorer} />
      <Route path={"/agent-zero"} component={AgentZero} />
      <Route path={"/webvm"} component={WebVMPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <CogServerProvider>
          <TooltipProvider>
            <Toaster />
            <WouterRouter base={base.endsWith('/') ? base.slice(0, -1) : base}>
              <Routes />
            </WouterRouter>
          </TooltipProvider>
        </CogServerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
