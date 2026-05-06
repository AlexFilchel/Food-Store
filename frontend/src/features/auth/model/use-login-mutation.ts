import { useMutation } from '@tanstack/react-query'

import { authClient } from '@/shared/api/auth-client'

export function useLoginMutation() {
  return useMutation({
    mutationFn: authClient.login,
  })
}
