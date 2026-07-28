import { describe, it, expect } from "vitest"
import { extractCategoryPrefix, groupByActivity, groupByCategory } from "../helpers"
import type { AllCoverageRow } from "../../../../hooks/api/vendor-coverage"

// Minimal factory that builds a valid AllCoverageRow with sensible defaults
// so each test only spells out the fields it actually cares about.
const row = (overrides: Partial<AllCoverageRow>): AllCoverageRow => ({
  _id: overrides._id,
  subject_kind: overrides.subject_kind ?? "seller",
  product_id: overrides.product_id ?? null,
  product_title: overrides.product_title ?? null,
  activity_code: overrides.activity_code ?? "ADAC-13.01",
  coverage_kind: overrides.coverage_kind ?? "DIRECT",
  source: overrides.source ?? "self_declared",
  confidence: overrides.confidence ?? 1,
  is_active: overrides.is_active ?? true,
})

describe("groupByActivity", () => {
  it("returns empty array for empty input", () => {
    expect(groupByActivity([])).toEqual([])
  })

  it("filters out inactive rows before grouping", () => {
    const out = groupByActivity([
      row({ activity_code: "ADAC-13.01", is_active: false }),
      row({ activity_code: "ADAC-13.01", is_active: true }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].rows).toHaveLength(1)
  })

  it("groups multiple rows for the same activity code", () => {
    const out = groupByActivity([
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "seller",
        source: "self_declared",
      }),
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "product",
        source: "ai_classified",
        product_id: "prod_x",
        product_title: "Rainwater Kit",
      }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].activity_code).toBe("ADAC-13.01")
    expect(out[0].rows).toHaveLength(2)
    expect(out[0].hasSelfDeclared).toBe(true)
    expect(out[0].productCount).toBe(1)
  })

  it("counts distinct products in productCount", () => {
    const out = groupByActivity([
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "product",
        source: "ai_classified",
        product_id: "prod_a",
      }),
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "product",
        source: "ai_classified",
        product_id: "prod_b",
      }),
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "product",
        source: "admin_curated",
        product_id: "prod_c",
      }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].hasSelfDeclared).toBe(false)
    expect(out[0].productCount).toBe(3)
  })

  it("sorts self-declared groups before product-only groups", () => {
    const out = groupByActivity([
      row({ activity_code: "AAAAA-01", subject_kind: "product", source: "ai_classified", product_id: "p1" }),
      row({ activity_code: "ZZZZZ-99", subject_kind: "seller", source: "self_declared" }),
    ])
    expect(out.map((g) => g.activity_code)).toEqual(["ZZZZZ-99", "AAAAA-01"])
  })

  it("within the same declared/undeclared tier, sorts alphabetically by code", () => {
    const out = groupByActivity([
      row({ activity_code: "ADAC-99.99", source: "self_declared", subject_kind: "seller" }),
      row({ activity_code: "ADAC-11.11", source: "self_declared", subject_kind: "seller" }),
      row({ activity_code: "ADAC-55.55", source: "self_declared", subject_kind: "seller" }),
    ])
    expect(out.map((g) => g.activity_code)).toEqual(["ADAC-11.11", "ADAC-55.55", "ADAC-99.99"])
  })

  it("does NOT set hasSelfDeclared when self_declared row has subject_kind=product", () => {
    // Defensive: source=self_declared should only mean seller-level. Product
    // rows with source=self_declared (shouldn't exist in practice) must not
    // fool the sort/badge logic.
    const out = groupByActivity([
      row({
        activity_code: "ADAC-13.01",
        subject_kind: "product",
        source: "self_declared",
        product_id: "prod_x",
      }),
    ])
    expect(out[0].hasSelfDeclared).toBe(false)
    expect(out[0].productCount).toBe(1)
  })

  it("keeps rows for different activity codes separate", () => {
    const out = groupByActivity([
      row({ activity_code: "ADAC-13.01" }),
      row({ activity_code: "ADAC-31.01" }),
      row({ activity_code: "ADAC-32.01" }),
    ])
    expect(out).toHaveLength(3)
  })

  it("preserves all fields on individual rows within a group", () => {
    const input = row({
      _id: "abc123",
      activity_code: "ADAC-13.01",
      subject_kind: "product",
      product_id: "prod_x",
      product_title: "Rainwater Kit 5000L",
      source: "ai_classified",
      confidence: 0.87,
      coverage_kind: "DIRECT",
    })
    const out = groupByActivity([input])
    expect(out[0].rows[0]).toEqual(input)
  })
})

