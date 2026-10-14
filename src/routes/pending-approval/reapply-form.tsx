import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Button, Input, Select, Text } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as z from "zod"

import { Form } from "../../components/common/form"
import { CountrySelect } from "../../components/inputs/country-select"
import {
  useReapplyForSeller,
  type SellerReapply,
} from "../../hooks/api/seller-application"
import { COMPANY_TYPES } from "../register/register-schema"

/**
 * Re-apply after a decline, from the screen that delivered the decline.
 *
 * `POST /vendor/sellers` has always accepted a second application once the
 * first was rejected — the guard there blocks only live or accepted
 * requests, and the comment beside it says a rejection "does not dead-end
 * the applicant". It did in practice: the status page showed the reviewer's
 * reason and then offered Contact support and Log out, with no way to act
 * on what they had just been told.
 *
 * Only the company details are editable. The account already exists and the
 * applicant is signed in, so there is no email or password here — this is
 * the second half of signup, not a second signup.
 */

const websiteSchema = z
  .string()
  .url({ message: "Enter a full URL, e.g. https://yourcompany.com" })
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value)
        return protocol === "http:" || protocol === "https:"
      } catch {
        return false
      }
    },
    { message: "Website must be an http(s) URL" }
  )

const ReapplySchema = z.object({
  name: z.string().trim().min(2, { message: "Name should be a string" }),
  website: websiteSchema.optional().or(z.literal("")),
  company_type: z.enum(COMPANY_TYPES).optional().or(z.literal("")),
  country_code: z.string().optional(),
})

type ReapplyValues = z.infer<typeof ReapplySchema>

export const ReapplyForm = ({ reapply }: { reapply: SellerReapply }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<ReapplyValues>({
    defaultValues: {
      name: reapply.name,
      website: reapply.website ?? "",
      company_type: (reapply.company_type ?? "") as ReapplyValues["company_type"],
      country_code: reapply.country_code ?? "",
    },
    resolver: zodResolver(ReapplySchema),
  })

  const { mutateAsync, isPending } = useReapplyForSeller()

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await mutateAsync({
        name: values.name.trim(),
        website: values.website || undefined,
        company_type: values.company_type || undefined,
        country_code: values.country_code || undefined,
        // The account's own identity — not editable here.
        member: reapply.member,
      })
      // On success the application query is invalidated by the hook, so
      // this screen re-renders as "Application received" on its own.
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : t("pendingApproval.reapplyFailed")
      )
    }
  })

  if (!open) {
    return (
      <Button
        className="tese-btn-primary w-full"
        onClick={() => setOpen(true)}
        data-testid="pending-approval-reapply-open"
      >
        {t("pendingApproval.reapply")}
      </Button>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-y-4 text-left"
        data-testid="pending-approval-reapply-form"
      >
        <Text size="small" className="text-ui-fg-subtle">
          {t("pendingApproval.reapplyHint")}
        </Text>

        <Form.Field
          control={form.control}
          name="name"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("register.companyName")}</Form.Label>
              <Form.Control>
                <Input {...field} data-testid="reapply-name" />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <Form.Field
          control={form.control}
          name="website"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("register.website")}</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  placeholder={t("register.websitePlaceholder")}
                  data-testid="reapply-website"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <Form.Field
          control={form.control}
          name="company_type"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("register.companyType")}</Form.Label>
              <Form.Control>
                <Select value={field.value} onValueChange={field.onChange}>
                  <Select.Trigger data-testid="reapply-company-type">
                    <Select.Value placeholder={t("register.selectType")} />
                  </Select.Trigger>
                  <Select.Content>
                    {COMPANY_TYPES.map((type) => (
                      <Select.Item key={type} value={type}>
                        {t(`register.companyTypes.${type}`)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <Form.Field
          control={form.control}
          name="country_code"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("register.country")}</Form.Label>
              <Form.Control>
                <CountrySelect
                  {...field}
                  className="bg-ui-bg-field-component"
                  placeholder={t("register.selectCountry")}
                  data-testid="reapply-country"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        {submitError && (
          <Alert variant="error" data-testid="reapply-error">
            <Text size="small">{submitError}</Text>
          </Alert>
        )}

        <div className="flex flex-col gap-y-2">
          <Button
            type="submit"
            isLoading={isPending}
            className="tese-btn-primary w-full"
            data-testid="reapply-submit"
          >
            {t("pendingApproval.reapplySubmit")}
          </Button>
          <Button
            type="button"
            variant="transparent"
            className="w-full"
            onClick={() => setOpen(false)}
            data-testid="reapply-cancel"
          >
            {t("pendingApproval.reapplyCancel")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ReapplyForm
