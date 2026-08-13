/*
 * bookmarks.js — "Bookmarks" widget data source for Calendarium Maximum.
 *
 * browser.bookmarks.getRecent() returns the most-recently-added bookmarks
 * (not a folder tree — a full bookmarks-tree browser is out of scope for
 * this widget, which mirrors a flat "recent" list like the other
 * widgets). Synchronous local read, no TTL cache needed. Requires the
 * optional "bookmarks" permission — see manifest.json / options.js's
 * requestBookmarksPermission().
 */

export const Bookmarks = {
    /**
     * @param {number} count Max number of bookmarks to return.
     * @returns {Promise<{title:string, url:string, dateAdded:number}[]|null>}
     *          null = API unavailable/not permitted; [] = attempted, no results.
     */
    fetch: async function(count) {
        if (typeof browser === "undefined" || !browser.bookmarks || !browser.bookmarks.getRecent) return null;
        try {
            let items = await browser.bookmarks.getRecent(count);
            return (items || [])
                .filter((i) => i.url) // folders have no url — skip them, this is a flat link list
                .map((i) => ({
                    title: i.title || i.url,
                    url: i.url,
                    dateAdded: i.dateAdded || 0
                }));
        } catch (e) {
            console.warn("Calendarium Maximum: bookmarks fetch error: " + e);
            return [];
        }
    }
};

export default Bookmarks;
