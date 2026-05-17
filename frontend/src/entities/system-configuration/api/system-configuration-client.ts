import { httpClient } from '@/shared/api/http-client'
import type {
  SystemConfigurationAdminListResponse,
  SystemConfigurationPatchPayload,
  SystemConfigurationPublicResponse,
} from '@/entities/system-configuration/model/types'

export const systemConfigurationClient = {
  adminList: async () => (await httpClient.get<SystemConfigurationAdminListResponse>('/api/v1/admin/system/configuration')).data,
  adminPatch: async (payload: SystemConfigurationPatchPayload) =>
    (await httpClient.patch<SystemConfigurationAdminListResponse>('/api/v1/admin/system/configuration', payload)).data,
  publicValues: async () =>
    (await httpClient.get<SystemConfigurationPublicResponse>('/api/v1/system/configuration/public')).data,
}
