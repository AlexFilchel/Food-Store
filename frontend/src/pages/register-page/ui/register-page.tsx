import { routePaths } from '@/app/routes/route-config'
import { AuthFormCard } from '@/features/auth/ui/auth-form-card'
import { RegisterForm } from '@/features/auth/ui/register-form'

export function RegisterPage() {
  return (
    <AuthFormCard
      alternateHref={routePaths.login}
      alternateLabel="Iniciá sesión"
      alternateText="¿Ya tenés cuenta?"
      description="Creamos tu sesión de cliente y te dejamos dentro del shell apenas terminás el registro."
      title="Crear cuenta"
    >
      <RegisterForm />
    </AuthFormCard>
  )
}
