import { useMemo, useRef, useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { SingleColumnPage } from "../../../components/layout/pages/single-column-page"
import { uploadFilesQuery } from "../../../lib/client/client"
import {
  useAttachSellerCertification,
  useCertificationCatalog,
  useRemoveSellerCertification,
  useSellerCertifications,
  type CatalogCertification,
  type SellerCertificationRow,
} from "../../../hooks/api/seller-certifications"

/**
 * Settings → Certifications.
 *
 * Sellers attach sustainability certifications from the shared catalog. Each
 * attachment enters a pending queue reviewed by Tese admins; verified attachments
 * show on the tenant-facing marketplace card. Expired certs stay visible in grey.
 */

const StatusBadge = ({
  status,
}: {
  status: SellerCertificationRow["verification_status"]
}) => {
  const color =
    status === "verified"
      ? "green"
      : status === "rejected"
        ? "red"
        : status === "expired"
          ? "grey"
          : "orange"
  const label =
    status === "verified"
      ? "Verified"
      : status === "rejected"
        ? "Rejected"
        : status === "expired"
          ? "Expired"
          : "Pending review"
  return (
    <Badge size="2xsmall" color={color}>
      {label}
    </Badge>
  )
}

// Accepted MIME hints for the file picker. Backend has no format
// enforcement (it just stores the returned URL as document_url), so
// this is UX-only — the browser filters the picker, we still show a
// friendly error if the user drops something unexpected via the URL
// path. Kept broad on purpose: real certificates arrive as PDFs, but
// scanned images and Word docs are common enough.
const ALLOWED_PROOF_ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const MAX_PROOF_BYTES = 10 * 1024 * 1024 // 10 MB — plenty for scanned certs

const fileNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url)
    const last = u.pathname.split("/").filter(Boolean).pop()
    return last ? decodeURIComponent(last) : url
  } catch {
    return url
  }
}

