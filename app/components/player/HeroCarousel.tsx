import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";
import type { PlayerView } from "../shared/types";

interface SlideItem {
  id: string;
  roomId?: string;
  kicker: string;
  title: ReactNode;
  body: string;
  cta: string;
  alt: string;
  seconds: number;
  theme: string;
  value: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
}

const defaultSlides: SlideItem[] = [
  {
    id: "tournament-banner",
    roomId: "tournament",
    kicker: "TRUEIGTECH WEEKEND CUP",
    title: (
      <>
        Five rounds.
        <br />
        <em>One champion.</em>
      </>
    ),
    body: "Build points across patterns and Full House wins. The top 128 advance after every stage.",
    cta: "Play now",
    alt: "View games",
    seconds: 3000,
    theme: "tournament",
    value: "$25,000",
    image: "/banners/weekend-cup-jackpot.png",
    imageAlt: "Trueigtech Bingo Weekend Cup. Five rounds, one champion, with a $25,000 jackpot prize this round.",
    imageWidth: 1880,
    imageHeight: 836,
  },
  {
    id: "fun-is-calling",
    roomId: "trueig-90",
    kicker: "BINGO FUN IS CALLING",
    title: (
      <>
        Fun is calling,
        <br />
        are <em>you</em> in?
      </>
    ),
    body: "Join thousands of players and win amazing rewards.",
    cta: "Play now",
    alt: "View games",
    seconds: 480,
    theme: "host",
    value: "$1,800",
    image: "/banners/fun-is-calling.png",
    imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.",
    imageWidth: 1672,
    imageHeight: 941,
  },
];

function isPreBakedBanner(slide: SlideItem): boolean {
  if (!slide.image) return false;
  const image = slide.image.toLowerCase();
  const title = typeof slide.title === "string" ? slide.title.toLowerCase() : "";

  // Only the original 2 demo artwork graphics where title text was baked into the PNG bitmap
  if (
    image.includes("weekend-cup-jackpot.png") &&
    (slide.id === "tournament-banner" || slide.id === "tournament") &&
    (title.includes("five rounds") || title === "")
  ) {
    return true;
  }
  if (
    image.includes("fun-is-calling.png") &&
    slide.id === "fun-is-calling" &&
    (title.includes("fun is calling") || title === "")
  ) {
    return true;
  }
  return false;
}

