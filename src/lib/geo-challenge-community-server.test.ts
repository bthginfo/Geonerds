import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ session: { uid: "alice", name: "Alice" } as {uid:string;name:string}|null,
  rows: [] as Record<string,unknown>[][], calls: [] as {text:string;values:unknown[]}[] }));
async function query(parts: TemplateStringsArray, ...values: unknown[]) {
  const text = parts.join("?");
  state.calls.push({text,values});
  if (text.includes("INSERT INTO gn_challenge_notifications")) return [];
  return state.rows.shift() ?? [];
}
const sql = Object.assign(query, {begin: async <T>(work:(tx:typeof query)=>Promise<T>) => work(query)});
vi.mock("./db", () => ({isDbConfigured:true,getDb:async()=>sql}));
vi.mock("./auth", () => ({getSession:async()=>state.session,newId:()=>"new-invite"}));
vi.mock("./ratelimit", () => ({clientIp:()=>"127.0.0.1",rateLimit:async()=>({ok:true,retryAfter:10})}));
import { actGeoChallenge, createGeoChallenge, getGeoChallenge, listGeoChallengeNotifications,
  listOpenGeoChallenges, readGeoChallengeNotification, serializeGeoChallenge, startGeoChallenge, submitGeoChallenge } from "./geo-challenge-server";
import { guestCookieName, guestTokenHash } from "./geo-challenge-guest";
import { CHALLENGE_INVITE_TTL_MS, CHALLENGE_PLAY_TTL_MS } from "./challenges";

const id = "duel";
const ctx = {params:Promise.resolve({id})};
const token = "a".repeat(64);
const config = {gameId:"flags",difficulty:"medium",mode:"choice",rounds:10,timed:false,variant:"world"};
const base = {id,challenger_id:"alice",opponent_id:null,challenger_name:"Alice",opponent_name:null,
  game_id:"flags",difficulty:"medium",mode:"choice",rounds:10,timed:false,variant:"world",seed:"private-seed",
  invitation_type:"link",status:"pending",winner_id:null,winner_side:null,guest_name:null,guest_token_hash:null,
  expires_at:new Date(Date.now()+60_000).toISOString(),created_at:new Date().toISOString()};
