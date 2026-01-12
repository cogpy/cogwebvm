import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Check if we're in static deployment mode (no backend)
const isStaticDeployment = !import.meta.env.VITE_OAUTH_PORTAL_URL || 
                           import.meta.env.VITE_STATIC_DEPLOYMENT === 'true';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable retries for static deployment
      retry: isStaticDeployment ? false : 3,
      // Don't refetch on window focus for static deployment
      refetchOnWindowFocus: !isStaticDeployment,
    },
  },
});

// For static deployment, we don't need tRPC
if (isStaticDeployment) {
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
} else {
  // Dynamic import for tRPC only when needed
  Promise.all([
    import("@/lib/trpc"),
    import("@trpc/client"),
    import("superjson"),
    import("@shared/const"),
    import("./const"),
  ]).then(([{ trpc }, { httpBatchLink, TRPCClientError }, { default: superjson }, { UNAUTHED_ERR_MSG }, { getLoginUrl }]) => {
    const redirectToLoginIfUnauthorized = (error: unknown) => {
      if (!(error instanceof TRPCClientError)) return;
      if (typeof window === "undefined") return;

      const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

      if (!isUnauthorized) return;

      window.location.href = getLoginUrl();
    };

    queryClient.getQueryCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        const error = event.query.state.error;
        redirectToLoginIfUnauthorized(error);
        console.error("[API Query Error]", error);
      }
    });

    queryClient.getMutationCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        const error = event.mutation.state.error;
        redirectToLoginIfUnauthorized(error);
        console.error("[API Mutation Error]", error);
      }
    });

    const trpcClient = trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(input, init) {
            return globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
            });
          },
        }),
      ],
    });

    createRoot(document.getElementById("root")!).render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    );
  });
}
