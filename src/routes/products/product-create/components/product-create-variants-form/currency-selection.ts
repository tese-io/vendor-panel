import { HttpTypes } from "@medusajs/types"

/**
 * Which currencies the variants grid prices in.
 *
 * The grid used to render one price column per entry in
 * `store.supported_currencies`. The marketplace store has effectively the full
 * ISO list enabled, so a vendor pricing a single product met roughly a hundred
 * columns and had to scroll sideways past Syrian pounds and Tongan paʻanga to
 * reach USD. Observed on 2026-10-08 during the onboarding walkthrough.
 *
 * The vendor now picks what they sell in, seeded from the store's default.
 */

/** The currencies to show before the vendor has chosen any. */
export function initialCurrencies(store?: HttpTypes.AdminStore): string[] {
  const supported = store?.supported_currencies || []
  if (!supported.length) {
    return []
  }
  const preferred = supported.find((c) => c.is_default) || supported[0]
  return preferred?.currency_code ? [preferred.currency_code] : []
}

/**
 * Currencies dropped between two selections.
 *
 * Their prices have to be cleared from form state as well as hidden: a price
 * left behind on a currency the vendor can no longer see would still submit,
 * and they would have no way to find or correct it.
 */
export function removedCurrencies(
  current: string[],
  next: string[]
): string[] {
  return current.filter((code) => !next.includes(code))
}

/** Normalises the Combobox value, which may be a single string or absent. */
export function toCurrencyList(value?: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value
  }
  return value ? [value] : []
}
