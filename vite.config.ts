import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const publicBackendEnv = {
  "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
    process.env.VITE_SUPABASE_PROJECT_ID ?? "ffonednbxcfhzxardvry"
  ),
  "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
    process.env.VITE_SUPABASE_URL ?? "https://ffonednbxcfhzxardvry.supabase.co"
  ),
  "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb25lZG5ieGNmaHp4YXJkdnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzkxMDEsImV4cCI6MjA4MzMxNTEwMX0.nd7uJnY3aTRWvemEXwkWC9sPYI8BmxRa4Ezj75tIfMQ"
  ),
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: publicBackendEnv,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-collapsible', '@radix-ui/react-accordion'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          'vendor-markdown': ['marked', 'dompurify'],
        },
      },
    },
  },
}));
