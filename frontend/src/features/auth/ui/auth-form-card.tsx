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
    <section className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-50">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-slate-950/30 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
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
    </section>
  )
}
