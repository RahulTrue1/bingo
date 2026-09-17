export function TrueigTicket({
  index,
  values,
  rows,
  columns,
  ballCount,
  selected,
  active,
  selling,
  called,
  manualMarks,
  autoDaub,
  targetCells,
  onSelect,
  onPreview,
  onMark,
}: {
  index: number;
  values: Array<number | "FREE" | null>;
  rows: number;
  columns: number;
  ballCount: number;
  selected: boolean;
  active: boolean;
  selling: boolean;
  called: number[];
  manualMarks: number[];
  autoDaub: boolean;
  targetCells: number[];
  onSelect: () => void;
  onPreview: () => void;
  onMark: (value: number) => void;
}) {
  const isMarked = (value: number | "FREE" | null) =>
    value === "FREE" || (typeof value === "number" && ((autoDaub && called.includes(value)) || manualMarks.includes(value)));
  const matched = values.filter((value) => isMarked(value)).length;
  const needed = targetCells.filter((i) => values[i] !== null).length;
  const targetMatched = targetCells.filter((i) => isMarked(values[i])).length;
  const nearWin = targetMatched >= Math.max(1, needed - 1) && targetMatched < needed;

  return (
    <div
      className={`bingo-ticket trueig-ticket ticket-${ballCount} ${active ? "active" : ""} ${selected ? "selected" : ""} ${nearWin ? "near-win" : ""}`}
      onClick={onPreview}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === "Enter" && onPreview()}
    >
      <div className="ticket-head">
        <b>TRUEIG CARD #{String(index + 1).padStart(2, "0")}</b>
        <div>
          {nearWin && <span className="near-label">1 TO GO</span>}
          {selling ? (
            <button
              className={selected ? "selected" : ""}
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
            >
              {selected ? "✓ SELECTED" : "+ SELECT"}
            </button>
          ) : (
            <span>{active ? "ACTIVE" : `${matched} MARKED`}</span>
          )}
        </div>
      </div>
      {ballCount === 75 && (
        <div className="bingo-letters">
          {"BINGO".split("").map((letter) => (
            <b key={letter}>{letter}</b>
          ))}
        </div>
      )}
      <div
        className={`trueig-ticket-cells cells-${columns}`}
        style={{ gridTemplateColumns: `repeat(${columns},1fr)` }}
      >
        {values.map((value, cellIndex) => (
          <button
            className={`${value === null ? "blank" : ""} ${isMarked(value) ? "marked" : ""} ${targetCells.includes(cellIndex) ? "target" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              if (typeof value === "number") onMark(value);
            }}
            key={`${value}-${cellIndex}`}
            disabled={value === null}
          >
            {value === "FREE" ? <span>★<small>FREE</small></span> : value}
          </button>
        ))}
      </div>
      <div className="ticket-foot">
        <span>{nearWin ? "⚡ Near win" : selected ? "♥ Selected" : "Preview card"}</span>
        <small>{rows}×{columns} · #{284200 + index + 1}</small>
      </div>
    </div>
  );
}
