import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChefHat, ArrowRight } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/apiErrors'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.token, { email: data.email, role: data.role })
      navigate('/mesas')
    },
    onError: (e) => {
      toast.error('No se pudo iniciar sesión', {
        description: getApiErrorMessage(e, 'Revisa tu correo y contraseña.'),
      })
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-4">
            <ChefHat size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">Miresta</h1>
          <p className="text-neutral-500 text-sm mt-1">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Correo
            </label>
            <Input
              {...register('email')}
              type="email"
              placeholder="admin@miresta.local"
              error={errors.email?.message}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
            {!mutation.isPending && (
              <>
                Iniciar sesión
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
