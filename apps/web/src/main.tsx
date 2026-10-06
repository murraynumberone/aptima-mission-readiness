import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import { RunLoader } from "./app/RunLoader";
import { ThemeProvider } from "./app/ThemeProvider";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RunLoader>{(run) => <App run={run} />}</RunLoader>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
