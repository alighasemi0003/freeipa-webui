import { normalizeLoginWarning } from "src/utils/loginWarning";

describe("normalizeLoginWarning", () => {
  it("returns empty for missing/empty values", () => {
    expect(normalizeLoginWarning(undefined)).toBe("");
    expect(normalizeLoginWarning(null)).toBe("");
    expect(normalizeLoginWarning("")).toBe("");
    expect(normalizeLoginWarning("   ")).toBe("");
    expect(normalizeLoginWarning(123)).toBe("");
  });

  it("returns configured plain text", () => {
    expect(
      normalizeLoginWarning("Authorized use only. Activity may be monitored.")
    ).toBe("Authorized use only. Activity may be monitored.");
  });

  it("preserves HTML-like input as plain text (no stripping of tags)", () => {
    const payload = "<script>alert(1)</script>";
    expect(normalizeLoginWarning(payload)).toBe(payload);
  });
});
