/*
 * topsites.js — "Shortcuts" widget data source for Calendarium Maximum.
 *
 * Unlike lib/wikipedia.js/lib/weather.js, this needs no TTL cache of its
 * own: browser.topSites.get() is a synchronous local read (no network
 * round trip), so there is nothing worth caching — every call to fetch()
 * just re-reads directly from the browser's own top-sites database.
 *
 * Requires the optional "topSites" permission (see manifest.json's
 * optional_permissions and options.js's requestShortcutsPermission()) —
 * callers are expected to have already confirmed the permission is
 * granted (e.g. via browser.permissions.contains()) before calling
 * fetch(), the same gating shape used for Wikipedia/Weather.
 */

export const TopSites = {
    /**
     * @param {number} count Max number of shortcuts to return.
     * @returns {Promise<{title:string, url:string, favicon:string|null}[]|null>}
     *          null = API unavailable/not permitted (never attempted);
     *          [] = attempted, no results.
     */
    fetch: async function(count) {
        if (typeof browser === "undefined" || !browser.topSites || !browser.topSites.get) return null;
        try {
            let sites = await browser.topSites.get({ limit: count, includeFavicon: true });
            return (sites || []).map((s) => ({
                title: s.title || s.url,
                url: s.url,
                favicon: s.favicon || null
            }));
        } catch (e) {
            console.warn("Calendarium Maximum: topSites fetch error: " + e);
            return [];
        }
    }
};

export default TopSites;
