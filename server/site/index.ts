import { renderPage, findSiteAsset, type PageMeta } from "./shell";
import { PAGES } from "./pages";

export interface SitePage {
  meta: PageMeta;
  body: string;
}

const BY_PATH = new Map<string, SitePage>(PAGES.map((p) => [p.meta.path, p]));

/** All marketing routes, for the router and the sitemap. */
export const SITE_PATHS: string[] = PAGES.map((p) => p.meta.path);

/** Normalises `/features/` and `/features/index.html` onto `/features`. */
export function normaliseSitePath(pathname: string): string {
  if (pathname === "/" || pathname === "/index.html") return "/";
  let p = pathname.replace(/\/index\.html$/i, "");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p.toLowerCase();
}

export function isSitePath(pathname: string): boolean {
  return BY_PATH.has(normaliseSitePath(pathname));
}

export function renderSitePage(pathname: string, baseUrl: string): string | null {
  const page = BY_PATH.get(normaliseSitePath(pathname));
  if (!page) return null;
  return renderPage(page.meta, page.body, baseUrl);
}

export { renderPage, findSiteAsset };
