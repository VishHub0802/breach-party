export const TOTAL_ROUNDS = 10;
export const REVEAL_SECONDS = 15;
export const GAME_MODES = {
  standard: { label: "Standard", answerSeconds: 25, estimate: "6–7 minutes", description: "Everyday cyber dilemmas. No expertise required." },
  hard: { label: "Hard", answerSeconds: 45, estimate: "9–10 minutes", description: "Technical scenarios with logs, protocols, and security controls." },
} as const;
export type Difficulty = keyof typeof GAME_MODES;
export type Category = "Spot the trap" | "Stop the breach" | "Build the shield";
export type Phase = "lobby" | "question" | "reveal" | "finished";
export interface Session { code: string; token: string; playerId: string }
export interface PublicPlayer {
  id: string; name: string; score: number; connected: boolean;
  answered: boolean; choice: number | null; points: number; correct: boolean | null;
}
export interface PublicRoom {
  code: string; phase: Phase; game: number; round: number; totalRounds: number; difficulty: Difficulty;
  hostId: string; you: string; serverNow: number; deadline: number; version: number;
  players: PublicPlayer[];
  question: null | { category: Category; title: string; artifactLabel: string;
    artifact: string; prompt: string; options: string[]; correct?: number; explanation?: string; concept?: string };
  myChoice: number | null;
}
