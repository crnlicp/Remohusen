import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { icpBindgen } from "@icp-sdk/bindgen/plugins/vite";
import { execSync } from "child_process";
import { seoFiles } from "./seo-plugin.ts";

export default defineConfig(({ command, mode }) => {
  const environment = process.env.ICP_ENVIRONMENT || "local";
  // Public address of the site, used for sitemap.xml, robots.txt and default meta tags.
  const siteUrl = process.env.SITE_URL || loadEnv(mode, process.cwd(), "").SITE_URL || "http://frontend.local.localhost:8010";
  const plugins = [
    react(),
    tailwindcss(),
    icpBindgen({
      didFile: "../backend/backend.did",
      outDir: "./src/bindings",
    }),
    seoFiles(siteUrl, environment),
  ];

  if (command !== "serve") {
    return { plugins };
  }

  // Dev server: emulate the asset canister's ic_env cookie and proxy API calls
  // to the local network so the app can talk to the deployed backend.
  const CANISTER_NAME = "backend";

  const networkStatus = JSON.parse(
    execSync(`icp network status -e ${environment} --json`, { encoding: "utf-8" }),
  );
  const rootKey: string = networkStatus.root_key;
  const proxyTarget: string = networkStatus.api_url;

  let canisterId: string;
  try {
    canisterId = execSync(`icp canister status ${CANISTER_NAME} -e ${environment} -i`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    console.error(`
     Backend canister "${CANISTER_NAME}" not found in environment "${environment}".
     Deploy it first:  icp deploy ${CANISTER_NAME} -e ${environment}
    `);
    process.exit(1);
  }

  return {
    plugins,
    server: {
      headers: {
        "Set-Cookie": `ic_env=${encodeURIComponent(
          `PUBLIC_CANISTER_ID:${CANISTER_NAME}=${canisterId}&ic_root_key=${rootKey}`,
        )}; SameSite=Lax;`,
      },
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true },
      },
    },
  };
});
