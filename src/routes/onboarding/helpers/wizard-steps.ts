/**
 * B-02 — pure state derivation for the first-run wizard.
 *
 * Fixed step order per the directive: company profile → warehouse
 * location → service activities → payout account → first product.
 * Activities come BEFORE the first product so the product form can
 * suggest from what the vendor already declared.
 */

export const WIZARD_STEPS = [
  'company',
  'warehouse',
  'activities',
  'payout',
  'product',
] as const

export type WizardStepKey = (typeof WIZARD_STEPS)[number]

export type WizardInputs = {
  flags: {
    store_information: boolean
    stripe_connection: boolean
    locations_shipping: boolean
    products: boolean
  } | null
  /** Active self-declared coverage rows; null = unknown. */
  activityCount: number | null
}

export type WizardState = {
  steps: Array<{ key: WizardStepKey; complete: boolean }>
  /** Resume point — the first incomplete step. */
  firstIncomplete: WizardStepKey
  completedCount: number
  allComplete: boolean
}

export function deriveWizardState(inputs: WizardInputs): WizardState {
  const flags = inputs.flags
  const complete: Record<WizardStepKey, boolean> = {
    company: Boolean(flags?.store_information),
    warehouse: Boolean(flags?.locations_shipping),
    // Unknown coverage counts as incomplete — the wizard step itself
    // shows the picker, which degrades gracefully.
    activities: (inputs.activityCount ?? 0) > 0,
    payout: Boolean(flags?.stripe_connection),
    product: Boolean(flags?.products),
  }

  const steps = WIZARD_STEPS.map((key) => ({ key, complete: complete[key] }))
  const firstIncomplete =
    steps.find((s) => !s.complete)?.key ?? WIZARD_STEPS[WIZARD_STEPS.length - 1]
  const completedCount = steps.filter((s) => s.complete).length

  return {
    steps,
    firstIncomplete,
    completedCount,
    allComplete: completedCount === steps.length,
  }
}

export function wizardDismissalKey(sellerId: string): string {
  return `onboarding-wizard-dismissed:${sellerId}`
}

/**
 * Gate (per Kuzi-approved plan correction): the wizard ambushes nobody —
 * it auto-opens only for a genuinely blank store (ALL FOUR backend
 * onboarding flags false, the SSO-provisioned case) that hasn't
 * dismissed it. Partially-onboarded vendors keep the dashboard
 * checklist instead.
 */
export function shouldShowWizard(
  flags: WizardInputs['flags'],
  dismissed: boolean
): boolean {
  if (dismissed || !flags) {
    return false
  }
  return (
    !flags.store_information &&
    !flags.stripe_connection &&
    !flags.locations_shipping &&
    !flags.products
  )
}
