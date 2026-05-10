export const deliveryAddressQueryKeys = {
  all: ['delivery-addresses'] as const,
  list: () => [...deliveryAddressQueryKeys.all, 'list'] as const,
  detail: (addressId: number) => [...deliveryAddressQueryKeys.all, 'detail', addressId] as const,
}
