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
  type CertificationDocument,
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
  // Multi-doc chip list: each entry is either an uploaded file (kind='file')
  // or a pasted URL (kind='url'). At least one entry required to submit.
  const [documents, setDocuments] = useState<CertificationDocument[]>([])
  const [urlDraft, setUrlDraft] = useState("")
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
      setDocuments([])
      setUrlDraft("")
      setExpiresAt("")
      setOpenList(false)
    },
    onError: (err) => {
      toast.error(err?.message || "Could not attach certification")
    },
  })

  const addDocument = (doc: CertificationDocument) => {
    // Dedupe by URL — pasting the same URL twice or re-uploading the
    // same file just no-ops rather than piling on duplicates.
    if (documents.some((d) => d.url === doc.url)) {
      toast.info("That document is already attached")
      return
    }
    setDocuments((prev) => [...prev, doc])
  }

  const removeDocumentAt = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleFilePicked = async (file: File) => {
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(`File too large — max ${MAX_PROOF_BYTES / (1024 * 1024)}MB`)
      return
    }
    setUploading(true)
    try {
      const resp = await uploadFilesQuery([{ file }], { purpose: 'private' })
      const uploaded = resp?.files?.[0]?.url as string | undefined
      if (!uploaded) {
        toast.error("Upload failed — no URL returned")
        return
      }
      addDocument({ url: uploaded, filename: file.name, kind: "file" })
      toast.success(`Uploaded ${file.name}`)
    } catch (err) {
      toast.error((err as Error)?.message || "Upload failed")
    } finally {
      setUploading(false)
      // Reset the input so picking the same file again re-triggers change
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const addUrlFromDraft = () => {
    const trimmedUrl = urlDraft.trim()
    if (!trimmedUrl) return
    try {
      // eslint-disable-next-line no-new
      new URL(trimmedUrl)
    } catch {
      toast.error("That doesn't look like a valid URL")
      return
    }
    addDocument({
      url: trimmedUrl,
      filename: fileNameFromUrl(trimmedUrl),
      kind: "url",
    })
    setUrlDraft("")
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
    if (documents.length === 0) {
      toast.error("Attach at least one proof document")
      return
    }
    attach.mutate({
      certification_slug: selected.slug,
      documents,
      expires_at: expiresAt.trim() || null,
    })
  }

  const canSubmit =
    !!selected &&
    documents.length >= 1 &&
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
        {/* Proof documents — at least one required. Sellers can mix
            uploads (goes to /vendor/uploads as a private proof) with
            pasted URLs (typically links to the certification body's
            public verification registry). Each entry renders as a chip. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
              Proof documents <span className="text-ui-fg-error">*</span>
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted">
              {documents.length === 0
                ? "at least one required"
                : `${documents.length} attached`}
            </Text>
          </div>

          {/* Chip list of already-attached docs. */}
          {documents.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {documents.map((doc, idx) => (
                <div
                  key={`${doc.url}-${idx}`}
                  className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2"
                >
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-6 h-6 rounded bg-ui-bg-base text-[10px] font-semibold text-ui-fg-muted border border-ui-border-base"
                  >
                    {doc.kind === "file" ? "PDF" : "🔗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs text-ui-fg-base truncate"
                      title={doc.url}
                    >
                      {doc.filename || fileNameFromUrl(doc.url)}
                    </div>
                    <div
                      className="text-[10px] text-ui-fg-muted truncate"
                      title={doc.url}
                    >
                      {doc.url}
                    </div>
                  </div>
                  <Badge
                    size="2xsmall"
                    color={doc.kind === "file" ? "green" : "blue"}
                  >
                    {doc.kind === "file" ? "uploaded" : "URL"}
                  </Badge>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => removeDocumentAt(idx)}
                    disabled={uploading || attach.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add-more controls: file picker + paste-URL input. Stay
              visible even when docs are attached so sellers can add more. */}
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
              {uploading ? "Uploading…" : documents.length ? "Upload another file" : "Upload file"}
            </Button>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Paste a URL (e.g. verification registry link)"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addUrlFromDraft()
                  }
                }}
                disabled={uploading || attach.isPending}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="small"
                onClick={addUrlFromDraft}
                disabled={
                  !urlDraft.trim() || uploading || attach.isPending
                }
              >
                Add URL
              </Button>
            </div>
          </div>

          <Text size="xsmall" className="text-ui-fg-subtle">
            PDF, image (PNG/JPG/WebP), or Word doc. Max 10&nbsp;MB per
            file. Mix uploads with links to the certifier's public
            verification page for the strongest evidence.
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

  // Multi-doc rows use `documents`. Legacy pre-migration rows had only
  // `document_url` — fall back so we don't render blank for them.
  const docs: CertificationDocument[] =
    (row.documents && row.documents.length > 0
      ? row.documents
      : row.document_url
        ? [{ url: row.document_url, kind: "url" }]
        : []) as CertificationDocument[]

  return (
    <div className="flex items-start justify-between gap-3 px-6 py-3 border-b border-ui-border-base last:border-0">
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
        </div>
        {docs.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {docs.map((d, i) => (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-md border border-ui-border-base bg-ui-bg-subtle px-2 py-0.5 text-[11px] text-ui-fg-interactive hover:bg-ui-bg-base-hover max-w-[220px]"
                title={d.url}
              >
                <span aria-hidden>{d.kind === "file" ? "📄" : "🔗"}</span>
                <span className="truncate">
                  {d.filename || fileNameFromUrl(d.url)}
                </span>
              </a>
            ))}
          </div>
        )}
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
