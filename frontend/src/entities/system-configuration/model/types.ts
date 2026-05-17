export type SystemConfigurationValue = string | boolean | number | null

export interface SystemConfigurationValidationMeta {
  min: number | null
  max: number | null
}

export interface SystemConfigurationItem {
  key: string
  category: string
  type: 'string' | 'nullable_string' | 'boolean' | 'integer' | 'timezone'
  editable: boolean
  visibility: 'admin_only' | 'public'
  sensitive: boolean
  description: string
  default_value: SystemConfigurationValue
  effective_value: SystemConfigurationValue
  is_default_backed: boolean
  validation: SystemConfigurationValidationMeta
  version: number
  updated_at: string | null
}

export interface SystemConfigurationAdminListResponse {
  items: SystemConfigurationItem[]
}

export interface SystemConfigurationPatchEntry {
  value: SystemConfigurationValue
  expected_version?: number
}

export interface SystemConfigurationPatchPayload {
  updates: Record<string, SystemConfigurationPatchEntry>
  reason?: string
}

export interface SystemConfigurationPublicResponse {
  values: Record<string, SystemConfigurationValue>
}
