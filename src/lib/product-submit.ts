/**
 * B-10 — product submit honesty. Pure decisions for the create form:
 * what the primary action really does (submit for review vs publish),
 * and how to read the D-04 completeness rejection into something a
 * vendor can act on.
 */

export type ConfigurationRulesResponse = {
  // GET /vendor/configuration RETURNS A MAP {rule_type: boolean} — its
  // OAS comment claims an array of {rule_type, is_enabled} rows, which
  // is wrong (crashed /products/create on dev, 2026-09-23). Accept both.
  configuration_rules?:
    | Record<string, boolean>
    | Array<{ rule_type?: string; is_enabled?: boolean }>
} | null | undefined

/**
 * D-01: review-before-visible is the launch state. On ANY doubt
 * (endpoint failed, rule missing, unexpected shape) assume approval IS
 * required — the safe direction is never promising instant publication.
 * Must NEVER throw: it runs during render.
 */
export function getRequireApproval(config: ConfigurationRulesResponse): boolean {
  const rules = config?.configuration_rules
  if (Array.isArray(rules)) {
    const rule = rules.find((r) => r?.rule_type === "require_product_approval")
    return typeof rule?.is_enabled === "boolean" ? rule.is_enabled : true
  }
  if (rules && typeof rules === "object") {
    const value = (rules as Record<string, unknown>)["require_product_approval"]
    return typeof value === "boolean" ? value : true
  }
  return true
}

export type SubmitActions = {
  /** i18n key for the primary button. */
  primaryLabelKey: "productSubmit.submitForReview" | "productSubmit.publish"
  /** i18n key for the footer hint, or null when publishing directly. */
  hintKey: "productSubmit.reviewHint" | null
  /** Chain a publish status call after create (flag-off environments). */
  publishAfterCreate: boolean
}

export function deriveSubmitActions(requireApproval: boolean): SubmitActions {
  if (requireApproval) {
    return {
      primaryLabelKey: "productSubmit.submitForReview",
      hintKey: "productSubmit.reviewHint",
      publishAfterCreate: false,
    }
  }
  return {
    primaryLabelKey: "productSubmit.publish",
    hintKey: null,
    publishAfterCreate: true,
  }
}

const INCOMPLETE_RE = /INCOMPLETE_SELLER_PROFILE:([a-z_,]+)/

export const INCOMPLETE_FIELD_KEYS = {
  activities: "productSubmit.missing.activities",
  warehouse_coordinates: "productSubmit.missing.warehouse_coordinates",
  contact_email: "productSubmit.missing.contact_email",
  price: "productSubmit.missing.price",
  business_verification: "productSubmit.missing.business_verification",
} as const

export type IncompleteField = keyof typeof INCOMPLETE_FIELD_KEYS

export const INCOMPLETE_FIELD_LINKS: Record<string, string> = {
  activities: "/settings/activities-served",
  warehouse_coordinates: "/settings/locations",
  contact_email: "/settings/store",
  price: "/products",
  business_verification: "/settings/business-verification",
}

/**
 * Parse the D-04 gate's machine marker out of an error message.
 * Returns the missing-field codes, or null when the error is something
 * else entirely.
 */
export function parseIncompleteProfile(
  message: string | undefined | null
): IncompleteField[] | null {
  if (!message) return null
  const match = INCOMPLETE_RE.exec(message)
  if (!match) return null
  return match[1]
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is IncompleteField => f in INCOMPLETE_FIELD_KEYS)
}
