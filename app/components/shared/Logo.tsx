export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`logo ${dark ? "logo-dark" : ""}`}>
      {/* This local SVG is already the final brand asset; image optimization would add no value. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-mark" src="/logo.svg" alt="" aria-hidden="true" />
      <span><b>TRUEIGTECH</b> BINGO</span>
    </div>
  );
}
