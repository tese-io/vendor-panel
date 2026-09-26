import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { fetchQuery, sdk } from "../../lib/client"

/**
 * Tese seller SSO callback.
 *
 * The tese dashboard redirects here with a one-time `key`. We exchange it for a
 * seller session via the `tese-sso-seller` auth provider, provision/link the
 * seller store + member for the active tenant, refresh the token so it carries
 * the seller actor, and enter the panel.
 */
export const SSOCallback = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // Which step failed, and what the server actually said. Kept on screen:
  // bouncing to /login with a generic "sign-in failed" threw away the only
  // evidence of what went wrong, which made a real failure undiagnosable
  // without server logs.
  const [failure, setFailure] = useState<{
    stage: string
    detail: string
  } | null>(null)
  const [claimPending, setClaimPending] = useState<{
    seller_name?: string
  } | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) {
      return
    }
    ran.current = true

    const key = params.get("key")
    if (!key) {
      navigate("/login?reason=sso_missing_key", { replace: true })
      return
    }

    ;(async () => {
      // Named so a failure can say which hop broke.
      let stage = "exchanging the tese.io sign-in key"
      try {
        // Exchange the one-time key. The SDK stores the returned token under
        // `medusa_auth_token`, which fetchQuery + the SDK both read.
        const token = await sdk.auth.login("seller", "tese-sso-seller", {
          sso_key: key,
        })
        if (typeof token !== "string") {
          setFailure({
            stage,
            detail:
              "The exchange returned no session token. The one-time key is valid for 60 seconds and can only be used once.",
          })
          return
        }
        stage = "setting up your store"

        // Provision the store (first user of the tenant) or attach as a member,
        // and point the auth identity at the seller. Idempotent.
        const provisioned = await fetchQuery("/vendor/sellers/tese", {
          method: "POST",
          body: {},
        })

        // B-01: a store matching this company already exists — the vendor's
        // access request is queued for a human to confirm. No seller actor
        // exists yet, so stay here and explain instead of entering the panel.
        if (provisioned?.claim_pending) {
          setClaimPending({ seller_name: provisioned.seller_name })
          return
        }

        // Refresh so the token carries the seller actor (member) link.
        stage = "refreshing your session"
        await sdk.auth.refresh()

        navigate("/dashboard", { replace: true })
      } catch (e: any) {
        const status = e?.status ?? e?.response?.status ?? e?.statusCode
        setFailure({
          stage,
          detail:
            [status ? `HTTP ${status}` : null, e?.message]
              .filter(Boolean)
              .join(" — ") || "Unknown error",
        })
      }
    })()
  }, [navigate, params])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md text-center">
        {claimPending ? (
          <div data-testid="sso-claim-pending">
            <p className="mb-2 font-medium">
              Your company already has a store on the tese marketplace
              {claimPending.seller_name ? `: ${claimPending.seller_name}` : ""}.
            </p>
            <p className="text-ui-fg-subtle mb-4">
              We've asked the tese team to confirm your access to it — you'll
              receive an email as soon as it's approved. Nothing else is
              needed from you right now.
            </p>
            <a className="text-ui-fg-interactive" href="/login">
              Back to login
            </a>
          </div>
        ) : failure ? (
          <div data-testid="sso-failure">
            <p className="text-ui-fg-error mb-2 font-medium">
              tese.io sign-in did not complete while {failure.stage}.
            </p>
            <p className="text-ui-fg-subtle mb-4 break-words font-mono text-xs">
              {failure.detail}
            </p>
            <p className="text-ui-fg-subtle mb-4">
              Starting again from tese.io issues a fresh key, which usually
              resolves it. If it keeps happening, send this message to support.
            </p>
            <a className="text-ui-fg-interactive" href="/login">
              Back to sign in
            </a>
          </div>
        ) : (
          <p className="text-ui-fg-subtle">Signing you in…</p>
        )}
      </div>
    </div>
  )
}
