import assert from "node:assert/strict";
import test from "node:test";

let server;
const PORT = 4099;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

test.before(async () => {
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = "test";
  const { default: app } = await import("../server/index.ts");
  server = app.listen(PORT);
  await new Promise((resolve) => setTimeout(resolve, 300));
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/health returns ok status", async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, "ok");
  assert.equal(json.service, "trueigtech-bingo-api");
});

test("GET /api/rooms returns list of bingo rooms", async () => {
  const res = await fetch(`${BASE_URL}/rooms`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.rooms));
  assert.ok(json.rooms.length >= 8);
  const diamond = json.rooms.find((r) => r.id === "diamond-75");
  assert.ok(diamond);
  assert.equal(diamond.variant, "75-Ball Pattern");
});

test("POST /api/rooms creates a new room and PUT updates it", async () => {
  const roomName = `API Test Room ${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      variant: "75-Ball Pattern",
      ticketPrice: 3,
      prize: 1200,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.success, true);
  assert.equal(created.room.name, roomName);

  const updateRes = await fetch(`${BASE_URL}/rooms/${created.room.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketPrice: 4.5,
    }),
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.room.ticketPrice, 4.5);
});

test("POST /api/rooms/rtp-policy applies network target RTP", async () => {
  const res = await fetch(`${BASE_URL}/rooms/rtp-policy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetRtp: 82, syncMode: "all" }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.policyRtp, 82);
});

test("Game session: call next ball, pause and resume", async () => {
  const callRes = await fetch(`${BASE_URL}/game/diamond-75/call-next`, { method: "POST" });
  assert.equal(callRes.status, 200);
  const callJson = await callRes.json();
  assert.equal(callJson.success, true);
  assert.ok(typeof callJson.ball === "number");
  assert.ok(callJson.label.includes("-"));

  const pauseRes = await fetch(`${BASE_URL}/game/diamond-75/pause`, { method: "POST" });
  assert.equal(pauseRes.status, 200);
  const pauseJson = await pauseRes.json();
  assert.equal(pauseJson.state.paused, true);

  const resumeRes = await fetch(`${BASE_URL}/game/diamond-75/resume`, { method: "POST" });
  assert.equal(resumeRes.status, 200);
  const resumeJson = await resumeRes.json();
  assert.equal(resumeJson.state.paused, false);
});

test("Wallet deposit, balance, and ticket purchase flow", async () => {
  const balBeforeRes = await fetch(`${BASE_URL}/wallet`);
  const balBeforeJson = await balBeforeRes.json();
  const initBal = balBeforeJson.balance;

  const depRes = await fetch(`${BASE_URL}/wallet/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 }),
  });
  assert.equal(depRes.status, 200);
  const depJson = await depRes.json();
  assert.equal(depJson.balance, initBal + 100);

  const buyRes = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: "diamond-75", count: 2 }),
  });
  assert.equal(buyRes.status, 201);
  const buyJson = await buyRes.json();
  assert.equal(buyJson.success, true);
  assert.equal(buyJson.purchasedCount, 2);
  assert.equal(buyJson.tickets.length, 2);
  assert.ok(buyJson.tickets[0].cells.length > 0);
  assert.equal(buyJson.wallet, initBal + 100 - buyJson.totalCost);
});

test("Chat posting and reading", async () => {
  const postRes = await fetch(`${BASE_URL}/chat/diamond-75`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: "Tester", text: "Hello bingo players!" }),
  });
  assert.equal(postRes.status, 201);
  const postJson = await postRes.json();
  assert.equal(postJson.message.text, "Hello bingo players!");

  const getRes = await fetch(`${BASE_URL}/chat/diamond-75`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.ok(getJson.messages.some((m) => m.text === "Hello bingo players!"));
});

test("Admin dashboard metrics and telemetry", async () => {
  const res = await fetch(`${BASE_URL}/admin/dashboard`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.metrics));
  assert.ok(json.metrics.length >= 6);
  assert.ok(Array.isArray(json.topRooms));
  assert.ok(Array.isArray(json.activityFeed));
});

