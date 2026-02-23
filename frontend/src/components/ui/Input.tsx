import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-zinc-900/80 border rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 transition-all duration-200 focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
              : 'border-zinc-800 focus:border-indigo-500/50 focus:ring-indigo-500/20 hover:border-zinc-700'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-zinc-600">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
