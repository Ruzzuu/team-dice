import type { SessionStatus } from "../types";

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <span className={`status status--${status.toLowerCase()}`}><i />{status.toLowerCase()}</span>;
}
