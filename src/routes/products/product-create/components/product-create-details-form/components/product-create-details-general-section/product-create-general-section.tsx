import { Input, Select, Textarea } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../../../components/common/form"
import { HandleInput } from "../../../../../../../components/inputs/handle-input"
import { SwitchBox } from "../../../../../../../components/common/switch-box"
import { ProductCreateSchemaType } from "../../../../types"

type ProductCreateGeneralSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateGeneralSection = ({
  form,
}: ProductCreateGeneralSectionProps) => {
  const { t } = useTranslation()
  const listingType = form.watch("listing_type")

  return (
    <div id="general" className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Form.Field
            control={form.control}
            name="listing_type"
            render={({ field: { onChange, ref, value, ...field } }) => (
              <Form.Item>
                <Form.Label>{t("products.listingType.label")}</Form.Label>
                <Form.Control>
                  <Select value={value} onValueChange={onChange}>
                    <Select.Trigger ref={ref}>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="product">{t("products.listingType.product")}</Select.Item>
                      <Select.Item value="service">{t("products.listingType.service")}</Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          {listingType === "service" && (
            <>
              <div className="col-span-full">
                <SwitchBox
                  control={form.control}
                  name="request_quote_only"
                  label={t("products.requestQuoteOnly.label", "Request quote only")}
                  description={t("products.requestQuoteOnly.description", "Show “Request quote” instead of “Add to cart” on the storefront")}
                />
              </div>
              <Form.Field
                control={form.control}
                name="duration_text"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("products.duration.label", "Duration")}</Form.Label>
                    <Form.Control>
                      <Input {...field} placeholder={t("products.duration.placeholder", "e.g. 1 hour, 30 min")} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="price_range_min"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("products.priceRangeMin.label", "Price from (optional)")}</Form.Label>
                    <Form.Control>
                      <Input {...field} type="number" min={0} step="0.01" placeholder="0" />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="price_range_max"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("products.priceRangeMax.label", "Price to (optional)")}</Form.Label>
                    <Form.Control>
                      <Input {...field} type="number" min={0} step="0.01" placeholder="0" />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </>
          )}
          <Form.Field
            control={form.control}
            name="title"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("products.fields.title.label")}</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder={t("products.fields.title.placeholder", "e.g. Consulting session, Product name")} />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="subtitle"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label optional>
                    {t("products.fields.subtitle.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder={t("products.fields.subtitle.placeholder", "Short tagline (optional)")} />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="handle"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label
                    tooltip={t("products.fields.handle.tooltip")}
                    optional
                  >
                    {t("fields.handle")}
                  </Form.Label>
                  <Form.Control>
                    <HandleInput {...field} placeholder={t("products.fields.handle.placeholder", "e.g. consulting-session")} />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
        </div>
      </div>
      <Form.Field
        control={form.control}
        name="description"
        render={({ field }) => {
          return (
            <Form.Item>
              <Form.Label optional>
                {t("products.fields.description.label")}
              </Form.Label>
              <Form.Control>
                <Textarea {...field} placeholder={t("products.fields.description.placeholder", "Describe your product or service")} />
              </Form.Control>
            </Form.Item>
          )
        }}
      />
    </div>
  )
}
