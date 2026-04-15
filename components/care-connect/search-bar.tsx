import type { InputHTMLAttributes, ReactNode } from "react"

type SearchBarProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  children?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange">

export function SearchBar({
  id,
  label,
  value,
  onChange,
  placeholder,
  children,
  className = "",
  ...inputProps
}: SearchBarProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cc-text">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-cc-text/15 bg-white/80 px-4 py-3 text-cc-text shadow-sm outline-none transition placeholder:text-cc-text/40 focus:border-cc-accent/50 focus:ring-2 focus:ring-cc-accent/20"
        {...inputProps}
      />
      {children}
    </div>
  )
}
