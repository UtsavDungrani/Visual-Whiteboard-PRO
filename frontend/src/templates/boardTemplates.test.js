import { describe, it, expect } from "vitest";
import { BOARD_TEMPLATES, getTemplateById } from "./boardTemplates";

describe("board templates", () => {
  it("exposes a blank template with no pre-built pages", () => {
    const blank = getTemplateById("blank");
    expect(blank).toBeTruthy();
    expect(blank.pages).toBeNull();
  });

  it("every non-blank template has one page of real objects", () => {
    const built = BOARD_TEMPLATES.filter((t) => t.id !== "blank");
    expect(built.length).toBeGreaterThan(0);
    for (const t of built) {
      expect(Array.isArray(t.pages)).toBe(true);
      expect(t.pages).toHaveLength(1);
      const page = t.pages[0];
      expect(page.page_id).toBe("page-1");
      expect(page.canvas_state.objects.length).toBeGreaterThan(0);
    }
  });

  it("template objects are primitive Fabric types with ids (no custom classes)", () => {
    const allowed = new Set(["rect", "i-text", "line"]);
    for (const t of BOARD_TEMPLATES) {
      if (!t.pages) continue;
      for (const obj of t.pages[0].canvas_state.objects) {
        expect(allowed.has(obj.type)).toBe(true);
        expect(typeof obj.id).toBe("string");
        expect(obj.id.length).toBeGreaterThan(0);
      }
    }
  });

  it("assigns unique ids within a template", () => {
    for (const t of BOARD_TEMPLATES) {
      if (!t.pages) continue;
      const ids = t.pages[0].canvas_state.objects.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("returns null for an unknown template id", () => {
    expect(getTemplateById("does-not-exist")).toBeNull();
  });

  it("each catalogue entry has display metadata", () => {
    for (const t of BOARD_TEMPLATES) {
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.accent).toBeTruthy();
    }
  });
});
