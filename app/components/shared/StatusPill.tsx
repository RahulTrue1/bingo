import type { BingoStatus } from "../../bingo-core";

export function StatusPill({ status }: { status: BingoStatus }) {
  return (
    <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>
      <i />
      {status}
    </span>
  );
}
