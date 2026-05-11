import { routePaths } from '@/app/routes/route-config'
import { AuthFormCard } from '@/features/auth/ui/auth-form-card'
import { LoginForm } from '@/features/auth/ui/login-form'

export function LoginPage() {
  return (
    <AuthFormCard
      alternateHref={routePaths.register}
      alternateLabel="Creá tu cuenta"
      alternateText="¿Todavía no tenés usuario?"
      description=""
      footer={
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Credenciales admin</p>
          <p className="mt-2 text-sm text-slate-800">
            <span className="font-medium">Email:</span> admin@foodstore.local
          </p>
          <p className="text-sm text-slate-800">
            <span className="font-medium">Contraseña:</span> Admin1234!
          </p>
        </div>
      }
      title="Iniciar sesión"
    >
      <LoginForm />
    </AuthFormCard>
  )
}
