/** NFR-5: anything over 500ms shows progress. Sized to sit inside a button label. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}
