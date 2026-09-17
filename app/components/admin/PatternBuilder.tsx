import { useEffect, useState } from "react";
import { apiClient } from "../../api-client";

export function PatternBuilder({ notify }: { notify: (message: string) => void }) {
  const [selected, setSelected] = useState([2, 6, 8, 10, 12, 14, 16, 18, 22]);
  const [patternName, setPatternName] = useState("Diamond");
  const [patternList, setPatternList] = useState<Array<[string, number[]]>>([
    ["Four Corners", [0, 4, 20, 24]],
    ["Diamond", [2, 6, 8, 10, 12, 14, 16, 18, 22]],
    ["X Shape", [0, 4, 6, 8, 12, 16, 18, 20, 24]],
    ["Full House", Array.from({ length: 25 }, (_, index) => index)],
  ]);

  useEffect(() => {
    apiClient.patterns.list().then((list) => {
      if (list && list.length > 0) {
        setPatternList(list.map((p) => [p.name, p.cells]));
      }
    }).catch(() => {});
  }, []);

  const toggle = (index: number) =>
    setSelected((cells) => (cells.includes(index) ? cells.filter((cell) => cell !== index) : [...cells, index]));

  const handleSave = () => {
    apiClient.patterns.save({ name: patternName, cells: selected, layout: "5 × 5" }).catch(() => {});
    setPatternList((prev) => {
      const idx = prev.findIndex(([n]) => n === patternName);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = [patternName, selected];
        return copy;
      }
      return [...prev, [patternName, selected]];
    });
    notify(`${patternName} pattern saved with ${selected.length} marked cells.`);
  };

  return (
    <div className="pattern-layout">
      <section className="admin-card pattern-builder">
        <div className="pattern-config">
          <label>
            Pattern name
            <input value={patternName} onChange={(event) => setPatternName(event.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Card layout
              <select>
                <option>5 × 5 · 75-Ball</option>
                <option>3 × 9 · 90-Ball</option>
                <option>3 × 3 · 30-Ball</option>
              </select>
            </label>
            <label>
              Minimum cells
              <input type="number" value={selected.length} readOnly />
            </label>
          </div>
          <div className="toggle-row">
            <span><b>Allow rotations</b><small>Match at 90°, 180° and 270°</small></span>
            <button className="toggle on"><i /></button>
          </div>
          <div className="toggle-row">
            <span><b>Allow mirroring</b><small>Match horizontal reflections</small></span>
            <button className="toggle"><i /></button>
          </div>
          <div className="pattern-actions">
            <button className="outline-button" onClick={() => setSelected([])}>Reset</button>
            <button className="outline-button" onClick={() => notify(`${patternName} preview: ${selected.length} required cells.`)}>
              Preview
            </button>
            <button className="admin-primary" onClick={handleSave}>Save pattern</button>
          </div>
        </div>
        <div className="pattern-canvas-wrap">
          <div className="pattern-canvas-head">
            <span><b>Pattern canvas</b><small>Click cells to mark or unmark</small></span>
            <button onClick={() => setSelected([0, 4, 20, 24])}>Load Four Corners</button>
          </div>
          <div className="large-pattern-grid">
            {Array.from({ length: 25 }, (_, index) => (
              <button
                className={selected.includes(index) ? "selected" : ""}
                onClick={() => toggle(index)}
                key={index}
              >
                {selected.includes(index) ? "✓" : index === 12 ? "FREE" : ""}
              </button>
            ))}
          </div>
          <div className="pattern-summary">
            <span><b>{selected.length}</b> marked cells</span>
            <span><b>4</b> supported rotations</span>
            <span><b>75-Ball</b> compatible</span>
          </div>
        </div>
      </section>
      <aside className="admin-card saved-patterns">
        <div className="card-title">
          <div>
            <h2>Pattern library</h2>
            <p>{patternList.length} active patterns</p>
          </div>
          <button>Filter</button>
        </div>
        {patternList.map(([name, cells]) => (
          <button
            key={name}
            onClick={() => {
              setPatternName(name);
              setSelected(cells);
            }}
          >
            <div className="mini-pattern">
              {Array.from({ length: 25 }, (_, index) => (
                <i className={cells.includes(index) ? "marked" : ""} key={index} />
              ))}
            </div>
            <span>
              <b>{name}</b>
              <small>{cells.length} cells · Active</small>
            </span>
            <i>→</i>
          </button>
        ))}
      </aside>
    </div>
  );
}
