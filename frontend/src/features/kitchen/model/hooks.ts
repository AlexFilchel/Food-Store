import { useQuery } from '@tanstack/react-query'

import { kitchenClient } from '@/entities/kitchen/api/kitchen-client'

export const kitchenQueryKeys = {
  all: ['kitchen'] as const,
  queue: () => [...kitchenQueryKeys.all, 'queue'] as const,
}

export function useKitchenQueueQuery() {
  return useQuery({
    queryKey: kitchenQueryKeys.queue(),
    queryFn: () => kitchenClient.list(),
  })
}
