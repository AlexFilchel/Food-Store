export function parsePriceToCents(value: string | number) {
  const normalizedValue = typeof value === 'number' ? value.toFixed(2) : value.trim()

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    throw new Error('INVALID_CART_PRICE')
  }

  const [wholePart, decimalPart = ''] = normalizedValue.split('.')
  return Number.parseInt(wholePart, 10) * 100 + Number.parseInt(decimalPart.padEnd(2, '0'), 10)
}

export function formatPriceFromCents(cents: number) {
  return (cents / 100).toFixed(2)
}

export function multiplyPriceByQuantity(unitPrice: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('INVALID_CART_QUANTITY')
  }

  return parsePriceToCents(unitPrice) * quantity
}
