import { useMemo, useState } from "react"

import { Trash } from "@medusajs/icons"
import { Alert, Button, Heading, Text, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { FilePreview } from "../../../components/common/file-preview"
import { RouteDrawer, useRouteModal } from "../../../components/modals"
import { productsQueryKeys } from "../../../hooks/api/products"
import { importProductsQuery } from "../../../lib/client/client"
import { queryClient } from "../../../lib/query-client"
import {
  INCOMPLETE_FIELD_KEYS,
  type IncompleteField,
} from "../../../lib/product-submit"
import { UploadImport } from "./components/upload-import"
import { getProductImportCsvTemplate } from "./helpers/import-template"

/**
 * B-11 — two-phase bulk upload: template download → upload → VALIDATION
 * REPORT (row + field per error, nothing created yet) → commit.
 * Committed products enter the same review state as single entries
 * (D-01), and the D-04 profile gate applies.
 */

type ImportRowError = { row: number; field: string; message: string }

type DryRunResult = {
  report: {
    valid_count: number
    error_count: number
    errors: ImportRowError[]
    truncated: boolean
  }
  profile_missing: IncompleteField[]
}

export const ProductImport = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.import.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.import.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <ProductImportContent />
    </RouteDrawer>
  )
}

const ProductImportContent = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const [file, setFile] = useState<File>()
  const [dryRun, setDryRun] = useState<DryRunResult>()
  const [validating, setValidating] = useState(false)
  const [committing, setCommitting] = useState(false)

  const productImportTemplateContent = useMemo(() => {
    return getProductImportCsvTemplate()
  }, [])

  const reset = () => {
    setFile(undefined)
    setDryRun(undefined)
  }

  // Phase 1 — upload runs the dry-run validation only.
  const handleUploaded = async (uploaded: File) => {
    setFile(uploaded)
    setValidating(true)
    try {
      const result = (await importProductsQuery(uploaded, {
        dryRun: true,
      })) as DryRunResult
      setDryRun(result)
    } catch (error) {
      toast.error((error as Error).message)
      reset()
    } finally {
      setValidating(false)
    }
  }

  // Phase 2 — explicit commit.
  const handleCommit = async () => {
    if (!file) return
    setCommitting(true)
    try {
      await importProductsQuery(file)
      // The import bypasses the react-query mutation hooks, so the
      // products list won't refetch on its own — invalidate it here or
      // the new rows only appear after a manual refresh.
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      toast.success(t("productImport.committedTitle"), {
        description: t("productImport.committedBody"),
      })
      handleSuccess()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setCommitting(false)
    }
  }

  const uploadedFileActions = [
    {
      actions: [
        {
          label: t("actions.delete"),
          icon: <Trash />,
          onClick: reset,
        },
      ],
    },
  ]

  const blocked =
    (dryRun?.report.error_count ?? 0) > 0 ||
    (dryRun?.profile_missing.length ?? 0) > 0 ||
    (dryRun?.report.valid_count ?? 0) === 0

  return (
    <>
      <RouteDrawer.Body className="overflow-y-auto">
        <Heading level="h2">{t("products.import.upload.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("products.import.upload.description")}
        </Text>

        <div className="mt-4">
          {file ? (
            <FilePreview
              filename={file.name}
              loading={validating}
              activity={t("productImport.validating")}
              actions={uploadedFileActions}
            />
          ) : (
            <UploadImport onUploaded={handleUploaded} />
          )}
        </div>

        {dryRun && (
          <div className="mt-6 flex flex-col gap-y-4" data-testid="import-report">
            <Heading level="h2">{t("productImport.reportTitle")}</Heading>
            <div className="shadow-elevation-card-rest bg-ui-bg-component flex flex-row rounded-md px-3 py-2">
              <div className="flex flex-1 flex-col justify-center">
                <Text size="xlarge" className="font-medium" data-testid="import-valid-count">
                  {dryRun.report.valid_count}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("productImport.validRows")}
                </Text>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <Text
                  size="xlarge"
                  className={
                    dryRun.report.error_count > 0
                      ? "text-ui-fg-error font-medium"
                      : "font-medium"
                  }
                  data-testid="import-error-count"
                >
                  {dryRun.report.error_count}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("productImport.errorRows")}
                </Text>
              </div>
            </div>

            {dryRun.profile_missing.length > 0 && (
              <Alert variant="error" data-testid="import-profile-blocked">
                {t("productImport.profileBlocked", {
                  fields: dryRun.profile_missing
                    .map((f) => t(INCOMPLETE_FIELD_KEYS[f]))
                    .join(", "),
                })}
              </Alert>
            )}

            {dryRun.report.errors.length > 0 && (
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border" data-testid="import-error-list">
                {dryRun.report.errors.map((error, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5">
                    <Text size="xsmall" weight="plus" className="shrink-0">
                      {t("productImport.rowLabel", { row: error.row })}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle break-all">
                      <b>{error.field}</b> — {error.message}
                    </Text>
                  </div>
                ))}
                {dryRun.report.truncated && (
                  <Text size="xsmall" className="text-ui-fg-subtle p-2.5">
                    {t("productImport.moreErrors", {
                      count:
                        dryRun.report.error_count -
                        dryRun.report.errors.length,
                    })}
                  </Text>
                )}
              </div>
            )}

            {!blocked && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("productImport.reviewNote")}
              </Text>
            )}
          </div>
        )}

        <div className="mt-6">
          <Heading level="h2">{t("products.import.template.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("products.import.template.description")}
          </Text>
          <div className="mt-4">
            <FilePreview
              filename={"product-import-template.csv"}
              url={productImportTemplateContent}
            />
          </div>
        </div>
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <div className="flex items-center gap-x-2">
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteDrawer.Close>
          <Button
            size="small"
            onClick={handleCommit}
            disabled={!dryRun || blocked}
            isLoading={committing}
            data-testid="import-commit-button"
          >
            {t("productImport.commit", {
              count: dryRun?.report.valid_count ?? 0,
            })}
          </Button>
        </div>
      </RouteDrawer.Footer>
    </>
  )
}
