import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Select, Textarea, toast } from "@medusajs/ui"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { languages } from "../../../../../i18n/languages"

import { Form } from "../../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateUser } from "../../../../../hooks/api/users"
import { TeamMemberProps } from "../../../../../types/user"
import { MediaSchema } from "../../../../products/product-create/constants"
import {
  FileType,
  FileUpload,
} from "../../../../../components/common/file-upload"
import { useCallback } from "react"
import { uploadFilesQuery } from "../../../../../lib/client"
import { HttpTypes } from "@medusajs/types"

type EditProfileProps = {
  user: TeamMemberProps
}

const EditProfileSchema = zod.object({
  name: zod.string().optional(),
  media: zod.array(MediaSchema).optional(),
  phone: zod.string().optional(),
  bio: zod.string().optional(),
  language: zod.string(),
})

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

export const EditProfileForm = ({ user }: EditProfileProps) => {
  const { t, i18n } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<zod.infer<typeof EditProfileSchema>>({
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ?? "",
      bio: user.bio ?? "",
      media: [],
      language: i18n.language,
    },
    resolver: zodResolver(EditProfileSchema),
  })

  // Q-05: the French catalog has shipped with the panel all along — this
  // selector (stripped from the upstream form at some point) is what
  // makes it reachable. Sorted by endonym, like the admin panel.
  const sortedLanguages = [...languages].sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  )

  const { fields } = useFieldArray({
    name: "media",
    control: form.control,
    keyName: "field_id",
  })

  const { mutateAsync, isPending } = useUpdateUser(user.id!)

  const handleSubmit = form.handleSubmit(async (values) => {
    let uploadedMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    try {
      if (values.media?.length) {
        const fileReqs = []
        fileReqs.push(
          uploadFilesQuery(values.media).then((r: any) =>
            r.files.map((f: any) => ({
              ...f,
              isThumbnail: false,
            }))
          )
        )

        uploadedMedia = (await Promise.all(fileReqs)).flat()
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    await mutateAsync(
      {
        name: values.name,
        photo: uploadedMedia[0]?.url || user.photo || "",
        phone: values.phone,
        bio: values.bio,
      },
      {
        onError: (error) => {
          toast.error(error.message)
          return
        },
      }
    )

    // Language preference is client-side (i18next persists it to the
    // lng cookie/localStorage) — no backend field involved.
    if (values.language && values.language !== i18n.language) {
      await i18n.changeLanguage(values.language)
    }

    toast.success(t("profile.toast.edit"))
    handleSuccess()
  })

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      )

      if (invalidFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalidFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })

        return true
      }

      return false
    },
    [form, t]
  )

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("media")
      if (hasInvalidFiles(files)) {
        return
      }

      form.setValue("media", [{ ...files[0], isThumbnail: false }])
    },
    [form, hasInvalidFiles]
  )

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body>
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="media"
              control={form.control}
              render={() => {
                return (
                  <Form.Item>
                    <div className="flex flex-col gap-y-2">
                      <div className="flex flex-col gap-y-1">
                        <Form.Label>Profile picture</Form.Label>
                      </div>
                      <Form.Control>
                        <FileUpload
                          uploadedImage={fields[0]?.url || user.photo || ""}
                          multiple={false}
                          label={t("products.media.uploadImagesLabel")}
                          hint={t("products.media.uploadImagesHint")}
                          hasError={!!form.formState.errors.media}
                          formats={SUPPORTED_FORMATS}
                          onUploaded={onUploaded}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </div>
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Name</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="phone"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="bio"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Bio</Form.Label>
                  <Form.Control>
                    <Textarea {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="language"
              render={({ field: { ref, ...field } }) => (
                <Form.Item data-testid="profile-edit-language-item">
                  <Form.Label>{t("profile.fields.languageLabel")}</Form.Label>
                  <Form.Hint>{t("profile.edit.languageHint")}</Form.Hint>
                  <Form.Control>
                    <Select
                      {...field}
                      onValueChange={field.onChange}
                      data-testid="profile-edit-language-select"
                    >
                      <Select.Trigger ref={ref}>
                        <Select.Value
                          placeholder={t("profile.edit.languagePlaceholder")}
                        >
                          {
                            sortedLanguages.find(
                              (language) => language.code === field.value
                            )?.display_name
                          }
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {sortedLanguages.map((language) => (
                          <Select.Item
                            key={language.code}
                            value={language.code}
                            data-testid={`profile-edit-language-option-${language.code}`}
                          >
                            {language.display_name}
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
          <div className="flex items-center gap-x-2">
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
