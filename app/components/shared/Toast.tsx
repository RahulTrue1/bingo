export function Toast({ message }: { message: string }) {
  return message ? <div className="toast"><span>✓</span>{message}</div> : null;
}
