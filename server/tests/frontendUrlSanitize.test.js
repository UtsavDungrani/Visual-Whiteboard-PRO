const fs = require("fs");
const path = require("path");

// ContextPanel renders note markdown through dangerouslySetInnerHTML, so its URL
// handling is security critical. The frontend has no test runner of its own (vite
// only), and the file is JSX using ESM, so it cannot simply be required here.
// These tests lift the two pure module-scope helpers out of the source instead.
//
// If the frontend ever gains vitest, move this file there and import directly.
describe("ContextPanel URL sanitising", () => {
  const lines = fs
    .readFileSync(
      path.join(__dirname, "../../frontend/src/components/ContextPanel.jsx"),
      "utf8",
    )
    .split(/\r?\n/);

  // A statement only ends on a line terminating in ';'. Growing purely until the
  // slice parses would truncate `const f = (v) =>\n  String(v)` into an identity
  // function, which would then pass every assertion below for the wrong reason.
  const grabSource = (name) => {
    const start = lines.findIndex((l) => l.startsWith(`const ${name} =`));
    if (start < 0) throw new Error(`${name} is missing from ContextPanel.jsx`);
    for (let end = start; end < start + 60 && end < lines.length; end++) {
      if (!lines[end].trimEnd().endsWith(";")) continue;
      const body = lines.slice(start, end + 1).join("\n");
      try {
        new Function(body);
        return body;
      } catch {
        // incomplete statement, keep growing
      }
    }
    throw new Error(`could not extract ${name} from ContextPanel.jsx`);
  };

  const { ensureAbsoluteUrl, escapeAttr } = eval(
    [
      grabSource("SAFE_URL_SCHEMES"),
      grabSource("ensureAbsoluteUrl"),
      grabSource("escapeAttr"),
      "({ ensureAbsoluteUrl, escapeAttr })",
    ].join("\n"),
  );

  // Guards the extraction itself: a truncated helper would silently pass below.
  it("extracted working helpers", () => {
    expect(escapeAttr("&")).toBe("&amp;");
    expect(ensureAbsoluteUrl("https://example.com")).toContain("example.com");
  });

  it.each([
    "javascript:alert(1)",
    "javascript:alert`1`",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ])("rejects %s", (url) => {
    expect(ensureAbsoluteUrl(url)).toBe("");
  });

  it.each([
    ["https://example.com/a?b=1&c=2", "example.com/a?b=1&c=2"],
    ["http://example.com", "http://example.com/"],
    ["mailto:a@b.com", "mailto:a@b.com"],
    // Bare domains and protocol-relative links are upgraded to https.
    ["example.com", "https://example.com/"],
    ["//example.com", "https://example.com/"],
  ])("keeps %s usable", (url, expected) => {
    expect(ensureAbsoluteUrl(url)).toContain(expected);
  });

  it("rejects a url that tries to close the href attribute", () => {
    expect(ensureAbsoluteUrl('" onmouseover="alert(1)')).toBe("");
  });

  it("escapes quotes so a url cannot add attributes to the anchor", () => {
    const escaped = escapeAttr('https://x.com/" onmouseover="alert(1)');
    expect(escaped).not.toMatch(/["'<>]/);
    expect(`<a href="${escaped}">`).not.toMatch(/"\s+on\w+\s*=/);
  });

  it("routes the rendered href through escapeAttr", () => {
    const src = lines.join("\n");
    expect(src).toContain('href="${escapeAttr(safeUrl)}"');
    expect(src).not.toContain('href="${ensureAbsoluteUrl(url)}"');
  });
});
