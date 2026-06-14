import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import {
  useChangeCustomerPasswordMutation,
  useCustomerProfileQuery,
  useUpdateCustomerProfileMutation,
} from '@/features/customer-profile/model/hooks'
import { getProblemDetails } from '@/shared/api/problem-details'

export function CustomerProfilePage() {
  const profileQuery = useCustomerProfileQuery()
  const updateMutation = useUpdateCustomerProfileMutation()
  const changePasswordMutation = useChangeCustomerPasswordMutation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (profileQuery.data) {
      setFirstName(profileQuery.data.first_name)
      setLastName(profileQuery.data.last_name)
      setEmail(profileQuery.data.email)
    }
  }, [profileQuery.data])

  async function handleProfileSubmit(event: React.FormEvent) {
    event.preventDefault()
    setProfileFeedback(null)
    try {
      await updateMutation.mutateAsync({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim() })
      setProfileFeedback({ type: 'success', message: 'Perfil actualizado correctamente.' })
    } catch (error) {
      const problem = getProblemDetails(error)
      setProfileFeedback({ type: 'error', message: problem?.detail ?? 'No pudimos actualizar tu perfil. Intentá de nuevo.' })
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPasswordFeedback(null)
    try {
      await changePasswordMutation.mutateAsync({ current_password: currentPassword, new_password: newPassword })
      setPasswordFeedback({ type: 'success', message: 'Contraseña cambiada correctamente.' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      const problem = getProblemDetails(error)
      setPasswordFeedback({ type: 'error', message: problem?.detail ?? 'No pudimos cambiar tu contraseña. Verificá tu contraseña actual.' })
    }
  }

  if (profileQuery.isLoading) {
    return (
      <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Cargando perfil...</p>
      </section>
    )
  }

  if (profileQuery.isError) {
    return (
      <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-rose-700" role="alert">No pudimos cargar tu perfil. Intentá de nuevo en un momento.</p>
      </section>
    )
  }

  const profile = profileQuery.data

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-3xl font-semibold text-slate-950">Mi perfil</h2>
          <p className="text-sm text-slate-600">Gestioná tu información personal y credenciales de acceso.</p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {profile?.roles.map((role) => (
            <span key={role} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900">
              {role}
            </span>
          ))}
        </div>

        <form className="space-y-4" onSubmit={(e) => void handleProfileSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900" htmlFor="first-name">Nombre</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                id="first-name"
                maxLength={80}
                required
                value={firstName}
                onChange={(e) => { setProfileFeedback(null); setFirstName(e.target.value) }}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-900" htmlFor="last-name">Apellido</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                id="last-name"
                maxLength={80}
                required
                value={lastName}
                onChange={(e) => { setProfileFeedback(null); setLastName(e.target.value) }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-900" htmlFor="email">Email</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              id="email"
              required
              type="email"
              value={email}
              onChange={(e) => { setProfileFeedback(null); setEmail(e.target.value) }}
            />
          </div>

          {profileFeedback ? (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${profileFeedback.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}
              role={profileFeedback.type === 'success' ? 'status' : 'alert'}
            >
              {profileFeedback.message}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">Cambiar contraseña</h2>
          <p className="text-sm text-slate-600">Ingresá tu contraseña actual y la nueva para actualizar tus credenciales.</p>
        </header>

        <form className="space-y-4" onSubmit={(e) => void handlePasswordSubmit(e)}>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-900" htmlFor="current-password">Contraseña actual</label>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              id="current-password"
              required
              type="password"
              value={currentPassword}
              onChange={(e) => { setPasswordFeedback(null); setCurrentPassword(e.target.value) }}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-900" htmlFor="new-password">Nueva contraseña</label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              id="new-password"
              required
              type="password"
              value={newPassword}
              onChange={(e) => { setPasswordFeedback(null); setNewPassword(e.target.value) }}
            />
          </div>

          {passwordFeedback ? (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${passwordFeedback.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}
              role={passwordFeedback.type === 'success' ? 'status' : 'alert'}
            >
              {passwordFeedback.message}
            </p>
          ) : null}

          <button
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={changePasswordMutation.isPending}
            type="submit"
          >
            {changePasswordMutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Mis direcciones de entrega</h2>
            <p className="text-sm text-slate-600">Gestioná las direcciones donde recibís tus pedidos.</p>
          </div>
          <Link
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to={routePaths.deliveryAddresses}
          >
            Ver mis direcciones
          </Link>
        </div>
      </div>
    </section>
  )
}
