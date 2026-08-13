// @vitest-environment jsdom
//
// newtab.js's scheduleWidgets() orchestration (permission-gated fetch of
// Shortcuts/Recent Activity/Bookmarks/Downloads on the same 60s refresh
// cadence) — mirrors newtab-rotation.test.js's makeBrowserMock() pattern,
// extended with topSites/history/bookmarks/downloads API stubs and a
// permission-name-aware browser.permissions.contains().
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getEls } from "../../src/lib/render.js";
import { initApp } from "../../src/newtab.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(path.resolve(__dirname, "../../src/newtab.html"), "utf8");

/** Let pending microtasks (the fire-and-forget async work refresh()/scheduleWidgets() kick off but don't await) settle before asserting. */
function flushAsync() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function freshDom() {
    let bodyMatch = HTML.match(/<body>([\s\S]*)<\/body>/);
    document.body.innerHTML = bodyMatch[1];
    document.body.className = "";
    return getEls(document);
}

function makeStorageMock(initial = {}) {
    let store = { ...initial };
    return {
        local: {
            get: vi.fn((keys) => {
                if (keys === null || keys === undefined) return Promise.resolve({ ...store });
                if (typeof keys === "string") return Promise.resolve(keys in store ? { [keys]: store[keys] } : {});
                let out = {};
                for (let k of keys) if (k in store) out[k] = store[k];
                return Promise.resolve(out);
            }),
            set: vi.fn((obj) => { Object.assign(store, obj); return Promise.resolve(); })
        },
        onChanged: { addListener: vi.fn() }
    };
}

function makeBrowserMock(stored, { grantedPermissions = [] } = {}) {
    return {
        runtime: { id: "test-id", getURL: (p) => "moz-extension://test/" + p },
        storage: makeStorageMock(stored),
        permissions: {
            contains: vi.fn(({ permissions }) => Promise.resolve(permissions.every((p) => grantedPermissions.includes(p))))
        },
        tabs: { getCurrent: vi.fn(() => Promise.resolve({ id: 1 })) },
        topSites:  { get: vi.fn(() => Promise.resolve([{ title: "Example", url: "https://example.com/", favicon: null }])) },
        history:   { search: vi.fn(() => Promise.resolve([{ title: "Visited", url: "https://visited.example/", lastVisitTime: 1 }])) },
        bookmarks: { getRecent: vi.fn(() => Promise.resolve([{ title: "Marked", url: "https://marked.example/", dateAdded: 1 }])) },
        downloads: { search: vi.fn(() => Promise.resolve([{ filename: "/tmp/file.pdf", url: "https://f.example/f.pdf", startTime: null, state: "complete" }])) }
    };
}

describe("newtab.js scheduleWidgets()", () => {
    let consoleErrorSpy;

    beforeEach(() => {
        freshDom();
        global.fetch = vi.fn(() => Promise.reject(new Error("no network in tests")));
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        delete global.browser;
        delete global.fetch;
        vi.useRealTimers();
    });

    it("does not call the topSites API when widget-shortcuts-enabled is false", async () => {
        global.browser = makeBrowserMock({ "widget-shortcuts-enabled": false }, { grantedPermissions: ["topSites"] });
        await initApp();
        expect(global.browser.topSites.get).not.toHaveBeenCalled();
        expect(document.getElementById("widget-shortcuts").hasAttribute("hidden")).toBe(true);
    });

    it("does not call the topSites API when the permission is not granted, even if enabled", async () => {
        global.browser = makeBrowserMock({ "widget-shortcuts-enabled": true }, { grantedPermissions: [] });
        await initApp();
        expect(global.browser.topSites.get).not.toHaveBeenCalled();
    });

    it("fetches and renders shortcuts when enabled and permitted", async () => {
        global.browser = makeBrowserMock({ "widget-shortcuts-enabled": true, "widget-shortcuts-count": 3 }, { grantedPermissions: ["topSites"] });
        await initApp();
        await flushAsync();
        expect(global.browser.topSites.get).toHaveBeenCalledWith({ limit: 3, includeFavicon: true });
        expect(document.getElementById("widget-shortcuts").hasAttribute("hidden")).toBe(false);
        expect(document.getElementById("widget-shortcuts-body").textContent).toContain("Example");
    });

    it("gates history/bookmarks/downloads independently by their own permission", async () => {
        global.browser = makeBrowserMock({
            "widget-history-enabled": true, "widget-bookmarks-enabled": true, "widget-downloads-enabled": true
        }, { grantedPermissions: ["history"] }); // only history granted
        await initApp();
        await flushAsync();
        expect(global.browser.history.search).toHaveBeenCalled();
        expect(global.browser.bookmarks.getRecent).not.toHaveBeenCalled();
        expect(global.browser.downloads.search).not.toHaveBeenCalled();
        expect(document.getElementById("widget-history-body").textContent).toContain("Visited");
        expect(document.getElementById("widget-bookmarks").hasAttribute("hidden")).toBe(true);
        expect(document.getElementById("widget-downloads").hasAttribute("hidden")).toBe(true);
    });
});
