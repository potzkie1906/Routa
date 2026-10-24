interface Option {
  value: string
  label: string
}

const baseClass = 'w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-secondary/50'

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  error?: string
  disabled?: boolean
  placeholder?: string // when given, an empty first choice with this text is added
}

export function SelectField({ id, label, value, onChange, options, error, disabled, placeholder }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={`${baseClass} ${error ? 'border-danger' : 'border-slate-300'} disabled:bg-slate-100`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

interface TextAreaFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  rows?: number
  maxLength?: number
}

export function TextAreaField({ id, label, value, onChange, error, rows = 3, maxLength }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={`${baseClass} ${error ? 'border-danger' : 'border-slate-300'}`}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

interface CheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

/** The red box at the top of a form with the message from the server or a summary of the problems. */
export function FormError({ message, details }: { message: string; details?: string[] }) {
  if (message === '') return null
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
      <p>{message}</p>
      {details && details.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Save and Cancel buttons at the bottom of a form. */
export function FormButtons({ busy, onCancel, saveLabel = 'Save' }: { busy: boolean; onCancel: () => void; saveLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? 'Saving...' : saveLabel}
      </button>
    </div>
  )
}
