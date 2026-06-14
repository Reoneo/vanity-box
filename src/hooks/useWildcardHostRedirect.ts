/**
 * On *.vanity.box subdomain hosts (e.g. mrs.vanity.box), rewrite the
 * URL path to /<sub>.vanity so the SPA's profile resolver loads the
 * corresponding profile. This enables Bluesky-style handle hosting:
 *   mrs.vanity.box -> loads the mrs.vanity profile.
 *
 * Apex (vanity.box, www.vanity.box) and dev hosts are untouched.
 */
import { useEffect } from "react";

const APEX_HOSTS = new Set([
  "vanity.box",
  "www.vanity.box",
]);

export function useWildcardHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    if (APEX_HOSTS.has(host)) return;
    // Must be exactly <sub>.vanity.box (single subdomain label).
    const match = host.match(/^([a-z0-9-]+)\.vanity\.box$/);
    if (!match) return;
    const sub = match[1];
    if (!sub || sub === "www") return;

    const target = `/${sub}.vanity`;
    const currentPath = window.location.pathname;
    // Only redirect when on the root path; preserve deep links.
    if (currentPath === "/" || currentPath === "") {
      window.history.replaceState(null, "", target + window.location.search + window.location.hash);
      // Notify SPA listeners that the path changed.
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);
}
