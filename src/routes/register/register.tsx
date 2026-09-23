import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Heading, Hint, Input, Select, Text } from '@medusajs/ui';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import * as z from 'zod';

import { Form } from '../../components/common/form';
import AvatarBox from '../../components/common/logo-box/avatar-box';
import { CountrySelect } from '../../components/inputs/country-select';
import { useSignUpWithEmailPass } from '../../hooks/api';
import { PasswordValidator } from './password-hints.tsx';
import { COMPANY_TYPES, RegisterSchema } from './register-schema.ts';

export const Register = () => {
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      website: '',
      company_type: '',
      country_code: '',
      password: '',
      confirmPassword: ''
    }
  });

  const [passwordError, setPasswordError] = useState({
    isValid: false,
    lower: false,
    upper: false,
    '12chars': false,
    digit: false,
    specialChar: false
  });

  const { mutateAsync, isPending } = useSignUpWithEmailPass();

  const handleSubmit = form.handleSubmit(async ({ name, email, website, company_type, country_code, password, confirmPassword }) => {
    if (!passwordError.isValid) {
      return;
    }
    if (password !== confirmPassword) {
      form.setError('password', {
        type: 'manual',
        message: t('register.passwordsDontMatch')
      });
      form.setError('confirmPassword', {
        type: 'manual',
        message: t('register.passwordsDontMatch')
      });

      return null;
    }

    await mutateAsync(
      {
        name,
        email,
        website: website || undefined,
        company_type: company_type || undefined,
        country_code: country_code || undefined,
        password,
        confirmPassword
      },
      {
        onError: error => {
          const status = 'status' in error ? error.status : undefined;

          if (status === 401) {
            form.setError('email', {
              type: 'manual',
              message: error.message
            });

            return;
          }

          if (status === 409) {
            form.setError('email', {
              type: 'manual',
              message: t('register.emailTaken')
            });

            return;
          }

          form.setError('root.serverError', {
            type: 'manual',
            message: error.message
          });
        },
        onSuccess: () => {
          setSuccess(true);
        }
      }
    );
  });

  const serverError = form.formState.errors?.root?.serverError?.message;
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message ||
    form.formState.errors.name?.message ||
    form.formState.errors.website?.message ||
    form.formState.errors.company_type?.message ||
    form.formState.errors.confirmPassword?.message;

  if (success)
    return (
      <div className="tese-auth-page flex min-h-dvh w-dvw items-center justify-center">
        <div className="mb-4 flex flex-col items-center">
          <Heading>{t('register.successTitle')}</Heading>
          <Text
            size="small"
            className="mt-2 max-w-[320px] text-center text-ui-fg-subtle"
          >
            {t('register.successBody')}
          </Text>

          <Link to="/login">
            <Button className="mt-8">{t('register.backToLogin')}</Button>
          </Link>
        </div>
      </div>
    );

  return (
    <div className="tese-auth-page flex min-h-dvh w-dvw items-center justify-center">
      <div className="tese-auth-card m-4 flex flex-col items-center">
        <AvatarBox />
        <div className="mb-4 flex flex-col items-center">
          <Heading>{t('register.title')}</Heading>
          <Text
            size="small"
            className="text-center text-ui-fg-subtle"
          >
            {t('register.hint')}
          </Text>
        </div>
        <div className="flex w-full flex-col gap-y-3">
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-y-6"
            >
              <div className="flex flex-col gap-y-2">
                <Form.Field
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input
                          {...field}
                          className="mb-2 bg-ui-bg-field-component"
                          placeholder={t('register.companyName')}
                          data-testid="register-company-name"
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input
                          {...field}
                          className="bg-ui-bg-field-component"
                          placeholder={t('register.website')}
                          data-testid="register-website"
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="company_type"
                  render={({ field: { onChange, value, ...field } }) => (
                    <Form.Item>
                      <Form.Control>
                        <Select
                          value={value || undefined}
                          onValueChange={onChange}
                          {...field}
                        >
                          <Select.Trigger
                            className="bg-ui-bg-field-component"
                            data-testid="register-company-type"
                          >
                            <Select.Value
                              placeholder={t('register.companyType')}
                            />
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
                      <Form.Control>
                        <CountrySelect
                          {...field}
                          className="bg-ui-bg-field-component"
                          placeholder={t('register.country')}
                          data-testid="register-country"
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Control>
                        <Input
                          {...field}
                          className="bg-ui-bg-field-component"
                          placeholder={t('fields.email')}
                          data-testid="register-email"
                        />
                      </Form.Control>
                      <Form.Hint>{t('register.emailHint')}</Form.Hint>
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label>{}</Form.Label>
                      <Form.Control>
                        <Input
                          type="password"
                          {...field}
                          className="bg-ui-bg-field-component"
                          placeholder={t('fields.password')}
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />

                <Form.Field
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label>{}</Form.Label>
                      <Form.Control>
                        <Input
                          type="password"
                          {...field}
                          className="bg-ui-bg-field-component"
                          placeholder={t('register.confirmPassword')}
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
                <PasswordValidator
                  password={form.watch('password')}
                  setError={setPasswordError}
                />
              </div>
              {validationError && (
                <div className="text-center">
                  <Hint
                    className="inline-flex"
                    variant={'error'}
                  >
                    {validationError}
                  </Hint>
                </div>
              )}
              {serverError && (
                <Alert
                  className="items-center bg-ui-bg-base p-2"
                  dismissible
                  variant="error"
                >
                  {serverError}
                </Alert>
              )}
              <Button
                className="tese-btn-primary w-full"
                type="submit"
                isLoading={isPending}
              >
                {t('register.submit')}
              </Button>
            </form>
          </Form>
        </div>
        <span className="txt-small my-6 text-ui-fg-muted">
          <Trans
            i18nKey="register.alreadySeller"
            components={[
              <Link
                to="/login"
                className="font-medium text-ui-fg-interactive outline-none transition-fg hover:text-ui-fg-interactive-hover focus-visible:text-ui-fg-interactive-hover"
              />
            ]}
          />
        </span>
      </div>
    </div>
  );
};
