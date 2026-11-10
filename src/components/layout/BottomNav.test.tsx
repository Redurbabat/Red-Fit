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
    expect(doc.querySelectorAll(".bottom-nav__selection")).toHaveLength(1);
    expect(doc.querySelector(".bottom-nav__selection")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("marks active subroutes and legacy progress via selection material", () => {
    const training = renderDock("/training/plans");
    expect(training.querySelector("a[aria-current='page']")?.getAttribute("href")).toBe("/training");
    expect(training.querySelector("nav")?.getAttribute("data-active-index")).toBe("1");
    const progress = renderDock("/progress");
    expect(progress.querySelector("a[aria-current='page']")?.getAttribute("href")).toBe("/body");
    expect(progress.querySelector("nav")?.getAttribute("data-active-index")).toBe("3");
  });

  it("starts expanded and does not add fake audio/player controls", () => {
    const doc = renderDock("/nutrition");
    expect(doc.querySelector("nav")?.getAttribute("data-dock-state")).toBe("expanded");
    expect(doc.querySelector("nav")?.getAttribute("data-active-index")).toBe("2");
    expect(doc.querySelectorAll("a[aria-current='page']")).toHaveLength(1);
  });

  it("does not invent an active destination for settings", () => {
    const doc = renderDock("/settings");
    expect(doc.querySelector("nav")?.getAttribute("data-active-index")).toBe("none");
    expect(doc.querySelectorAll("nav a")).toHaveLength(5);
    expect(doc.querySelectorAll('a[aria-current="page"]')).toHaveLength(0);
  });
});
