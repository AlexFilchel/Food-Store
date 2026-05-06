import { useNavigate } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { useLogoutMutation } from '@/features/auth/model/use-logout-mutation'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const navigate = useNavigate()
  const mutation = useLogoutMutation()

  async function handleLogout() {
    await mutation.mutateAsync()
    navigate(routePaths.login, { replace: true })
  }

  return (
    <button
      className={className}
      disabled={mutation.isPending}
      onClick={() => void handleLogout()}
      type="button"
    >
      {mutation.isPending ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}
