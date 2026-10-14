/**
 * B-05: detect the "authenticated but not an approved seller" state.
 *
 * The backend's check-seller-approved middleware answers 403 with
 * "Seller is not active" for an identity whose application is still
 * pending (or was declined). The panel routes that state to the
 * pending-approval page instead of bouncing to /login with a raw error.
 */
export function isPendingSellerError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }
  const status = (error as { status?: number }).status
  const message = (error as { message?: string }).message || ""
  return status === 403 && /seller is not active/i.test(message)
}
