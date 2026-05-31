export function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${normalize(value)}`}>{value.replace(/_/g, " ")}</span>;
}

function normalize(value: string): string {
  return value.replace(/_/g, "-");
}
