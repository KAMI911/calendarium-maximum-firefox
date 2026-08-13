import { describe, it, expect, afterEach, vi } from "vitest";
import { TopSites } from "../../src/lib/widgets/topsites.js";
import { History } from "../../src/lib/widgets/history.js";
import { Bookmarks } from "../../src/lib/widgets/bookmarks.js";
import { Downloads } from "../../src/lib/widgets/downloads.js";

afterEach(() => { delete global.browser; });

describe("TopSites.fetch", () => {
    it("returns null when browser.topSites is unavailable", async () => {
        global.browser = {};
        expect(await TopSites.fetch(8)).toBeNull();
    });

    it("maps title/url/favicon and passes limit/includeFavicon through", async () => {
        let get = vi.fn(() => Promise.resolve([{ title: "Example", url: "https://example.com/", favicon: "https://example.com/favicon.ico" }]));
        global.browser = { topSites: { get } };
        let result = await TopSites.fetch(8);
        expect(get).toHaveBeenCalledWith({ limit: 8, includeFavicon: true });
        expect(result).toEqual([{ title: "Example", url: "https://example.com/", favicon: "https://example.com/favicon.ico" }]);
    });

    it("falls back to url as title when a site has none", async () => {
        global.browser = { topSites: { get: () => Promise.resolve([{ url: "https://example.com/" }]) } };
        let result = await TopSites.fetch(8);
        expect(result[0].title).toBe("https://example.com/");
    });

    it("resolves [] (not throwing) on API error", async () => {
        global.browser = { topSites: { get: () => Promise.reject(new Error("denied")) } };
        expect(await TopSites.fetch(8)).toEqual([]);
    });
});

describe("History.fetch", () => {
    it("returns null when browser.history is unavailable", async () => {
        global.browser = {};
        expect(await History.fetch(8)).toBeNull();
    });

    it("sorts by lastVisitTime descending and truncates to count", async () => {
        global.browser = {
            history: {
                search: () => Promise.resolve([
                    { title: "Old", url: "https://old.example/", lastVisitTime: 100 },
                    { title: "New", url: "https://new.example/", lastVisitTime: 300 },
                    { title: "Mid", url: "https://mid.example/", lastVisitTime: 200 }
                ])
            }
        };
        let result = await History.fetch(2);
        expect(result.map((r) => r.title)).toEqual(["New", "Mid"]);
    });

    it("resolves [] on API error", async () => {
        global.browser = { history: { search: () => Promise.reject(new Error("denied")) } };
        expect(await History.fetch(8)).toEqual([]);
    });
});

describe("Bookmarks.fetch", () => {
    it("returns null when browser.bookmarks is unavailable", async () => {
        global.browser = {};
        expect(await Bookmarks.fetch(8)).toBeNull();
    });

    it("filters out folders (no url) and maps title/url/dateAdded", async () => {
        global.browser = {
            bookmarks: {
                getRecent: () => Promise.resolve([
                    { title: "A Folder" }, // no url — should be skipped
                    { title: "Example", url: "https://example.com/", dateAdded: 12345 }
                ])
            }
        };
        let result = await Bookmarks.fetch(8);
        expect(result).toEqual([{ title: "Example", url: "https://example.com/", dateAdded: 12345 }]);
    });

    it("resolves [] on API error", async () => {
        global.browser = { bookmarks: { getRecent: () => Promise.reject(new Error("denied")) } };
        expect(await Bookmarks.fetch(8)).toEqual([]);
    });
});

describe("Downloads.fetch", () => {
    it("returns null when browser.downloads is unavailable", async () => {
        global.browser = {};
        expect(await Downloads.fetch(5)).toBeNull();
    });

    it("reduces a full path to just the filename", async () => {
        global.browser = {
            downloads: {
                search: () => Promise.resolve([
                    { filename: "/home/user/Downloads/report.pdf", url: "https://example.com/report.pdf", startTime: "2026-06-15T10:00:00Z", state: "complete" }
                ])
            }
        };
        let result = await Downloads.fetch(5);
        expect(result[0].filename).toBe("report.pdf");
        expect(result[0].state).toBe("complete");
    });

    it("resolves [] on API error", async () => {
        global.browser = { downloads: { search: () => Promise.reject(new Error("denied")) } };
        expect(await Downloads.fetch(5)).toEqual([]);
    });
});
