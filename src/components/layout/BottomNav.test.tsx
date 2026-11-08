import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { BottomNav, NAV_ITEMS } from "./BottomNav";

function renderDock(at: string): Document {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <BottomNav />
    </MemoryRouter>,
  );
  return new DOMParser().parseFromString(html, "text/html");
}

describe("RED Morph-inspired bottom dock", () => {
  it("keeps all five destinations and their accessible labels", () => {
    const doc = renderDock("/today");
    const links = [...doc.querySelectorAll("nav[aria-label='Hauptnavigation'] a")];
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute("aria-label")))
      .toEqual(NAV_ITEMS.map((item) => item.label));
    expect(links.map((link) => link.getAttribute("href")))
      .toEqual(NAV_ITEMS.map((item) => item.to));
  });

  it("marks the active subroute and the legacy progress route as selected", () => {
    const training = renderDock("/training/plans");
    expect(training.querySelector("a[aria-current='page']")?.getAttribute("href"))
      .toBe("/training");
    const progress = renderDock("/progress");
    expect(progress.querySelector("a[aria-current='page']")?.getAttribute("href"))
      .toBe("/body");
  });

  it("starts expanded and does not add a fake audio/player control", () => {
    const doc = renderDock("/nutrition");
    expect(doc.querySelector("nav")?.getAttribute("data-dock-state"))
      .toBe("expanded");
    expect(doc.querySelectorAll("a[aria-current='page']")).toHaveLength(1);
  });
});
