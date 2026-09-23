import { describe, expect, it } from "vitest"

import { isPendingSellerError } from "../is-pending-seller-error"

describe("isPendingSellerError (B-05)", () => {
  it("matches the approval-gate 403", () => {
    expect(
      isPendingSellerError({ status: 403, message: "Seller is not active" })
    ).toBe(true)
    expect(
      isPendingSellerError({ status: 403, message: "seller is NOT active!" })
    ).toBe(true)
  })

  it("ignores other 403s and other statuses", () => {
    expect(
      isPendingSellerError({ status: 403, message: "Forbidden" })
    ).toBe(false)
    expect(
      isPendingSellerError({ status: 401, message: "Seller is not active" })
    ).toBe(false)
  })

  it("is safe on junk input", () => {
    expect(isPendingSellerError(null)).toBe(false)
    expect(isPendingSellerError(undefined)).toBe(false)
    expect(isPendingSellerError("Seller is not active")).toBe(false)
    expect(isPendingSellerError({})).toBe(false)
  })
})
