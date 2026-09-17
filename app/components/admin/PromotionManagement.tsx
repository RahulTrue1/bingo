import { useState } from "react";
import { apiClient } from "../../api-client";
import type { AdminAction } from "../shared/types";

export function PromotionManagement({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const promotions = [
    ["Free Bingo", "Hourly free 75-ball card", "Active", "FREE75"],
    ["Buy 3 Get 1", "Fourth eligible card free", "Active", "BUY3"],
    ["Happy Hour", "50% ticket discount · 18:00–19:00", "Scheduled", "HAPPY"],
    ["Cashback", "10% Bingo cashback", "Active", "CASH"],
    ["Tournament Entry", "Weekend Cup ticket reward", "Draft", "CUP"],
    ["VIP Access", "Unlock VIP Gold Room", "Active", "VIP"],
    ["Daily Reward", "One card after first login", "Paused", "DAILY"],
  ];
  const [states, setStates] = useState<Record<string, string>>(
    Object.fromEntries(promotions.map((item) => [item[0], item[2]])),
  );

  return (
    <div className="promotion-admin-grid">
      {promotions.map((promo, index) => (
        <article className="admin-card promotion-admin-card" key={promo[0]}>
          <span className={`promotion-icon promo-${index}`}>{index % 2 ? "%" : "★"}</span>
          <span className={`table-status ${states[promo[0]] === "Active" ? "success" : "warning"}`}>
            {states[promo[0]]}
          </span>
          <h2>{promo[0]}</h2>
          <p>{promo[1]}</p>
          <div>
            <button onClick={() => openAction({ kind: "promotion", label: promo[0] })}>Edit</button>
            <button
              onClick={() => {
                const next = states[promo[0]] === "Active" ? "Paused" : "Active";
                setStates((items) => ({ ...items, [promo[0]]: next }));
                apiClient.promotions.update(promo[3] || promo[0], { status: next }).catch(() => {});
                notify(`${promo[0]} ${next.toLowerCase()}.`);
              }}
            >
              {states[promo[0]] === "Active" ? "Pause" : "Activate"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
