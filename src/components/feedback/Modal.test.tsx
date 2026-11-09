import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet, Modal } from "./Modal";

describe("RED Morph overlay adaptation", () => {
  it("renders an accessible dismiss button on both surfaces", () => {
    const sheet = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <BottomSheet title="Schnell erfassen" open material="glass" onClose={() => {}}>
          <button type="button">Wasser</button>
        </BottomSheet>,
      ), "text/html",
    );
    const dialog = sheet.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.classList.contains("redfit-morph-glass")).toBe(true);
    expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog?.querySelector('button[aria-label="Schliessen"]')).toBeTruthy();
    expect(dialog?.querySelector("button")?.getAttribute("type")).toBe("button");

    const solid = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <Modal title="Bestätigen" open onClose={() => {}}>Inhalt</Modal>,
      ), "text/html",
    );
    expect(solid.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
    expect(solid.querySelector('button[aria-label="Schliessen"]')).toBeTruthy();
  });

  it("focuses the dismiss control, supports Escape and restores the previous focus", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const trigger = document.createElement("button");
    trigger.textContent = "Öffnen";
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const root = createRoot(host);

    try {
      await act(async () => {
        root.render(
          <BottomSheet title="Test" open onClose={onClose}>
            <button type="button">Aktion</button>
          </BottomSheet>,
        );
      });
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Schliessen");
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      await act(async () => root.render(<BottomSheet title="Test" open={false} onClose={onClose}>X</BottomSheet>));
      expect(document.activeElement).toBe(trigger);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      trigger.remove();
    }
  });
});
