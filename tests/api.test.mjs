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

test("Game configuration rules: cardLimit, promotion discounts, and ticket purchasing reflect dynamically", async () => {
  const promoGameId = `test-promo-game-${Date.now()}`;

  // 1. Create a game with cardLimit = 4 and promotion = "Buy 3 Get 1"
  const createRes = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: promoGameId,
      name: "Turbo Promo 30",
      variant: "30-Ball Speed",
      status: "Live",
      ticketPrice: 2,
      prize: 300,
      maxPlayers: 2,
      cardLimit: 4,
      promotion: "Buy 3 Get 1",
      callDelay: 600,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.room.cardLimit, 4);
  assert.equal(created.room.promotion, "Buy 3 Get 1");
  assert.equal(created.room.maxPlayers, 2);

  // 2. Deposit to have known balance
  await fetch(`${BASE_URL}/wallet/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 }),
  });
  const walletBeforeRes = await fetch(`${BASE_URL}/wallet`);
  const { balance: balanceBefore } = await walletBeforeRes.json();

  // 3. Buy 4 cards: with "Buy 3 Get 1", 1 card is free, so cost = 3 * $2 = $6
  const buyRes = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: promoGameId, count: 4 }),
  });
  assert.equal(buyRes.status, 201);
  const buyJson = await buyRes.json();
  assert.equal(buyJson.success, true);
  assert.equal(buyJson.tickets.length, 4);
  assert.equal(buyJson.wallet, balanceBefore - 6);

  // 4. Update room cardLimit to 6 and verify persistence
  const updateRes = await fetch(`${BASE_URL}/rooms/${promoGameId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardLimit: 6 }),
  });
  assert.equal(updateRes.status, 200);
  const updatedJson = await updateRes.json();
  assert.equal(updatedJson.room.cardLimit, 6);
});

test("POST /api/auth/signup creates a dynamic player with initial bonus", async () => {
  const username = `TestPlayer_${Date.now()}`;
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username.toLowerCase()}@example.com`,
      bonus: 100,
    }),
  });
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.user.username, username);
  assert.equal(json.user.balance, 100);
  assert.equal(json.wallet, 100);
  assert.ok(json.user.id.startsWith("USR-"));

  // Verify /api/auth/me returns this new active user
  const meRes = await fetch(`${BASE_URL}/auth/me`);
  assert.equal(meRes.status, 200);
  const meJson = await meRes.json();
  assert.equal(meJson.success, true);
  assert.equal(meJson.user.username, username);
  assert.equal(meJson.wallet, 100);
});

test("POST /api/auth/login switches active player and syncs wallet", async () => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "TrueigQueen" }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.user.username, "TrueigQueen");
  assert.equal(json.user.tier, "VIP");

  // Verify me reflects TrueigQueen
  const meRes = await fetch(`${BASE_URL}/auth/me`);
  const meJson = await meRes.json();
  assert.equal(meJson.user.username, "TrueigQueen");
});

test("POST /api/admin/players/:id/add-funds adds funds to player and records transaction", async () => {
  // Add funds to MikaK
  const addRes = await fetch(`${BASE_URL}/admin/players/MikaK/add-funds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 75.5,
      reason: "VIP promotional gift",
    }),
  });
  assert.equal(addRes.status, 200);
  const addJson = await addRes.json();
  assert.equal(addJson.success, true);
  assert.equal(addJson.player.username, "MikaK");
  assert.ok(addJson.player.balance >= 75.5);
  assert.equal(addJson.amount, 75.5);
  assert.ok(addJson.transaction);
  assert.equal(addJson.transaction.amount, 75.5);
});

