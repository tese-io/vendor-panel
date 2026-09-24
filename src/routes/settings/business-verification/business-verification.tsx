import { useRef, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Alert,
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as z from "zod"

import { Form } from "../../../components/common/form"
import { CountrySelect } from "../../../components/inputs/country-select"
import { SingleColumnPage } from "../../../components/layout/pages/single-column-page"
import {
  fetchBusinessVerificationDocumentUrl,
  useBusinessVerification,
  usePrefillBusinessVerification,
  useSubmitBusinessVerification,
  type BusinessVerificationRow,
  type DocumentKind,
  type OcrPrefill,
} from "../../../hooks/api/business-verification"
import { uploadFilesQuery } from "../../../lib/client/client"

/**
 * Settings → Business verification (KYB, B-23 + B-27).
 *
 * Four vendor-facing states: needed (upload + typed fields), under review,
 * declined (reason + re-upload), verified (no banner, no badge — G-11).
 * Documents go to the private bucket and are only ever opened through
 * short-lived signed links (G-12).
 */

const DOCUMENT_KINDS: DocumentKind[] = [
  "certificate_of_incorporation",
  "registration_extract",
  "trade_licence",
  "tax_registration",
]

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp"
const MAX_BYTES = 10 * 1024 * 1024

const Schema = z.object({
  document_kind: z.enum([
    "certificate_of_incorporation",
    "registration_extract",
    "trade_licence",
    "tax_registration",
  ]),
  legal_name: z.string().trim().min(2).max(200),
  registration_number: z.string().trim().min(2).max(64),
  country_of_registration: z.string().length(2),
})

type UploadedDoc = { key: string; url: string; filename: string; mimeType: string }

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : ""

const StateBadge = ({ state }: { state: "under_review" | "declined" | "verified" }) => {
  const { t } = useTranslation()
  const color = state === "verified" ? "green" : state === "declined" ? "red" : "orange"
  return (
    <Badge size="2xsmall" color={color} data-testid={`business-verification-state-${state}`}>
      {t(`businessVerification.badges.${state}`)}
    </Badge>
  )
}

const SubmittedSummary = ({ row }: { row: BusinessVerificationRow }) => {
  const { t } = useTranslation()
  const [opening, setOpening] = useState(false)
  const openDocument = async () => {
    setOpening(true)
    try {
      const { url } = await fetchBusinessVerificationDocumentUrl()
      window.open(url, "_blank", "noopener")
    } catch (err) {
      toast.error((err as Error)?.message || t("businessVerification.toasts.documentUnavailable"))
    } finally {
      setOpening(false)
    }
  }
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-4 py-1">
      <Text size="small" className="text-ui-fg-subtle">{label}</Text>
      <Text size="small" className="text-right">{value}</Text>
    </div>
  )
  return (
    <div className="flex flex-col gap-y-1">
      <Row label={t("businessVerification.fields.documentKind")} value={t(`businessVerification.kinds.${row.document_kind}`)} />
      <Row label={t("businessVerification.fields.legalName")} value={row.legal_name} />
      <Row label={t("businessVerification.fields.registrationNumber")} value={row.registration_number} />
      <Row label={t("businessVerification.fields.country")} value={row.country_of_registration.toUpperCase()} />
      <Row label={t("businessVerification.submittedOn")} value={formatDate(row.created_at)} />
      {row.reviewed_at && (
        <Row label={t("businessVerification.reviewedOn")} value={formatDate(row.reviewed_at)} />
      )}
      <div className="mt-2">
        <Button variant="secondary" size="small" onClick={openDocument} isLoading={opening} data-testid="business-verification-open-document">
          {t("businessVerification.actions.viewDocument")}
        </Button>
      </div>
    </div>
  )
}

