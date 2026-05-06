import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getDefaultAuthenticatedPath } from '@/app/routes/route-config'
import { useRegisterMutation } from '@/features/auth/model/use-register-mutation'
import { getErrorMessage, getFieldErrors } from '@/shared/api/problem-details'
import { useAuthStore } from '@/shared/stores/auth-store'

interface RegisterFormState {
  email: string
  first_name: string
  last_name: string
  password: string
}

const initialForm: RegisterFormState = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
}

export function RegisterForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const mutation = useRegisterMutation()
  const [form, setForm] = useState<RegisterFormState>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    try {
      const payload = await mutation.mutateAsync(form)

      setSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        user: payload.user,
      })

      const destination =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        getDefaultAuthenticatedPath(payload.user.roles)

      navigate(destination, { replace: true })
    } catch (error) {
      setFieldErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error, 'No pudimos crear tu cuenta.'))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <RegisterField
        error={fieldErrors.first_name}
        id="register-first-name"
        label="Nombre"
        onChange={(value) => setForm((current) => ({ ...current, first_name: value }))}
        value={form.first_name}
      />
      <RegisterField
        error={fieldErrors.last_name}
        id="register-last-name"
        label="Apellido"
        onChange={(value) => setForm((current) => ({ ...current, last_name: value }))}
        value={form.last_name}
      />
      <RegisterField
        autoComplete="email"
        error={fieldErrors.email}
        id="register-email"
        label="Email"
        onChange={(value) => setForm((current) => ({ ...current, email: value }))}
        type="email"
        value={form.email}
      />
      <RegisterField
        autoComplete="new-password"
        error={fieldErrors.password}
        id="register-password"
        label="Contraseña"
        onChange={(value) => setForm((current) => ({ ...current, password: value }))}
        type="password"
        value={form.password}
      />

      {formError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}

interface RegisterFieldProps {
  autoComplete?: string
  error?: string
  id: string
  label: string
  onChange: (value: string) => void
  type?: string
  value: string
}

function RegisterField({ autoComplete, error, id, label, onChange, type = 'text', value }: RegisterFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-sm text-rose-600" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