test("GET /api/jackpots returns all 4 dynamic jackpot tiers", async () => {
  const res = await fetch(`${BASE_URL}/jackpots`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.jackpots));
  assert.ok(json.jackpots.length >= 4);
  const mega = json.jackpots.find((j) => j.id === "mega-trueig");
  assert.ok(mega);
  assert.ok(mega.currentAmount >= 50000);
  const major = json.jackpots.find((j) => j.id === "major-trueig");
  assert.ok(major);
  assert.equal(major.qualifyingPattern, "Coverall in 50 balls");
});

test("GET /api/promotions and claim flow", async () => {
  const res = await fetch(`${BASE_URL}/promotions`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.promotions));
  assert.ok(json.promotions.length >= 6);

  const freePromo = json.promotions.find((p) => p.code === "FREE75" || p.id === "free-bingo");
  assert.ok(freePromo);
  assert.equal(freePromo.category, "Free cards");

  // Claim promotion
  const claimRes = await fetch(`${BASE_URL}/promotions/${freePromo.id}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: `USR-TEST-${Date.now()}`, playerName: "TestPlayer" }),
  });
  assert.equal(claimRes.status, 200);
  const claimJson = await claimRes.json();
  assert.equal(claimJson.success, true);
});

test("GET /api/banners returns dynamic lobby slides", async () => {
  const res = await fetch(`${BASE_URL}/banners`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.banners));
  assert.ok(json.banners.length >= 2);
  assert.ok(json.banners.some((b) => b.roomId === "tournament"));
});

test("GET /api/sync/status returns revision and history", async () => {
  const res = await fetch(`${BASE_URL}/sync/status`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(typeof json.revision === "number");
  assert.ok(Array.isArray(json.events));
  assert.ok(json.summary);
});

test("POST /api/sync/broadcast emits announcement event", async () => {
  const msg = `System Test Announcement ${Date.now()}`;
  const res = await fetch(`${BASE_URL}/sync/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, entity: "announcement", action: "broadcast" }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.event.message, msg);
});

