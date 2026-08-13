/*
 * downloads.js — "Most recent downloads" widget data source for Calendarium Maximum.
 *
 * browser.downloads.search() is a synchronous local read, no TTL cache
 * needed. Requires the optional "downloads" permission — see
 * manifest.json / options.js's requestDownloadsPermission().
 */

/** Basename of a filesystem path — downloads.search() returns full local paths, but only the filename is worth showing. */
function basename(fullPath) {
    if (!fullPath) return "";
    let parts = fullPath.split(/[\\/]/);
    return parts[parts.length - 1] || fullPath;
}

export const Downloads = {
    /**
     * @param {number} count Max number of downloads to return.
     * @returns {Promise<{filename:string, url:string, startTime:string, state:string}[]|null>}
     *          null = API unavailable/not permitted; [] = attempted, no results.
     */
    fetch: async function(count) {
        if (typeof browser === "undefined" || !browser.downloads || !browser.downloads.search) return null;
        try {
            let items = await browser.downloads.search({ limit: count, orderBy: ["-startTime"] });
            return (items || []).map((i) => ({
                filename: basename(i.filename),
                url: i.url,
                startTime: i.startTime || null,
                state: i.state || "unknown"
            }));
        } catch (e) {
            console.warn("Calendarium Maximum: downloads fetch error: " + e);
            return [];
        }
    }
};

export default Downloads;
