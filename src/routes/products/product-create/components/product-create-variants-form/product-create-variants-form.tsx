import { useMemo, useState } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { HttpTypes } from "@medusajs/types"
import { Label, Text } from "@medusajs/ui"

import {
  createDataGridHelper,
  createDataGridPriceColumns,
  DataGrid,
} from "../../../../../components/data-grid"
import { Combobox } from "../../../../../components/inputs/combobox"
import {
  initialCurrencies,
  removedCurrencies,
  toCurrencyList,
} from "./currency-selection"
import { useRouteModal } from "../../../../../components/modals"
import {
  DEFAULT_OPTION_TITLE,
  ProductCreateOptionSchema,
  ProductCreateVariantSchema,
} from "../../constants"
import { ProductCreateSchemaType } from "../../types"

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  regions?: HttpTypes.AdminRegion[]
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
}

type VariantWithIndex = ProductCreateVariantSchema & {
  originalIndex: number
}

/**
 * Which currencies get a price column.
 *
 * The grid used to render one column per entry in `store.supported_currencies`.
 * The marketplace store has essentially the full ISO list enabled, so a vendor
 * pricing a single product met ~100 columns and had to scroll sideways past
 * Syrian pounds and Tongan paʻanga to reach USD. Observed on 2026-10-08.
 *
 * Now the vendor picks the currencies they actually sell in, starting from the
 * store's default. Everything else stays one click away rather than on screen.
 */
function useCurrencySelection(store?: HttpTypes.AdminStore) {
  const supported = useMemo(
    () => store?.supported_currencies?.map((c) => c.currency_code) || [],
    [store]
  )

  const [selected, setSelected] = useState<string[] | null>(null)

  // Resolved lazily: the store loads after first render, so seeding state
  // directly would lock in an empty list.
  const currencies = useMemo(
    () => selected ?? initialCurrencies(store),
    [selected, store]
  )

  return { supported, currencies, setSelected }
}

export const ProductCreateVariantsForm = ({
  form,
  regions,
  store,
  pricePreferences,
}: ProductCreateVariantsFormProps) => {
  const { t } = useTranslation()
  const { setCloseOnEscape } = useRouteModal()

  const { supported, currencies, setSelected } = useCurrencySelection(store)

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  const options = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  /**
   * NOTE: anything that goes to the datagrid component needs to be memoised otherwise DataGrid will rerender and inputs will loose focus
   */
  const columns = useColumns({
    options,
    currencies,
    regions,
    pricePreferences,
  })

  const currencyOptions = useMemo(
    () =>
      supported.map((code) => ({
        label: code.toUpperCase(),
        value: code,
      })),
    [supported]
  )

  // Dropping a currency must drop its prices too. Leaving them in form state
  // would submit a price the vendor can no longer see or correct.
  const handleCurrencyChange = (next?: string[] | string) => {
    const codes = toCurrencyList(next)
    const removed = removedCurrencies(currencies, codes)

    if (removed.length) {
      const all = form.getValues("variants") || []
      all.forEach((_, index) => {
        removed.forEach((code) => {
          form.setValue(`variants.${index}.prices.${code}`, "")
        })
      })
    }

    setSelected(codes)
  }

  const variantData = useMemo(() => {
    const ret: VariantWithIndex[] = []

    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })

    return ret
  }, [variants])

  return (
    <div className="flex size-full flex-col divide-y overflow-hidden">
      <div className="flex flex-col gap-y-2 px-6 py-4">
        <div className="flex items-center justify-between gap-x-4">
          <div>
            <Label size="small" weight="plus">
              {t("variantPricing.currencies")}
            </Label>
            <Text size="small" className="text-ui-fg-subtle">
              {t("variantPricing.currenciesHint")}
            </Text>
          </div>
        </div>
        <Combobox
          value={currencies}
          onChange={handleCurrencyChange}
          options={currencyOptions}
          placeholder={t("variantPricing.addCurrency")}
          data-testid="variant-currency-picker"
        />
      </div>
      <DataGrid
        columns={columns}
        data={variantData}
        state={form}
        onEditingChange={(editing) => setCloseOnEscape(!editing)}
      />
    </div>
  )
}

const columnHelper = createDataGridHelper<
  VariantWithIndex,
  ProductCreateSchemaType
>()

const useColumns = ({
  options,
  currencies = [],
  regions = [],
  pricePreferences = [],
}: {
  options: ProductCreateOptionSchema[]
  currencies?: string[]
  regions?: HttpTypes.AdminRegion[]
  pricePreferences?: HttpTypes.AdminPricePreference[]
}) => {
  const { t } = useTranslation()

  // When the vendor defined no options, Medusa invents one so the product
  // still has a variant. Showing it put a "Default option / Default option
  // value" column in front of every single-variant product — internals
  // presented as data.
  const hasRealOptions = options.some((o) => o.title !== DEFAULT_OPTION_TITLE)

  return useMemo(
    () => [
      ...(!hasRealOptions
        ? []
        : [
      columnHelper.column({
        id: "options",
        header: () => (
          <div className="flex size-full items-center overflow-hidden">
            <span className="truncate">
              {options.map((o) => o.title).join(" / ")}
            </span>
          </div>
        ),
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {options
                .map((o) => context.row.original.options[o.title])
                .join(" / ")}
            </DataGrid.ReadonlyCell>
          )
        },
        disableHiding: true,
      }),
          ]),
      columnHelper.column({
        id: "title",
        name: t("fields.title"),
        header: t("fields.title"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.title`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),
      columnHelper.column({
        id: "sku",
        name: t("fields.sku"),
        header: t("fields.sku"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.sku`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),

      ...createDataGridPriceColumns<VariantWithIndex, ProductCreateSchemaType>({
        currencies,
        pricePreferences,
        getFieldName: (context, value) => {
          if (context.column.id?.startsWith("currency_prices")) {
            return `variants.${context.row.original.originalIndex}.prices.${value}`
          }
          return `variants.${context.row.original.originalIndex}.prices.${value}`
        },
        t,
      }),
    ],
    [currencies, regions, options, pricePreferences, hasRealOptions, t]
  )
}
