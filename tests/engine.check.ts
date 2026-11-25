// Self-check for the engine's trust boundary: sessions, signed mandates, spending limits, the server stop.
import assert from "node:assert/strict";
import { runEngine, type EngineRequest } from "../src/lib/engine/engine";
const base = { auditHead: null, config: { killSwitch: false, disabledServices: [], connectorHealth: {}, policyVersion: "test" } };
const call = (r: Partial<EngineRequest>) => runEngine({ ...base, ...r } as EngineRequest);

// authentication alone grants nothing, and nothing person-scoped runs without it
assert.equal(call({ action: "grant", personaId: "faisal", serviceId: "driving_license", targetId: "dl", grant: { actions: ["read"], hours: 1 } }).error?.code, "SESSION_REQUIRED");

const login = call({ action: "login", personaId: "faisal" });
const session = login.session!;
assert.ok(session, "login issues a session");
assert.equal(call({ action: "grant", session: session + "x", serviceId: "driving_license", targetId: "dl", grant: { actions: ["read"], hours: 1 } }).error?.code, "SESSION_REQUIRED", "a forged session is refused");

// a session cannot act for another person
const other = call({ action: "login", personaId: "noura" }).session!;
assert.equal(call({ action: "grant", session: other, personaId: "faisal", serviceId: "driving_license", targetId: "dl", grant: { actions: ["read"], hours: 1 } }).error?.code, "WRONG_PERSON");

// mandates are signed: a copy with a later expiry is rejected
const g = call({ action: "grant", session, serviceId: "driving_license", targetId: "dl", grant: { actions: ["read", "prepare", "submit", "pay"], hours: 1, spendLimit: 40 } });
assert.ok(g.mandate?.sig, "granted mandate is signed");
const forged = { ...g.mandate!, expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() };
assert.equal(call({ action: "start", session, serviceId: "driving_license", targetId: "dl", mandate: forged }).error?.code, "MANDATE_TAMPERED");

// the spending limit is enforced by the policy engine at payment
let tx = call({ action: "start", session, serviceId: "driving_license", targetId: "dl", mandate: g.mandate }).tx!;
assert.equal(tx.state, "PREPARED");
tx = call({ action: "confirm", session, tx, mandate: g.mandate, durationIndex: 3 }).tx!; // 10 years: SAR 400
const paid = call({ action: "pay", session, tx, mandate: g.mandate });
assert.equal(paid.tx?.state, "BLOCKED", "SAR 400 is above the SAR 40 limit");
assert.ok(paid.events.some((e) => e.data?.code === "SPEND_LIMIT"));

// the operator's server-side stop holds even if the browser sends killSwitch: false
process.env.PLATFORM_KILL_SWITCH = "1";
const stopped = call({ action: "start", session, serviceId: "driving_license", targetId: "dl", mandate: g.mandate });
assert.equal(stopped.tx?.state, "BLOCKED");
assert.ok(stopped.events.some((e) => e.data?.code === "KILL_SWITCH"));
delete process.env.PLATFORM_KILL_SWITCH;

console.log("engine.check ok — sessions, signed mandates, spending limit and server stop hold");
