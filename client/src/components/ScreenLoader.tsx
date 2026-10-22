export function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="screen-loader" role="status" aria-live="polite">
      <span className="screen-loader__coin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
