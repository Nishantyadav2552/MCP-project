/**
 * Unit tests for staleness guard logic.
 * Tests checkStaleness with matching and mismatching element counts.
 */

import { describe, it, expect } from "vitest";
import { checkStaleness } from "../../src/canva/design-editor";

describe("staleness guard", () => {
  it("returns false when snapshot count matches live count", () => {
    expect(checkStaleness(5, 5)).toBe(false);
  });

  it("returns true when live count is greater (element added)", () => {
    expect(checkStaleness(5, 6)).toBe(true);
  });

  it("returns true when live count is smaller (element deleted)", () => {
    expect(checkStaleness(5, 4)).toBe(true);
  });

  it("returns false for zero counts matching", () => {
    expect(checkStaleness(0, 0)).toBe(false);
  });

  it("returns true when live count differs from zero", () => {
    expect(checkStaleness(0, 1)).toBe(true);
  });
});
