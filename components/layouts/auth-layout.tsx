import Image from 'next/image'
import { cn } from '@/lib/utils'

export function AuthLayout({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 hero-gradient">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/motogo-logo.png"
          alt="MotoGo"
          width={180}
          height={68}
          priority
          className="h-16 w-auto drop-shadow-lg"
        />
      </div>

      {/* Glass Card */}
      <div className={cn('w-full max-w-md glass-card rounded-2xl p-8', className)}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
