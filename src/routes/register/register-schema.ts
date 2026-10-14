import * as z from 'zod';

// Mirrors the backend's http(s)-only rule — a stored javascript:/data:
// URL is an XSS vector when rendered as an anchor href.
const websiteSchema = z
  .string()
  .url({ message: 'Enter a full URL, e.g. https://yourcompany.com' })
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Website must be an http(s) URL' }
  );

export const COMPANY_TYPES = [
  'manufacturer',
  'distributor',
  'wholesaler',
  'service_provider',
  'startup',
  'other'
] as const;

export const RegisterSchema = z.object({
  name: z.string().min(2, { message: "Name should be a string" }),
  email: z.string().email({ message: "Invalid email" }),
  website: websiteSchema.optional().or(z.literal('')),
  company_type: z.enum(COMPANY_TYPES).optional().or(z.literal('')),
  country_code: z.string().optional(),
  password: z.string()
    .min(12, { message: "at least 12 characters" })
    .regex(/[a-z]/, { message: "at least one lowercase case" })
    .regex(/[A-Z]/, { message: "at least one upper case" })
    .regex(/[0-9]/, { message: "at least one digit" })
    .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/, { message: "at least one special character" }),
  confirmPassword: z.string()
})  .refine((data) => data.password === data.confirmPassword, {
  message: "passwords don't match",
  path: ['confirmPassword'],
});