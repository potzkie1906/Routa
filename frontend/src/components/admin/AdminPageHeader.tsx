interface AdminPageHeaderProps {
  title: string
  description: string
  // search box (leave out for pages without search)
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  // "Add" button (leave out when nothing can be added)
  addLabel?: string
  onAdd?: () => void
}

export default function AdminPageHeader({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  addLabel,
  onAdd,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <>
            <label htmlFor="admin-search" className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              id="admin-search"
              type="search"
              value={search ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-secondary/50"
            />
          </>
        )}
        {onAdd && (
          <button type="button" onClick={onAdd} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark">
            {addLabel ?? 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}
