import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { routePaths } from '@/app/routes/route-config'
import type { UserRoleCode } from '@/entities/user-administration/model/types'
import {
  useAdminUserDetailQuery,
  useAdminUserLifecycleMutation,
  useAdminUserPasswordResetMutation,
  useAdminUserRoleUpdateMutation,
  useAdminUserUpdateMutation,
} from '@/features/user-administration/model/hooks'
import { getErrorMessage, getFieldErrors, getProblemDetails } from '@/shared/api/problem-details'

const ROLE_OPTIONS: { value: UserRoleCode; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'PEDIDOS', label: 'Pedidos' },
  { value: 'CLIENT', label: 'Cliente' },
]

export function AdminUserDetailPageContent() {
  const { userId } = useParams()
  const resolvedId = Number(userId)
  const navigate = useNavigate()
  const isInvalidId = Number.isNaN(resolvedId) || resolvedId <= 0

  const detailQuery = useAdminUserDetailQuery(isInvalidId ? 0 : resolvedId)
  const updateMutation = useAdminUserUpdateMutation()
  const roleMutation = useAdminUserRoleUpdateMutation()
  const lifecycleMutation = useAdminUserLifecycleMutation()
  const resetMutation = useAdminUserPasswordResetMutation()

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [selectedRoles, setSelectedRoles] = useState<UserRoleCode[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const user = detailQuery.data
  const problem = detailQuery.error ? getProblemDetails(detailQuery.error) : null
  const isForbidden = problem?.status === 403

  useEffect(() => {
    if (!user) {
      return
    }
    setProfileForm({ first_name: user.first_name, last_name: user.last_name, email: user.email })
    setSelectedRoles(user.roles)
  }, [user])

  const isPending =
    updateMutation.isPending ||
    roleMutation.isPending ||
    lifecycleMutation.isPending ||
    resetMutation.isPending

  async function onUpdateProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user) {
      return
    }
    setError(null)
    setFieldErrors({})
    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        payload: {
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          email: profileForm.email,
        },
      })
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos guardar los cambios.'))
      setFieldErrors(getFieldErrors(cause))
    }
  }

  async function onUpdateRoles(event: React.FormEvent) {
    event.preventDefault()
    if (!user) {
      return
    }
    setError(null)
    try {
      await roleMutation.mutateAsync({
        userId: user.id,
        payload: { role_codes: selectedRoles },
      })
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos actualizar los roles.'))
    }
  }

  async function onToggleLifecycle(nextActive: boolean) {
    if (!user) {
      return
    }
    setError(null)
    try {
      await lifecycleMutation.mutateAsync({
        userId: user.id,
        payload: { is_active: nextActive },
      })
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos actualizar el estado del usuario.'))
    }
  }

  async function onResetPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!user) {
      return
    }
    setError(null)
    setFieldErrors({})
    try {
      await resetMutation.mutateAsync({
        userId: user.id,
        payload: { new_password: newPassword },
      })
      setNewPassword('')
    } catch (cause) {
      setError(getErrorMessage(cause, 'No pudimos resetear la contraseña.'))
      setFieldErrors(getFieldErrors(cause))
    }
  }

  function toggleRole(role: UserRoleCode) {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  if (isInvalidId) {
    return (
      <div className="rounded-3xl border border-dashed border-rose-300 bg-white p-8 text-center">
        <p className="text-rose-700">El usuario solicitado no es válido.</p>
        <button
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          onClick={() => navigate(routePaths.adminUsers)}
          type="button"
        >
          Volver
        </button>
      </div>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-600">Cargando usuario...</p>
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="rounded-3xl border border-dashed border-rose-300 bg-white p-8 text-center">
        <p className="text-rose-700">
          {isForbidden
            ? 'No tenés permisos para acceder a este usuario.'
            : 'No pudimos cargar el detalle del usuario.'}
        </p>
        <button
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          onClick={() => navigate(routePaths.adminUsers)}
          type="button"
        >
          Volver
        </button>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">USUARIO</span>
        <h2 className="mt-4 text-3xl font-semibold text-slate-950">{user.first_name} {user.last_name}</h2>
        <p className="mt-2 text-sm text-slate-600">{user.email}</p>
        <p className="text-xs text-slate-500">Creado: {new Date(user.created_at).toLocaleDateString('es-AR')}</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Perfil</h3>
            <p className="mt-2 text-sm text-slate-600">Actualizá la información básica del usuario.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
            {user.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={onUpdateProfile}>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Nombre</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={profileForm.first_name}
              onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))}
            />
            {fieldErrors.first_name ? <span className="text-xs text-rose-600">{fieldErrors.first_name}</span> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Apellido</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={profileForm.last_name}
              onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))}
            />
            {fieldErrors.last_name ? <span className="text-xs text-rose-600">{fieldErrors.last_name}</span> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-700">Email</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
            />
            {fieldErrors.email ? <span className="text-xs text-rose-600">{fieldErrors.email}</span> : null}
          </label>
          <div className="md:col-span-3">
            <button
              className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={isPending}
            >
              Guardar perfil
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Roles</h3>
        <p className="mt-2 text-sm text-slate-600">Seleccioná los roles permitidos para este usuario.</p>

        <form className="mt-4 space-y-3" onSubmit={onUpdateRoles}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  selectedRoles.includes(option.value)
                    ? 'border-sky-300 bg-sky-50 text-sky-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={selectedRoles.includes(option.value)}
                  onChange={() => toggleRole(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <button
            className="inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={isPending || selectedRoles.length === 0}
          >
            Guardar roles
          </button>
        </form>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Estado</h3>
        <p className="mt-2 text-sm text-slate-600">Activá o desactivá el acceso al sistema.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60"
            type="button"
            disabled={isPending || user.is_active}
            onClick={() => onToggleLifecycle(true)}
          >
            Activar
          </button>
          <button
            className="inline-flex rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 disabled:opacity-60"
            type="button"
            disabled={isPending || !user.is_active}
            onClick={() => onToggleLifecycle(false)}
          >
            Desactivar
          </button>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Reset de contraseña</h3>
        <p className="mt-2 text-sm text-slate-600">Definí una nueva contraseña temporal para el usuario.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onResetPassword}>
          <div className="flex-1">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {fieldErrors.new_password ? <span className="text-xs text-rose-600">{fieldErrors.new_password}</span> : null}
          </div>
          <button
            className="inline-flex justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={isPending || !newPassword}
          >
            Resetear
          </button>
        </form>
      </article>
    </section>
  )
}
