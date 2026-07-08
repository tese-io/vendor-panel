/**
 * Returns the URL only if it is a safe external web link (http/https).
 *
 * React does not sanitize the `href` attribute, so rendering an untrusted URL
 * such as `javascript:...` or `data:...` directly is an XSS vector. Seller
 * websites are seller-provided, so guard them here. Returns `undefined` for
 * anything that isn't a valid http(s) URL so callers can skip the anchor.
 */
export function safeExternalHref(u?: string | null): string | undefined {
  if (!u || typeof u !== "string") return undefined
  try {
    const parsed = new URL(u.trim())
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined
  } catch {
    return undefined
  }
}
