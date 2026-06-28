import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.VITE_BACKEND_PORT || env.PORT || "8080";
  
  return {
    server: {
      proxy: {
        "/api": `http://localhost:${backendPort}`,
      },
    },
  };
});