function req(body?:unknown, guestToken?:string) {
  return new Request(`https://geo-nerds.com/api/challenges/${id}`, {method:body===undefined?"GET":"POST",
    headers:{Origin:"https://geo-nerds.com",...(guestToken?{Cookie:`${guestCookieName(id)}=${guestToken}`}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
const joined = () => ({...base,status:"active",guest_name:"Visitor",guest_token_hash:guestTokenHash(token)});
const run = {...config,score:1000,correct:7,total:10,bestStreak:4,durationMs:30_000,attemptToken:"attempt-token"};
const hostAttempt = {user_id:"alice",name:"Alice",score:900,correct:6,total:10,best_streak:3,duration_ms:20_000};
const guestAttempt = {score:1000,correct:7,total:10,best_streak:4,duration_ms:30_000};
beforeEach(()=>{state.session={uid:"alice",name:"Alice"};state.rows=[];state.calls=[];});

describe("community challenge invitations",()=>{
  it("creates an unclaimed share link with a three-day invitation deadline",async()=>{
    state.rows=[[{id:"alice",name:"Alice"}],[{count:0}],[]];
    const before=Date.now();
    const response=await createGeoChallenge(req({...config,invitationType:"link"}));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ok:true,id:"new-invite",sharePath:"/challenges?invite=new-invite"});
    const insert=state.calls.find(c=>c.text.includes("INSERT INTO gn_challenges"))!;
    expect(insert.values[2]).toBeNull();
    expect((insert.values[11] as Date).getTime()-before).toBeGreaterThanOrEqual(CHALLENGE_INVITE_TTL_MS);
    expect((insert.values[11] as Date).getTime()-before).toBeLessThan(CHALLENGE_INVITE_TTL_MS+2000);
    expect(state.calls[0].text).toContain("FOR UPDATE");
  });
  it("chooses a random registered opponent on the server and notifies that account",async()=>{
    state.rows=[[{id:"alice",name:"Alice"}],[{id:"bob",name:"Bob"}],[{count:0}],[],[]];
    const response=await createGeoChallenge(req({...config,invitationType:"random",opponentName:"InjectedName"}));
    expect(response.status).toBe(201);
    expect((await response.json()).opponentName).toBe("Bob");
    const selection=state.calls.find(c=>c.text.includes("SELECT u.id,u.name"))!;
    expect(selection.text).toContain("u.id<>?");
    expect(selection.text).toContain("NOT EXISTS");
    expect(selection.text).toContain("random()");
    expect(selection.values).not.toContain("injectedname");
    const notice=state.calls.find(c=>c.text.includes("INSERT INTO gn_challenge_notifications"))!;
    expect(notice.values).toContain("bob");
    expect(notice.values).toContain("invited");
    expect(notice.text).toContain("DO NOTHING");
  });
  it("does not create fake/random opponents when there is nobody eligible",async()=>{
    state.rows=[[{id:"alice",name:"Alice"}],[]];
    const response=await createGeoChallenge(req({...config,invitationType:"random"}));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("no_random_opponents");
    expect(state.calls.some(c=>c.text.includes("INSERT INTO"))).toBe(false);
  });
  it("rejects a stale authenticated account and duplicate pending pairs",async()=>{
    expect((await createGeoChallenge(req({...config,invitationType:"open"}))).status).toBe(401);
    state.rows=[[{id:"alice",name:"Alice"}],[{id:"bob",name:"Bob"}],[{count:0}],[{id:"existing"}]];
    const duplicate=await createGeoChallenge(req({...config,opponentName:"Bob"}));
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error).toBe("already_challenged");
  });
  it("public previews never expose shared seeds, attempts or private results",async()=>{
    state.session=null;state.rows=[[],[{...base,status:"active",guest_name:"Other guest",viewer_attempted:true,attempt_count:2}]];
    const response=await getGeoChallenge(req(),ctx);
    const view=(await response.json()).challenge;
    expect(view).toMatchObject({seed:null,viewerRole:"visitor",viewerAttempted:false,attemptCount:0,viewerOutcome:null});
    expect(view.attempts).toBeUndefined();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });
  it("shows only genuinely open unclaimed seats, without seeds",async()=>{
    state.session=null;state.rows=[[],[{...base,invitation_type:"open"}]];
    const result=await (await listOpenGeoChallenges(req())).json();
    expect(result.challenges[0]).toMatchObject({direction:"open",seed:null,viewerRole:"visitor",canAccept:true});
    const listing=state.calls.find(c=>c.text.includes("ORDER BY c.created_at DESC LIMIT 50"))!;
    expect(listing.text).toContain("c.opponent_id IS NULL AND c.guest_name IS NULL");
  });
  it("atomically claims a public seat for one registered player, then allows seven days to finish",async()=>{
    state.session={uid:"bob",name:"Bob"};
    state.rows=[[{...base,invitation_type:"open"}],[{id:"bob",name:"Bob"}],[],[],[]];
    const before=Date.now();
    expect((await actGeoChallenge(req({action:"accept"}),ctx)).status).toBe(200);
    expect(state.calls[0].text).toContain("FOR UPDATE");
    const activated=state.calls.find(c=>c.text.includes("SET status=?"))!;
    const expiry=activated.values.find(v=>v instanceof Date && v.getTime()>before+1000) as Date;
    expect(expiry.getTime()-before).toBeGreaterThanOrEqual(CHALLENGE_PLAY_TTL_MS);
    state.session={uid:"charlie",name:"Charlie"};
    state.rows=[[{...base,status:"active",opponent_id:"bob"}]];
    const later=await actGeoChallenge(req({action:"accept"}),ctx);
    expect(later.status).toBe(409);
    expect((await later.json()).error).toBe("invitation_taken");
  });
  it("denies expired invitations and publishes an expiry notification once",async()=>{
    state.session=null;state.rows=[[{...base,expires_at:"2020-01-01T00:00:00Z"}],[]];
    const response=await actGeoChallenge(req({action:"accept",guestName:"Visitor"}),ctx);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("expired");
    expect(state.calls.some(c=>c.text.includes("SET guest_name"))).toBe(false);
    expect(state.calls.find(c=>c.text.includes("INSERT INTO gn_challenge_notifications"))?.values).toContain("expired");
  });
});

describe("challenge-bound guest capabilities",()=>{
  it("accepts a share-link guest and issues a secure, HttpOnly challenge-scoped capability",async()=>{
    state.session=null;state.rows=[[{...base}],[],[]];
    const response=await actGeoChallenge(req({action:"accept",guestName:"Visitor"}),ctx);
    expect(response.status).toBe(200);
    const cookie=response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("HttpOnly");expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Path=/api/challenges/duel");
    const raw=cookie.match(/=([a-f0-9]{64});/)![1];
    const guestUpdate=state.calls.find(c=>c.text.includes("SET guest_name"))!;
    expect(guestUpdate.values).toContain(guestTokenHash(raw));
    expect(guestUpdate.values).not.toContain(raw);
    expect(JSON.stringify(await response.json())).not.toContain(raw);
  });
  it("does not allow anonymous users to join the registered open lobby",async()=>{
    state.session=null;state.rows=[[{...base,invitation_type:"open"}]];
    const response=await actGeoChallenge(req({action:"accept",guestName:"Visitor"}),ctx);
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("guest_requires_link");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
  it("rejects invalid guest names and an already-claimed guest link",async()=>{
    state.session=null;state.rows=[[{...base}]];
    const invalid=await actGeoChallenge(req({action:"accept",guestName:"x"}),ctx);
    expect((await invalid.json()).error).toBe("invalid_guest_name");
    state.rows=[[joined()]];
    const taken=await actGeoChallenge(req({action:"accept",guestName:"Another"}),ctx);
    expect((await taken.json()).error).toBe("invitation_taken");
    expect(state.calls.some(c=>c.text.includes("SET guest_name"))).toBe(false);
  });
  it("cannot authorize a guest using their display name, an absent token, or a forged cookie",async()=>{
    state.session=null;
    expect((await startGeoChallenge(req({guestName:"Visitor"}),ctx)).status).toBe(401);
    state.rows=[[joined()]];
    expect((await startGeoChallenge(req({},"b".repeat(64)),ctx)).status).toBe(404);
    expect(state.calls.some(c=>c.text.includes("INSERT INTO gn_challenge_guest_starts"))).toBe(false);
  });
  it("starts an authorized guest's own single attempt without writing a registered-user attempt",async()=>{
    state.session=null;state.rows=[[joined()],[],[{token:"same-attempt"}]];
    expect(await (await startGeoChallenge(req({},token),ctx)).json()).toEqual({ok:true,attemptToken:"same-attempt"});
    const start=state.calls.find(c=>c.text.includes("INSERT INTO gn_challenge_guest_starts"))!;
    expect(start.text).toContain("SET token=gn_challenge_guest_starts.token");
    expect(start.text).not.toContain("started_at=");
    expect(state.calls.some(c=>c.text.includes("INSERT INTO gn_challenge_starts"))).toBe(false);
  });
  it("recognizes a guest victory as a victory, never as a draw or ranked account score",async()=>{
    state.session=null;
    const result={...joined(),status:"resolved",winner_side:"opponent",viewer_attempted:true,attempt_count:2};
    state.rows=[[joined()],[],[{token:"attempt-token",started_at:new Date(Date.now()-35_000).toISOString()}],[],
      [hostAttempt],[guestAttempt],[],[result],[hostAttempt],[guestAttempt]];
    const response=await submitGeoChallenge(req(run,token),ctx);
    expect(response.status).toBe(200);
    const data=await response.json();
    expect(data.challenge).toMatchObject({viewerIsGuest:true,viewerRole:"opponent",viewerKey:"guest:duel",viewerOutcome:"win",winnerName:"Visitor"});
    expect(data.challenge.attempts.find((a:{guest?:boolean})=>a.guest).mine).toBe(true);
    const resolution=state.calls.find(c=>c.text.includes("status='resolved'"))!;
    expect(resolution.values[0]).toBeNull();expect(resolution.values[1]).toBe("opponent");
    expect(state.calls.some(c=>c.text.includes("INSERT INTO gn_scores")||c.text.includes("INSERT INTO gn_challenge_attempts"))).toBe(false);
    expect(serializeGeoChallenge(result,"alice").viewerOutcome).toBe("loss");
  });
  it("rejects an oversized anonymous body even without Content-Length",async()=>{
    state.session=null;
    const response=await actGeoChallenge(req({action:"accept",guestName:"x".repeat(17_000)}),ctx);
    expect(response.status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });
});

describe("durable challenge notifications",()=>{
  it("only lists the authenticated account's unread events and checks expired invites first",async()=>{
    state.rows=[[],[{id:"a".repeat(32),challenge_id:id,kind:"accepted",actor_name:"Bob",game_id:"flags",created_at:new Date().toISOString(),read_at:null}]];
    const response=await listGeoChallengeNotifications();
    expect((await response.json()).notifications[0]).toMatchObject({kind:"accepted",actorName:"Bob",challengeId:id,readAt:null});
    const listing=state.calls.find(c=>c.text.includes("SELECT id,challenge_id,kind"))!;
    expect(listing.values).toContain("alice");expect(listing.text).toContain("read_at IS NULL");
  });
  it("preserves read receipts and cannot dismiss another account's event",async()=>{
    const context={params:Promise.resolve({id:"a".repeat(32)})};
    expect((await readGeoChallengeNotification(req({}),context)).status).toBe(404);
    expect(state.calls[0].text).toContain("COALESCE(read_at,now())");
    expect(state.calls[0].values).toContain("alice");
    state.rows=[[{id:"a".repeat(32)}]];
    expect((await readGeoChallengeNotification(req({}),context)).status).toBe(200);
    expect((await readGeoChallengeNotification(req({}),{params:Promise.resolve({id:"all"})})).status).toBe(200);
  });
});
