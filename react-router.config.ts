import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "@react-router/dev/config";

export default {
  basename: "/my-portfolio/",
  ssr: false,
  routeDiscovery: { mode: "initial" },
  async buildEnd({ reactRouterConfig }) {
    const clientBuildDirectory = join(reactRouterConfig.buildDirectory, "client");
    await copyFile(
      join(clientBuildDirectory, "index.html"),
      join(clientBuildDirectory, "404.html"),
    );
  },
} satisfies Config;
