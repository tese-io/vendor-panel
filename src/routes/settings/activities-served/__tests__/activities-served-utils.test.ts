import { describe, expect, it } from "vitest"

import {
  ALL,
  DOMAIN_OPTIONS,
  VERTICAL_OPTIONS,
  buildDeclaredRows,
  domainLabel,
  shouldShowResults,
  sourceBadge,
  verticalLabel,
} from "../activities-served-utils"

describe("labels", () => {
  it("maps taxonomy codes to vendor-friendly names", () => {
    expect(verticalLabel("TOU")).toBe("Tourism")
    expect(verticalLabel("AGRI")).toBe("Agriculture")
    expect(domainLabel("NBS")).toBe("Nature-based Solutions")
  })

  it("passes unknown codes through instead of hiding them", () => {
    expect(verticalLabel("REA")).toBe("REA")
  })

  it("nullish codes yield null (badge hides)", () => {
    expect(verticalLabel(null)).toBeNull()
    expect(domainLabel(undefined)).toBeNull()
  })

  it("option lists stay in sync with the label maps", () => {
    for (const o of VERTICAL_OPTIONS) expect(verticalLabel(o.value)).toBe(o.label)
    for (const o of DOMAIN_OPTIONS) expect(domainLabel(o.value)).toBe(o.label)
  })
})

describe("shouldShowResults", () => {
  it("opens on two typed characters", () => {
    expect(shouldShowResults("ra", ALL, ALL)).toBe(true)
    expect(shouldShowResults("r", ALL, ALL)).toBe(false)
    expect(shouldShowResults("  r  ", ALL, ALL)).toBe(false)
  })

  it("opens on a category filter alone — the browse path", () => {
    expect(shouldShowResults("", "TOU", ALL)).toBe(true)
    expect(shouldShowResults("", ALL, "CLIMATE")).toBe(true)
  })

  it("stays closed when idle", () => {
    expect(shouldShowResults("", ALL, ALL)).toBe(false)
  })
})

describe("sourceBadge", () => {
  it("covers every known provenance", () => {
    expect(sourceBadge("self_declared")).toEqual({ label: "You declared", color: "green" })
    expect(sourceBadge("admin_curated").label).toBe("Tese-verified")
    expect(sourceBadge("ai_classified").label).toBe("AI-classified")
    expect(sourceBadge("llm_web_discovery").label).toBe("AI-discovered")
  })

  it("unknown sources render verbatim, never crash", () => {
    expect(sourceBadge("interaction_signal")).toEqual({
      label: "interaction_signal",
      color: "grey",
    })
  })
})

describe("buildDeclaredRows", () => {
  const base = {
    subject: { kind: "seller", id: "s1" },
    coverage_kind: "DIRECT" as const,
    source: "self_declared",
    confidence: 1,
    is_active: true,
  }

  it("uses the enriched name and sorts alphabetically by it", () => {
    const rows = buildDeclaredRows([
      { ...base, activity_code: "Z-1", activity_name: "Wetland restoration" },
      { ...base, activity_code: "A-1", activity_name: "Rainwater harvesting" },
    ])
    expect(rows.map((r) => r.name)).toEqual([
      "Rainwater harvesting",
      "Wetland restoration",
    ])
  })

  it("falls back to the code when enrichment is missing", () => {
    const rows = buildDeclaredRows([{ ...base, activity_code: "TOU-CT-REAC-20.03" }])
    expect(rows[0].name).toBe("TOU-CT-REAC-20.03")
    expect(rows[0].description).toBeNull()
    expect(rows[0].vertical).toBeNull()
  })

  it("flags indirect coverage and keeps raw category codes", () => {
    const rows = buildDeclaredRows([
      {
        ...base,
        activity_code: "X-1",
        coverage_kind: "INDIRECT",
        industry_vertical: "TOU",
        domain: "CLIMATE",
      },
    ])
    expect(rows[0].indirect).toBe(true)
    expect(rows[0].vertical).toBe("TOU")
    expect(rows[0].domain).toBe("CLIMATE")
  })

  it("keys by _id when present, code otherwise", () => {
    const rows = buildDeclaredRows([
      { ...base, activity_code: "X-1", _id: "abc" },
      { ...base, activity_code: "Y-1" },
    ])
    expect(rows.find((r) => r.code === "X-1")?.key).toBe("abc")
    expect(rows.find((r) => r.code === "Y-1")?.key).toBe("Y-1")
  })
})
