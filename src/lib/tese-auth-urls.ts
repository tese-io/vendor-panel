const DEFAULT_DASHBOARD_URL = 'http://148.113.8.184:4200'

export function getDashboardUrl (): string {
  return (
    import.meta.env.VITE_TESE_DASHBOARD_URL || DEFAULT_DASHBOARD_URL
  ).replace(/\/$/, '')
}

export function getContinueWithTeseSellerUrl (): string {
  return `${getDashboardUrl()}/seller/enter`
}
