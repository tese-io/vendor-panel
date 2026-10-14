import { describe, expect, it } from "vitest"

import {
  deriveWizardState,
  shouldShowWizard,
  wizardDismissalKey,
} from "../wizard-steps"

const blankFlags = {
  store_information: false,
  stripe_connection: false,
  locations_shipping: false,
  products: false,
}

describe("deriveWizardState (B-02)", () => {
  it("keeps the fixed directive order with activities before product", () => {
    const state = deriveWizardState({ flags: blankFlags, activityCount: 0 })
    expect(state.steps.map((s) => s.key)).toEqual([
      "company",
      "warehouse",
      "activities",
      "payout",
      "product",
    ])
    expect(state.firstIncomplete).toBe("company")
    expect(state.allComplete).toBe(false)
  })

  it("resumes at the first incomplete step", () => {
    const state = deriveWizardState({
      flags: { ...blankFlags, store_information: true, locations_shipping: true },
      activityCount: 0,
    })
    expect(state.firstIncomplete).toBe("activities")
    expect(state.completedCount).toBe(2)
  })

  it("all complete lands on the last step and reports allComplete", () => {
    const state = deriveWizardState({
      flags: {
        store_information: true,
        stripe_connection: true,
        locations_shipping: true,
        products: true,
      },
      activityCount: 3,
    })
    expect(state.allComplete).toBe(true)
    expect(state.firstIncomplete).toBe("product")
  })

  it("unknown coverage counts as incomplete, never as done", () => {
    const state = deriveWizardState({
      flags: { ...blankFlags, store_information: true, locations_shipping: true },
      activityCount: null,
    })
    expect(state.steps.find((s) => s.key === "activities")!.complete).toBe(false)
  })
})

describe("shouldShowWizard (gating)", () => {
  it("auto-opens only for a fully blank store", () => {
    expect(shouldShowWizard(blankFlags, false)).toBe(true)
  })

  it("never ambushes a partially-onboarded vendor", () => {
    expect(
      shouldShowWizard({ ...blankFlags, store_information: true }, false)
    ).toBe(false)
  })

  it("respects dismissal and missing flags", () => {
    expect(shouldShowWizard(blankFlags, true)).toBe(false)
    expect(shouldShowWizard(null, false)).toBe(false)
  })
})

describe("wizardDismissalKey", () => {
  it("is scoped per seller", () => {
    expect(wizardDismissalKey("sel_1")).not.toBe(wizardDismissalKey("sel_2"))
  })
})