const SubmitForm = ({ declinedNote }: { declinedNote?: string | null }) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [doc, setDoc] = useState<UploadedDoc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [prefill, setPrefill] = useState<OcrPrefill | null>(null)

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: {
      document_kind: "registration_extract",
      legal_name: "",
      registration_number: "",
      country_of_registration: "",
    },
  })

  const prefillMutation = usePrefillBusinessVerification()
  const submit = useSubmitBusinessVerification({
    onSuccess: () => toast.success(t("businessVerification.toasts.submitted")),
    onError: (err) =>
      toast.error(err?.message || t("businessVerification.toasts.submitFailed")),
  })

  const applyPrefill = (p: OcrPrefill | null) => {
    setPrefill(p)
    if (!p) return
    const cur = form.getValues()
    if (p.document_kind) form.setValue("document_kind", p.document_kind)
    if (p.legal_name && !cur.legal_name) form.setValue("legal_name", p.legal_name)
    if (p.registration_number && !cur.registration_number)
      form.setValue("registration_number", p.registration_number)
    if (p.country_of_registration && !cur.country_of_registration)
      form.setValue("country_of_registration", p.country_of_registration)
  }

  const handleFilePicked = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(t("businessVerification.toasts.tooLarge"))
      return
    }
    setUploading(true)
    try {
      const resp = await uploadFilesQuery([{ file }], { purpose: "private" })
      const uploaded = resp?.files?.[0] as { key?: string; id?: string; url?: string } | undefined
      const key = uploaded?.key || uploaded?.id
      if (!key || !uploaded?.url) {
        toast.error(t("businessVerification.toasts.uploadFailed"))
        return
      }
      setDoc({ key, url: uploaded.url, filename: file.name, mimeType: file.type })
      // Best-effort OCR pre-fill — the vendor confirms every value.
      try {
        const res = await prefillMutation.mutateAsync({ document_key: key, mime_type: file.type || null })
        applyPrefill(res?.prefill ?? null)
      } catch {
        applyPrefill(null)
      }
    } catch (err) {
      toast.error((err as Error)?.message || t("businessVerification.toasts.uploadFailed"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!doc) {
      toast.error(t("businessVerification.toasts.documentRequired"))
      return
    }
    await submit.mutateAsync({
      document_key: doc.key,
      document_url: doc.url,
      document_filename: doc.filename,
      document_kind: values.document_kind,
      legal_name: values.legal_name,
      registration_number: values.registration_number,
      country_of_registration: values.country_of_registration.toLowerCase(),
      ocr_prefill: prefill,
    })
  })

  const busy = uploading || prefillMutation.isPending || submit.isPending

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-y-5">
        {declinedNote && (
          <Alert variant="error" data-testid="business-verification-declined-note">
            <span className="font-medium">{t("businessVerification.states.declined.title")}</span>
            {" — "}
            {declinedNote}
          </Alert>
        )}

        <div className="flex flex-col gap-y-2">
          <Text size="small" weight="plus">
            {t("businessVerification.fields.document")}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("businessVerification.fields.documentHint")}
          </Text>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFilePicked(f)
            }}
            data-testid="business-verification-file-input"
          />
          <div className="flex items-center gap-x-3">
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              data-testid="business-verification-upload"
            >
              {uploading
                ? t("businessVerification.fields.uploading")
                : doc
                  ? t("businessVerification.fields.replace")
                  : t("businessVerification.fields.upload")}
            </Button>
            {doc && (
              <Text size="small" className="truncate" title={doc.filename}>
                {doc.filename}
              </Text>
            )}
          </div>
          {prefillMutation.isPending && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("businessVerification.fields.reading")}
            </Text>
          )}
          {prefill && (
            <Text size="xsmall" className="text-ui-fg-subtle" data-testid="business-verification-prefilled">
              {t("businessVerification.fields.prefilled")}
            </Text>
          )}
          <Text size="xsmall" className="text-ui-fg-muted">
            {t("businessVerification.privacy")}
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="document_kind"
            render={({ field: { onChange, value, ...field } }) => (
              <Form.Item>
                <Form.Label>{t("businessVerification.fields.documentKind")}</Form.Label>
                <Form.Control>
                  <Select value={value} onValueChange={onChange} {...field}>
                    <Select.Trigger data-testid="business-verification-kind">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {DOCUMENT_KINDS.map((k) => (
                        <Select.Item key={k} value={k}>
                          {t(`businessVerification.kinds.${k}`)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.Hint>{t("businessVerification.fields.documentKindHint")}</Form.Hint>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="country_of_registration"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("businessVerification.fields.country")}</Form.Label>
                <Form.Control>
                  <CountrySelect {...field} data-testid="business-verification-country" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="legal_name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("businessVerification.fields.legalName")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="business-verification-legal-name" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("businessVerification.fields.registrationNumber")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="business-verification-registration-number" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={submit.isPending} disabled={busy || !doc} data-testid="business-verification-submit">
            {t("businessVerification.actions.submit")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const BusinessVerification = () => {
  const { t } = useTranslation()
  const { data, isLoading, isError, error } = useBusinessVerification()
  const state = data?.state ?? "needed"
  const current = data?.current ?? null

  return (
    <SingleColumnPage widgets={{ before: [], after: [] }} hasOutlet={false}>
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Heading level="h2">{t("businessVerification.title")}</Heading>
            {state !== "needed" && <StateBadge state={state} />}
          </div>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            {t("businessVerification.why")}
          </Text>
        </div>

        <div className="px-6 py-5">
          {isLoading && (
            <Text size="small" className="text-ui-fg-subtle">{t("businessVerification.loading")}</Text>
          )}
          {isError && (
            <Text size="small" className="text-ui-fg-error">
              {(error as any)?.message || t("businessVerification.toasts.loadFailed")}
            </Text>
          )}

          {!isLoading && !isError && state === "needed" && (
            <div className="flex flex-col gap-y-4">
              <Alert variant="warning" data-testid="business-verification-needed">
                <span className="font-medium">{t("businessVerification.states.needed.title")}</span>
                {" — "}
                {t("businessVerification.states.needed.body")}
              </Alert>
              <SubmitForm />
            </div>
          )}

          {!isLoading && !isError && state === "under_review" && current && (
            <div className="flex flex-col gap-y-4">
              <Alert variant="info" data-testid="business-verification-under-review">
                <span className="font-medium">{t("businessVerification.states.underReview.title")}</span>
                {" — "}
                {t("businessVerification.states.underReview.body")}
              </Alert>
              <SubmittedSummary row={current} />
            </div>
          )}

          {!isLoading && !isError && state === "declined" && current && (
            <div className="flex flex-col gap-y-4">
              <SubmitForm declinedNote={current.reviewer_note} />
            </div>
          )}

          {!isLoading && !isError && state === "verified" && current && (
            <div className="flex flex-col gap-y-4">
              <Text size="small" data-testid="business-verification-verified">
                {t("businessVerification.states.verified.body", {
                  date: formatDate(current.reviewed_at || current.created_at),
                })}
              </Text>
              <SubmittedSummary row={current} />
            </div>
          )}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export const Component = BusinessVerification
