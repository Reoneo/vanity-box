// capacitor.config.ts
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.7531083cc70e4d19bd875efe8beff8c5",
  appName: "ens-vanity-hub",
  webDir: "dist",

  // You’re loading from a remote Lovable URL — keep it,
  // but also allow the deep-link schemes World App / WC use.
  server: {
    url: "https://7531083c-c70e-4d19-bd87-5efe8beff8c5.lovableproject.com?forceHideBadge=true",
    cleartext: true,
    allowNavigation: [
      "worldapp://*",
      "walletconnect://*",
      "wc://*",
      "https://id.worldcoin.org/*",
      "https://worldcoin.org/*",
    ],
  },

  // Add an app-specific return scheme so World App can hand back.
  ios: {
    scheme: "vanitybox", // <— you can change the name, but keep it consistent with Info.plist below
  },
};

export default config;
