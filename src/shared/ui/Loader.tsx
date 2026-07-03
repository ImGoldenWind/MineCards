interface LoaderProps {
  label?: string;
}

export function Loader({ label = "Загрузка" }: LoaderProps) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader__dot" />
      <span>{label}</span>
    </div>
  );
}
