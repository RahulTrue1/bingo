import { Info } from "@phosphor-icons/react";

export function DashboardInfo({ label, description }: { label: string; description: string }) {
  return (
    <details className="dashboard-info">
      <summary aria-label={`About ${label.toLowerCase()}`}>
        <Info size={15} weight="bold" aria-hidden="true" />
      </summary>
      <div className="dashboard-info-content" role="note">
        <b>{label}</b>
        <p>{description}</p>
      </div>
    </details>
  );
}