test("POST /api/auth/signup with password and POST /api/auth/login validates password", async () => {
  const user = `PassTest_${Date.now()}`;
  const password = "mySecretBingoPass99";

  // 1. Sign up with custom password
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user,
      password: password,
      bonus: 100,
    }),
  });
  assert.equal(signupRes.status, 201);
  const signupJson = await signupRes.json();
  assert.equal(signupJson.success, true);
  assert.equal(signupJson.user.username, user);
  // Password should NOT be leaked in the response object
  assert.equal(signupJson.user.password, undefined);

  // 2. Attempt login with WRONG password -> expect 401
  const failRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user,
      password: "wrongPasswordXYZ",
    }),
  });
  assert.equal(failRes.status, 401);
  const failJson = await failRes.json();
  assert.equal(failJson.success, false);
  assert.match(failJson.error, /incorrect password/i);

  // 3. Attempt login with CORRECT password -> expect 200
  const passRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user,
      password: password,
    }),
  });
  assert.equal(passRes.status, 200);
  const passJson = await passRes.json();
  assert.equal(passJson.success, true);
  assert.equal(passJson.user.username, user);
  assert.equal(passJson.user.password, undefined);
});

test("Ticket isolation: each user only sees their own purchased tickets", async () => {
  // 1. MikaK has not bought any tickets -> should return 0 tickets
  const nonBuyerRes = await fetch(`${BASE_URL}/tickets?username=MikaK`);
  assert.equal(nonBuyerRes.status, 200);
  const nonBuyerJson = await nonBuyerRes.json();
  assert.equal(nonBuyerJson.success, true);
  assert.equal(nonBuyerJson.tickets.length, 0, "MikaK must have 0 tickets");

  // 2. Ari.R has seeded tickets -> should return tickets owned by Ari.R
  const ariRes = await fetch(`${BASE_URL}/tickets?username=Ari.R`);
  assert.equal(ariRes.status, 200);
  const ariJson = await ariRes.json();
  assert.equal(ariJson.success, true);
  assert.ok(ariJson.tickets.length > 0, "Ari.R should have active tickets");
  for (const t of ariJson.tickets) {
    assert.ok(t.player === "Ari.R" || t.userId === "USR-11804");
  }

  // 3. Register a fresh player
  const newPlayer = `TicketOwner_${Date.now()}`;
  const regRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: newPlayer,
      password: "pass12345Owner",
      bonus: 50,
    }),
  });
  assert.equal(regRes.status, 201);
  const regJson = await regRes.json();

  // Fresh user initially has 0 tickets
  const emptyRes = await fetch(`${BASE_URL}/tickets?username=${newPlayer}`);
  const emptyJson = await emptyRes.json();
  assert.equal(emptyJson.tickets.length, 0, "New player must have 0 tickets before buying");

  // Buy 2 tickets as this new player
  const buyRes = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: "diamond-75",
      count: 2,
      username: newPlayer,
      userId: regJson.user.id,
    }),
  });
  assert.equal(buyRes.status, 201);
  const buyJson = await buyRes.json();
  assert.equal(buyJson.tickets.length, 2);
  assert.equal(buyJson.tickets[0].player, newPlayer);

  // 4. Now verify new player sees exactly their 2 tickets
  const ownerRes = await fetch(`${BASE_URL}/tickets?username=${newPlayer}`);
  const ownerJson = await ownerRes.json();
  assert.equal(ownerJson.tickets.length, 2);
  assert.equal(ownerJson.tickets[0].player, newPlayer);

  // 5. Verify non-buyer MikaK still has 0 tickets and does NOT see new player's tickets
  const nonBuyerAfterRes = await fetch(`${BASE_URL}/tickets?username=MikaK`);
  const nonBuyerAfterJson = await nonBuyerAfterRes.json();
  assert.equal(nonBuyerAfterJson.tickets.length, 0, "MikaK must still have 0 tickets");
});