const AddCertificationRow = ({
  existingSlugs,
}: {
  existingSlugs: Set<string>
}) => {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<CatalogCertification | null>(null)
  const [documentUrl, setDocumentUrl] = useState("")
  // Tracks whether documentUrl came from an upload (show filename chip)
  // vs a paste (show URL). Purely presentational.
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [expiresAt, setExpiresAt] = useState("")
  const [openList, setOpenList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const trimmed = query.trim()
  const enabled = trimmed.length >= 2
  const { data, isLoading, isError } = useCertificationCatalog(trimmed, {
    enabled,
  })
  const suggestions: CatalogCertification[] = data?.certifications || []

  const attach = useAttachSellerCertification({
    onSuccess: () => {
      toast.success("Certification attached — pending Tese admin review")
      setQuery("")
      setSelected(null)
      setDocumentUrl("")
      setUploadedFileName(null)
      setExpiresAt("")
      setOpenList(false)
    },
    onError: (err) => {
      toast.error(err?.message || "Could not attach certification")
    },
  })

  const handleFilePicked = async (file: File) => {
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(`File too large — max ${MAX_PROOF_BYTES / (1024 * 1024)}MB`)
      return
    }
    setUploading(true)
    try {
      const resp = await uploadFilesQuery([{ file }])
      const uploaded = resp?.files?.[0]?.url as string | undefined
      if (!uploaded) {
        toast.error("Upload failed — no URL returned")
        return
      }
      setDocumentUrl(uploaded)
      setUploadedFileName(file.name)
      toast.success(`Uploaded ${file.name}`)
    } catch (err) {
      toast.error((err as Error)?.message || "Upload failed")
    } finally {
      setUploading(false)
      // Reset the input so picking the same file again re-triggers change
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const clearDocument = () => {
    setDocumentUrl("")
    setUploadedFileName(null)
  }

  const submit = () => {
    if (!selected) {
      toast.error("Please pick a certification from the catalog first")
      return
    }
    if (existingSlugs.has(selected.slug)) {
      toast.info("You already attached that certification")
      return
    }
    const trimmedUrl = documentUrl.trim()
    if (!trimmedUrl) {
      toast.error("A proof document is required — upload a file or paste a URL")
      return
    }
    // Client-side URL sanity check — matches backend z.string().url()
    try {
      // eslint-disable-next-line no-new
      new URL(trimmedUrl)
    } catch {
      toast.error("The proof document URL is not valid")
      return
    }
    attach.mutate({
      certification_slug: selected.slug,
      document_url: trimmedUrl,
      expires_at: expiresAt.trim() || null,
    })
  }

  const canSubmit =
    !!selected &&
    !!documentUrl.trim() &&
    !uploading &&
    !attach.isPending

  return (
    <div className="px-6 py-4 border-b border-ui-border-base">
      <Text size="small" weight="plus" className="mb-2 text-ui-fg-subtle">
        Add a certification
      </Text>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Input
            placeholder="Search catalog (e.g. FSC, B Corp, ISO 14001)"
            value={selected ? selected.name : query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
              setOpenList(true)
            }}
            onFocus={() => setOpenList(true)}
          />
          {openList && enabled && !selected && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg">
              {isLoading && (
                <div className="px-3 py-2 text-sm text-ui-fg-subtle">
                  Searching…
                </div>
              )}
              {isError && (
                <div className="px-3 py-2 text-sm text-ui-fg-error">
                  Catalog search failed. Try again.
                </div>
              )}
              {!isLoading && !isError && suggestions.length === 0 && (
                <div className="px-3 py-2 text-sm text-ui-fg-subtle">
                  No matches. Try a different search term.
                </div>
              )}
              {suggestions.map((c) => {
                const already = existingSlugs.has(c.slug)
                return (
                  <button
                    key={c.slug}
                    type="button"
                    disabled={already}
                    onClick={() => {
                      setSelected(c)
                      setOpenList(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm border-b border-ui-border-base last:border-0 hover:bg-ui-bg-base-hover disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="font-mono text-xs text-ui-fg-subtle">
                      {c.slug}
                    </div>
                    <div className="text-ui-fg-base">{c.name}</div>
                    {c.categories.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {c.categories.slice(0, 3).map((cat) => (
                          <Badge key={cat} size="2xsmall" color="grey">
                            {cat}
                          </Badge>
                        ))}
                        {already && (
                          <Badge size="2xsmall" color="green">
                            Already attached
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {/* Proof document — required. Two paths: upload a file (goes to
            Medusa's file service, returns a public URL) or paste a URL
            directly. Either way we end up with a URL in documentUrl. */}
        <div className="flex flex-col gap-1.5">
          <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
            Proof document <span className="text-ui-fg-error">*</span>
          </Text>

          {uploadedFileName ? (
            <div className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <span className="text-xs text-ui-fg-base truncate flex-1" title={documentUrl}>
                {uploadedFileName}
              </span>
              <Badge size="2xsmall" color="green">
                uploaded
              </Badge>
              <Button
                variant="transparent"
                size="small"
                onClick={clearDocument}
                disabled={uploading || attach.isPending}
              >
                Change
              </Button>
            </div>
          ) : documentUrl ? (
            <div className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <span className="text-xs text-ui-fg-base truncate flex-1" title={documentUrl}>
                {fileNameFromUrl(documentUrl)}
              </span>
              <Badge size="2xsmall" color="blue">
                URL
              </Badge>
              <Button
                variant="transparent"
                size="small"
                onClick={clearDocument}
                disabled={uploading || attach.isPending}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_PROOF_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFilePicked(f)
                }}
              />
              <Button
                variant="secondary"
                size="small"
                disabled={uploading || attach.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload file (PDF / image)"}
              </Button>
              <Input
                placeholder="…or paste a document URL"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                disabled={uploading || attach.isPending}
                className="flex-1"
              />
            </div>
          )}
          <Text size="xsmall" className="text-ui-fg-subtle">
            PDF, image (PNG/JPG/WebP), or Word doc. Max 10&nbsp;MB. Required so the Tese admin can verify the certificate.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="Expires on (optional)"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="primary"
            size="small"
            disabled={!canSubmit}
            onClick={submit}
          >
            {attach.isPending ? "Attaching…" : "Attach certification"}
          </Button>
        </div>
      </div>
      <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
        Attached certifications are reviewed by Tese before they show as verified on the marketplace.
      </Text>
    </div>
  )
}

const CertificationRowItem = ({ row }: { row: SellerCertificationRow }) => {
  const remove = useRemoveSellerCertification({
    onSuccess: () => toast.success("Removed"),
    onError: (err) => toast.error(err?.message || "Could not remove"),
  })

  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-ui-border-base last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-ui-fg-subtle">
          {row.certification_slug}
        </div>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <StatusBadge status={row.verification_status} />
          {row.expires_at && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              expires {new Date(row.expires_at).toLocaleDateString()}
            </Text>
          )}
          {row.document_url && (
            <a
              href={row.document_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-ui-fg-interactive underline"
            >
              View document
            </a>
          )}
        </div>
        {row.verification_notes && (
          <Text size="xsmall" className="mt-1 text-ui-fg-subtle">
            {row.verification_notes}
          </Text>
        )}
      </div>
      <Button
        variant="secondary"
        size="small"
        disabled={remove.isPending}
        onClick={() => remove.mutate(row.id)}
      >
        {remove.isPending ? "Removing…" : "Remove"}
      </Button>
    </div>
  )
}

export const Certifications = () => {
  const { data, isLoading, isError, error } = useSellerCertifications()

  const rows = data?.seller_certifications || []
  const existingSlugs = useMemo(
    () => new Set(rows.map((r) => r.certification_slug)),
    [rows]
  )

  return (
    <SingleColumnPage
      showMetadata={false}
      showJSON={false}
      widgets={{ before: [], after: [] }}
      hasOutlet={false}
    >
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="px-6 py-4">
          <Heading level="h2">Certifications</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Attach the sustainability certifications your store holds. Tese
            reviews each attachment; verified certifications show as a green
            check on the marketplace.
          </Text>
        </div>

        <AddCertificationRow existingSlugs={existingSlugs} />

        <div>
          {isLoading && (
            <div className="px-6 py-4 text-sm text-ui-fg-subtle">Loading…</div>
          )}
          {isError && (
            <div className="px-6 py-4 text-sm text-ui-fg-error">
              Couldn't load your certifications:{" "}
              {(error as any)?.message || "unknown error"}
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="px-6 py-6 text-sm text-ui-fg-subtle">
              You haven't attached any certifications yet. Use the search above
              to add one.
            </div>
          )}
          {rows.map((r) => (
            <CertificationRowItem key={r.id} row={r} />
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export const Component = Certifications
