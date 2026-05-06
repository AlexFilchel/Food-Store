import { useQuery } from '@tanstack/react-query'

import { authQueryKeys } from '@/features/auth/model/auth-query-keys'
import { authClient } from '@/shared/api/auth-client'
import { isAuthProblem } from '@/shared/api/problem-details'

export function useAuthMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: authClient.me,
    enabled,
    retry: (failureCount, error) => {
      if (isAuthProblem(error)) {
        return false
      }

      return failureCount < 1
    },
  })
}
