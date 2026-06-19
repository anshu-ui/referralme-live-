import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  // 1. Tell Vite to look in the root folder for the .env file
  envDir: path.resolve(import.meta.dirname), 
  
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  // 2. Your frontend code is here
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/firebase/") || id.includes("@firebase")) return "vendor-firebase";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("react") || id.includes("wouter")) return "vendor-react";
          if (id.includes("framer-motion")) return "vendor-motion";

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      // 3. Allow Vite to access the root folder for env files
      allow: [path.resolve(import.meta.dirname)], 
      deny: ["**/.*"],
    },
  },
});








