import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { StoreVendor } from "../../../../../types/user"
import { ActionMenu } from "../../../../../components/common/action-menu"
import { Pencil } from "@medusajs/icons"
import { ImageAvatar } from "../../../../../components/common/image-avatar"
import { TeseVerifiedBadge } from "../../../../../components/common/tese-verified-badge/tese-verified-badge"

export const StoreGeneralSection = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading>{t("store.domain")}</Heading>
          <TeseVerifiedBadge verified={Boolean(seller.is_verified)} />
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: "Edit",
                  to: "edit",
                },
              ],
            },
          ]}
        />
      </div>
      {!seller.is_verified && (
        <div className="px-6 py-3" data-testid="verified-badge-how-to-earn">
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("verifiedBadge.howToEarn")}
          </Text>
        </div>
      )}
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4 items-center">
        <Text size="small" leading="compact" weight="plus">
          Image
        </Text>
        <ImageAvatar src={seller.photo || "/logo.svg"} size={8} rounded />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.name")}
        </Text>
        <Text size="small" leading="compact">
          {seller.name}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.email")}
        </Text>
        <Text size="small" leading="compact">
          {seller.email}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.phone")}
        </Text>
        <Text size="small" leading="compact">
          {seller.phone}
        </Text>
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Description
        </Text>
        <Text size="small" leading="compact">
          {seller.description || "-"}
        </Text>
      </div>
    </Container>
  )
}
