import { describe, expect, it } from "vitest"

import {
  deriveSubmitActions,
  getRequireApproval,
  parseIncompleteProfile,
} from "../product-submit"

describe("getRequireApproval (D-01 default)", () => {
  it("reads the rule when present", () => {
    expect(
      getRequireApproval({
        configuration_rules: [
          { rule_type: "require_product_approval", is_enabled: false },
        ],
      })
    ).toBe(false)
    expect(
      getRequireApproval({
        configuration_rules: [
          { rule_type: "require_product_approval", is_enabled: true },
        ],
      })
    ).toBe(true)
  })

  it("reads the REAL wire shape: a {rule_type: boolean} map", () => {
    // GET /vendor/configuration returns a map, not the array its OAS
    // comment describes — this exact mismatch crashed /products/create.
    expect(
      getRequireApproval({
        configuration_rules: { require_product_approval: false },
      })
    ).toBe(false)
    expect(
      getRequireApproval({
        configuration_rules: {
          require_product_approval: true,
          global_product_catalog: false,
        },
      })
    ).toBe(true)
  })

  it("fails SAFE (approval required) on any doubt, never throwing", () => {
    expect(getRequireApproval(undefined)).toBe(true)
    expect(getRequireApproval(null)).toBe(true)
    expect(getRequireApproval({})).toBe(true)
    expect(getRequireApproval({ configuration_rules: [] })).toBe(true)
    expect(getRequireApproval({ configuration_rules: {} })).toBe(true)
    expect(
      getRequireApproval({
        configuration_rules: [{ rule_type: "require_product_approval" }],
      })
    ).toBe(true)
    expect(
      getRequireApproval({
        configuration_rules: { require_product_approval: "yes" },
      } as never)
    ).toBe(true)
  })
})

describe("deriveSubmitActions (B-10)", () => {
  it("approval required → submit-for-review with hint, no auto-publish", () => {
    const a = deriveSubmitActions(true)
    expect(a.primaryLabelKey).toBe("productSubmit.submitForReview")
    expect(a.hintKey).toBe("productSubmit.reviewHint")
    expect(a.publishAfterCreate).toBe(false)
  })

  it("approval off → publish directly", () => {
    const a = deriveSubmitActions(false)
    expect(a.primaryLabelKey).toBe("productSubmit.publish")
    expect(a.hintKey).toBeNull()
    expect(a.publishAfterCreate).toBe(true)
  })
})

describe("parseIncompleteProfile (D-04 gate errors)", () => {
  it("extracts the missing-field codes from the server marker", () => {
    const msg =
      "Complete your seller profile before submitting: missing service activities, product price. (INCOMPLETE_SELLER_PROFILE:activities,price)"
    expect(parseIncompleteProfile(msg)).toEqual(["activities", "price"])
  })

  it("keeps only known fields and returns null for unrelated errors", () => {
    expect(
      parseIncompleteProfile("(INCOMPLETE_SELLER_PROFILE:activities,mystery)")
    ).toEqual(["activities"])
    expect(parseIncompleteProfile("Something else went wrong")).toBeNull()
    expect(parseIncompleteProfile(undefined)).toBeNull()
  })

  it("handles the full four-field rejection", () => {
    expect(
      parseIncompleteProfile(
        "(INCOMPLETE_SELLER_PROFILE:activities,warehouse_coordinates,contact_email,price)"
      )
    ).toEqual(["activities", "warehouse_coordinates", "contact_email", "price"])
  })
})