export function HeroCarousel({
  rooms,
  enterRoom,
  setView,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  setView: (view: PlayerView) => void;
}) {
  const [slides, setSlides] = useState<SlideItem[]>(defaultSlides);
  // Track index with 1 clone on left and 2 on right: actual slides start at index 1
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadBanners = useCallback(() => {
    apiClient.banners
      .list()
      .then((list) => {
        if (list && list.length > 0) {
          const activeList = list.filter((b) => b.active !== false);
          if (activeList.length > 0) {
            const mapped: SlideItem[] = activeList.map((b) => ({
              id: b.id,
              roomId: b.roomId || "trueig-90",
              kicker: b.kicker || "SPECIAL EVENT",
              title: b.title,
              body: b.body || "",
              cta: b.cta || "Play now",
              alt: b.alt || "View games",
              seconds: b.seconds || 3000,
              theme: b.theme || "tournament",
              value: b.value || "$25,000",
              image: b.image,
              imageAlt: b.imageAlt || (typeof b.title === "string" ? b.title : "Banner"),
              imageWidth: b.imageWidth || 1880,
              imageHeight: b.imageHeight || 836,
            }));
            setSlides(mapped);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBanners();

    const unsubscribe = apiClient.sync.subscribe((event) => {
      if (event.entity === "banners" || event.entity === "all") {
        loadBanners();
      }
    });

    return unsubscribe;
  }, [loadBanners]);

  // For 2 cards per view: 1 clone on left, 2 clones on right for infinite seamless loop
  const displaySlides = useMemo(() => {
    if (slides.length <= 1) return slides;
    return [slides[slides.length - 1], ...slides, slides[0], slides[1 % slides.length]];
  }, [slides]);

  // Real 0-based dot index
  const activeDotIndex =
    slides.length <= 1
      ? 0
      : (currentIndex - 1 + slides.length) % slides.length;

  const handleNext = useCallback(() => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [slides.length]);

  const handleDotClick = useCallback((dotIdx: number) => {
    setIsTransitioning(true);
    setCurrentIndex(dotIdx + 1);
  }, []);

  // Auto-switch carousel every 4.5 seconds to smoothly slide to the left
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [handleNext, isHovered, slides.length]);

  // Seamless wrap-around on transition end
  const handleTransitionEnd = () => {
    if (slides.length <= 1) return;

    if (currentIndex >= slides.length + 1) {
      // Reached trailing clone -> silently snap back to index 1
      setIsTransitioning(false);
      setCurrentIndex(1);
    } else if (currentIndex <= 0) {
      // Reached leading clone -> silently snap back to slides.length
      setIsTransitioning(false);
      setCurrentIndex(slides.length);
    }
  };

  // Re-enable smooth transition after instant snap
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  const handleCta = (slide: SlideItem, room: BingoRoomData) => {
    const isTournament =
      slide.id === "tournament" ||
      slide.id === "tournament-banner" ||
      slide.roomId === "tournament" ||
      slide.theme === "tournament";

    if (isTournament) {
      if (rooms.some((r) => r.id === slide.roomId)) {
        enterRoom(room);
      } else {
        setView("tournaments");
      }
    } else if (slide.roomId === "mega-jackpot" || slide.theme === "jackpot") {
      setView("jackpots");
    } else {
      enterRoom(room);
    }
  };

  const handleAlt = (slide: SlideItem, room: BingoRoomData) => {
    const isTournament =
      slide.id === "tournament" ||
      slide.id === "tournament-banner" ||
      slide.roomId === "tournament" ||
      slide.theme === "tournament" ||
      slide.alt?.toLowerCase().includes("game") ||
      slide.alt?.toLowerCase().includes("tourn");

    if (isTournament) {
      setView("tournaments");
    } else if (slide.roomId === "mega-jackpot" || slide.alt?.toLowerCase().includes("jackpot")) {
      setView("jackpots");
    } else {
      enterRoom(room);
    }
  };

  const stepPercent = isMobile ? 100 : 50;
  const trackTransform =
    slides.length <= 1
      ? "translateX(0%)"
      : `translateX(-${currentIndex * stepPercent}%)`;

  return (
    <div
      className="lobby-hero-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "#0c0920",
        padding: "14px max(2.5vw, calc((100vw - 1600px) / 2)) 18px",
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="carousel-viewport"
        style={{
          margin: "0 auto",
          maxWidth: "1600px",
          height: isMobile ? "230px" : "320px",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          className={`carousel-track ${isTransitioning ? "animated" : ""}`}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            height: "100%",
            width: "100%",
            transform: trackTransform,
            transition: isTransitioning
              ? "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
            willChange: "transform",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {displaySlides.map((slide, slotIdx) => {
            const targetRoomId = slide.roomId || slide.id;
            const room = rooms.find((item) => item.id === targetRoomId) ?? rooms[0];
            const preBaked = isPreBakedBanner(slide);
            const isWeekendCup = slide.image?.includes("weekend-cup-jackpot.png");

            return (
              <div
                className="carousel-slide-item-2card"
                key={`${slide.id}-${slotIdx}`}
                style={{
                  boxSizing: "border-box",
                  flex: `0 0 ${stepPercent}%`,
                  height: "100%",
                  minWidth: `${stepPercent}%`,
                  padding: isMobile ? "0" : "0 7px",
                  width: `${stepPercent}%`,
                }}
              >
                <article
                  className={`lobby-banner-card ${
                    preBaked
                      ? "lobby-banner-card-image"
                      : slide.image
                      ? "lobby-banner-card-dynamic"
                      : "lobby-banner-card-copy"
                  } hero-slide-${slide.theme || "tournament"}`}
                  style={{
                    height: "100%",
                    width: "100%",
                    borderRadius: "18px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {preBaked ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="lobby-banner-image"
                        src={slide.image}
                        alt={slide.imageAlt || "Bingo promotion"}
                        fetchPriority={slotIdx <= 2 ? "high" : "low"}
                        style={{
                          display: "block",
                          height: "100%",
                          objectFit: "cover",
                          width: "100%",
                        }}
                      />
                      <div
                        className="lobby-banner-hotspots"
                        style={{
                          inset: 0,
                          pointerEvents: "none",
                          position: "absolute",
                          zIndex: 5,
                        }}
                      >
                        <button
                          type="button"
                          className="banner-play-hotspot"
                          onClick={() => handleCta(slide, room)}
                          aria-label={`Play ${typeof slide.title === "string" ? slide.title : "Bingo"}`}
                          style={{
                            background: "transparent",
                            border: 0,
                            cursor: "pointer",
                            pointerEvents: "auto",
                            position: "absolute",
                          }}
                        />
                        {isWeekendCup && (
                          <button
                            type="button"
                            className="banner-games-hotspot"
                            onClick={() => handleAlt(slide, room)}
                            aria-label="View tournament games"
                            style={{
                              background: "transparent",
                              border: 0,
                              cursor: "pointer",
                              pointerEvents: "auto",
                              position: "absolute",
                            }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {slide.image && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="lobby-banner-backdrop-img"
                            src={slide.image}
                            alt={slide.imageAlt || (typeof slide.title === "string" ? slide.title : "Promotion backdrop")}
                            fetchPriority={slotIdx <= 2 ? "high" : "low"}
                            style={{
                              filter: "brightness(0.72)",
                              height: "100%",
                              inset: 0,
                              objectFit: "cover",
                              objectPosition: "center",
                              position: "absolute",
                              width: "100%",
                              zIndex: 1,
                            }}
                          />
                          <div
                            className="lobby-banner-scrim"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(10, 7, 24, 0.96) 0%, rgba(12, 9, 28, 0.88) 48%, rgba(14, 10, 32, 0.52) 75%, rgba(14, 10, 32, 0.28) 100%)",
                              inset: 0,
                              pointerEvents: "none",
                              position: "absolute",
                              zIndex: 2,
                            }}
                          />
                        </>
                      )}
                      <div
                        className="compact-banner-copy"
                        style={{
                          padding: "26px",
                          position: "relative",
                          width: "66%",
                          zIndex: 3,
                        }}
                      >
                        <span
                          className="eyebrow"
                          style={{
                            color: "#a796ff",
                            fontSize: "10px",
                            fontWeight: 850,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <i
                            style={{
                              background: "#3ce2ba",
                              borderRadius: "50%",
                              width: "6px",
                              height: "6px",
                              display: "inline-block",
                            }}
                          />{" "}
                          {slide.kicker || "SPECIAL EVENT"}
                        </span>
                        <h2
                          style={{
                            fontSize: "28px",
                            fontWeight: 800,
                            letterSpacing: "-1px",
                            lineHeight: 1.05,
                            margin: "10px 0 8px",
                            color: "#fff",
                          }}
                        >
                          {slide.title}
                        </h2>
                        {slide.body && (
                          <p
                            style={{
                              color: "#aaa5ba",
                              fontSize: "12px",
                              lineHeight: 1.5,
                              margin: 0,
                              maxWidth: "340px",
                            }}
                          >
                            {slide.body}
                          </p>
                        )}
                        <div
                          className="compact-banner-actions"
                          style={{ display: "flex", gap: "9px", marginTop: "16px" }}
                        >
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleCta(slide, room)}
                            style={{
                              background: "linear-gradient(135deg, #7c69ff, #6250d9)",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              borderRadius: "11px",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: 700,
                              padding: "9px 18px",
                            }}
                          >
                            {slide.cta || "Play now"} <span>→</span>
                          </button>
                          {slide.alt && (
                            <button
                              type="button"
                              className="glass-button"
                              onClick={() => handleAlt(slide, room)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.16)",
                                borderRadius: "11px",
                                color: "#d8d3ec",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: 600,
                                padding: "9px 16px",
                              }}
                            >
                              {slide.alt}
                            </button>
                          )}
                        </div>
                      </div>
                      {slide.value && (
                        <div
                          className="compact-banner-prize"
                          style={{
                            alignItems: "flex-end",
                            display: "flex",
                            flexDirection: "column",
                            position: "absolute",
                            right: "22px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 3,
                          }}
                        >
                          <small
                            style={{
                              color: "#a49abf",
                              fontSize: "9px",
                              fontWeight: 850,
                              letterSpacing: "1.6px",
                              textTransform: "uppercase",
                            }}
                          >
                            {slide.theme === "speed" ? "NEXT ROUND" : "FEATURED PRIZE"}
                          </small>
                          <strong
                            style={{
                              background: "linear-gradient(#fff8d6, #f6bf48)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              fontSize: "36px",
                              fontWeight: 900,
                              letterSpacing: "-1.5px",
                              margin: "4px 0",
                              lineHeight: 1,
                            }}
                          >
                            {slide.value}
                          </strong>
                          {room?.pattern && (
                            <span
                              style={{
                                color: "#918aa7",
                                fontSize: "10px",
                                maxWidth: "140px",
                                textAlign: "right",
                              }}
                            >
                              {room.pattern}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </article>
              </div>
            );
          })}
        </div>

        {slides.length > 2 && (
          <>
            <button
              type="button"
              className="carousel-nav-arrow prev"
              onClick={handlePrev}
              aria-label="Previous promotion banner"
              style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                left: "8px",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(14, 10, 32, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#fff",
                fontSize: "26px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
                boxShadow: "0 4px 18px rgba(0, 0, 0, 0.55)",
                lineHeight: 1,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-nav-arrow next"
              onClick={handleNext}
              aria-label="Next promotion banner"
              style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                right: "8px",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(14, 10, 32, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#fff",
                fontSize: "26px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
                boxShadow: "0 4px 18px rgba(0, 0, 0, 0.55)",
                lineHeight: 1,
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div
          className="carousel-pagination"
          role="tablist"
          aria-label="Promotion banner pagination"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          {slides.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              role="tab"
              aria-selected={idx === activeDotIndex}
              aria-label={`Go to slide ${idx + 1}: ${typeof s.title === "string" ? s.title : "Banner"}`}
              className={`carousel-pagination-dot ${idx === activeDotIndex ? "active" : ""}`}
              onClick={() => handleDotClick(idx)}
              style={{
                background:
                  idx === activeDotIndex
                    ? "linear-gradient(90deg, #7c69ff, #2bddaa)"
                    : "rgba(255, 255, 255, 0.25)",
                border: 0,
                borderRadius: "6px",
                cursor: "pointer",
                height: "9px",
                padding: 0,
                transition: "all 0.28s ease",
                width: idx === activeDotIndex ? "28px" : "9px",
                boxShadow:
                  idx === activeDotIndex
                    ? "0 0 12px rgba(124, 105, 255, 0.8)"
                    : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

