import { renderPage, findSiteAsset, type PageMeta } from "./shell";
import { PAGES } from "./pages";
import { PAY_PAGES } from "./pay";

export interface SitePage {
  meta: PageMeta;
  body: string;
}

const ALL_PAGES: SitePage[] = [...PAGES, ...PAY_PAGES];

const BY_PATH = new Map<string, SitePage>(ALL_PAGES.map((p) => [p.meta.path, p]));

/** Every renderable route, for the router and for the pre-render step. */
export const SITE_PATHS: string[] = ALL_PAGES.map((p) => p.meta.path);

/**
 * The indexable subset, for the sitemap. The Stripe Checkout return pages are
 * real routes that must be rendered and pre-rendered, but listing them for
 * crawlers would invite them into a page that only means something with a
 * session id attached.
 */
export const SITEMAP_PATHS: string[] = ALL_PAGES.filter((p) => !p.meta.noindex).map(
  (p) => p.meta.path,
);

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
