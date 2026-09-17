import { useEffect, useState } from "react";
import { apiClient, type HeroBannerModel } from "../../api-client";
import type { BingoRoomData } from "../../bingo-core";
import type { AdminAction } from "../shared/types";

export function BannerManagement({
  rooms,
  openAction,
  notify,
}: {
  rooms: BingoRoomData[];
  openAction: (action: AdminAction) => void;
  notify: (message: string) => void;
}) {
  const [banners, setBanners] = useState<HeroBannerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKicker, setEditKicker] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editCta, setEditCta] = useState("");

  const fetchBanners = () => {
    apiClient.banners
      .list()
      .then((list) => {
        setBanners(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBanners();
    const unsub = apiClient.sync.subscribe((event) => {
      if (event.entity === "banners") {
        fetchBanners();
      }
    });
    return unsub;
  }, []);

  const handleToggleActive = async (banner: HeroBannerModel) => {
    const nextState = !banner.active;
    try {
      await apiClient.banners.update(banner.id, { active: nextState });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, active: nextState } : b)),
      );
      notify(
        `✓ Banner "${banner.title}" is now ${nextState ? "active and visible to players" : "disabled and hidden from lobby"}.`,
      );
    } catch {
      notify("Failed to update banner status.");
    }
  };

  const handleDelete = async (banner: HeroBannerModel) => {
    if (!window.confirm(`Delete banner "${banner.title}" permanently?`)) return;
    try {
      await apiClient.banners.delete(banner.id);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      notify(`✓ Banner "${banner.title}" deleted.`);
    } catch {
      notify("Failed to delete banner.");
    }
  };

  const startEdit = (banner: HeroBannerModel) => {
    setEditingId(banner.id);
    setEditTitle(banner.title);
    setEditKicker(banner.kicker);
    setEditValue(banner.value);
    setEditCta(banner.cta);
  };

  const saveEdit = async (id: string) => {
    try {
      await apiClient.banners.update(id, {
        title: editTitle,
        kicker: editKicker,
        value: editValue,
        cta: editCta,
      });
      setBanners((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, title: editTitle, kicker: editKicker, value: editValue, cta: editCta }
            : b,
        ),
      );
      setEditingId(null);
      notify("✓ Banner updated and synchronized to player lobby.");
    } catch {
      notify("Failed to save banner changes.");
    }
  };

  return (
    <div className="admin-card data-card">
      <div className="game-builder-banner">
        <div>
          <span className="section-kicker">LOBBY HERO CAROUSEL</span>
          <h2>Homepage Banner Management</h2>
          <p>
            Add, customize, and toggle featured carousel banners displayed on the player lobby in real time.
          </p>
        </div>
        <button className="admin-primary" onClick={() => openAction({ kind: "create-banner" })}>
          + Create Banner
        </button>
      </div>

      <div className="responsive-table" style={{ marginTop: "16px" }}>
        <table>
          <thead>
            <tr>
              <th>Preview</th>
              <th>Kicker & Title</th>
              <th>Target Room</th>
              <th>Reward / Value</th>
              <th>CTA</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px" }}>
                  Loading banners...
                </td>
              </tr>
            ) : banners.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                  No banners configured. Click &quot;+ Create Banner&quot; above to add one.
                </td>
              </tr>
            ) : (
              banners.map((banner) => {
                const isEditing = editingId === banner.id;
                const room = rooms.find((r) => r.id === banner.roomId);

                return (
                  <tr key={banner.id}>
                    <td style={{ width: "120px" }}>
                      <div
                        style={{
                          width: "110px",
                          height: "54px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          background: "#12111e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {banner.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={banner.image}
                            alt={banner.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>Text only</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <input
                            type="text"
                            value={editKicker}
                            onChange={(e) => setEditKicker(e.target.value)}
                            placeholder="Kicker"
                            style={{ fontSize: "11px", padding: "3px 6px" }}
                          />
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                            style={{ fontSize: "12px", fontWeight: 700, padding: "3px 6px" }}
                          />
                        </div>
                      ) : (
                        <div>
                          <small
                            style={{
                              color: "var(--accent, #27d7ad)",
                              fontSize: "9px",
                              letterSpacing: "0.5px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            {banner.kicker}
                          </small>
                          <br />
                          <b>{banner.title}</b>
                        </div>
                      )}
                    </td>

                    <td>
                      <span className="speed-label">
                        {room ? room.name : banner.roomId === "tournament" ? "Tournament Cup" : banner.roomId}
                      </span>
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ width: "80px", fontSize: "12px", padding: "3px 6px" }}
                        />
                      ) : (
                        <b>{banner.value}</b>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCta}
                          onChange={(e) => setEditCta(e.target.value)}
                          style={{ width: "80px", fontSize: "12px", padding: "3px 6px" }}
                        />
                      ) : (
                        <span className="speed-label">{banner.cta || "Play now"}</span>
                      )}
                    </td>

                    <td>
                      <button
                        className={`toggle ${banner.active !== false ? "on" : ""}`}
                        onClick={() => handleToggleActive(banner)}
                        title={banner.active !== false ? "Click to disable banner" : "Click to activate banner"}
                      >
                        <i />
                      </button>
                    </td>

                    <td>
                      <div className="table-actions">
                        {isEditing ? (
                          <>
                            <button
                              style={{ color: "var(--accent, #27d7ad)", fontWeight: 700 }}
                              onClick={() => saveEdit(banner.id)}
                            >
                              ✓ Save
                            </button>
                            <button onClick={() => setEditingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(banner)}>Edit</button>
                            <button
                              style={{ color: "#ff725e" }}
                              onClick={() => handleDelete(banner)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
