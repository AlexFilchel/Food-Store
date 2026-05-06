import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/shared/lib/class-names'

interface AuthFormCardProps extends PropsWithChildren {
  alternateHref: string
  alternateLabel: string
  alternateText: string
  description: string
  title: string
  footer?: ReactNode
}

export function AuthFormCard({
  alternateHref,
  alternateLabel,
  alternateText,
  children,
  description,
  footer,
  title,
}: AuthFormCardProps) {
  return (
    <section className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-sm font-medium text-sky-200">
            Food Store Shell
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Acceso seguro para cada rol</h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Entrá con tu cuenta y navegá solo las secciones que te corresponden. Cliente, stock, pedidos o administración: cada experiencia queda aislada desde el shell.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-slate-950/30 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-slate-600">{description}</p>
          </div>

          <div className="mt-6">{children}</div>

          <div className={cn('mt-6 text-sm text-slate-600', footer && 'space-y-4')}>
            {footer}
            <p>
              {alternateText}{' '}
              <Link className="font-semibold text-sky-700 hover:text-sky-900" to={alternateHref}>
                {alternateLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
