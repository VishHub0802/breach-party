import { advance, GameError, nextRound, ONLINE_MS, publicRoom, startGame, submitAnswer, validateName } from "../../../../lib/game";
import { identify, mutateRoom, readPayload, responseError } from "../../../../lib/room-store";
type Context={params:Promise<{code:string}>};
const headers={"Cache-Control":"no-store, max-age=0"};
function token(request:Request) {return request.headers.get("authorization")?.replace(/^Bearer /,"")||"";}
export async function GET(request:Request,context:Context) {
  try {
    const {code}=await context.params;
    const update=await mutateRoom(code.toUpperCase(),(room,now)=>{
      const player=identify(room,token(request));
      if(now-player.lastSeen>6500) player.lastSeen=now;
      return player.id;
    });
    return Response.json({room:publicRoom(update.room,update.room.players.find(p=>p.id===update.result)!,update.version,update.now)},{headers});
  } catch(error) {return responseError(error);}
}
export async function POST(request:Request,context:Context) {
  try {
    const {code}=await context.params;
    const payload=await readPayload(request);
    const joinPlayer=payload.action==="join" ? {id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID(),name:validateName(payload.name),score:0,lastSeen:Date.now()} : null;
    const update=await mutateRoom(code.toUpperCase(),(room,now)=>{
      if(joinPlayer) {
        if(room.phase!=="lobby" && room.phase!=="finished") throw new GameError("This game is underway. Join after the final scores.",409);
        room.players=room.players.filter(p=>now-p.lastSeen<ONLINE_MS*3);
        if(room.players.length>=8) throw new GameError("This room is full (8 players).",409);
        if(room.players.some(p=>p.name.toLowerCase()===joinPlayer.name.toLowerCase())) throw new GameError("That nickname is taken. Choose another.",409);
        room.players.push({...joinPlayer,lastSeen:now});return joinPlayer.id;
      }
      const player=identify(room,token(request));player.lastSeen=now;
      advance(room,now);
      if(payload.action==="leave") {
        room.players=room.players.filter(p=>p.id!==player.id);delete room.answers[player.id];
        if(room.hostId===player.id) room.hostId=room.players[0]?.id||"";
        return "left";
      }
      if(payload.game!==room.game) throw new GameError("Your screen is catching up. Try again.",409);
      if(payload.action==="answer") {
        submitAnswer(room,player,payload.game as number,payload.round as number,payload.choice as number,now);
      } else {
        if(player.id!==room.hostId) throw new GameError("Only the host can do that.",403);
        if(payload.action==="start") {
          if(room.phase!=="lobby") throw new GameError("The game has already started.",409);
          startGame(room,now);
        } else if(payload.action==="difficulty") {
          if(room.phase!=="lobby") throw new GameError("Change difficulty in the lobby before the game starts.",409);
          if(payload.difficulty!=="standard"&&payload.difficulty!=="hard") throw new GameError("Choose Standard or Hard mode.",400);
          room.difficulty=payload.difficulty;
        } else if(payload.action==="next") {
          if(room.phase!=="reveal" || payload.round!==room.round) throw new GameError("The next round isn't ready yet.",409);
          nextRound(room,now);
        } else if(payload.action==="replay") {
          if(room.phase!=="finished") throw new GameError("Finish this game first.",409);
          room.phase="lobby";room.plan=[];room.round=0;room.deadline=0;room.answers={};
          room.players.forEach(p=>p.score=0);
        } else throw new GameError("Unknown game action.");
      }
      return player.id;
    });
    if(update.result==="left") return Response.json({left:true},{headers});
    const player=update.room.players.find(p=>p.id===update.result)!;
    return Response.json({room:publicRoom(update.room,player,update.version,update.now),...(joinPlayer?{session:{code:update.room.code,token:joinPlayer.token,playerId:joinPlayer.id}}:{})},{headers});
  } catch(error) {return responseError(error);}
}
