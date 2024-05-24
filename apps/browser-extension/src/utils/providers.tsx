import { TRPCProvider } from "@hoarder/shared-react/providers/trpc-provider";

import usePluginSettings from "./settings";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const { settings } = usePluginSettings();

  return (
    <TRPCProvider settings={settings}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        {children}
      </ThemeProvider>
    </TRPCProvider>
  );
}
