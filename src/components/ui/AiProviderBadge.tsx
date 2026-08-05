import { Cpu } from 'lucide-react'
import type { AIProviderInfo } from '@/services/ai/types'
import { cn } from '@/lib/utils'

function providerLabel(name: string): string {
  const key = name.toLowerCase()
  if (key === 'groq') return 'Groq'
  if (key === 'gemini') return 'Gemini'
  if (key === 'kimi') return 'Kimi'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function AiProviderBadge({
  info,
  className,
}: {
  info: AIProviderInfo | null | undefined
  className?: string
}) {
  if (!info?.provider) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase tracking-wider text-text-secondary',
        className,
      )}
      title={info.model || undefined}
    >
      <Cpu className="w-3 h-3 text-accent-gold shrink-0" />
      Via {providerLabel(info.provider)}
      {info.model ? (
        <span className="normal-case tracking-normal font-medium text-text-muted truncate max-w-[160px]">
          · {info.model}
        </span>
      ) : null}
    </span>
  )
}
