import { describe, expect, it } from "vitest"

import { RegisterSchema } from "../register-schema"

const base = {
  name: "Acme Marine",
  email: "al@acmemarine.mu",
  password: "Str0ng!Password12",
  confirmPassword: "Str0ng!Password12",
}

describe("RegisterSchema — B-05 application capture", () => {
  it("accepts the full application", () => {
    const out = RegisterSchema.safeParse({
      ...base,
      website: "https://acmemarine.mu",
      company_type: "manufacturer",
      country_code: "mu",
    })
    expect(out.success).toBe(true)
  })

  it("keeps the new fields optional (legacy minimal signup still works)", () => {
    expect(RegisterSchema.safeParse(base).success).toBe(true)
    expect(
      RegisterSchema.safeParse({ ...base, website: "", company_type: "" })
        .success
    ).toBe(true)
  })

  it("rejects non-http(s) websites", () => {
    expect(
      RegisterSchema.safeParse({ ...base, website: "javascript:alert(1)" })
        .success
    ).toBe(false)
    expect(
      RegisterSchema.safeParse({ ...base, website: "not a url" }).success
    ).toBe(false)
  })

  it("rejects unknown company types", () => {
    expect(
      RegisterSchema.safeParse({ ...base, company_type: "conglomerate" })
        .success
    ).toBe(false)
  })

  it("still rejects mismatched passwords", () => {
    expect(
      RegisterSchema.safeParse({ ...base, confirmPassword: "Different!123456" })
        .success
    ).toBe(false)
  })
})
