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
