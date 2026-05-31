export function LoadingState() {
  return (
    <main className="content-area">
      <div className="state-block">Loading workspace...</div>
    </main>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="state-block">
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-block error">
      <strong>Something needs attention</strong>
      <span>{message}</span>
    </div>
  );
}
