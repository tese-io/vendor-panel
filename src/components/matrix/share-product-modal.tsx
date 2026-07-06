import { Button, Checkbox, FocusModal } from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import {
  OnChangeFn,
  RowSelectionState,
  createColumnHelper,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { _DataTable } from "../../components/table/data-table"
import { useProducts } from "../../hooks/api/products"
import { useProductTableColumns } from "../../hooks/table/columns/use-product-table-columns"
import { useProductTableQuery } from "../../hooks/table/query/use-product-table-query"
import { useDataTable } from "../../hooks/use-data-table"
import { fetchQuery } from "../../lib/client"
import { getLocaleAmount } from "../../lib/money-amount-helpers"
import { ExtendedAdminProduct } from "../../types/products"
import { buildProductCardContent } from "./matrix-cards"

const PAGE_SIZE = 20
const PREFIX = "spm"

/**
 * Cheapest price across a product's variants, preferring EUR. Returns null
 * when the product has no loaded prices.
 */
const pickPrice = (
  product: ExtendedAdminProduct
): { amount: number; currency_code: string; formatted: string } | null => {
  const prices = (product.variants || []).flatMap((v: any) => v.prices || [])
  if (!prices.length) return null

  const currency = prices.some((p: any) => p.currency_code === "eur")
    ? "eur"
    : prices[0].currency_code
  const inCurrency = prices.filter((p: any) => p.currency_code === currency)
  const amount = Math.min(...inCurrency.map((p: any) => p.amount))

  return {
    amount,
    currency_code: currency,
    formatted: getLocaleAmount(amount, currency),
  }
}

export const ShareProductModal = ({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (content: object) => Promise<void>
}) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sending, setSending] = useState(false)

  const { searchParams, raw } = useProductTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })
  const { products, count, isLoading } = useProducts(
    { ...searchParams, fields: "+thumbnail,*variants.prices" },
    { placeholderData: keepPreviousData, enabled: open }
  )

  // Single-select: only the newest toggled row survives.
  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const state = typeof fn === "function" ? fn(rowSelection) : fn
    const newest = Object.keys(state).find((id) => !(id in rowSelection))
    setRowSelection(newest ? { [newest]: true } : {})
  }

  const columns = useColumns()

  const { table } = useDataTable({
    data: (products || []) as ExtendedAdminProduct[],
    columns,
    count,
    enablePagination: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    rowSelection: { state: rowSelection, updater },
    pageSize: PAGE_SIZE,
  })

  const selectedId = Object.keys(rowSelection)[0]

  const handleSend = async () => {
    if (!selectedId || sending) return
    setSending(true)
    try {
      let product = (products || []).find((p: any) => p.id === selectedId) as
        | ExtendedAdminProduct
        | undefined

      // Fallback when the list query didn't hydrate variant prices.
      if (product && !pickPrice(product)) {
        const detail = await fetchQuery(`/vendor/products/${selectedId}`, {
          method: "GET",
          query: { fields: "+thumbnail,*variants.prices" },
        }).catch(() => null)
        if (detail?.product) product = detail.product
      }

      if (!product) return

      const price = pickPrice(product)
      const singleVariant =
        product.variants?.length === 1 ? product.variants[0] : undefined

      await onSend(
        buildProductCardContent({
          id: product.id,
          title: product.title,
          handle: product.handle,
          thumbnail: product.thumbnail || undefined,
          price: price || undefined,
          variant_id: singleVariant?.id,
        })
      )

      setRowSelection({})
      onOpenChange(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Share a product</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-1 flex-col overflow-hidden">
          <_DataTable
            table={table}
            columns={columns}
            pageSize={PAGE_SIZE}
            prefix={PREFIX}
            count={count}
            isLoading={isLoading}
            layout="fill"
            pagination
            search
            queryObject={raw}
            noRecords={{ message: "No products found" }}
          />
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              onClick={handleSend}
              disabled={!selectedId}
              isLoading={sending}
            >
              Share product
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

const columnHelper = createColumnHelper<ExtendedAdminProduct>()

const useColumns = () => {
  const base = useProductTableColumns()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      ...base,
    ],
    [base]
  )
}
