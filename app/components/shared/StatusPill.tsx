import type { BingoStatus } from "../../bingo-core";

export function StatusPill({ status, label }: { status: BingoStatus; label?: string }) {
  return (
    <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>
      <i />
      {label || status}
    </span>
  );
}
