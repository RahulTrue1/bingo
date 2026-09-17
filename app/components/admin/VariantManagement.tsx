import type { AdminAction } from "../shared/types";

export function VariantManagement({ openAction }: { openAction: (action: AdminAction) => void }) {
  const variants = [
    ["75", "75-Ball Classic", "5 × 5", "Free center", "14 patterns", "violet"],
    ["90", "90-Ball", "3 × 9", "15 numbers", "3 stages", "teal"],
    ["80", "80-Ball Grid", "4 × 4", "No free cell", "8 patterns", "pink"],
    ["30", "Speed Bingo", "3 × 3", "Coverall", "Turbo caller", "coral"],
    ["50", "50-Ball", "5 × 3", "Configurable", "6 patterns", "blue"],
  ];

  return (
    <>
      <div className="variant-grid">
        {variants.map((variant) => (
          <article className="admin-card variant-card" key={variant[0]}>
            <div className={`variant-ball accent-${variant[5]}`}>{variant[0]}</div>
            <span className="table-status success">Active</span>
            <h2>{variant[1]}</h2>
            <p>{variant[2]} card layout</p>
            <div>
              <span><small>FREE SQUARES</small><b>{variant[3]}</b></span>
              <span><small>WIN RULES</small><b>{variant[4]}</b></span>
            </div>
            <button onClick={() => openAction({ kind: "variants", label: variant[1] })}>
              Configure variant →
            </button>
          </article>
        ))}
      </div>
      <button
        className="new-variant-card"
        onClick={() => openAction({ kind: "variants", label: "Create custom variant" })}
      >
        <span>+</span>
        <b>Create custom variant</b>
        <small>Define any ball count, card layout and calling rule</small>
      </button>
    </>
  );
}
