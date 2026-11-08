import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUNDLED_WGER_CATALOG_SIZE,
  loadBundledWgerCatalog,
} from "./bundledWgerCatalog";

const source = readFileSync("public/data/wger-verified-789.json", "utf8");

function mockBundledResponse(text = source, ok = true) {
  const fetchMock = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 404,
    text: async () => text,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("opt-in bundled wger catalog", () => {
  it("does not load the catalog until explicitly called", () => {
    const fetchMock = mockBundledResponse();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads 789 attributed previews from local bundled data", async () => {
    const fetchMock = mockBundledResponse();
    const preview = await loadBundledWgerCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "data/wger-verified-789.json",
    );
    expect(preview).toHaveLength(BUNDLED_WGER_CATALOG_SIZE);
    expect(new Set(preview.map((entry) => entry.sourceKey)).size).toBe(789);
    expect(preview.every((entry) => entry.attribution.author.length > 0)).toBe(true);
    expect(preview.filter((entry) => entry.needsMuscleReview)).toHaveLength(120);
  });

  it("fails without returning incomplete previews when the built-in asset is missing", async () => {
    mockBundledResponse("", false);
    await expect(loadBundledWgerCatalog()).rejects.toThrow(/HTTP 404/);
  });

  it("rejects a partial catalog rather than silently presenting fewer exercises", async () => {
    mockBundledResponse(JSON.stringify([JSON.parse(source)[0]]));
    await expect(loadBundledWgerCatalog()).rejects.toThrow(/Expected 789/);
  });

  it("rejects injected remote media fields instead of importing unreviewed assets", async () => {
    const entry = JSON.parse(source)[0];
    mockBundledResponse(JSON.stringify([
      { ...entry, imageUrl: "https://example.invalid/restricted.png" },
    ]));
    await expect(loadBundledWgerCatalog()).rejects.toThrow();
  });
});
