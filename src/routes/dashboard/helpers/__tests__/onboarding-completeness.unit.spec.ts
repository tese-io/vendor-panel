import { describe, expect, it } from "vitest"

import {
  buildCompleteness,
  shouldRecalculateOnboarding,
  summarizePricing,
  type CompletenessInputs,
} from "../onboarding-completeness"

const allDone: CompletenessInputs = {
  flags: {
    store_information: true,
    stripe_connection: true,
    locations_shipping: true,
    products: true,
  },
  activityCount: 2,
  contactEmail: "sales@acmemarine.mu",
  pricing: { total: 5, priced: 5 },
  certificationCount: 0,
}

describe("buildCompleteness (checklist v2)", () => {
  it("all non-optional rows done → allComplete, 100%, certs never block", () => {
    const c = buildCompleteness(allDone)
    expect(c.allComplete).toBe(true)
    expect(c.percent).toBe(100)
    // certifications row exists but is optional
    const certs = c.rows.find((r) => r.key === "certifications")!
    expect(certs.optional).toBe(true)
    expect(certs.done).toBe(false)
  })

  it("counts only known, non-optional rows in the percent", () => {
    const c = buildCompleteness({
      ...allDone,
      activityCount: null, // coverage source down → excluded from percent
      pricing: { total: 4, priced: 2 },
    })
    const activities = c.rows.find((r) => r.key === "activities")!
    expect(activities.done).toBeNull()
    // 6 known non-optional rows (4 flags + email + prices), 5 done
    expect(c.known).toBe(6)
    expect(c.done).toBe(5)
    expect(c.percent).toBe(83)
    expect(c.allComplete).toBe(false)
  })

  it("no flags at all degrades those rows to unknown, never to false", () => {
    const c = buildCompleteness({ ...allDone, flags: null })
    for (const key of [
      "store_information",
      "stripe_connection",
      "locations_shipping",
      "products",
    ] as const) {
      expect(c.rows.find((r) => r.key === key)!.done).toBeNull()
    }
  })

  it("empty store: prices row is todo, with no detail chip", () => {
    const c = buildCompleteness({
      ...allDone,
      pricing: { total: 0, priced: 0 },
    })
    const prices = c.rows.find((r) => r.key === "prices")!
    expect(prices.done).toBe(false)
    expect(prices.detail).toBeUndefined()
  })

  it("partially priced store shows the detail and stays todo", () => {
    const c = buildCompleteness({
      ...allDone,
      pricing: { total: 7, priced: 3 },
    })
    const prices = c.rows.find((r) => r.key === "prices")!
    expect(prices.done).toBe(false)
    expect(prices.detail).toEqual({ priced: 3, total: 7 })
  })

  it("every row carries a deep link", () => {
    for (const row of buildCompleteness(allDone).rows) {
      expect(row.link.startsWith("/")).toBe(true)
    }
  })
})

describe("shouldRecalculateOnboarding (fire-on-mount fix)", () => {
  const flags = allDone.flags!

  it("never fires when everything is already true", () => {
    expect(shouldRecalculateOnboarding(flags, false)).toBe(false)
  })

  it("fires once when a flag is false", () => {
    expect(
      shouldRecalculateOnboarding({ ...flags, products: false }, false)
    ).toBe(true)
  })

  it("never fires twice in one visit, and never without flags", () => {
    expect(
      shouldRecalculateOnboarding({ ...flags, products: false }, true)
    ).toBe(false)
    expect(shouldRecalculateOnboarding(null, false)).toBe(false)
  })
})

describe("summarizePricing", () => {
  it("counts products with at least one positive price", () => {
    expect(
      summarizePricing([
        { variants: [{ prices: [{ amount: 100 }] }] },
        { variants: [{ prices: [{ amount: 0 }] }] },
        { variants: [] },
      ])
    ).toEqual({ total: 3, priced: 1 })
  })

  it("string amounts count; missing source is null", () => {
    expect(
      summarizePricing([{ variants: [{ prices: [{ amount: "12.50" }] }] }])
    ).toEqual({ total: 1, priced: 1 })
    expect(summarizePricing(null)).toBeNull()
  })
})