test("Multi-User Session Isolation: Token A vs Token B operate concurrently without clobbering each other", async () => {
  // 1. User A logs in as Ari.R
  const loginARes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Ari.R", password: "demo123" }),
  });
  assert.equal(loginARes.status, 200);
  const loginAJson = await loginARes.json();
  assert.equal(loginAJson.success, true);
  assert.ok(loginAJson.token, "Login A must return a session token");
  const tokenA = loginAJson.token;
  const initialBalanceA = loginAJson.wallet;

  // 2. User B signs up as a new user
  const userBName = `ConcurrentPlayer_${Date.now()}`;
  const signupBRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: userBName,
      password: "secretPassword123",
      bonus: 150,
    }),
  });
  assert.equal(signupBRes.status, 201);
  const signupBJson = await signupBRes.json();
  assert.equal(signupBJson.success, true);
  assert.ok(signupBJson.token, "Signup B must return a session token");
  const tokenB = signupBJson.token;
  assert.notEqual(tokenA, tokenB, "Session tokens must be distinct");

  // 3. Verify concurrent GET /me calls return respective users
  const meARes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { "x-session-token": tokenA },
  });
  const meAJson = await meARes.json();
  assert.equal(meAJson.user.username, "Ari.R");

  const meBRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { "x-session-token": tokenB },
  });
  const meBJson = await meBRes.json();
  assert.equal(meBJson.user.username, userBName);

  // 4. User B deposits $75 -> verify User A's wallet is completely untouched
  const depositBRes = await fetch(`${BASE_URL}/wallet/deposit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": tokenB,
    },
    body: JSON.stringify({ amount: 75 }),
  });
  assert.equal(depositBRes.status, 200);
  const depositBJson = await depositBRes.json();
  assert.equal(depositBJson.balance, 225);

  const walletARes = await fetch(`${BASE_URL}/wallet`, {
    headers: { "x-session-token": tokenA },
  });
  const walletAJson = await walletARes.json();
  assert.equal(walletAJson.balance, initialBalanceA, "User A's balance must not change when User B deposits");

  // 5. User B buys 1 ticket -> verify ticket scoping
  const buyBRes = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": tokenB,
    },
    body: JSON.stringify({
      roomId: "trueig-90",
      count: 1,
    }),
  });
  assert.equal(buyBRes.status, 201);
  const buyBJson = await buyBRes.json();
  assert.equal(buyBJson.purchasedCount, 1);
  assert.equal(buyBJson.tickets[0].player, userBName);

  // User B's tickets view returns only User B's 1 ticket
  const ticketsBRes = await fetch(`${BASE_URL}/tickets`, {
    headers: { "x-session-token": tokenB },
  });
  const ticketsBJson = await ticketsBRes.json();
  assert.equal(ticketsBJson.tickets.length, 1);
  assert.equal(ticketsBJson.tickets[0].player, userBName);

  // User A's tickets view returns Ari.R's tickets, not User B's
  const ticketsARes = await fetch(`${BASE_URL}/tickets`, {
    headers: { "x-session-token": tokenA },
  });
  const ticketsAJson = await ticketsARes.json();
  assert.ok(ticketsAJson.tickets.length > 0);
  assert.ok(ticketsAJson.tickets.every((t) => t.player === "Ari.R" || t.userId === "USR-11804"));

  // 6. User B logs out -> Token A remains active
  const logoutBRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "x-session-token": tokenB },
  });
  assert.equal(logoutBRes.status, 200);

  const meAStillActive = await fetch(`${BASE_URL}/auth/me`, {
    headers: { "x-session-token": tokenA },
  });
  const meAStillActiveJson = await meAStillActive.json();
  assert.equal(meAStillActiveJson.user.username, "Ari.R");
});

test("Tournament full lifecycle: registration, 5-stage progressive elimination, dynamic scoring, champion payout, and reset", async () => {
  const tourneyId = "weekend-cup";

  // 1. Reset tournament to known clean state
  const resetRes = await fetch(`${BASE_URL}/tournaments/${tourneyId}/reset`, { method: "POST" });
  assert.equal(resetRes.status, 200);
  const resetJson = await resetRes.json();
  assert.equal(resetJson.tournament.status, "Registration open");
  assert.equal(resetJson.tournament.currentRoundIndex, 0);

  // 2. Register a player
  const regPlayer = "TourneyChamp";
  const regRes = await fetch(`${BASE_URL}/tournaments/${tourneyId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName: regPlayer }),
  });
  assert.equal(regRes.status, 200);
  const regJson = await regRes.json();
  assert.ok(regJson.tournament.registeredPlayers.includes(regPlayer));

  // 3. Start Tournament -> Stage 1 (Qualifiers) Live
  const startRes = await fetch(`${BASE_URL}/tournaments/${tourneyId}/start`, { method: "POST" });
  assert.equal(startRes.status, 200);
  const startJson = await startRes.json();
  assert.equal(startJson.tournament.status, "Live");
  assert.equal(startJson.tournament.currentRoundIndex, 0);
  assert.equal(startJson.tournament.currentStageName, "Qualifiers");
  assert.equal(startJson.tournament.stageStatus, "in_progress");

  // 4. Score Stage 1 (Qualifiers)
  const score1Res = await fetch(`${BASE_URL}/tournaments/${tourneyId}/score-stage`, { method: "POST" });
  assert.equal(score1Res.status, 200);
  const score1Json = await score1Res.json();
  assert.equal(score1Json.tournament.stageStatus, "scored");
  assert.ok(score1Json.tournament.standings.some((s) => s.status === "Qualified"));

  // 5. Advance to Stage 2 (Round of 256)
  const adv1Res = await fetch(`${BASE_URL}/tournaments/${tourneyId}/advance`, { method: "POST" });
  assert.equal(adv1Res.status, 200);
  const adv1Json = await adv1Res.json();
  assert.equal(adv1Json.tournament.currentRoundIndex, 1);
  assert.equal(adv1Json.tournament.currentStageName, "Round of 256");
  assert.equal(adv1Json.tournament.stageStatus, "in_progress");

  // 6. Score Stage 2 and Advance to Stage 3 (Round of 128)
  await fetch(`${BASE_URL}/tournaments/${tourneyId}/score-stage`, { method: "POST" });
  const adv2Res = await fetch(`${BASE_URL}/tournaments/${tourneyId}/advance`, { method: "POST" });
  const adv2Json = await adv2Res.json();
  assert.equal(adv2Json.tournament.currentRoundIndex, 2);
  assert.equal(adv2Json.tournament.currentStageName, "Round of 128");

  // 7. Score Stage 3 and Advance to Stage 4 (Semi Final)
  await fetch(`${BASE_URL}/tournaments/${tourneyId}/score-stage`, { method: "POST" });
  const adv3Res = await fetch(`${BASE_URL}/tournaments/${tourneyId}/advance`, { method: "POST" });
  const adv3Json = await adv3Res.json();
  assert.equal(adv3Json.tournament.currentRoundIndex, 3);
  assert.equal(adv3Json.tournament.currentStageName, "Semi Final");

  // 8. Score Stage 4 and Advance to Stage 5 (Grand Final)
  await fetch(`${BASE_URL}/tournaments/${tourneyId}/score-stage`, { method: "POST" });
  const adv4Res = await fetch(`${BASE_URL}/tournaments/${tourneyId}/advance`, { method: "POST" });
  const adv4Json = await adv4Res.json();
  assert.equal(adv4Json.tournament.currentRoundIndex, 4);
  assert.equal(adv4Json.tournament.currentStageName, "Grand Final");

  // 9. Score Grand Final and Complete Tournament
  await fetch(`${BASE_URL}/tournaments/${tourneyId}/score-stage`, { method: "POST" });
  const completeRes = await fetch(`${BASE_URL}/tournaments/${tourneyId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winnerName: regPlayer }),
  });
  assert.equal(completeRes.status, 200);
  const completeJson = await completeRes.json();
  assert.equal(completeJson.tournament.status, "Completed");
  assert.equal(completeJson.tournament.winner, regPlayer);
  assert.equal(completeJson.payout, 15000); // 60% of $25,000

  // 10. Reset back for future play
  const cleanReset = await fetch(`${BASE_URL}/tournaments/${tourneyId}/reset`, { method: "POST" });
  assert.equal(cleanReset.status, 200);
  const cleanResetJson = await cleanReset.json();
  assert.equal(cleanResetJson.tournament.status, "Registration open");
  assert.equal(cleanResetJson.tournament.currentRoundIndex, 0);
});

test("Tournament creation with custom variant, cardsPerPlayer, and maxOpenBalls persists and returns properly", async () => {
  const customTourneyId = `test-custom-tourney-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: customTourneyId,
      name: "30-Ball Lightning Clash",
      variant: "30-Ball Speed Bingo",
      cardsPerPlayer: 2,
      maxOpenBalls: 18,
      entryFee: 15,
      prizePool: 30000,
      maxPlayers: 128,
      rounds: ["Heat 1", "Semifinal", "Grand Final"],
      stagePatterns: ["One Line", "Two Lines", "Speed Full House"],
      startsAt: "Live",
    }),
  });
  assert.equal(createRes.status, 201);
  const json = await createRes.json();
  assert.equal(json.success, true);
  assert.equal(json.tournament.variant, "30-Ball Speed Bingo");
  assert.equal(json.tournament.cardsPerPlayer, 2);
  assert.equal(json.tournament.maxOpenBalls, 18);
  assert.equal(json.tournament.stagePatterns.length, 3);
  assert.equal(json.tournament.stagePatterns[2], "Speed Full House");

  // Fetch it back
  const getRes = await fetch(`${BASE_URL}/tournaments/${customTourneyId}`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.tournament.variant, "30-Ball Speed Bingo");
  assert.equal(getJson.tournament.cardsPerPlayer, 2);
  assert.equal(getJson.tournament.maxOpenBalls, 18);
});

