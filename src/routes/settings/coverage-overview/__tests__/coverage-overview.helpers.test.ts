import { describe, it, expect } from "vitest"
import { groupByActivity } from "../helpers"
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
