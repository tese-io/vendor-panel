import { useForm } from "react-hook-form"
import { RouteDrawer, useRouteModal } from "../../../../components/modals"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { StoreVendor } from "../../../../types/user"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { Form } from "../../../../components/common/form"
import { Button, Input, Select, toast } from "@medusajs/ui"
import { useUpdateMe } from "../../../../hooks/api"

export const COMPANY_TYPE_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "service_provider", label: "Service provider" },
  { value: "startup", label: "Startup" },
  { value: "other", label: "Other" },
]

const EditStoreSchema = z.object({
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
  tax_id: z.string().optional(),
  website: z
    .string()
    .url("Enter a full URL, e.g. https://example.com")
    .optional()
    .or(z.literal("")),
  company_type: z.string().optional(),
})

export const EditStoreCompanyForm = ({ seller }: { seller: StoreVendor }) => {
  const { handleSuccess } = useRouteModal()

  const form = useForm<z.infer<typeof EditStoreSchema>>({
    defaultValues: {
      address_line: seller.address_line || "",
      postal_code: seller.postal_code || "",
      city: seller.city || "",
      country_code: seller.country_code || "",
      tax_id: seller.tax_id || "",
      website: seller.website || "",
      company_type: seller.company_type || "",
    },
    resolver: zodResolver(EditStoreSchema),
  })

  const { mutateAsync, isPending } = useUpdateMe()

  const handleSubmit = form.handleSubmit(async (values) => {
    const { company_type, ...rest } = values
    await mutateAsync(
      {
        ...rest,
        // the API only accepts known company types — omit when unset
        ...(company_type ? { company_type } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Store updated")
          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="address_line"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Address</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="postal_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Postal Code</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="city"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>City</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="country_code"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Country</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="tax_id"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Tax ID</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="website"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Website</Form.Label>
                  <Form.Control>
                    <Input placeholder="https://your-company.com" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="company_type"
              control={form.control}
              render={({ field: { onChange, ref, ...field } }) => (
                <Form.Item>
                  <Form.Label>Company type</Form.Label>
                  <Form.Control>
                    <Select {...field} onValueChange={onChange}>
                      <Select.Trigger ref={ref}>
                        <Select.Value placeholder="Select a company type" />
                      </Select.Trigger>
                      <Select.Content>
                        {COMPANY_TYPE_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </RouteDrawer.Close>
          <Button type="submit" size="small" isLoading={isPending}>
            Save
          </Button>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
