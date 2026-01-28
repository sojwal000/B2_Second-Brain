import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-secondary-300 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-secondary-900 border rounded-lg px-4 py-2 text-white placeholder-secondary-500 transition-colors duration-200 focus:outline-none focus:ring-1 resize-none ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-secondary-700 focus:border-primary-500 focus:ring-primary-500'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-secondary-500">{helperText}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export default TextArea
