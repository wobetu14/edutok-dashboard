export function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="text-xs text-destructive mt-0.5" role="alert">
      {message}
    </p>
  )
}
