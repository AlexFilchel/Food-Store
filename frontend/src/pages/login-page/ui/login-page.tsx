import { routePaths } from '@/app/routes/route-config'
import { AuthFormCard } from '@/features/auth/ui/auth-form-card'
import { LoginForm } from '@/features/auth/ui/login-form'

export function LoginPage() {
  return (
    <AuthFormCard
      alternateHref={routePaths.register}
      alternateLabel="Creá tu cuenta"
      alternateText="¿Todavía no tenés usuario?"
      description="Entrá con tus credenciales para recuperar tu shell y tus permisos actuales."
      title="Iniciar sesión"
    >
      <LoginForm />
    </AuthFormCard>
  )
}
