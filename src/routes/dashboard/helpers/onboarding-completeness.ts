/**
 * B-02 checklist v2 — pure completeness model for the dashboard.
 *
 * The four backend `seller_onboarding` flags stay authoritative for what
 * they cover; the extended signals (activities, contact email, prices)
 * are computed client-side from data the panel already fetches (D1).
 * Certifications are shown but OPTIONAL (D-02: never required to list
 * or sell) and excluded from the percentage.
 *
 * Every input is nullable: null = "source unavailable", and the row
 * degrades to unknown instead of lying in either direction.
 */

export type CompletenessInputs = {
  flags: {
    store_information: boolean | null
    stripe_connection: boolean | null
    locations_shipping: boolean | null
    products: boolean | null
  } | null
  /** Count of the seller's ACTIVE self-declared coverage rows. */
  activityCount: number | null
  /** Normalized store contact email ('' and placeholders → null upstream). */
  contactEmail: string | null
  /** Products sampled for pricing (first 100): how many carry ≥1 positive price. */
  pricing: { total: number; priced: number } | null
  certificationCount: number | null
}

export type CompletenessRowKey =
  | 'store_information'
  | 'stripe_connection'
  | 'locations_shipping'
  | 'products'
  | 'activities'
  | 'contact_email'
  | 'prices'
  | 'certifications'

export type CompletenessRow = {
  key: CompletenessRowKey
  /** true = done, false = todo, null = source unavailable ("—"). */
  done: boolean | null
  link: string
  optional: boolean
  /** Extra display context, e.g. "3 of 7 products priced". */
  detail?: { priced: number; total: number }
}

export type Completeness = {
  rows: CompletenessRow[]
  /** 0–100 across the non-optional rows whose state is known. */
  percent: number
  /** Count of non-optional rows that are done / known. */
  done: number
  known: number
  /** All non-optional, known rows complete. */
  allComplete: boolean
}

export const ROW_LINKS: Record<CompletenessRowKey, string> = {
  store_information: '/settings/store',
  stripe_connection: '/stripe-connect',
  locations_shipping: '/settings/locations',
  products: '/products/create',
  activities: '/settings/activities-served',
  contact_email: '/settings/store',
  prices: '/products',
  certifications: '/settings/certifications',
}

export function buildCompleteness(inputs: CompletenessInputs): Completeness {
  const flags = inputs.flags

  const rows: CompletenessRow[] = [
    {
      key: 'store_information',
      done: flags ? Boolean(flags.store_information) : null,
      link: ROW_LINKS.store_information,
      optional: false,
    },
    {
      key: 'locations_shipping',
      done: flags ? Boolean(flags.locations_shipping) : null,
      link: ROW_LINKS.locations_shipping,
      optional: false,
    },
    {
      key: 'activities',
      done: inputs.activityCount === null ? null : inputs.activityCount > 0,
      link: ROW_LINKS.activities,
      optional: false,
    },
    {
      key: 'contact_email',
      done: inputs.contactEmail === null ? false : Boolean(inputs.contactEmail),
      link: ROW_LINKS.contact_email,
      optional: false,
    },
    {
      key: 'stripe_connection',
      done: flags ? Boolean(flags.stripe_connection) : null,
      link: ROW_LINKS.stripe_connection,
      optional: false,
    },
    {
      key: 'products',
      done: flags ? Boolean(flags.products) : null,
      link: ROW_LINKS.products,
      optional: false,
    },
    {
      key: 'prices',
      // No products yet → pricing can't be judged; ride on the products
      // row instead of double-punishing an empty store.
      done:
        inputs.pricing === null
          ? null
          : inputs.pricing.total === 0
            ? false
            : inputs.pricing.priced === inputs.pricing.total,
      link: ROW_LINKS.prices,
      optional: false,
      ...(inputs.pricing && inputs.pricing.total > 0
        ? { detail: { priced: inputs.pricing.priced, total: inputs.pricing.total } }
        : {}),
    },
    {
      key: 'certifications',
      done:
        inputs.certificationCount === null
          ? null
          : inputs.certificationCount > 0,
      link: ROW_LINKS.certifications,
      optional: true,
    },
  ]

  const counted = rows.filter((r) => !r.optional && r.done !== null)
  const done = counted.filter((r) => r.done === true).length
  const known = counted.length
  const percent = known === 0 ? 0 : Math.round((done / known) * 100)

  return {
    rows,
    percent,
    done,
    known,
    allComplete: known > 0 && done === known,
  }
}

/**
 * The backend recalculation POST runs only when a backend flag is
 * actually false, and at most once per dashboard visit (the caller's
 * mount ref supplies `alreadyRanThisVisit`). Not per-session: flags
 * become satisfiable mid-session, and recalc naturally stops firing
 * once every flag is true.
 */
export function shouldRecalculateOnboarding(
  flags: CompletenessInputs['flags'],
  alreadyRanThisVisit: boolean
): boolean {
  if (alreadyRanThisVisit || !flags) {
    return false
  }
  return (
    !flags.store_information ||
    !flags.stripe_connection ||
    !flags.locations_shipping ||
    !flags.products
  )
}

/** Count products (sampled) that carry ≥1 positive variant price. */
export function summarizePricing(
  products:
    | Array<{
        variants?: Array<{
          prices?: Array<{ amount?: number | string | null }> | null
        }> | null
      }>
    | null
    | undefined
): { total: number; priced: number } | null {
  if (!products) {
    return null
  }
  let priced = 0
  for (const product of products) {
    const has = (product.variants || []).some((v) =>
      (v?.prices || []).some((p) => {
        const amount = Number(p?.amount)
        return Number.isFinite(amount) && amount > 0
      })
    )
    if (has) priced += 1
  }
  return { total: products.length, priced }
}
