import * as React from "react"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  error?: string
  description?: string
  htmlFor?: string
  children: React.ReactNode
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className = '', label, error, description, htmlFor, children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col gap-1.5 ${className}`} {...props}>
        {label && (
          <label htmlFor={htmlFor} className="text-sm font-semibold text-zinc-700">
            {label}
          </label>
        )}
        {children}
        {description && !error && (
          <p className="text-xs text-zinc-500">{description}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"
