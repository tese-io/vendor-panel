import { describe, it, expect } from "vitest"
import type { HttpTypes } from "@medusajs/types"

import {
  initialCurrencies,
  removedCurrencies,
  toCurrencyList,
} from "../currency-selection"

/**
 * Observed on 2026-10-08: pricing one product meant scrolling sideways through
 * roughly a hundred currency columns, because the grid rendered one per entry
 * in `store.supported_currencies` and the marketplace store has the full ISO
 * list enabled.
 */
const store = (codes: Array<[string, boolean]>) =>
  ({
    supported_currencies: codes.map(([currency_code, is_default]) => ({
      currency_code,
      is_default,
    })),
  }) as unknown as HttpTypes.AdminStore

describe("initialCurrencies", () => {
  it("starts from the store's default rather than every currency it supports", () => {
    expect(
      initialCurrencies(
        store([
          ["syp", false],
          ["usd", true],
          ["thb", false],
        ])
      )
    ).toEqual(["usd"])
  })

  it("falls back to the first supported currency when none is flagged", () => {
    expect(
      initialCurrencies(
        store([
          ["eur", false],
          ["usd", false],
        ])
      )
    ).toEqual(["eur"])
  })

  it("returns nothing rather than guessing when the store has no currencies", () => {
    expect(initialCurrencies(store([]))).toEqual([])
    expect(initialCurrencies(undefined)).toEqual([])
  })
})

describe("removedCurrencies", () => {
  it("names what was dropped, so its prices can be cleared", () => {
    // A price left on a hidden currency would still submit, and the vendor
    // would have no way to see or correct it.
    expect(removedCurrencies(["usd", "eur", "mur"], ["usd"])).toEqual([
      "eur",
      "mur",
    ])
  })

  it("is empty when currencies are only added", () => {
    expect(removedCurrencies(["usd"], ["usd", "eur"])).toEqual([])
  })

  it("treats clearing everything as removing everything", () => {
    expect(removedCurrencies(["usd", "eur"], [])).toEqual(["usd", "eur"])
  })
})

describe("toCurrencyList", () => {
  it("accepts the shapes the Combobox can hand back", () => {
    expect(toCurrencyList(["usd", "eur"])).toEqual(["usd", "eur"])
    expect(toCurrencyList("usd")).toEqual(["usd"])
    expect(toCurrencyList(undefined)).toEqual([])
    expect(toCurrencyList("")).toEqual([])
  })
})
