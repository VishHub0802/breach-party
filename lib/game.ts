import { questions } from "./questions";
import { hardQuestions } from "./hard-questions";
import { TOTAL_ROUNDS, GAME_MODES, REVEAL_SECONDS } from "./protocol";
import type { Phase, PublicRoom, Difficulty } from "./protocol";

export const REVEAL_MS = REVEAL_SECONDS * 1000;
export const ONLINE_MS = 25_000;
export const ROOM_MS = 24 * 60 * 60 * 1000;
export interface Player { id: string; token: string; name: string; score: number; lastSeen: number }
export interface Answer { choice: number; at: number; points: number; correct: boolean }
export interface Room {
  code: string; hostId: string; players: Player[]; phase: Phase; game: number;
  round: number; plan: { question: number; order: number[] }[]; deadline: number;
  startedAt: number; answers: Record<string, Answer>; expiresAt: number; difficulty?: Difficulty;
}
export function difficultyOf(room: Room): Difficulty { return room.difficulty === "hard" ? "hard" : "standard"; }
export function roundMs(room: Room) { return GAME_MODES[difficultyOf(room)].answerSeconds * 1000; }
export class GameError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const value = new Uint32Array(1); crypto.getRandomValues(value);
    const j = value[0] % (i + 1); [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function makeRoom(code: string, name: string, now: number): { room: Room; player: Player } {
  const player = { id: crypto.randomUUID(), token: crypto.randomUUID()+crypto.randomUUID(), name, score: 0, lastSeen: now };
  return {player, room:{code,hostId:player.id,players:[player],phase:"lobby",game:0,round:0,plan:[],deadline:0,startedAt:0,answers:{},expiresAt:now+ROOM_MS,difficulty:"standard"}};
}
export function validateName(input: unknown): string {
  if (typeof input !== "string") throw new GameError("Enter a nickname.");
  const name = input.trim().replace(/\s+/g," ");
  if (name.length < 1 || name.length > 18 || /[\x00-\x1f\x7f]/.test(name)) throw new GameError("Use a nickname from 1 to 18 characters.");
  return name;
}
export function currentQuestion(room: Room) {
  const plan = room.plan[room.round];
  if (!plan) return null;
  const q = (difficultyOf(room)==="hard"?hardQuestions:questions)[plan.question];
  return { ...q, options: plan.order.map(i => q.options[i]), correct: plan.order.indexOf(q.correct) };
}
export function advance(room: Room, now: number) {
  const active = room.players.filter(p=>now-p.lastSeen<ONLINE_MS);
  if (!active.some(p=>p.id===room.hostId) && active.length) room.hostId=active[0].id;
  // One server-owned transition at a time; no client controls the clock or score.
  if (room.phase === "question" && (now >= room.deadline || (active.length > 0 && active.every(p=>room.answers[p.id])))) {
    room.phase="reveal"; room.deadline=now+REVEAL_MS;
  } else if (room.phase === "reveal" && now >= room.deadline) nextRound(room,now);
}
export function nextRound(room: Room, now: number) {
  if (room.round+1 >= room.plan.length) {room.phase="finished";room.deadline=0;return;}
  room.round++;room.phase="question";room.startedAt=now;room.deadline=now+roundMs(room);room.answers={};
}
export function startGame(room: Room, now: number) {
  if (room.players.filter(p=>now-p.lastSeen<ONLINE_MS).length < 2) throw new GameError("Invite at least one other player before starting.",409);
  const categories=["Spot the trap","Stop the breach","Build the shield"];
  const bank=difficultyOf(room)==="hard"?hardQuestions:questions;
  const selected=shuffled(categories).flatMap((category,index)=>{
    const count=Math.floor(TOTAL_ROUNDS/categories.length)+(index<TOTAL_ROUNDS%categories.length?1:0);
    return shuffled(bank.map((q,i)=>({q,i})).filter(x=>x.q.category===category)).slice(0,count).map(x=>x.i);
  });
  room.plan=shuffled(selected).map(question=>({question,order:shuffled(bank[question].options.map((_,i)=>i))}));
  room.players.forEach(p=>p.score=0);room.game++;room.phase="question";room.round=0;room.answers={};room.startedAt=now;room.deadline=now+roundMs(room);
}
export function submitAnswer(room: Room, player: Player, game: number, round: number, choice: number, now: number) {
  if (game!==room.game || round!==room.round) throw new GameError("That round has ended. Your screen is catching up.",409);
  if (room.answers[player.id]) return; // Retries cannot earn points twice or change an answer.
  if (room.phase!=="question" || now>=room.deadline) throw new GameError("Time's up! Wait for the reveal.",409);
  const q=currentQuestion(room)!;
  if (!Number.isInteger(choice) || choice<0 || choice>=q.options.length) throw new GameError("Choose one of the answers shown.");
  const correct=choice===q.correct;
  const points=correct ? 1000+Math.round(500*Math.max(0,Math.min(1,(room.deadline-now)/roundMs(room)))) : 0;
  room.answers[player.id]={choice,at:now,points,correct}; player.score+=points;
}
export function publicRoom(room: Room, viewer: Player, version: number, now: number): PublicRoom {
  const q=currentQuestion(room);
  const reveal=room.phase==="reveal" || room.phase==="finished";
  return {code:room.code,phase:room.phase,game:room.game,round:room.round,totalRounds:room.plan.length||TOTAL_ROUNDS,difficulty:difficultyOf(room),hostId:room.hostId,you:viewer.id,serverNow:now,deadline:room.deadline,version,
    players:room.players.map(p=>({id:p.id,name:p.name,score:reveal?p.score:p.score-(room.answers[p.id]?.points??0),connected:now-p.lastSeen<ONLINE_MS,answered:!!room.answers[p.id],choice:reveal?(room.answers[p.id]?.choice??null):null,points:reveal?(room.answers[p.id]?.points??0):0,correct:reveal?(room.answers[p.id]?.correct??null):null})),
    question: q?{category:q.category,title:q.title,artifactLabel:q.artifactLabel,artifact:q.artifact,prompt:q.prompt,options:q.options,...(reveal?{correct:q.correct,explanation:q.explanation,concept:q.concept}:{})}:null,
    myChoice:room.answers[viewer.id]?.choice??null};
}