test("Dynamic Jackpots lifecycle: create, configure, ticket contribution, manual boost, win trigger with wallet payout, and delete", async () => {
  // 1. Verify initial list
  const listRes = await fetch(`${BASE_URL}/jackpots`);
  assert.equal(listRes.status, 200);
  const listJson = await listRes.json();
  assert.ok(Array.isArray(listJson.jackpots));
  assert.ok(listJson.jackpots.length >= 4);

  // 2. Create a new dynamic jackpot
  const customId = `test-jp-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/jackpots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: customId,
      name: "Diamond Stash Jackpot",
      variant: "75-Ball Progressive",
      startingAmount: 15000,
      currentAmount: 15000,
      resetAmount: 15000,
      maximumAmount: 150000,
      contributionPercent: 3.0,
      qualifyingPattern: "Full House in 40 balls",
      qualifyingBallLimit: 40,
      linkedRooms: ["diamond-75"],
      price: 3,
      difficulty: "Legendary",
      reward: "Life-changing",
    }),
  });
  assert.equal(createRes.status, 201);
  const createJson = await createRes.json();
  assert.equal(createJson.success, true);
  assert.equal(createJson.jackpot.name, "Diamond Stash Jackpot");
  assert.equal(createJson.jackpot.currentAmount, 15000);

  // 3. Update configuration
  const updateRes = await fetch(`${BASE_URL}/jackpots/${customId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      maximumAmount: 200000,
      contributionPercent: 3.5,
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.equal(updateJson.jackpot.maximumAmount, 200000);
  assert.equal(updateJson.jackpot.contributionPercent, 3.5);

  // 4. Add manual contribution
  const contribRes = await fetch(`${BASE_URL}/jackpots/${customId}/contribute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 2500, user: "Test Operator" }),
  });
  assert.equal(contribRes.status, 200);
  const contribJson = await contribRes.json();
  assert.equal(contribJson.jackpot.currentAmount, 17500);
  assert.equal(contribJson.jackpot.history[0].type, "Manual adjustment");
  assert.equal(contribJson.jackpot.history[0].amount, 2500);

  // 5. Trigger win / payout to player
  const winnerUser = "Ari.R";
  const walletBeforeRes = await fetch(`${BASE_URL}/wallet?username=${winnerUser}`);
  const { balance: walletBefore } = await walletBeforeRes.json();

  const triggerRes = await fetch(`${BASE_URL}/jackpots/${customId}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winnerName: winnerUser }),
  });
  assert.equal(triggerRes.status, 200);
  const triggerJson = await triggerRes.json();
  assert.equal(triggerJson.success, true);
  assert.equal(triggerJson.payout, 17500);
  assert.equal(triggerJson.jackpot.currentAmount, 15000); // reset back to resetAmount

  // Verify player received payout in wallet
  const walletAfterRes = await fetch(`${BASE_URL}/wallet?username=${winnerUser}`);
  const { balance: walletAfter } = await walletAfterRes.json();
  assert.equal(walletAfter, walletBefore + 17500);

  // 6. Clean up: Delete custom jackpot
  const deleteRes = await fetch(`${BASE_URL}/jackpots/${customId}`, {
    method: "DELETE",
  });
  assert.equal(deleteRes.status, 200);
  const deleteJson = await deleteRes.json();
  assert.equal(deleteJson.success, true);

  // Verify it is no longer in jackpots list
  const listAfterRes = await fetch(`${BASE_URL}/jackpots`);
  const listAfterJson = await listAfterRes.json();
  assert.ok(!listAfterJson.jackpots.some((j) => j.id === customId));
});

