import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Global QueryClient configuration.
 * - retry: 1 — only retry once on failure (critical SCADA data shouldn't silently retry many times)
 * - staleTime: 30s — data considered fresh for 30 seconds
 * - Global onError handler: shows a toast for unexpected query errors
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30_000, // 30 seconds
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0, // Never retry mutations — side effects must be explicit
    },
  },
});

// Global mutation error handler
queryClient.setMutationDefaults([], {
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    // Don't show duplicate toasts — individual mutations handle their own errors
    console.error("[QueryClient] Mutation error:", message);
  },
});
