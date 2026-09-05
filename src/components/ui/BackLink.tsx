import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function BackLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mb-4"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
