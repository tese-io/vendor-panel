import { Button, Input, Select, Text, Textarea, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { ExtendedAdminProduct } from "../../../../../types/products"
import { Form } from "../../../../../components/common/form"
import { SwitchBox } from "../../../../../components/common/switch-box"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { useExtendableForm } from "../../../../../extensions/forms/hooks"
import { useUpdateProduct } from "../../../../../hooks/api/products"

import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  FormExtensionZone,
  useDashboardExtension,
} from "../../../../../extensions"

const LISTING_TYPES = ["product", "service"] as const

type EditProductFormProps = {
  product: ExtendedAdminProduct
}

const EditProductSchema = zod.object({
  title: zod.string().min(1),
  handle: zod.string().min(1),
  description: zod.string().optional(),
  discountable: zod.boolean(),
  listing_type: zod.enum(LISTING_TYPES),
  request_quote_only: zod.boolean().optional(),
  duration_text: zod.string().optional(),
  price_range_min: zod.union([zod.number(), zod.string()]).optional(),
  price_range_max: zod.union([zod.number(), zod.string()]).optional(),
})

export const EditProductForm = ({ product }: EditProductFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { getFormFields, getFormConfigs } = useDashboardExtension()
  const fields = getFormFields("product", "edit")
  const configs = getFormConfigs("product", "edit")

  const existingMetadata = (product as { metadata?: Record<string, unknown> }).metadata as Record<string, unknown> | undefined
  const defaultListingType = (existingMetadata?.listing_type as string) === "service" ? "service" : "product"

  const form = useExtendableForm({
    defaultValues: {
      title: product.title,
      handle: product.handle || "",
      description: product.description || "",
      discountable: product.discountable,
      listing_type: defaultListingType,
      request_quote_only: !!(existingMetadata?.request_quote_only),
      duration_text: (existingMetadata?.duration_text as string) ?? (existingMetadata?.duration_minutes != null ? `${existingMetadata.duration_minutes} min` : ""),
      price_range_min: (existingMetadata?.price_range_min as number) ?? "",
      price_range_max: (existingMetadata?.price_range_max as number) ?? "",
    },
    schema: EditProductSchema,
    configs: configs,
    data: product,
  })

  const { mutateAsync, isPending } = useUpdateProduct(product.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    const { description, discountable, handle, title, listing_type, request_quote_only, duration_text, price_range_min, price_range_max } = data

    await mutateAsync(
      {
        description,
        discountable,
        handle,
        title,
        metadata: {
          ...(typeof existingMetadata === "object" && existingMetadata !== null ? existingMetadata : {}),
          listing_type,
          ...(listing_type === "service"
            ? {
                request_quote_only: !!request_quote_only,
                ...(duration_text?.trim() ? { duration_text: duration_text.trim() } : {}),
                ...(price_range_min != null && price_range_min !== "" ? { price_range_min: Number(price_range_min) } : {}),
                ...(price_range_max != null && price_range_max !== "" ? { price_range_max: Number(price_range_max) } : {}),
              }
            : { request_quote_only: undefined, duration_text: undefined, price_range_min: undefined, price_range_max: undefined }),
        },
      },
      {
        onSuccess: ({ product }) => {
          toast.success(
            t("products.edit.successToast", {
              title: product.title,
            })
          )
          handleSuccess(`/products/${product.id}`)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col gap-y-4">
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
              {form.watch("listing_type") === "service" && (
                <>
                  <SwitchBox
                    control={form.control}
                    name="request_quote_only"
                    label={t("products.requestQuoteOnly.label", "Request quote only")}
                    description={t("products.requestQuoteOnly.description", "Show “Request quote” instead of “Add to cart” on the storefront")}
                  />
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
              {/* <Form.Field
                control={form.control}
                name="status"
                render={({ field: { onChange, ref, ...field } }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.status")}</Form.Label>
                      <Form.Control>
                        <Select {...field} onValueChange={onChange}>
                          <Select.Trigger ref={ref}>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {(
                              [
                                "draft",
                                "published",
                                "proposed",
                                "rejected",
                              ] as const
                            ).map((status) => {
                              return (
                                <Select.Item key={status} value={status}>
                                  {t(`products.productStatus.${status}`)}
                                </Select.Item>
                              )
                            })}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="title"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.title")}</Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              {/* <Form.Field
                control={form.control}
                name='subtitle'
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>
                        {t('fields.subtitle')}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  );
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="handle"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.handle")}</Form.Label>
                      <Form.Control>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center border-r">
                            <Text
                              className="text-ui-fg-muted"
                              size="small"
                              leading="compact"
                              weight="plus"
                            >
                              /
                            </Text>
                          </div>
                          <Input {...field} className="pl-10" />
                        </div>
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              {/* <Form.Field
                control={form.control}
                name='material'
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>
                        {t('fields.material')}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  );
                }}
              /> */}
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label optional>
                        {t("fields.description")}
                      </Form.Label>
                      <Form.Control>
                        <Textarea {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            </div>
            <SwitchBox
              control={form.control}
              name="discountable"
              label={t("fields.discountable")}
              description={t("products.discountableHint")}
            />
            <FormExtensionZone fields={fields} form={form} />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
