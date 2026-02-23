import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export default function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  const baseStyles = 'bg-zinc-900/80 rounded-2xl border border-zinc-800/80 backdrop-blur-sm'
  const hoverStyles = hoverable ? 'hover:border-zinc-700/80 hover:bg-zinc-900/90 cursor-pointer transition-all duration-300' : ''

  if (onClick) {
    return (
      <motion.div
        whileHover={hoverable ? { scale: 1.01, y: -2 } : undefined}
        whileTap={hoverable ? { scale: 0.99 } : undefined}
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
    <div className={`p-5 border-b border-zinc-800/80 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-5 border-t border-zinc-800/80 ${className}`}>
      {children}
    </div>
  )
}
