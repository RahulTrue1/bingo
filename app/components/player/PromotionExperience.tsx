import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, Clock, Diamond, Lightning, Star, Trophy } from "@phosphor-icons/react";
import { apiClient } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";
import { money, type PromotionCategory } from "../shared/types";

export const playerPromotions = [
  {
    code: "FREE75",
    title: "Free Bingo every hour",
    shortTitle: "Free card. Real prizes.",
    description: "Claim one 75-ball card every hour and play Four Corners for the $100 community prize.",
    roomId: "free-party",
    category: "Free cards" as PromotionCategory,
    image: "/promotions/free-bingo-reward.png",
    accent: "cyan",
    reward: "1 free card",
    ends: "Renews hourly",
    featured: true,
  },
  {
    code: "VIP",
    title: "VIP Gold access",
    shortTitle: "Tonight belongs to Gold.",
    description: "Unlock the private VIP room, premium cards and tonight’s $20,000 guaranteed prize pool.",
    roomId: "vip-gold",
    category: "VIP" as PromotionCategory,
    image: "/promotions/vip-gold-access.png",
    accent: "gold",
    reward: "$20,000 room",
    ends: "Tonight · 9 PM",
    featured: true,
  },
  {
    code: "CUP",
    title: "Weekend Cup ticket",
    shortTitle: "Five rounds. One champion.",
    description: "Complete five eligible games to unlock an $8 tournament entry at no extra cost.",
    roomId: "tournament",
    category: "Tournaments" as PromotionCategory,
    image: "/promotions/weekend-cup.png",
    accent: "violet",
    reward: "Free $8 entry",
    ends: "Ends Sunday",
    featured: true,
  },
  {
    code: "BUY3",
    title: "Buy 3, get 1 free",
    shortTitle: "More cards. More chances.",
    description: "Add three Diamond 75 cards to your basket and your fourth qualifying card is free.",
    roomId: "diamond-75",
    category: "Ticket deals" as PromotionCategory,
    image: "/rooms/diamond-75.png",
    accent: "mint",
    reward: "4th card free",
    ends: "3 days left",
    featured: false,
  },
  {
    code: "HAPPY",
    title: "Happy Hour Bingo",
    shortTitle: "Half-price happy hour.",
    description: "Enjoy 50% off Trueig 90 Classic tickets between 18:00 and 19:00 every weekday.",
    roomId: "trueig-90",
    category: "Ticket deals" as PromotionCategory,
    image: "/rooms/trueig-90-classic.png",
    accent: "amber",
    reward: "50% off",
    ends: "Starts 18:00",
    featured: false,
  },
  {
    code: "CASH",
    title: "10% Bingo cashback",
    shortTitle: "Play today. Get some back.",
    description: "Receive 10% of eligible ticket spend as playable credit after your final game today.",
    roomId: "turbo-30",
    category: "Ticket deals" as PromotionCategory,
    image: "/rooms/turbo-30.png",
    accent: "coral",
    reward: "Up to $25",
    ends: "Resets midnight",
    featured: false,
  },
];

