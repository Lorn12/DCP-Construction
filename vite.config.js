import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const PRODUCTION_ORIGIN = "https://dcp.graspvisual.com";

function siteTarget() {
  const isPages = process.env.GITHUB_PAGES === "true";
  const owner = (process.env.GITHUB_REPOSITORY?.split("/")[0] || "Lorn12").toLowerCase();
  const base = isPages ? "/DCP-Construction/" : "/";
  const siteUrl = isPages
    ? `https://${owner}.github.io/DCP-Construction`
    : PRODUCTION_ORIGIN;
  return {
    isPages,
    base,
    siteUrl,
    robots: isPages ? "noindex, nofollow" : "index, follow",
  };
}

function notFoundFallbackPlugin() {
  const pagePath = resolve(root, "404.html");
  const skip = (url) =>
    url.startsWith("/@") ||
    url.startsWith("/src/") ||
    url.startsWith("/node_modules/") ||
    url.startsWith("/images/") ||
    (/\.[a-z0-9]+$/i.test(url) && !url.endsWith(".html"));

  const hasPage = (baseDir, url) => {
    const pathname = decodeURIComponent(url.split("?")[0]);
    if (pathname === "/" || pathname === "") return existsSync(resolve(baseDir, "index.html"));
    const relativePath = pathname.replace(/^\/+/, "");
    if (!relativePath.endsWith(".html")) return false;
    return existsSync(resolve(baseDir, relativePath));
  };

  return {
    name: "not-found-fallback",
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== "GET" && req.method !== "HEAD") return next();
          const url = req.url?.split("?")[0] ?? "";
          if (skip(url) || hasPage(root, url)) return next();
          try {
            const raw = readFileSync(pagePath, "utf8");
            const html = await server.transformIndexHtml("/404.html", raw);
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(req.method === "HEAD" ? undefined : html);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

function siteIndexingPlugin(site) {
  let outDir = resolve(root, "dist");
  return {
    name: "site-indexing",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      sequential: true,
      order: "post",
      handler() {
        const robotsPath = resolve(outDir, "robots.txt");
        const sitemapPath = resolve(outDir, "sitemap.xml");
        const robots = site.isPages
          ? "User-agent: *\nDisallow: /\n"
          : readFileSync(resolve(root, "public/robots.txt"), "utf8");
        const sitemap = readFileSync(resolve(root, "public/sitemap.xml"), "utf8").replaceAll(
          PRODUCTION_ORIGIN,
          site.siteUrl,
        );
        writeFileSync(robotsPath, robots);
        writeFileSync(sitemapPath, sitemap);
      },
    },
  };
}

/** Prefix root-absolute href/src with Vite base so GitHub Pages (/DCP-Construction/) links work. */
function htmlBaseUrlsPlugin(base) {
  return {
    name: "html-base-urls",
    transformIndexHtml: {
      // After Vite rewrites module/asset URLs, fix remaining root-absolute page/image links.
      order: "post",
      handler(html) {
        if (!base || base === "/") return html;
        const basePath = base.replace(/\/$/, "");
        const alreadyBased = basePath.replace(/^\//, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b(href|src)="/(?!/|${alreadyBased}/)`, "g");
        return html.replace(re, `$1="${base}`);
      },
    },
  };
}

const site = siteTarget();

export default defineConfig({
  appType: "mpa",
  plugins: [
    tailwindcss(),
    htmlBaseUrlsPlugin(site.base),
    notFoundFallbackPlugin(),
    siteIndexingPlugin(site),
  ],
  base: site.base,
  define: {
    "import.meta.env.VITE_SITE_URL": JSON.stringify(site.siteUrl),
    "import.meta.env.VITE_ROBOTS": JSON.stringify(site.robots),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        services: resolve(root, "services.html"),
        interiorDemolition: resolve(root, "interior-demolition.html"),
        notFound: resolve(root, "404.html"),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
