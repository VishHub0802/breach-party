import { getRawDb } from "../db";
import { advance, GameError, makeRoom, publicRoom, ROOM_MS, type Player, type Room } from "./game";
type StoredRoom={state:string;version:number;expires_at:number};
function codeValue() {
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values=new Uint8Array(6);crypto.getRandomValues(values);
  return [...values].map(v=>alphabet[v%alphabet.length]).join("");
}
export async function createRoom(name:string) {
  const db=getRawDb(); const now=Date.now();
  // Bounded cleanup keeps old sessions from accumulating indefinitely.
  await db.prepare("DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires_at < ? LIMIT 50)").bind(now).run();
  for(let attempt=0;attempt<5;attempt++) {
    const {room,player}=makeRoom(codeValue(),name,now);
    const result=await db.prepare("INSERT OR IGNORE INTO rooms (code,state,version,expires_at) VALUES (?,?,0,?)").bind(room.code,JSON.stringify(room),room.expiresAt).run();
    if(result.meta.changes) return {session:{code:room.code,token:player.token,playerId:player.id},room:publicRoom(room,player,0,now)};
  }
  throw new GameError("Couldn't create a room. Please try again.",503);
}
// Compare-and-swap serializes simultaneous answers, joins, and clock transitions.
// D1 owns the shared state; browser tabs never act as the room server.
export async function mutateRoom<T>(code:string, mutate:(room:Room, now:number)=>T) {
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new GameError("Enter a valid six-character room code.",400);
  const db=getRawDb();
  for(let attempt=0;attempt<8;attempt++) {
    const stored=await db.prepare("SELECT state,version,expires_at FROM rooms WHERE code=?").bind(code).first<StoredRoom>();
    const now=Date.now();
    if(!stored || stored.expires_at < now) throw new GameError("Room not found or expired. Check the code or create a new room.",404);
    const room=JSON.parse(stored.state) as Room;
    const result=mutate(room,now);
    advance(room,now);
    const serialized=JSON.stringify(room);
    if(serialized===stored.state) return {room,version:stored.version,result,now};
    room.expiresAt=now+ROOM_MS;
    const updated=await db.prepare("UPDATE rooms SET state=?,version=version+1,expires_at=? WHERE code=? AND version=?").bind(JSON.stringify(room),room.expiresAt,code,stored.version).run();
    if(updated.meta.changes) return {room,version:stored.version+1,result,now};
  }
  throw new GameError("The room is busy. Please try again.",503);
}
export function identify(room:Room,token:string):Player {
  const player=room.players.find(p=>p.token===token);
  if(!player) throw new GameError("Your room session ended. Join again with the room code.",401);
  return player;
}
export function responseError(error:unknown) {
  if(error instanceof GameError) return Response.json({error:error.message},{status:error.status,headers:{"Cache-Control":"no-store"}});
  console.error("Game request failed",error);
  return Response.json({error:"The game is temporarily unavailable. Try again in a moment."},{status:503,headers:{"Cache-Control":"no-store"}});
}
export async function readPayload(request:Request):Promise<Record<string,unknown>> {
  if(Number(request.headers.get("content-length")||0)>2048) throw new GameError("Request too large.",413);
  if(!request.headers.get("content-type")?.includes("application/json")) throw new GameError("Expected game data.",415);
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin) throw new GameError("Open the game directly to join.",403);
  const raw=await request.text();if(raw.length>2048) throw new GameError("Request too large.",413);
  try {const payload=JSON.parse(raw);if(!payload || Array.isArray(payload) || typeof payload!=="object") throw new Error();return payload;} catch {throw new GameError("Couldn't read that request.",400);}
}
