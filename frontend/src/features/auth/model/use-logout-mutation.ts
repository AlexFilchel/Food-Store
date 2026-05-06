import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authQueryKeys } from '@/features/auth/model/auth-query-keys'
import { authClient } from '@/shared/api/auth-client'
import { useFeedbackStore } from '@/shared/stores/feedback-store'
import { useAuthStore } from '@/shared/stores/auth-store'

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((state) => state.clear)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const suppressSessionExpiredFor = useAuthStore((state) => state.suppressSessionExpiredFor)
  const setError = useFeedbackStore((state) => state.setError)

  return useMutation({
    onMutate: async () => {
      suppressSessionExpiredFor(5_000)
      await queryClient.cancelQueries({ queryKey: authQueryKeys.all })
    },
    mutationFn: async () => {
      if (!refreshToken) {
        return
      }

      await authClient.logout({ refresh_token: refreshToken })
    },
    onError: () => {
      setError({
        title: 'Cierre de sesión parcial',
        message: 'No pudimos confirmar el cierre en el servidor, pero tu sesión local ya se cerró.',
      })
    },
    onSettled: async () => {
      clearSession()
      queryClient.removeQueries({ queryKey: authQueryKeys.all })
    },
  })
}