export function PromotionExperience({
  rooms,
  enterRoom,
  notify,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  notify: (message: string) => void;
}) {
  const [promotions, setPromotions] = useState(playerPromotions);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [category, setCategory] = useState<PromotionCategory>("All offers");
  const [wallet, setWallet] = useState(248.5);
  const [rulesPromo, setRulesPromo] = useState<typeof playerPromotions[0] | null>(null);

  useEffect(() => {
    const refreshPromos = () => {
      apiClient.promotions
        .list()
        .then((list) => {
          if (list && list.length > 0) {
            const mapped = list.map((p) => ({
              code: p.code || p.id,
              title: p.title,
              shortTitle: p.shortTitle || p.title,
              description: p.description,
              roomId: p.roomId || "free-party",
              category: (p.category || "All offers") as PromotionCategory,
              image: p.image || "/promotions/free-bingo-reward.png",
              accent: p.accent || "cyan",
              reward: p.reward || (p.rewardValue ? `$${p.rewardValue} bonus` : "Special reward"),
              ends: p.ends || "Ongoing",
              featured: Boolean(p.featured),
            }));
            setPromotions(mapped);
          }
        })
        .catch(() => {});
    };

    const refreshWallet = () => {
      apiClient.wallet
        .get()
        .then((w) => {
          if (w && typeof w.balance === "number") setWallet(w.balance);
        })
        .catch(() => {});
    };

    refreshPromos();
    refreshWallet();

    const unsubscribe = apiClient.sync.subscribe((event) => {
      if (event.entity === "promotions") {
        refreshPromos();
      } else if (event.entity === "wallet") {
        refreshWallet();
      }
    });

    const poll = window.setInterval(refreshPromos, 4000);

    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, []);

  const featured = promotions.filter((item) => item.featured);
  const mainFeatured = featured[0] ?? promotions[0];
  const sideFeatured = featured.slice(1);
  const visiblePromotions = promotions.filter(
    (item) => category === "All offers" || item.category === category
  );

  const categories: PromotionCategory[] = [
    "All offers",
    "Free cards",
    "Ticket deals",
    "VIP",
    "Tournaments",
  ];

  async function activatePromotion(code: string, roomId: string) {
    const isClaimed = claimed.includes(code);
    if (!isClaimed) {
      setClaimed((items) => [...items, code]);
      try {
        const res = await apiClient.promotions.claim(code.toLowerCase());
        if (res && typeof res.wallet === "number") {
          setWallet(res.wallet);
        }
      } catch {
        // Fallback gracefully
      }
      notify(`Reward ${code} claimed and ready to use in the room.`);
      return;
    }
    const targetRoom = rooms.find((room) => room.id === roomId) ?? rooms[0];
    enterRoom(targetRoom);
    notify(`Opening ${targetRoom.name} with your active ${code} reward applied.`);
  }

  const handleAddFunds = async () => {
    try {
      const res = await apiClient.wallet.deposit(50);
      if (res && typeof res.balance === "number") {
        setWallet(res.balance);
        notify(`Added $50.00 to wallet! Balance: $${res.balance.toFixed(2)}`);
      }
    } catch {
      notify("Failed to add funds. Please try again.");
    }
  };

  return (
    <div className="simple-player-page promotions-experience">
      <header className="promotions-page-header">
        <div>
          <span className="section-kicker">PROMOTIONS & REWARDS</span>
          <h1>Play more. Get rewarded.</h1>
          <p>Claim ticket deals, entry passes and VIP rooms created for Trueigtech players.</p>
        </div>
        <div className="promotions-wallet">
          <span>
            <Diamond size={18} weight="fill" />
          </span>
          <div>
            <small>REWARD WALLET</small>
            <strong>{money(wallet)}</strong>
          </div>
          <button onClick={handleAddFunds}>+ Add funds</button>
        </div>
      </header>

      {/* Featured Grid Layout matching .promotion-feature-grid */}
      <section className="promotion-feature-grid" aria-label="Featured promotions">
        <article className="promotion-feature-main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainFeatured.image} alt="" width="960" height="540" fetchPriority="high" />
          <div className="promotion-banner-shade" />
          <div className="promotion-feature-copy">
            <span className="promotion-live-badge">
              <Lightning size={12} weight="fill" /> Active Reward
            </span>
            <small>{mainFeatured.reward}</small>
            <h2>{mainFeatured.title}</h2>
            <p>{mainFeatured.description}</p>
            <div>
              <button
                className={claimed.includes(mainFeatured.code) ? "claimed" : ""}
                onClick={() => activatePromotion(mainFeatured.code, mainFeatured.roomId)}
              >
                {claimed.includes(mainFeatured.code) ? "✓ Claimed & Active" : "Claim reward"} <ArrowRight size={14} weight="bold" />
              </button>
              <span>
                <Clock size={13} weight="bold" /> {mainFeatured.ends}
              </span>
            </div>
          </div>
        </article>

        <div className="promotion-feature-stack">
          {sideFeatured.map((promo) => (
            <article className="promotion-feature-small" key={promo.code}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={promo.image} alt="" width="480" height="270" />
              <div className="promotion-banner-shade" />
              <div>
                <span>{promo.category}</span>
                <h2>{promo.title}</h2>
                <p>{promo.reward}</p>
                <button
                  className={claimed.includes(promo.code) ? "claimed" : ""}
                  onClick={() => activatePromotion(promo.code, promo.roomId)}
                >
                  {claimed.includes(promo.code) ? "Use now" : "Claim reward"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Offers Section matching .promotions-offers */}
      <section className="promotions-offers" aria-labelledby="offers-title">
        <div className="promotions-offers-head">
          <div>
            <h2 id="offers-title">Offers picked for you</h2>
            <p>Claim an offer now, then use it in any eligible Bingo round.</p>
          </div>
          <div className="promotion-category-tabs" aria-label="Filter promotions">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="promotion-offer-grid">
          {visiblePromotions.map((promotion) => (
            <article className="promotion-offer-card" key={promotion.code}>
              <div className="promotion-offer-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={promotion.image} alt="" width="480" height="270" loading="lazy" />
                <span>{promotion.code}</span>
                <small>
                  <Clock size={12} weight="bold" /> {promotion.ends}
                </small>
              </div>
              <div className="promotion-offer-body">
                <span className="promotion-reward-label">
                  <Star size={13} weight="fill" /> {promotion.reward}
                </span>
                <h3>{promotion.title}</h3>
                <p>{promotion.description}</p>
                <div>
                  <span>
                    <CheckCircle size={13} weight="fill" />
                    <button
                      type="button"
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        color: "#8f879d",
                        cursor: "pointer",
                        fontSize: "10px",
                        textDecoration: "underline",
                      }}
                      onClick={() => setRulesPromo(promotion)}
                    >
                      Terms
                    </button>
                  </span>
                  <button
                    className={claimed.includes(promotion.code) ? "claimed" : ""}
                    onClick={() => activatePromotion(promotion.code, promotion.roomId)}
                  >
                    {claimed.includes(promotion.code) ? "Use now" : "Claim"} <ArrowRight size={13} weight="bold" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!visiblePromotions.length && (
          <div className="promotion-empty">
            <Trophy size={28} weight="duotone" />
            <h3>No offers in this category yet</h3>
            <p>Fresh rewards are added throughout the week.</p>
          </div>
        )}
      </section>

      {/* Rules & Terms Modal */}
      {rulesPromo && (
        <div className="tourney-modal-backdrop">
          <button
            className="tourney-modal-scrim"
            aria-label="Close promotion rules"
            onClick={() => setRulesPromo(null)}
          />
          <section
            className="tourney-rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-rules-title"
          >
            <button className="tourney-modal-close" onClick={() => setRulesPromo(null)}>
              Close
            </button>
            <span className="section-kicker">Promotion terms</span>
            <h2 id="promo-rules-title">{rulesPromo.title}</h2>
            <p>{rulesPromo.description}</p>
            <ol>
              <li>Offer valid for registered Trueigtech players only.</li>
              <li>One claim per promotion code unless stated otherwise.</li>
              <li>Reward cannot be exchanged for cash or transferred between accounts.</li>
              <li>Offer expires on {rulesPromo.ends.toLowerCase()}.</li>
            </ol>
            <button
              className="primary-button"
              onClick={() => {
                activatePromotion(rulesPromo.code, rulesPromo.roomId);
                setRulesPromo(null);
              }}
            >
              {claimed.includes(rulesPromo.code) ? "Use now" : "Claim reward"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