describe("extractCategoryPrefix", () => {
  it("strips a single-segment prefix + numeric tail", () => {
    expect(extractCategoryPrefix("ADAC-13.04")).toBe("ADAC")
  })

  it("keeps a compound prefix (TOU-ADAC)", () => {
    expect(extractCategoryPrefix("TOU-ADAC-01.01")).toBe("TOU-ADAC")
  })

  it("keeps a three-segment compound prefix (TOU-CT-ADAC)", () => {
    expect(extractCategoryPrefix("TOU-CT-ADAC-01.01")).toBe("TOU-CT-ADAC")
  })

  it("handles long numeric tails (HTBDAC-01.01.01.01)", () => {
    expect(extractCategoryPrefix("HTBDAC-01.01.01.01")).toBe("HTBDAC")
  })

  it("returns the whole code when no hyphen-digit boundary exists", () => {
    // Unexpected shape — no digit after hyphen, or no hyphen at all.
    // We fall back to using the whole code as its own category so nothing
    // gets silently misgrouped.
    expect(extractCategoryPrefix("WEIRD-CODE")).toBe("WEIRD-CODE")
    expect(extractCategoryPrefix("STANDALONE")).toBe("STANDALONE")
  })
})

describe("groupByCategory", () => {
  const activity = (
    code: string,
    overrides: Partial<{ hasSelfDeclared: boolean; productCount: number }> = {}
  ) => ({
    activity_code: code,
    rows: [row({ activity_code: code })],
    hasSelfDeclared: overrides.hasSelfDeclared ?? false,
    productCount: overrides.productCount ?? 0,
  })

  it("returns empty array for empty input", () => {
    expect(groupByCategory([])).toEqual([])
  })

  it("puts activities sharing a prefix into one category bucket", () => {
    const out = groupByCategory([
      activity("ADAC-13.04"),
      activity("ADAC-22.01"),
      activity("ADAC-31.01"),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].category_code).toBe("ADAC")
    expect(out[0].activities).toHaveLength(3)
    expect(out[0].totalActivities).toBe(3)
  })

  it("splits activities with different prefixes into different categories", () => {
    const out = groupByCategory([
      activity("ADAC-13.04"),
      activity("TOU-ADAC-01.01"),
      activity("HTBDAC-01.01.01.01"),
    ])
    expect(out).toHaveLength(3)
    expect(out.map((c) => c.category_code).sort()).toEqual([
      "ADAC",
      "HTBDAC",
      "TOU-ADAC",
    ])
  })

  it("uses human labels for known category prefixes", () => {
    const out = groupByCategory([activity("ADAC-13.04")])
    expect(out[0].category_label).toBe("Climate Adaptation")
  })

  it("falls back to raw prefix as label for unknown categories", () => {
    const out = groupByCategory([activity("XYZ-01.01")])
    expect(out[0].category_code).toBe("XYZ")
    expect(out[0].category_label).toBe("XYZ")
  })

  it("counts self-declared vs via-products-only correctly", () => {
    const out = groupByCategory([
      activity("ADAC-13.04", { hasSelfDeclared: true }),
      activity("ADAC-22.01", { hasSelfDeclared: true, productCount: 2 }),
      activity("ADAC-31.01", { hasSelfDeclared: false, productCount: 3 }),
      activity("ADAC-32.01", { hasSelfDeclared: false, productCount: 0 }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].totalActivities).toBe(4)
    expect(out[0].totalSelfDeclared).toBe(2)
    // 31.01 is via-products-only (productCount>0, hasSelfDeclared=false)
    // 32.01 is neither (productCount=0)
    expect(out[0].totalViaProductsOnly).toBe(1)
  })

  it("sorts categories alphabetically by their human label", () => {
    // "Climate Adaptation" < "Habitat & Biodiversity" < "Tourism Adaptation"
    const out = groupByCategory([
      activity("HTBDAC-01.01.01.01"),
      activity("ADAC-13.04"),
      activity("TOU-ADAC-01.01"),
    ])
    expect(out.map((c) => c.category_label)).toEqual([
      "Climate Adaptation",
      "Habitat & Biodiversity",
      "Tourism Adaptation",
    ])
  })
})
