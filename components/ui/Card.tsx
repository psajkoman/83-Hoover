import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-gang-secondary/80 backdrop-blur-sm',
      elevated: 'bg-gang-secondary/90 backdrop-blur-md shadow-xl',
      bordered: 'bg-gang-secondary/70 backdrop-blur-sm border border-gang-accent/30',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg p-4 transition-all',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
