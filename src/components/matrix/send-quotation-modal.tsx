import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash } from "@medusajs/icons"
import {
  Button,
  DatePicker,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"

import { toast } from "@medusajs/ui"

import { useQuotes, useSubmitQuote } from "../../hooks/api/quotes"
import { currencies } from "../../lib/data/currencies"
import { buildQuotationContent } from "./matrix-cards"

const COMMON_CURRENCIES = ["EUR", "USD", "GBP", "INR", "CNY", "AED", "SGD"]

const QuotationSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency_code: z.string().min(3),
  moq: z.string().optional(),
  lead_time: z.string().optional(),
  payment_terms: z.string().optional(),
  valid_until: z.date().optional().nullable(),
  notes: z.string().optional(),
  enquiry_id: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1, "Required"),
        quantity: z.coerce.number().min(1),
        unit_amount: z.coerce.number().min(0),
      })
    )
    .optional(),
})

type QuotationFormValues = z.infer<typeof QuotationSchema>

export const SendQuotationModal = ({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (content: object) => Promise<void>
}) => {
  const { quotes } = useQuotes({ page: 1, size: 50 }, { enabled: open })
  const openEnquiries = quotes.filter(
    (q) => !q.status || ["open", "quoted", "sent", "draft"].includes(q.status)
  )

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationSchema),
    defaultValues: {
      amount: undefined,
      currency_code: "EUR",
      items: [],
      valid_until: null,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const sending = form.formState.isSubmitting
  const { mutateAsync: submitQuote } = useSubmitQuote()

  const submit = form.handleSubmit(async (values) => {
    // When linked to an RFQ, also record the quote against the enquiry
    // (source of truth: tese-backend). Best-effort — the chat card is sent
    // regardless so the negotiation isn't blocked.
    if (values.enquiry_id) {
      try {
        await submitQuote({
          enquiryId: values.enquiry_id,
          quotedAmount: values.amount,
          quotedCurrency: values.currency_code,
          quoteNotes: values.notes,
        })
      } catch (error) {
        toast.warning(
          "The quote could not be recorded on the RFQ — it was still sent in the chat."
        )
        console.error("RFQ quote submission failed", error)
      }
    }

    await onSend(
      buildQuotationContent({
        amount: values.amount,
        currency_code: values.currency_code.toLowerCase(),
        items: values.items?.length ? values.items : undefined,
        moq: values.moq || undefined,
        lead_time: values.lead_time || undefined,
        payment_terms: values.payment_terms || undefined,
        valid_until: values.valid_until
          ? values.valid_until.toISOString().slice(0, 10)
          : undefined,
        notes: values.notes || undefined,
        enquiry_id: values.enquiry_id || undefined,
      })
    )
    form.reset()
    onOpenChange(false)
  })

  const errors = form.formState.errors

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Send a quotation</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-1 justify-center overflow-y-auto py-8">
          <div className="flex w-full max-w-lg flex-col gap-y-6 px-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Total amount
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...form.register("amount")}
                />
                {errors.amount && (
                  <Text size="xsmall" className="text-ui-fg-error">
                    {errors.amount.message}
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Currency
                </Label>
                <Select
                  value={form.watch("currency_code")}
                  onValueChange={(v) => form.setValue("currency_code", v)}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {COMMON_CURRENCIES.filter((c) => currencies[c]).map(
                      (code) => (
                        <Select.Item key={code} value={code}>
                          {code} — {currencies[code].name}
                        </Select.Item>
                      )
                    )}
                  </Select.Content>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <Label size="small" weight="plus">
                  Line items (optional)
                </Label>
                <Button
                  variant="transparent"
                  size="small"
                  type="button"
                  onClick={() =>
                    append({ title: "", quantity: 1, unit_amount: 0 })
                  }
                >
                  <Plus /> Add line
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-x-2">
                  <Input
                    placeholder="Item"
                    className="flex-1"
                    {...form.register(`items.${index}.title`)}
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    className="w-20"
                    {...form.register(`items.${index}.quantity`)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit price"
                    className="w-28"
                    {...form.register(`items.${index}.unit_amount`)}
                  />
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => remove(index)}
                  >
                    <Trash />
                  </IconButton>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  MOQ (optional)
                </Label>
                <Input placeholder="e.g. 10 tonnes" {...form.register("moq")} />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Lead time (optional)
                </Label>
                <Input
                  placeholder="e.g. 2–3 weeks"
                  {...form.register("lead_time")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Payment terms (optional)
                </Label>
                <Input
                  placeholder="e.g. 30% advance, 70% on delivery"
                  {...form.register("payment_terms")}
                />
              </div>
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Valid until (optional)
                </Label>
                <DatePicker
                  value={form.watch("valid_until") ?? undefined}
                  onChange={(date) => form.setValue("valid_until", date)}
                  minValue={new Date()}
                />
              </div>
            </div>

            {openEnquiries.length > 0 && (
              <div className="flex flex-col gap-y-1">
                <Label size="small" weight="plus">
                  Link to RFQ (optional)
                </Label>
                <Select
                  value={form.watch("enquiry_id") || ""}
                  onValueChange={(v) => form.setValue("enquiry_id", v)}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select a quote request" />
                  </Select.Trigger>
                  <Select.Content>
                    {openEnquiries.map((q) => (
                      <Select.Item key={q.enquiryId} value={q.enquiryId}>
                        {q.title || q.enquiryId}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">
                Notes (optional)
              </Label>
              <Textarea
                rows={3}
                placeholder="Anything the buyer should know…"
                {...form.register("notes")}
              />
            </div>

            <Heading level="h3" className="sr-only">
              Quotation
            </Heading>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="small" onClick={submit} isLoading={sending}>
              Send quotation
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
