import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export default function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  const baseStyles = 'bg-secondary-800 rounded-xl border border-secondary-700'
  const hoverStyles = hoverable ? 'hover:border-secondary-600 cursor-pointer' : ''

  if (onClick) {
    return (
      <motion.div
        whileHover={hoverable ? { scale: 1.02, y: -2 } : undefined}
        whileTap={hoverable ? { scale: 0.98 } : undefined}
        className={`${baseStyles} ${hoverStyles} ${className}`}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-4 border-b border-secondary-700 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-4 border-t border-secondary-700 ${className}`}>
      {children}
    </div>
  )
}
