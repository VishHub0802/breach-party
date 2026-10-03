"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, Users, Zap, Mail, LockKeyhole, Check, Copy, Trophy, Wifi, WifiOff, LogOut, CheckCircle2, XCircle, RotateCcw, Timer, Radio, Moon, Sun } from "lucide-react";
import type { PublicRoom, Session, Category, Difficulty } from "../lib/protocol";
import { TOTAL_ROUNDS, GAME_MODES, REVEAL_SECONDS } from "../lib/protocol";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";

const STORAGE_KEY="breach-party-session-v1";
const THEME_KEY="breach-party-theme-v1";
type GameResponse={room:PublicRoom;session:Session;error?:string;left?:boolean};
const modes: {category:Category;description:string;icon:typeof Mail;className:string}[]=[
  {category:"Spot the trap",description:"Suspicious message or safe move?",icon:Mail,className:"trap"},
  {category:"Stop the breach",description:"Something went wrong. Act fast.",icon:Zap,className:"breach"},
  {category:"Build the shield",description:"Choose the stronger defense.",icon:Shield,className:"shield"},
];
function mode(category:Category) {return modes.find(m=>m.category===category)!;}
function formatScore(score:number) {return score.toLocaleString("en-US");}
function PlayerAvatar({name}:{name:string;index:number}) {
  return <span className="avatar">{name.slice(0,1).toUpperCase()}</span>;
}
function Briefing() {
  return <section className="briefing"><div className="eyebrow">THE MISSION</div><h2>Think fast.<br/>{" "}Stay secure.</h2><p className="briefing-intro">{TOTAL_ROUNDS} cyber dilemmas. Standard or Hard mode. Pick the safest response before the clock runs out.</p>
    <div className="mode-list">{modes.map(({category,description,icon:Icon,className})=><div className="mode-row" key={category}><span className={`mode-icon ${className}`}><Icon size={23}/></span><div><h3>{category}</h3><p>{description}</p></div><span className="mode-count">{Math.floor(TOTAL_ROUNDS/modes.length)}–{Math.ceil(TOTAL_ROUNDS/modes.length)}</span></div>)}</div>
    <div className="scoring"><div><strong>1,000</strong><span>for a safe answer</span></div><span className="scoring-plus">+</span><div><strong>500</strong><span>max speed bonus</span></div></div>
  </section>;
}
export default function Home() {
  const [theme,setTheme]=useState<"light"|"dark">("light");
  const [session,setSession]=useState<Session|null>(null);const [room,setRoom]=useState<PublicRoom|null>(null);
  const [name,setName]=useState("");const [code,setCode]=useState("");const [tab,setTab]=useState<"create"|"join">("create");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [fatal,setFatal]=useState(false);
  const [live,setLive]=useState(false);const [copied,setCopied]=useState(false);const [tick,setTick]=useState(Date.now());
  const [restoring,setRestoring]=useState(true);const [pendingChoice,setPendingChoice]=useState<number|null>(null);
  const offset=useRef(0);const currentRoom=useRef<PublicRoom|null>(null);const fetching=useRef(false);const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    setTheme(document.documentElement.dataset.theme==="dark"?"dark":"light");
    const syncTheme=(event:StorageEvent)=>{
      if(event.key!==THEME_KEY&&event.key!==null)return;
      const next=event.newValue==="dark"?"dark":"light";
      document.documentElement.dataset.theme=next;setTheme(next);
    };
    window.addEventListener("storage",syncTheme);
    return()=>window.removeEventListener("storage",syncTheme);
  },[]);
  function toggleTheme() {
    const next=theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;setTheme(next);
    try {localStorage.setItem(THEME_KEY,next);} catch {}
  }
  const accept=useCallback((next:PublicRoom)=>{
    if(currentRoom.current?.code===next.code && currentRoom.current.version>next.version) return;
    offset.current=next.serverNow-Date.now();currentRoom.current=next;setRoom(next);setLive(true);
  },[]);
  useEffect(()=>{
    try {
      const saved=sessionStorage.getItem(STORAGE_KEY);
      if(saved) {const parsed=JSON.parse(saved);if(typeof parsed.code==="string"&&typeof parsed.token==="string"&&typeof parsed.playerId==="string") setSession(parsed);}
      const invited=new URLSearchParams(window.location.search).get("room");
      if(invited) {setTab("join");setCode(invited.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6));}
    } catch {}
    setRestoring(false);
  },[]);
  useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),200);return()=>clearInterval(timer);},[]);
  const reset=useCallback(()=>{
    try {sessionStorage.removeItem(STORAGE_KEY);} catch {}
    setSession(null);currentRoom.current=null;setRoom(null);setLive(false);setFatal(false);setError("");setPendingChoice(null);
  },[]);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    if(!session||fetching.current) return;fetching.current=true;
    try {
      const response=await fetch(`/api/rooms/${session.code}`,{headers:{Authorization:`Bearer ${session.token}`},cache:"no-store",signal});
      const data=await response.json() as GameResponse;
      if(!response.ok) {if(response.status===401||response.status===404) setFatal(true);throw new Error(data.error||"Couldn't sync the room.");}
      if(mounted.current && !signal?.aborted) {accept(data.room);setError("");setFatal(false);}
    } catch(err) {if(!signal?.aborted && mounted.current) {setLive(false);setError(err instanceof Error?err.message:"Connection lost. Retrying…");}}
    finally {fetching.current=false;}
  },[session,accept]);
  useEffect(()=>{
    if(!session) return;
    const controller=new AbortController();void refresh(controller.signal);
    const timer=setInterval(()=>void refresh(controller.signal),1000);
    const onFocus=()=>void refresh(controller.signal);window.addEventListener("focus",onFocus);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener("focus",onFocus);};
  },[session,refresh]);
  useEffect(()=>{setPendingChoice(null);},[room?.game,room?.round,room?.phase]);
  async function enter(event:React.FormEvent) {
    event.preventDefault();if(busy) return;setBusy(true);setError("");setFatal(false);
    try {
      const response=await fetch(tab==="create"?"/api/rooms":`/api/rooms/${code.toUpperCase()}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,...(tab==="join"?{action:"join"}:{})})});
      const data=await response.json() as GameResponse;if(!response.ok) throw new Error(data.error||"Couldn't enter the room.");
      try {sessionStorage.setItem(STORAGE_KEY,JSON.stringify(data.session));} catch {}
      currentRoom.current=null;setSession(data.session);accept(data.room);
    } catch(err) {setError(err instanceof Error?err.message:"Couldn't connect. Please try again.");} finally {setBusy(false);}
  }
  async function action(actionName:string,choice?:number,difficulty?:Difficulty) {
    if(!session||!room||busy) return;setBusy(true);setError("");if(choice!==undefined) setPendingChoice(choice);
    try {
      const response=await fetch(`/api/rooms/${session.code}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.token}`},body:JSON.stringify({action:actionName,game:room.game,round:room.round,...(choice!==undefined?{choice}:{}),...(difficulty?{difficulty}:{})})});
      const data=await response.json() as GameResponse;if(!response.ok) throw new Error(data.error||"Couldn't save that move.");
      if(actionName==="leave") {reset();return;}accept(data.room);
    } catch(err) {setPendingChoice(null);setError(err instanceof Error?err.message:"Couldn't connect. Try again.");void refresh();}
    finally {setBusy(false);}
  }
  async function copyInvite() {
    if(!room) return;
    try {await navigator.clipboard.writeText(`${window.location.origin}/?room=${room.code}`);setCopied(true);setTimeout(()=>setCopied(false),2500);}
    catch {setError(`Share this room code: ${room.code}`);}
  }
  const isHost=room?.you===room?.hostId;const host=room?.players.find(p=>p.id===room.hostId);const me=room?.players.find(p=>p.id===room.you);
  const seconds=Math.max(0,Math.ceil(((room?.deadline||0)-(tick+offset.current))/1000));
  const answered=room?.players.filter(p=>p.answered).length||0;const activePlayers=room?.players.filter(p=>p.connected).length||0;
  const sorted=room?[...room.players].sort((a,b)=>b.score-a.score):[];const top=sorted[0]?.score||0;const winners=sorted.filter(p=>p.score===top);
  const q=room?.question;const chosen=room?.myChoice??pendingChoice;const reveal=room?.phase==="reveal";const myCorrect=me?.correct;
  const difficulty=room?.difficulty||"standard";const gameMode=GAME_MODES[difficulty];
  const connection=<span className={`connection ${live?"connected":""}`}>{live?<Wifi size={15}/>:<WifiOff size={15}/>}<span>{live?"Live room":"Connecting"}</span></span>;

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="Breach Party home">Breach Party.</a><div className="header-right">{session?connection:<span className="header-label">FIELD<br/>EXERCISE</span>}<button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme==="dark"?"light":"dark"} mode`}>{theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}<span>{theme==="dark"?"Light mode":"Dark mode"}</span></button>{room&&<button className="icon-button leave-button" onClick={()=>void action("leave")} disabled={busy} aria-label="Leave room"><LogOut size={18}/><span>Leave</span></button>}</div></header>
    {error&&<div className="error-banner" role="alert"><span>{error}</span>{fatal?<button onClick={reset}>Back to join</button>:session&&<button onClick={()=>void refresh()}>Retry</button>}</div>}
    {restoring || (session&&!room&&!fatal)?<main className="loading-screen"><Radio size={38}/><h1>Connecting to your crew…</h1><p>Your room will appear in a moment.</p></main>:
    !session||fatal?<main className="home-grid"><section className="start-panel"><div className="eyebrow"><span className="small-line"/> 2–8 PLAYERS · 10 ROUNDS</div><h1 className="game-title">Breach<br/><span>Party.</span></h1><p className="start-description">Rally your crew. Outsmart the threats.<br/>Choose Standard or Hard in the lobby.</p><p className="mode-estimate">Standard: about {GAME_MODES.standard.estimate}<br/>Hard: about {GAME_MODES.hard.estimate}</p>
      <form className="entry-form" onSubmit={enter}><div className="entry-tabs" role="tablist" aria-label="Room action"><button type="button" role="tab" aria-selected={tab==="create"} className={tab==="create"?"active":""} onClick={()=>setTab("create")}>Create a room</button><button type="button" role="tab" aria-selected={tab==="join"} className={tab==="join"?"active":""} onClick={()=>setTab("join")}>Join a room</button></div><label htmlFor="nickname">Your nickname</label><input id="nickname" name="nickname" value={name} onChange={e=>setName(e.target.value)} maxLength={18} placeholder="e.g. Firewall Fred" autoComplete="nickname" required disabled={busy}/>{tab==="join"&&<><label htmlFor="room-code">Room code</label><input className="code-input" id="room-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} minLength={6} maxLength={6} placeholder="ABC234" autoComplete="off" autoCapitalize="characters" spellCheck={false} required disabled={busy}/></>}<button className="button primary entry-button" type="submit" disabled={busy||!name.trim()||(tab==="join"&&code.length!==6)}>{busy?"Connecting…":tab==="create"?"Create room":"Join room"}<Users size={20}/></button><p className="form-note"><LockKeyhole size={14}/> Nicknames only. No game accounts or downloads.</p></form>
    </section><Briefing/></main>:
    room&&room.phase==="lobby"?<main className="room-layout"><section className="lobby-main"><div className="eyebrow">MISSION LOBBY</div><h1>Assemble your crew.</h1><p className="muted">Everyone joins on their own phone or laptop.</p><div className="room-code-card"><div className="eyebrow">YOUR ROOM CODE</div><div className="big-code" aria-label={`Room code ${room.code.split("").join(" ")}`}>{room.code}</div><button className="button secondary" onClick={()=>void copyInvite()}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?"Invite link copied":"Copy invite link"}</button></div><fieldset className="difficulty-picker"><legend>Difficulty</legend><RadioGroup value={difficulty} onValueChange={value=>void action("difficulty",undefined,value as Difficulty)} disabled={!isHost||busy} aria-label="Game difficulty" className="difficulty-options">{(Object.keys(GAME_MODES) as Difficulty[]).map(value=><label className={`difficulty-option ${difficulty===value?"active":""}`} key={value} htmlFor={`difficulty-${value}`}><RadioGroupItem id={`difficulty-${value}`} value={value} className="difficulty-radio"/><span><strong>{GAME_MODES[value].label}{value==="hard"?" mode":""}</strong><span className="difficulty-description">{GAME_MODES[value].description}</span><span className="difficulty-timing">{GAME_MODES[value].answerSeconds}s per round · About {GAME_MODES[value].estimate}</span></span></label>)}</RadioGroup>{!isHost&&<p className="difficulty-note">The host chooses the mode for everyone.</p>}</fieldset><div className="lobby-rules"><div><Timer size={20}/><span><strong>{gameMode.answerSeconds} seconds</strong> per round</span></div><div><Trophy size={20}/><span><strong>Correct + quick</strong> wins points</span></div><div><RotateCcw size={20}/><span><strong>{TOTAL_ROUNDS} rounds.</strong> Then play again.</span></div></div>{isHost?<button className="button primary full-width" onClick={()=>void action("start")} disabled={busy||activePlayers<2}>{busy?"Starting…":activePlayers<2?"Waiting for another player":"Start the mission"}<Zap size={20}/></button>:<div className="waiting-message"><Radio size={20}/> Waiting for {host?.name||"the host"} to start</div>}<p className="form-note">{isHost?"You are the host. Start when everyone is here.":"Keep this screen open. Your game starts with the crew."}</p></section><aside className="crew-panel"><div className="panel-heading"><h2>Your crew</h2><span>{room.players.length}/8</span></div><div className="crew-list">{room.players.map((p,i)=><div className="crew-row" key={p.id}><PlayerAvatar name={p.name} index={i}/><div className="crew-name"><strong>{p.name}{p.id===room.you&&<span className="you-tag">you</span>}</strong><span>{p.id===room.hostId?"Host":p.connected?"Ready to play":"Reconnecting…"}</span></div>{p.connected&&<CheckCircle2 className="ready-icon" size={19}/>}</div>)}</div>{room.players.length<2&&<div className="empty-crew"><Users size={30}/><p>The first teammate is one room code away.</p></div>}<div className="crew-footer"><Shield size={19}/><p>All players see the same round. Answers stay hidden until the reveal.</p></div></aside></main>:
    room&&room.phase==="finished"?<main className="results-layout"><section className="results-main"><div className="eyebrow">MISSION COMPLETE · {gameMode.label.toUpperCase()} · GAME {room.game}</div><span className="trophy-medallion"><Trophy size={40}/></span><h1>{winners.length>1?"A shared victory.":`${winners[0]?.name||"Your crew"} wins!`}</h1><p className="muted">{winners.length>1?winners.map(p=>p.name).join(" & "):"Fast thinking. Strong defense. Bragging rights earned."}</p><div className="winner-score">{formatScore(top)}<span>POINTS</span></div><div className="results-actions">{isHost?<button className="button primary" onClick={()=>void action("replay")} disabled={busy}><RotateCcw size={19}/>{busy?"Opening lobby…":"Play again"}</button>:<div className="waiting-message">Waiting for {host?.name||"the host"} to open the next lobby</div>}<button className="button secondary" onClick={()=>void action("leave")} disabled={busy}>Leave room</button></div><p className="form-note">Same crew. New shuffle. Another shot at the top.</p></section><aside className="crew-panel final-board"><div className="panel-heading"><h2>Final leaderboard</h2><Trophy size={20}/></div><ol className="leaderboard">{sorted.map((p,i)=><li className={p.id===room.you?"your-score":""} key={p.id}><span className="rank">{sorted.findIndex(x=>x.score===p.score)+1}</span><PlayerAvatar name={p.name} index={room.players.findIndex(x=>x.id===p.id)}/><div className="score-name"><strong>{p.name}</strong>{p.id===room.you&&<span>That's you</span>}</div><strong className="score">{formatScore(p.score)}</strong></li>)}</ol><div className="crew-footer"><CheckCircle2 size={19}/><p>{room.totalRounds} rounds survived. Take these habits into your next real-world cyber dilemma.</p></div></aside></main>:
    room&&q?<main className="arena-layout"><section className="play-panel"><div className="round-top"><div className="round-meta"><span className="eyebrow">{gameMode.label.toUpperCase()} · ROUND {room.round+1} / {room.totalRounds}</span><div className="round-pips" aria-label={`Round ${room.round+1} of ${room.totalRounds}`}>{Array.from({length:room.totalRounds},(_,i)=><span key={i} className={i<room.round?"done":i===room.round?"current":""}/>)}</div></div><div className={`countdown ${seconds<=5&&!reveal?"urgent":""}`} role="timer" aria-label={`${seconds} seconds ${reveal?"until next round":"remaining"}`}><Timer size={20}/><strong>{seconds.toString().padStart(2,"0")}</strong><span>{reveal?"next round":"seconds"}</span></div></div><div className="time-track" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(0,seconds/(reveal?REVEAL_SECONDS:gameMode.answerSeconds)*100))}%`}}/></div>
      <div className={`category-tag ${mode(q.category).className}`}>{(()=>{const Icon=mode(q.category).icon;return <Icon size={17}/>;})()}{q.category}</div><h1 className="scenario-title">{q.title}</h1><div className="case-spread"><div className="artifact"><div className="artifact-label">EXHIBIT · {q.artifactLabel}</div><p>{q.artifact}</p></div><section className="case-decisions"><h2 className="question-prompt">{q.prompt}</h2>
      <div className="answer-list">{q.options.map((option,i)=>{const correct=reveal&&q.correct===i;const wrong=reveal&&chosen===i&&!correct;const selected=chosen===i;return <button key={i} className={`answer-button ${correct?"correct":wrong?"wrong":selected?"selected":""}`} onClick={()=>void action("answer",i)} disabled={busy||reveal||chosen!==null||seconds===0||!live}><span className="answer-letter">{String.fromCharCode(65+i)}</span><span>{option}</span>{correct?<CheckCircle2 size={21}/>:wrong?<XCircle size={21}/>:selected?<Check size={21}/>:null}</button>;})}</div>
      {reveal?<div className={`reveal-card ${myCorrect?"success":""}`} role="status"><div className="reveal-heading"><strong>{myCorrect?"Good call!":me?.answered?"A lesson for next time.":"The safe move revealed."}</strong><span>{myCorrect?`+${formatScore(me?.points||0)} points`:"+0 points"}</span></div><p>{q.explanation}</p><div className="reveal-bottom"><span className="concept-tag">{q.concept}</span>{isHost&&<button className="text-button" onClick={()=>void action("next")} disabled={busy}>{room.round===room.totalRounds-1?"See final scores":"Next round"}</button>}</div></div>:<div className="answer-status" role="status">{chosen!==null?<><CheckCircle2 size={18}/><span>Answer locked. Waiting for the crew…</span></>:seconds===0?<><Timer size={18}/><span>Time's up. Revealing the safe move…</span></>:<><LockKeyhole size={16}/><span>One choice. No take-backs. Trust your instincts.</span></>}</div>}
    </section></div></section><aside className="crew-panel live-board"><div className="panel-heading"><h2>The leaderboard</h2><span className="board-count">{answered}/{room.players.length} locked in</span></div><ol className="leaderboard">{sorted.map((p,i)=><li key={p.id} className={p.id===room.you?"your-score":""}><span className="rank">{i+1}</span><PlayerAvatar name={p.name} index={room.players.findIndex(x=>x.id===p.id)}/><div className="score-name"><strong>{p.name}{p.id===room.you&&<span className="you-tag">you</span>}</strong><span>{!p.connected?"Reconnecting…":reveal?p.correct?`+${formatScore(p.points)} points`:p.answered?"Missed this one":"No answer":p.answered?"Locked in":"Thinking…"}</span></div><strong className="score">{formatScore(p.score)}</strong></li>)}</ol>{reveal&&<div className="crew-answers"><div className="eyebrow">CREW PICKS</div>{room.players.map(p=><div key={p.id}><span>{p.name}</span><span>{p.choice===null?"—":String.fromCharCode(65+p.choice)} {p.correct===true?"✓":p.correct===false?"×":""}</span></div>)}</div>}<div className="crew-footer"><span className="mini-code">{room.code}</span><p>{reveal?`Next round in ${seconds}s. Everyone moves together.`:"1,000 for a safe answer. Up to 500 extra for speed."}</p></div></aside></main>:null}
    <footer className="site-footer"><span>BREACH PARTY</span><span>Think together. Choose for yourself.</span><span><Shield size={13}/> 2–8 players · phones & laptops</span></footer>
  </div>;
}
