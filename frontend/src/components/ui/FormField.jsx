/**
 * Label + form control + optional hint/error, laid out consistently.
 * Pass the control itself as children so it still works with any
 * input/select/textarea and their existing onChange handlers.
 *
 * <FormField label="Full name" required>
 *   <input className="input" value={name} onChange={...} />
 * </FormField>
 */
export default function FormField({ label, required, hint, error, children }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
