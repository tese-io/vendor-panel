import { useEffect, useMemo, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowUpRightOnBox, CloudArrowUp, Plus } from "@medusajs/icons"
import {
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  ProgressTabs,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import * as z from "zod"

import { ActivitiesPicker } from "../../components/activities-picker/activities-picker"
import { Form } from "../../components/common/form"
import { MapPinPicker } from "../../components/common/map-pin-picker/map-pin-picker"
import { CountrySelect } from "../../components/inputs/country-select"
import { useOnboarding, useUpdateOnboarding } from "../../hooks/api"
import { useCreateStockLocation } from "../../hooks/api/stock-locations"
import { useMe, useUpdateMe } from "../../hooks/api/users"
import { useSellerCoverage } from "../../hooks/api/vendor-coverage"
import { COMPANY_TYPES } from "../register/register-schema"
import {
  WIZARD_STEPS,
  deriveWizardState,
  wizardDismissalKey,
  type WizardStepKey,
} from "./helpers/wizard-steps"

/**
 * B-02 — the first-run wizard. Fixed order per the directive:
 * company profile → warehouse location → service activities → payout →
 * first product. Full-screen, resumable (opens at the first incomplete
 * step), skippable ("skip for now" records a per-seller dismissal so it
 * never ambushes anyone twice).
 */

const CompanySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().optional(),
  company_type: z.string().optional(),
  country_code: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  // Registered company address — required here because the backend's
  // store_information flag needs all three, and this step is the only
  // funnel surface that collects them (signup stays lean).
  address_line: z.string().min(1),
  city: z.string().min(1),
  postal_code: z.string().min(1),
})

const WarehouseSchema = z.object({
  name: z.string().min(1),
  address_1: z.string().min(1),
  city: z.string().optional(),
  country_code: z.string().min(2).max(2),
  geo: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    location_precision: z.enum(["map_pinned", "geocoded", "country_centroid"]),
  }),
})

function dismissWizard(sellerId: string | undefined) {
  if (!sellerId) return
  try {
    localStorage.setItem(wizardDismissalKey(sellerId), "1")
  } catch {
    // ignore
  }
}