test("GET /api/settings and PUT /api/settings updates platform settings", async () => {
  const getRes = await fetch(`${BASE_URL}/settings`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.success, true);
  assert.ok(getJson.settings);
  assert.ok(typeof getJson.settings.timeBetweenBalls === "number");

  const putRes = await fetch(`${BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeBetweenBalls: 1.5,
      voiceCaller: "Trueigtech Max",
      updatedBy: "AdminTest",
    }),
  });
  assert.equal(putRes.status, 200);
  const putJson = await putRes.json();
  assert.equal(putJson.success, true);
  assert.equal(putJson.settings.timeBetweenBalls, 1.5);
  assert.equal(putJson.settings.voiceCaller, "Trueigtech Max");
});

test("Room status change from Scheduled to Live persists and triggers sync event", async () => {
  // 1. Update trueig-90 from whatever status to Scheduled
  const schedRes = await fetch(`${BASE_URL}/rooms/trueig-90`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Scheduled" }),
  });
  assert.equal(schedRes.status, 200);
  const schedJson = await schedRes.json();
  assert.equal(schedJson.success, true);
  assert.equal(schedJson.room.status, "Scheduled");

  // Verify in GET /api/rooms
  const get1 = await fetch(`${BASE_URL}/rooms/trueig-90`);
  const get1Json = await get1.json();
  assert.equal(get1Json.room.status, "Scheduled");

  // 2. Change status Scheduled -> Live (exact user action)
  const liveRes = await fetch(`${BASE_URL}/rooms/trueig-90`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Live" }),
  });
  assert.equal(liveRes.status, 200);
  const liveJson = await liveRes.json();
  assert.equal(liveJson.success, true);
  assert.equal(liveJson.room.status, "Live");

  // Verify in GET /api/rooms
  const get2 = await fetch(`${BASE_URL}/rooms/trueig-90`);
  const get2Json = await get2.json();
  assert.equal(get2Json.room.status, "Live");

  // 3. Verify sync event was recorded in sync bus
  const syncRes = await fetch(`${BASE_URL}/sync/status`);
  const syncJson = await syncRes.json();
  const roomEvent = syncJson.events.find((e) => e.entity === "rooms" && e.roomId === "trueig-90");
  assert.ok(roomEvent);
  assert.equal(roomEvent.action, "update");
});

test("Banner management: full CRUD workflow and live sync", async () => {
  // 1. Create a new banner
  const newBanner = {
    title: `Automated Test Banner ${Date.now()}`,
    kicker: "EXCLUSIVE CHAMPIONSHIP",
    roomId: "diamond-75",
    value: "$50,000",
    cta: "Join now",
    image: "/banners/weekend-cup-jackpot.png",
    active: true,
  };
  const createRes = await fetch(`${BASE_URL}/banners`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newBanner),
  });
  assert.equal(createRes.status, 201);
  const createJson = await createRes.json();
  assert.equal(createJson.success, true);
  const bannerId = createJson.banner.id;
  assert.ok(bannerId);
  assert.equal(createJson.banner.title, newBanner.title);

  // 2. Update banner (toggle active to false)
  const updateRes = await fetch(`${BASE_URL}/banners/${bannerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: false, value: "$75,000" }),
  });
  assert.equal(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.equal(updateJson.success, true);
  assert.equal(updateJson.banner.active, false);
  assert.equal(updateJson.banner.value, "$75,000");

  // 3. Delete banner
  const deleteRes = await fetch(`${BASE_URL}/banners/${bannerId}`, {
    method: "DELETE",
  });
  assert.equal(deleteRes.status, 200);
  const deleteJson = await deleteRes.json();
  assert.equal(deleteJson.success, true);

  // Verify deletion in GET /api/banners
  const listRes = await fetch(`${BASE_URL}/banners`);
  const listJson = await listRes.json();
  assert.ok(!listJson.banners.some((b) => b.id === bannerId));
});

test("Game creation and update flow: persists stages, status, and emits real-time sync", async () => {
  const gameId = `test-game-${Date.now()}`;
  const stages = [
    { name: "One Line", prize: 150, continueAfterWin: true },
    { name: "Two Lines", prize: 350, continueAfterWin: true },
    { name: "Full House", prize: 1000, continueAfterWin: false },
  ];

  // 1. Create game as Live
  const createRes = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: gameId,
      name: "Trueig Championship 75",
      variant: "75-Ball Pattern",
      status: "Live",
      ticketPrice: 2.5,
      prize: 1500,
      maxPlayers: 450,
      callDelay: 600,
      frequency: "Every 5 min",
      startsIn: "19:00",
      winningStages: stages,
      jackpot: 125480,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.success, true);
  assert.equal(created.room.id, gameId);
  assert.equal(created.room.status, "Live");
  assert.equal(created.room.winningStages.length, 3);
  assert.equal(created.room.callDelay, 600);

  // 2. Schedule game (change status to Scheduled and update prize)
  const updateRes = await fetch(`${BASE_URL}/rooms/${gameId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Scheduled",
      prize: 2000,
      startsIn: "21:30",
    }),
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.room.status, "Scheduled");
  assert.equal(updated.room.prize, 2000);
  assert.equal(updated.room.startsIn, "21:30");

  // 3. Verify sync status recorded the update
  const syncRes = await fetch(`${BASE_URL}/sync/status`);
  const syncJson = await syncRes.json();
  const foundEvent = syncJson.events.find((e) => e.entity === "rooms" && e.roomId === gameId);
  assert.ok(foundEvent);
  assert.equal(foundEvent.action, "update");

  // 4. Verify filtering by status
  const filterRes = await fetch(`${BASE_URL}/rooms?status=Scheduled`);
  const filterJson = await filterRes.json();
  assert.ok(filterJson.rooms.some((r) => r.id === gameId));
});



