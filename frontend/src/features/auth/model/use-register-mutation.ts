import { useMutation } from '@tanstack/react-query'

import { authClient } from '@/shared/api/auth-client'

export function useRegisterMutation() {
  return useMutation({
    mutationFn: authClient.register,
  })
}
