import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "./Button";

describe("RED Morph press feedback on RED Fit buttons", () => {
  it("tracks keyboard press and clears on key release or blur", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const onClick = vi.fn();
    try {
      await act(async () => root.render(<Button onClick={onClick}>Speichern</Button>));
      const button = host.querySelector("button")!;
      await act(async () => button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
      expect(button.hasAttribute("data-pressed")).toBe(true);
      await act(async () => button.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true })));
      expect(button.hasAttribute("data-pressed")).toBe(false);
      await act(async () => button.click());
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it("keeps disabled icon buttons inert and accessible", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const onClick = vi.fn();
    try {
      await act(async () => root.render(<IconButton label="Zurück" disabled onClick={onClick}>←</IconButton>));
      const button = host.querySelector("button")!;
      expect(button.getAttribute("aria-label")).toBe("Zurück");
      expect(button.disabled).toBe(true);
      await act(async () => button.click());
      expect(onClick).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
