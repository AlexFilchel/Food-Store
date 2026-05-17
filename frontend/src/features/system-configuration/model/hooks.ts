import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { systemConfigurationClient } from '@/entities/system-configuration/api/system-configuration-client'
import type { SystemConfigurationPatchPayload } from '@/entities/system-configuration/model/types'
import { systemConfigurationQueryKeys } from '@/features/system-configuration/model/system-configuration-query-keys'

export function useAdminSystemConfigurationQuery() {
  return useQuery({
    queryKey: systemConfigurationQueryKeys.admin(),
    queryFn: () => systemConfigurationClient.adminList(),
  })
}

export function usePublicSystemConfigurationQuery() {
  return useQuery({
    queryKey: systemConfigurationQueryKeys.public(),
    queryFn: () => systemConfigurationClient.publicValues(),
  })
}

export function useAdminSystemConfigurationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SystemConfigurationPatchPayload) => systemConfigurationClient.adminPatch(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: systemConfigurationQueryKeys.admin() }),
        queryClient.invalidateQueries({ queryKey: systemConfigurationQueryKeys.public() }),
      ])
    },
  })
}
