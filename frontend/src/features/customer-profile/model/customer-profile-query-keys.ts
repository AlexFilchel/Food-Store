export const customerProfileQueryKeys = {
  all: ['customer-profile'] as const,
  me: () => [...customerProfileQueryKeys.all, 'me'] as const,
}
