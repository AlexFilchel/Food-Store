export const systemConfigurationQueryKeys = {
  all: ['system-configuration'] as const,
  admin: () => [...systemConfigurationQueryKeys.all, 'admin'] as const,
  public: () => [...systemConfigurationQueryKeys.all, 'public'] as const,
}
