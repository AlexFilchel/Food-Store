import { useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { formatPriceFromCents, multiplyPriceByQuantity } from '@/shared/lib/cart-pricing'
import { useCartStore } from '@/shared/stores/cart-store'

function getCustomizationSummary(names: readonly string[]) {
  if (names.length === 0) {
    return 'Sin cambios.'
  }

  return `Sin ${names.join(', sin ')}.`
}

export function CartPage() {
  const items = useCartStore((state) => state.items)
  const totalItems = useCartStore((state) => state.totalItems())
  const subtotalCents = useCartStore((state) => state.subtotalCents())
  const toCheckoutPayload = useCartStore((state) => state.toCheckoutPayload)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeLine = useCartStore((state) => state.removeLine)
  const clear = useCartStore((state) => state.clear)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const checkoutPayload = toCheckoutPayload()

  const handleClear = () => {
    clear()
    setStatusMessage('Se vació el carrito.')
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">Tu carrito</h1>
        <p className="text-slate-600">Revisá cantidades, personalizaciones y subtotal antes del futuro checkout.</p>
      </header>

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {statusMessage}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Tu carrito está vacío</h2>
          <p className="text-slate-600">Todavía no agregaste productos. Volvé al catálogo y armá tu pedido.</p>
          <div>
            <Link className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700" to={routePaths.home}>
              Ir al catálogo
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="space-y-4">
            {items.map((item) => {
              const lineSubtotal = multiplyPriceByQuantity(item.unitPrice, item.quantity)

              return (
                <article key={item.cartItemId} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Link className="text-lg font-semibold text-slate-950 underline-offset-4 hover:underline" to={`/catalog/products/${item.slug || item.productId}`}>
                        {item.name}
                      </Link>
                      <p className="text-sm text-slate-600">{getCustomizationSummary(item.removedIngredients.map((ingredient) => ingredient.name))}</p>
                    </div>

                    <div className="text-sm text-slate-700">
                      <p>Unitario: ${item.unitPrice}</p>
                      <p className="font-semibold text-slate-950">Subtotal: ${formatPriceFromCents(lineSubtotal)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2" role="group" aria-label={`Controles de cantidad de ${item.name}`}>
                      <button
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        type="button"
                      >
                        −
                      </button>
                      <input
                        aria-label={`Cantidad de ${item.name}`}
                        className="w-16 rounded-xl border border-slate-300 px-3 py-2 text-center text-sm"
                        readOnly
                        value={item.quantity}
                      />
                      <button
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                      onClick={() => removeLine(item.cartItemId)}
                      type="button"
                    >
                      Quitar producto
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Resumen</h2>
              <p className="text-sm text-slate-600">{totalItems} producto(s) en tu carrito actual.</p>
            </div>

            <dl className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <dt>Items</dt>
                <dd>{totalItems}</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-950">
                <dt>Subtotal</dt>
                <dd>${formatPriceFromCents(subtotalCents)}</dd>
              </div>
            </dl>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Checkout próximamente</p>
              <p>Cuando habilitemos el checkout vamos a retomar estas {checkoutPayload.items.length} línea(s) para validar stock, precios y pago.</p>
            </div>

            <button
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setStatusMessage('El checkout todavía no está disponible. Por ahora solo podés revisar tu carrito.')}
              type="button"
            >
              Continuar al checkout
            </button>

            <button
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={handleClear}
              type="button"
            >
              Vaciar carrito
            </button>
          </aside>
        </div>
      )}
    </section>
  )
}
