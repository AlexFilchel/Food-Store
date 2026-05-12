import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import { usePaymentByExternalReferenceQuery } from '@/features/payments/model/hooks'

type PaymentResult = 'success' | 'failure' | 'pending' | 'loading'

export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState<PaymentResult>('loading')

  const externalReference = searchParams.get('external_reference') ?? undefined
  const orderId = externalReference ? Number(externalReference.replace('order-', '')) : undefined

  const paymentQuery = usePaymentByExternalReferenceQuery(externalReference)

  useEffect(() => {
    if (paymentQuery.isLoading) {
      setResult('loading')
      return
    }

    if (paymentQuery.isError || !paymentQuery.data) {
      setResult('pending')
      return
    }

    const status = paymentQuery.data.status
    if (status === 'Aprobado') {
      setResult('success')
    } else if (status === 'Rechazado' || status === 'Cancelado' || status === 'Fallido') {
      setResult('failure')
    } else {
      setResult('pending')
    }
  }, [paymentQuery.data, paymentQuery.isLoading, paymentQuery.isError])

  const config = resultConfig[result]

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`inline-flex size-16 items-center justify-center rounded-full mx-auto ${config.iconBg}`}>
          <span className="text-2xl">{config.icon}</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-950">{config.title}</h1>
          <p className="text-sm text-slate-600">{config.description}</p>
        </div>

        {paymentQuery.data ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-medium">Estado:</span> {paymentQuery.data.status}</p>
            <p><span className="font-medium">Monto:</span> ${paymentQuery.data.amount}</p>
            {paymentQuery.data.attempts > 1 ? (
              <p><span className="font-medium">Intentos:</span> {paymentQuery.data.attempts}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {result === 'failure' && orderId ? (
            <Link
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              to={`${routePaths.orders}/${orderId}`}
            >
              Reintentar pago
            </Link>
          ) : null}

          {result === 'success' ? (
            <Link
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              to={routePaths.orders}
            >
              Ver mis pedidos
            </Link>
          ) : null}

          <Link
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            to={routePaths.home}
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}

const resultConfig: Record<PaymentResult, { icon: string; iconBg: string; title: string; description: string }> = {
  loading: {
    icon: '⏳',
    iconBg: 'bg-slate-100',
    title: 'Procesando pago...',
    description: 'Estamos verificando el estado de tu pago.',
  },
  success: {
    icon: '✅',
    iconBg: 'bg-emerald-100',
    title: '¡Pago aprobado!',
    description: 'Tu pago fue procesado exitosamente. Tu pedido está confirmado.',
  },
  failure: {
    icon: '❌',
    iconBg: 'bg-rose-100',
    title: 'Pago no completado',
    description: 'No pudimos procesar tu pago. Podés reintentar desde tu pedido.',
  },
  pending: {
    icon: '⏳',
    iconBg: 'bg-amber-100',
    title: 'Pago pendiente',
    description: 'Tu pago está siendo procesado. Te avisemos cuando se confirme.',
  },
}
