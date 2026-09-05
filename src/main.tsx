import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/app/App";
import { initTheme } from "@/platform/store/useTheme";
import { hydrateDurableStore, flushDurableStore } from "@/platform/lib/durableStore";
import { ConfirmProvider } from "@/platform/components/ui/confirm-dialog";
import "@/styles/globals.css";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function mount() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// Songs, treatments, choreography, and cast are read synchronously in render
// paths (`useState(() => loadSongs())`), so the cache backing those reads has
// to be warm before the first render — otherwise the first paint shows an
// empty app and looks exactly like data loss. Mount either way: a hydration
// failure is reported to the user by the store itself, and a running app they
// can retry in beats a blank window.
void hydrateDurableStore().finally(mount);

// A write queued in the last 250ms would otherwise die with the window.
window.addEventListener("beforeunload", () => {
  void flushDurableStore();
});
