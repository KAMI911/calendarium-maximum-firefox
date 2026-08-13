/*
 * history.js — "Recent Activity" widget data source for Calendarium Maximum.
 *
 * Same shape as topsites.js: browser.history.search() is a synchronous
 * local read, so no TTL cache is needed here either. Requires the
 * optional "history" permission — see manifest.json / options.js's
 * requestHistoryPermission().
 */

export const History = {
    /**
     * @param {number} count Max number of recently-visited pages to return.
     * @returns {Promise<{title:string, url:string, lastVisitTime:number}[]|null>}
     *          null = API unavailable/not permitted; [] = attempted, no results.
     */
    fetch: async function(count) {
        if (typeof browser === "undefined" || !browser.history || !browser.history.search) return null;
        try {
            let items = await browser.history.search({ text: "", maxResults: count, startTime: 0 });
            return (items || [])
                .sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0))
                .slice(0, count)
                .map((i) => ({
                    title: i.title || i.url,
                    url: i.url,
                    lastVisitTime: i.lastVisitTime || 0
                }));
        } catch (e) {
            console.warn("Calendarium Maximum: history fetch error: " + e);
            return [];
        }
    }
};

export default History;