test("Maximum players capacity enforcement: blocks additional players from joining when room is full", async () => {
  // 1. Create a dedicated room with maxPlayers: 1
  const createRes = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: `cap-test-${Date.now()}`,
      name: "Capacity Test Room",
      variant: "75-Ball Pattern",
      status: "Selling Tickets",
      ticketPrice: 2,
      prize: 100,
      maxPlayers: 1,
    }),
  });
  assert.equal(createRes.status, 201);
  const createJson = await createRes.json();
  const testRoomId = createJson.room.id;
  assert.equal(createJson.room.maxPlayers, 1);

  // 2. First player (PlayerOne) buys a card -> success 201
  const playerOne = `CapOne_${Date.now()}`;
  await fetch(`${BASE_URL}/admin/players/${playerOne}/add-funds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 }),
  });

  const buyOne = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: testRoomId, count: 1, username: playerOne }),
  });
  assert.equal(buyOne.status, 201);

  // 3. Second player (PlayerTwo) attempts to buy a card -> rejected with 403
  const playerTwo = `CapTwo_${Date.now()}`;
  await fetch(`${BASE_URL}/admin/players/${playerTwo}/add-funds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 100 }),
  });

  const buyTwo = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: testRoomId, count: 1, username: playerTwo }),
  });
  assert.equal(buyTwo.status, 403);
  const buyTwoJson = await buyTwo.json();
  assert.equal(buyTwoJson.success, false);
  assert.match(buyTwoJson.error, /maximum capacity|full/i);

  // 4. First player buys another card -> allowed because they are already participating
  const buyOneAgain = await fetch(`${BASE_URL}/tickets/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: testRoomId, count: 1, username: playerOne }),
  });
  assert.equal(buyOneAgain.status, 201);
});

test("Room chat hydration supports both user and sender without slice errors", async () => {
  const res = await fetch(`${BASE_URL}/chat/trueig-90`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.messages));
  for (const m of json.messages) {
    const sender = m.user || m.sender || "Player";
    assert.ok(typeof sender === "string");
    assert.ok(sender.slice(0, 2).length > 0);
  }
});

