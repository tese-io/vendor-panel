import { Spinner } from "@medusajs/icons"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useMe } from "../../../hooks/api/users"
import { isPendingSellerError } from "../../../lib/is-pending-seller-error"
import { SearchProvider } from "../../../providers/search-provider"
import { SidebarProvider } from "../../../providers/sidebar-provider"
import { MatrixProvider } from "../../../providers/matrix-provider"

export const ProtectedRoute = () => {
  const { seller, isPending, error } = useMe()

  const location = useLocation()
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (!seller) {
    // B-05: an authenticated identity whose application is still under
    // review gets a status page, not a raw error on the login screen.
    if (isPendingSellerError(error)) {
      return <Navigate to="/pending-approval" replace />
    }
    return (
      <Navigate
        to={`/login${error?.message ? `?reason=${encodeURIComponent(error.message)}` : ""}`}
        state={{ from: location }}
        replace
      />
    )
  }

  return (
    <MatrixProvider>
      <SidebarProvider>
        <SearchProvider>
          <Outlet />
        </SearchProvider>
      </SidebarProvider>
    </MatrixProvider>
  )
}
