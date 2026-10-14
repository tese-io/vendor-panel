'use client';

import { useEffect, useState, type FC } from 'react';

import { CheckCircle, CheckCircleSolid } from '@medusajs/icons';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface PasswordError {
  isValid: boolean;
  hasError: boolean;
  lower: boolean;
  upper: boolean;
  '12chars': boolean;
  digit: boolean;
  specialChar: boolean;
}

function validatePassword(password: string) {
  const errors = {
    tooShort: password.length < 12,
    noLower: !/[a-z]/.test(password),
    noUpper: !/[A-Z]/.test(password),
    noDigit: !/[0-9]/.test(password),
    noSpecialChar: !/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)
  };

  return {
    isValid: !Object.values(errors).some(Boolean),
    errors
  };
}

const rules = {
  isValid: false,
  hasError: false,
  lower: false,
  upper: false,
  '12chars': false,
  digit: false,
  specialChar: false
};

const PasswordRule: FC<{
  hasError: boolean;
  showErrors: boolean;
  ruleName: keyof typeof rules;
}> = ({ ruleName, hasError, showErrors }) => {
  const { t } = useTranslation();
  if (ruleName === 'hasError' || ruleName === 'isValid') return;

  const rulesText: Record<Exclude<keyof typeof rules, 'hasError' | 'isValid'>, string> = {
    lower: t('validation.rules.lower'),
    upper: t('validation.rules.upper'),
    '12chars': t('validation.rules.12chars'),
    digit: t('validation.rules.digit'),
    specialChar: t('validation.rules.specialChar')
  };

  // Met rules turn green as you type; unmet rules stay neutral until a
  // submit attempt, then turn red so the blocker is unmissable.
  return (
    <p
      className={clsx(
        'flex items-center gap-2 text-xs',
        !hasError
          ? 'text-ui-tag-green-text'
          : showErrors
            ? 'text-ui-tag-red-text'
            : 'text-ui-fg-muted'
      )}
    >
      {!hasError ? <CheckCircleSolid /> : <CheckCircle />} {rulesText[ruleName]}
    </p>
  );
};

export const PasswordValidator = ({
  password,
  setError,
  showErrors = false
}: {
  password: string;
  setError: (error: PasswordError) => void;
  showErrors?: boolean;
}) => {
  const [newPasswordError, setNewPasswordError] = useState(rules);
  useEffect(() => {
    const validation = validatePassword(password);

    const nextState = {
      isValid: validation.isValid,
      hasError: !validation.isValid,
      lower: validation.errors.noLower,
      upper: validation.errors.noUpper,
      '12chars': validation.errors.tooShort,
      digit: validation.errors.noDigit,
      specialChar: validation.errors.noSpecialChar
    };

    setError(nextState);
    setNewPasswordError(nextState);
  }, [password]);

  return (
    <div className="flex flex-col gap-y-1 rounded-md bg-ui-bg-subtle px-3 py-2">
      {(Object.keys(newPasswordError) as (keyof typeof rules)[]).map(k => (
        <PasswordRule
          key={k}
          ruleName={k}
          hasError={newPasswordError[k]}
          showErrors={showErrors}
        />
      ))}
    </div>
  );
};