const CompanyStep = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation()
  const { seller } = useMe()
  const { mutateAsync, isPending } = useUpdateMe()

  const form = useForm<z.infer<typeof CompanySchema>>({
    resolver: zodResolver(CompanySchema),
    values: {
      name: seller?.name || "",
      description: seller?.description || "",
      website: (seller as { website?: string } | undefined)?.website || "",
      company_type:
        (seller as { company_type?: string } | undefined)?.company_type || "",
      country_code: seller?.country_code || "",
      email: seller?.email || "",
      phone: seller?.phone || "",
      address_line: seller?.address_line || "",
      city: seller?.city || "",
      postal_code: seller?.postal_code || "",
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        ...values,
        email: values.email || undefined,
      } as never)
      toast.success(t("onboardingWizard.saved"))
      onDone()
    } catch (error) {
      toast.error((error as Error).message)
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboardingWizard.company.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-name" />
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
                <Form.Label optional>
                  {t("onboardingWizard.company.website")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-website" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="company_type"
            render={({ field: { onChange, value, ...field } }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("onboardingWizard.company.type")}
                </Form.Label>
                <Form.Control>
                  <Select
                    value={value || undefined}
                    onValueChange={onChange}
                    {...field}
                  >
                    <Select.Trigger data-testid="wizard-company-type">
                      <Select.Value />
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
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="country_code"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("onboardingWizard.company.country")}
                </Form.Label>
                <Form.Control>
                  <CountrySelect {...field} data-testid="wizard-company-country" />
                </Form.Control>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="email"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboardingWizard.company.email")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-email" />
                </Form.Control>
                <Form.Hint>{t("onboardingWizard.company.emailHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="phone"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("onboardingWizard.company.phone")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-phone" />
                </Form.Control>
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="address_line"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>
                  {t("onboardingWizard.company.address")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-address" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="city"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboardingWizard.company.city")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-city" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>
                  {t("onboardingWizard.company.postalCode")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-company-postal" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>
        <Form.Field
          control={form.control}
          name="description"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>
                {t("onboardingWizard.company.description")}
              </Form.Label>
              <Form.Control>
                <Textarea rows={3} {...field} data-testid="wizard-company-description" />
              </Form.Control>
            </Form.Item>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending} data-testid="wizard-company-save">
            {t("onboardingWizard.saveContinue")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

const WarehouseStep = ({
  onDone,
  alreadyComplete,
}: {
  onDone: () => void
  alreadyComplete: boolean
}) => {
  const { t } = useTranslation()
  const { seller } = useMe()
  const { mutateAsync, isPending } = useCreateStockLocation()
  const [sameAsCompany, setSameAsCompany] = useState(false)

  const form = useForm<z.infer<typeof WarehouseSchema>>({
    resolver: zodResolver(WarehouseSchema),
    defaultValues: {
      name: "",
      address_1: "",
      city: "",
      country_code: "",
      geo: undefined,
    },
  })

  // Convenience only: copies the registered address typed on the company
  // step into the fields (still editable). The map pin stays required —
  // an address is never turned into coordinates behind the user's back.
  const applyCompanyAddress = (checked: boolean) => {
    setSameAsCompany(checked)
    if (!checked) return
    if (seller?.address_line) {
      form.setValue("address_1", seller.address_line, { shouldValidate: true })
    }
    if (seller?.city) {
      form.setValue("city", seller.city, { shouldValidate: true })
    }
    if (seller?.country_code) {
      form.setValue("country_code", seller.country_code, {
        shouldValidate: true,
      })
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        name: values.name,
        address: {
          address_1: values.address_1,
          city: values.city,
          country_code: values.country_code,
        },
        geo: values.geo,
      } as never)
      toast.success(t("onboardingWizard.saved"))
      onDone()
    } catch (error) {
      toast.error((error as Error).message)
    }
  })

  if (alreadyComplete) {
    return (
      <div className="flex flex-col gap-y-3">
        <Text size="small" className="text-ui-fg-subtle">
          {t("onboardingWizard.warehouse.alreadyDone")}
        </Text>
        <div className="flex justify-end">
          <Button onClick={onDone} data-testid="wizard-warehouse-continue">
            {t("onboardingWizard.continue")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
        <Text size="small" className="text-ui-fg-subtle">
          {t("onboardingWizard.warehouse.why")}
        </Text>
        {Boolean(seller?.address_line) && (
          <div className="flex items-center gap-x-2">
            <Checkbox
              id="wizard-warehouse-same-address"
              checked={sameAsCompany}
              onCheckedChange={(checked) =>
                applyCompanyAddress(checked === true)
              }
              data-testid="wizard-warehouse-same-address"
            />
            <Label htmlFor="wizard-warehouse-same-address" size="small">
              {t("onboardingWizard.warehouse.sameAsCompany")}
            </Label>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboardingWizard.warehouse.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-warehouse-name" />
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
                <Form.Label>{t("onboardingWizard.warehouse.country")}</Form.Label>
                <Form.Control>
                  <CountrySelect {...field} data-testid="wizard-warehouse-country" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="address_1"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("onboardingWizard.warehouse.address")}</Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-warehouse-address" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="city"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>
                  {t("onboardingWizard.warehouse.city")}
                </Form.Label>
                <Form.Control>
                  <Input {...field} data-testid="wizard-warehouse-city" />
                </Form.Control>
              </Form.Item>
            )}
          />
        </div>
        <Form.Field
          control={form.control}
          name="geo"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("onboardingWizard.warehouse.pin")}</Form.Label>
              <Form.Control>
                <MapPinPicker
                  value={field.value}
                  onChange={(v: unknown) => field.onChange(v)}
                  helpText={t("onboardingWizard.warehouse.pinHelp")}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" isLoading={isPending} data-testid="wizard-warehouse-save">
            {t("onboardingWizard.saveContinue")}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const Onboarding = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { seller } = useMe()
  const { onboarding } = useOnboarding()
  const { data: coverage } = useSellerCoverage()
  const { mutateAsync: recalculate } = useUpdateOnboarding()

  const flags = onboarding
    ? {
        store_information: Boolean(onboarding.store_information),
        stripe_connection: Boolean(
          onboarding.stripe_connection ?? onboarding.stripe_connect
        ),
        locations_shipping: Boolean(onboarding.locations_shipping),
        products: Boolean(onboarding.products),
      }
    : null

  const activityCount = coverage
    ? (coverage.rows || []).filter((r) => r.is_active !== false).length
    : null

  const state = useMemo(
    () => deriveWizardState({ flags, activityCount }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(flags), activityCount]
  )

  const [tab, setTab] = useState<WizardStepKey | null>(null)
  useEffect(() => {
    // Resume at the first incomplete step once data is in — but never
    // yank the tab away from a user who already navigated.
    if (tab === null && flags !== null) {
      setTab(state.firstIncomplete)
    }
  }, [tab, flags, state.firstIncomplete])

  const activeTab = tab ?? "company"

  const goNext = async () => {
    // Refresh the backend flags so step completion sticks, then advance.
    recalculate().catch(() => undefined)
    const idx = WIZARD_STEPS.indexOf(activeTab)
    if (idx < WIZARD_STEPS.length - 1) {
      setTab(WIZARD_STEPS[idx + 1])
    } else {
      dismissWizard(seller?.id)
      navigate("/dashboard", { replace: true })
    }
  }

  const skipAll = () => {
    dismissWizard(seller?.id)
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="bg-ui-bg-subtle flex min-h-screen justify-center">
      <div className="flex w-full max-w-3xl flex-col gap-y-6 px-4 py-10">
        <div className="flex items-start justify-between">
          <div>
            <Heading data-testid="wizard-title">
              {t("onboardingWizard.title")}
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("onboardingWizard.subtitle")}
            </Text>
          </div>
          <Button
            variant="transparent"
            size="small"
            onClick={skipAll}
            data-testid="wizard-skip"
          >
            {t("onboardingWizard.skip")}
          </Button>
        </div>

        <ProgressTabs
          value={activeTab}
          onValueChange={(v) => setTab(v as WizardStepKey)}
          className="flex w-full flex-col"
        >
          <ProgressTabs.List className="grid w-full grid-cols-5">
            {state.steps.map((step) => (
              <ProgressTabs.Trigger
                key={step.key}
                value={step.key}
                status={step.complete ? "completed" : "not-started"}
                data-testid={`wizard-tab-${step.key}`}
              >
                {t(`onboardingWizard.steps.${step.key}`)}
              </ProgressTabs.Trigger>
            ))}
          </ProgressTabs.List>

          <div className="bg-ui-bg-base mt-4 rounded-lg border p-6">
            <ProgressTabs.Content value="company">
              <CompanyStep onDone={goNext} />
            </ProgressTabs.Content>

            <ProgressTabs.Content value="warehouse">
              <WarehouseStep
                onDone={goNext}
                alreadyComplete={Boolean(flags?.locations_shipping)}
              />
            </ProgressTabs.Content>

            <ProgressTabs.Content value="activities">
              <div className="flex flex-col gap-y-4">
                <ActivitiesPicker compact />
                <div className="flex justify-end">
                  <Button
                    onClick={goNext}
                    disabled={(activityCount ?? 0) < 1}
                    data-testid="wizard-activities-continue"
                  >
                    {t("onboardingWizard.continue")}
                  </Button>
                </div>
              </div>
            </ProgressTabs.Content>

            <ProgressTabs.Content value="payout">
              <div className="flex flex-col gap-y-4">
                <Text size="small" className="text-ui-fg-subtle">
                  {t("onboardingWizard.payout.why")}
                </Text>
                <div className="flex items-center justify-between">
                  <Button variant="secondary" asChild data-testid="wizard-payout-link">
                    <Link to="/stripe-connect" target="_blank">
                      <ArrowUpRightOnBox />
                      {t("onboardingWizard.payout.connect")}
                    </Link>
                  </Button>
                  <Button onClick={goNext} data-testid="wizard-payout-continue">
                    {t("onboardingWizard.payout.later")}
                  </Button>
                </div>
              </div>
            </ProgressTabs.Content>

            <ProgressTabs.Content value="product">
              <div className="flex flex-col gap-y-4">
                <Text size="small" className="text-ui-fg-subtle">
                  {t("onboardingWizard.product.why")}
                </Text>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Link
                    to="/products/create"
                    className="hover:bg-ui-bg-base-hover flex flex-col gap-2 rounded-lg border p-4"
                    data-testid="wizard-product-create"
                  >
                    <Plus />
                    <Text weight="plus">
                      {t("onboardingWizard.product.createTitle")}
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("onboardingWizard.product.createBody")}
                    </Text>
                  </Link>
                  <Link
                    to="/products/import"
                    className="hover:bg-ui-bg-base-hover flex flex-col gap-2 rounded-lg border p-4"
                    data-testid="wizard-product-import"
                  >
                    <CloudArrowUp />
                    <Text weight="plus">
                      {t("onboardingWizard.product.importTitle")}
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("onboardingWizard.product.importBody")}
                    </Text>
                  </Link>
                </div>
                <div className="flex justify-end">
                  <Button onClick={goNext} data-testid="wizard-finish">
                    {t("onboardingWizard.finish")}
                  </Button>
                </div>
              </div>
            </ProgressTabs.Content>
          </div>
        </ProgressTabs>
      </div>
    </div>
  )
}
