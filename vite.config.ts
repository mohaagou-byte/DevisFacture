import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Cast process to any to avoid TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This allows 'process.env.API_KEY' to work in client-side code
      // We fallback to your provided key if the env var is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyDhCS0IlHho8MJdpQ_9ENP4tdbcUPVBZ3g")
    },
    preview: {
      allowedHosts: true
    }
  };
});