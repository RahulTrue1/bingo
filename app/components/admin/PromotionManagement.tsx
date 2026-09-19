import { useCallback, useEffect, useState } from "react";
import { apiClient, type PromotionModel } from "../../api-client";
import type { AdminAction } from "../shared/types";

const defaultPromos = [
  { id: "free-bingo", title: "Free Bingo", description: "Hourly free 75-ball card", status: "Active", code: "FREE75" },
  { id: "buy-3-get-1", title: "Buy 3 Get 1", description: "Fourth eligible card free", status: "Active", code: "BUY3" },
  { id: "happy-hour", title: "Happy Hour", description: "50% ticket discount · 18:00–19:00", status: "Scheduled", code: "HAPPY" },
  { id: "cashback", title: "Cashback", description: "10% Bingo cashback", status: "Active", code: "CASH" },
  { id: "tournament-entry", title: "Tournament Entry", description: "Weekend Cup ticket reward", status: "Draft", code: "CUP" },
  { id: "vip-access", title: "VIP Access", description: "Unlock VIP Gold Room", status: "Active", code: "VIP" },
  { id: "daily-reward", title: "Daily Reward", description: "One card after first login", status: "Paused", code: "DAILY" },
];

export function PromotionManagement({
  notify,
  openAction,
}: {
  notify: (message: string) => void;
  openAction: (action: AdminAction) => void;
}) {
  const [promotions, setPromotions] = useState<Array<{ id: string; title: string; description: string; status: string; code: string }>>(defaultPromos);

  const refreshPromos = useCallback(() => {
    apiClient.promotions.list().then((list) => {
      if (list && list.length > 0) {
        setPromotions(
          list.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description || "Promotional reward",
            status: p.status || "Active",
            code: p.code || p.id,
          }))
        );
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshPromos();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "promotions") {
        refreshPromos();
      }
    });
    return unsub;
  }, [refreshPromos]);

  const toggleStatus = async (promo: { id: string; title: string; status: string; code: string }) => {
    const next = promo.status === "Active" ? "Paused" : "Active";
    setPromotions((prev) =>
      prev.map((item) => (item.id === promo.id ? { ...item, status: next } : item))
    );
    try {
      await apiClient.promotions.update(promo.id, { status: next });
      notify(`✓ Promotion "${promo.title}" is now ${next.toLowerCase()}.`);
    } catch {
      notify(`Failed to update ${promo.title}.`);
    }
  };

  return (
    <div className="promotion-admin-grid">
      {promotions.map((promo, index) => (
        <article className="admin-card promotion-admin-card" key={promo.id}>
          <span className={`promotion-icon promo-${index % 6}`}>{index % 2 ? "%" : "★"}</span>
          <span className={`table-status ${promo.status === "Active" ? "success" : "warning"}`}>
            {promo.status}
          </span>
          <h2>{promo.title}</h2>
          <p>{promo.description}</p>
          <div>
            <button onClick={() => openAction({ kind: "promotion", label: promo.title })}>Edit</button>
            <button onClick={() => toggleStatus(promo)}>
              {promo.status === "Active" ? "Pause" : "Activate"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

