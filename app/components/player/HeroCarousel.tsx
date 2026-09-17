import { useEffect, useState } from "react";
import type { BingoRoomData } from "../../bingo-core";
import type { PlayerView } from "../shared/types";

export function HeroCarousel({
  rooms,
  enterRoom,
  setView,
}: {
  rooms: BingoRoomData[];
  enterRoom: (room: BingoRoomData) => void;
  setView: (view: PlayerView) => void;
}) {
  const slides = [
    {
      id: "tournament",
      kicker: "TRUEIGTECH WEEKEND CUP",
      title: <>Five rounds.<br /><em>One champion.</em></>,
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
      id: "trueig-90",
      kicker: "BINGO FUN IS CALLING",
      title: <>Fun is calling,<br />are <em>you</em> in?</>,
      body: "Join thousands of players and win amazing rewards.",
      cta: "Play now",
      alt: "",
      seconds: 480,
      theme: "host",
      value: "$1,500",
      image: "/banners/fun-is-calling.png",
      imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.",
      imageWidth: 1672,
      imageHeight: 941,
    },
    {
      id: "tournament",
      kicker: "TRUEIGTECH WEEKEND CUP",
      title: <>Five rounds.<br /><em>One champion.</em></>,
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
      id: "trueig-90",
      kicker: "BINGO FUN IS CALLING",
      title: <>Fun is calling,<br />are <em>you</em> in?</>,
      body: "Join thousands of players and win amazing rewards.",
      cta: "Play now",
      alt: "",
      seconds: 480,
      theme: "host",
      value: "$1,500",
      image: "/banners/fun-is-calling.png",
      imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.",
      imageWidth: 1672,
      imageHeight: 941,
    },
    {
      id: "tournament",
      kicker: "TRUEIGTECH WEEKEND CUP",
      title: <>Five rounds.<br /><em>One champion.</em></>,
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
      id: "trueig-90",
      kicker: "BINGO FUN IS CALLING",
      title: <>Fun is calling,<br />are <em>you</em> in?</>,
      body: "Join thousands of players and win amazing rewards.",
      cta: "Play now",
      alt: "",
      seconds: 480,
      theme: "host",
      value: "$1,500",
      image: "/banners/fun-is-calling.png",
      imageAlt: "Trueigtech Bingo. Fun is calling, are you in? Join thousands of players and win amazing rewards.",
      imageWidth: 1672,
      imageHeight: 941,
    },
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 2) % slides.length), 8000);
    return () => window.clearTimeout(timer);
  }, [index, paused, slides.length]);

  const visibleSlides = [slides[index], slides[(index + 1) % slides.length]];

  return (
    <section
      className="lobby-hero-carousel"
      aria-label="Featured Bingo promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {visibleSlides.map((slide) => {
        const room = rooms.find((item) => item.id === slide.id) ?? rooms[0];
        const showTournamentGames = slide.id === "tournament";
        const secondaryAction = () =>
          showTournamentGames
            ? setView("tournaments")
            : slide.id === "mega-jackpot"
              ? setView("jackpots")
              : enterRoom(room);

        return (
          <article
            className={`lobby-banner-card hero-slide-${slide.theme} ${
              slide.image ? "lobby-banner-card-image" : "lobby-banner-card-copy"
            }`}
            key={slide.id}
          >
            {slide.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="lobby-banner-image"
                  src={slide.image}
                  alt={slide.imageAlt}
                  width={slide.imageWidth}
                  height={slide.imageHeight}
                  fetchPriority="high"
                />
                <div className="lobby-banner-hotspots">
                  <button
                    className="banner-play-hotspot"
                    onClick={() => enterRoom(room)}
                    aria-label={showTournamentGames ? "Play the Trueigtech Weekend Cup" : "Play Bingo now"}
                  />
                  {showTournamentGames && (
                    <button
                      className="banner-games-hotspot"
                      onClick={() => setView("tournaments")}
                      aria-label="View tournament games"
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="compact-banner-copy">
                  <span className="eyebrow"><i /> {slide.kicker}</span>
                  <h2>{slide.title}</h2>
                  <p>{slide.body}</p>
                  <div className="compact-banner-actions">
                    <button className="primary-button" onClick={() => enterRoom(room)}>
                      {slide.cta} <span>→</span>
                    </button>
                    <button className="glass-button" onClick={secondaryAction}>
                      {slide.alt}
                    </button>
                  </div>
                </div>
                <div className="compact-banner-prize">
                  <small>{slide.theme === "speed" ? "NEXT ROUND" : "FEATURED PRIZE"}</small>
                  <strong>{slide.value}</strong>
                  <span>{room.pattern}</span>
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
