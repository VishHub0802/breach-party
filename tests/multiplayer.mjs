import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const req=createRequire(import.meta.url);
const wr=createRequire(req.resolve('wrangler/package.json'));
const {Miniflare}=wr('miniflare');
const moduleFiles=await readdir('dist/server',{recursive:true});
const modulePaths=['index.js',...moduleFiles.filter(x=>x!=='index.js'&&(x.endsWith('.js')||x.endsWith('.mjs')))];
const mf=new Miniflare({modules:modulePaths.map(path=>({type:'ESModule',path:process.cwd()+'/dist/server/'+path})),modulesRoot:process.cwd()+'/dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],assets:{directory:process.cwd()+'/dist/client',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},log:new (wr('miniflare').Log)(wr('miniflare').LogLevel.ERROR)});
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
try {
 const db=await mf.getD1Database('DB');
 const migration=await readFile('drizzle/0000_nifty_ultron.sql','utf8');
 for(const sql of migration.split('--> statement-breakpoint')) await db.prepare(sql).run();
 const request=async(path,body,session)=>{
   const response=await mf.dispatchFetch('http://game.test'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(session?{Authorization:'Bearer '+session.token}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const raw=await response.text();if(!raw) throw new Error('Empty response '+response.status+' '+JSON.stringify([...response.headers]));let data;try{data=JSON.parse(raw);}catch{throw new Error('Non-JSON response '+response.status+' '+raw.slice(0,800));}return {status:response.status,...data};
 };
 for(const difficulty of ['standard','hard']) {
 const expectedMs=(difficulty==='hard'?45:25)*1000;
 const host=await request('/api/rooms',{name:'Host'});check(host.status===201,'Room created');const path='/api/rooms/'+host.session.code;
 const alone=await request(path,{action:'start',game:0},host.session);check(alone.status===409,'Cannot start alone');
 const joins=await Promise.all(Array.from({length:7},(_,i)=>request(path,{action:'join',name:'Player '+(i+1)})));check(joins.every(j=>j.status===200),'Seven concurrent players joined without lost updates');
 const sessions=[host.session,...joins.map(j=>j.session)];
 const lobby=await request(path,null,host.session);check(lobby.room.players.length===8,'All 8 players synchronized');
 check(lobby.room.totalRounds===10,'Lobby advertises ten rounds');
 check(lobby.room.difficulty==='standard','New rooms default to Standard');
 const guestMode=await request(path,{action:'difficulty',game:0,difficulty},sessions[1]);check(guestMode.status===403,'Only host can select difficulty');
 const badMode=await request(path,{action:'difficulty',game:0,difficulty:'impossible'},host.session);check(badMode.status===400,'Unsupported difficulty rejected');
 const chosenMode=await request(path,{action:'difficulty',game:0,difficulty},host.session);check(chosenMode.room.difficulty===difficulty,'Host selects shared mode');
 const modeViews=await Promise.all(sessions.map(s=>request(path,null,s)));check(modeViews.every(x=>x.room.difficulty===difficulty),'Selected mode synchronized across eight clients');
 const overflow=await request(path,{action:'join',name:'Overflow'});check(overflow.status===409,'Room capacity enforced');
 const unauthorized=await request(path,null,{token:'wrong'});check(unauthorized.status===401,'Unauthorized state read blocked');
 const guestStart=await request(path,{action:'start',game:0},sessions[1]);check(guestStart.status===403,'Host controls enforced');
 let r=await request(path,{action:'start',game:0},host.session);check(r.room.phase==='question','Game started');
 check(r.room.totalRounds===10,'Started game has ten rounds');
 check(r.room.difficulty===difficulty&&r.room.deadline-r.room.serverNow===expectedMs,'Mode uses the correct initial answer window');
 const midGameMode=await request(path,{action:'difficulty',game:1,difficulty:difficulty==='hard'?'standard':'hard'},host.session);check(midGameMode.status===409,'Mode cannot change during play');
 const inGameJoin=await request(path,{action:'join',name:'Late'});check(inGameJoin.status===409,'Mid-game joining blocked');
 check(!JSON.stringify(r.room).includes('token'),'Player tokens never exposed');
 const seenTitles=new Set();const categoryCounts={};
 for(let round=0;round<10;round++) {
   r=await request(path,null,host.session);check(r.room.round===round,'Correct round index');check(r.room.question.correct===undefined,'Answer key hidden during question');
   seenTitles.add(r.room.question.title);categoryCounts[r.room.question.category]=(categoryCounts[r.room.question.category]||0)+1;
   const snapshots=await Promise.all(sessions.map(s=>request(path,null,s)));
   check(snapshots.every(x=>x.room.question.title===r.room.question.title&&JSON.stringify(x.room.question.options)===JSON.stringify(r.room.question.options)),'Identical scenario and option order across 8 clients');
   const first=await request(path,{action:'answer',game:1,round,choice:0},host.session);check(first.status===200,'Answer accepted');check(first.room.myChoice===0,'Own answer restored');
   check(first.room.players.every(p=>p.choice===null&&p.correct===null&&p.points===0),'Other answers and current score changes hidden');
   const repeated=await request(path,{action:'answer',game:1,round,choice:2},host.session);check(repeated.room.myChoice===0,'Double submission cannot change answer');
   const answers=await Promise.all(sessions.slice(1).map((s,i)=>request(path,{action:'answer',game:1,round,choice:(i+1)%3},s)));
   check(answers.every(a=>a.status===200),'Concurrent answers all accepted');
   r=await request(path,null,host.session);check(r.room.phase==='reveal','Revealed when all players answered');check(typeof r.room.question.correct==='number'&&r.room.question.explanation.length>0,'Correct response explained');
   check(r.room.players.every(p=>p.answered),'All answers recorded exactly once');
   check(r.room.players.filter(p=>p.correct).every(p=>p.points>=1000&&p.points<=1500),'Server scoring within expected range');
   const synced=await Promise.all(sessions.map(s=>request(path,null,s)));check(synced.every(x=>JSON.stringify(x.room.players.map(p=>p.score))===JSON.stringify(r.room.players.map(p=>p.score))),'Scoreboard synchronized');
   check(r.room.deadline-r.room.serverNow>14000&&r.room.deadline-r.room.serverNow<=15000&&synced.every(x=>x.room.deadline===r.room.deadline),'All clients share a 15-second explanation window');
   if(round===0) {
     const guestNext=await request(path,{action:'next',game:1,round},sessions[1]);check(guestNext.status===403,'Guests cannot skip the explanation for the group');
     await editRoom(s=>s.deadline-=8000);
     const reading=await Promise.all(sessions.map(s=>request(path,null,s)));check(reading.every(x=>x.room.phase==='reveal'&&x.room.round===round&&x.room.question.explanation===r.room.question.explanation),'Explanation stays readable after the old eight-second interval');
   }
   r=await request(path,{action:'next',game:1,round},host.session);
   if(r.room.phase==='question')check(r.room.deadline-r.room.serverNow===expectedMs,'Every next round uses the mode timer');
 }
 check(r.room.phase==='finished'&&r.room.round===9,'Final scores reached after exactly ten rounds');
 check(seenTitles.size===10,'All ten scenarios are distinct');
 check(JSON.stringify(Object.values(categoryCounts).sort())==='[3,3,4]','Ten rounds cover all three categories evenly');
 const scores=r.room.players.map(p=>p.score);check(scores.some(x=>x>0),'Correct players earned points');
 const replay=await request(path,{action:'replay',game:1},host.session);check(replay.room.phase==='lobby'&&replay.room.players.every(p=>p.score===0)&&replay.room.difficulty===difficulty,'Replay keeps mode and crew while resetting scores');
 r=await request(path,{action:'start',game:1},host.session);check(r.room.game===2&&r.room.round===0,'Second game starts cleanly');
 check(r.room.totalRounds===10,'Replay also starts with ten rounds');
 const stale=await request(path,{action:'answer',game:1,round:0,choice:0},host.session);check(stale.status===409,'Old game answers rejected');
 // Advance only the isolated test database's clock state; production code still owns transitions.
 async function editRoom(fn){const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(host.session.code).first();const state=JSON.parse(row.state);fn(state);await db.prepare('UPDATE rooms SET state=?,version=version+1 WHERE code=?').bind(JSON.stringify(state),host.session.code).run();}
 await editRoom(s=>{const now=Date.now();s.startedAt=now-expectedMs/2;s.deadline=now+expectedMs/2;s.players.forEach(p=>p.lastSeen=now);});
 const stored=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(host.session.code).first();const state=JSON.parse(stored.state);const correctChoice=state.plan[state.round].order.indexOf(0);
 await Promise.all(sessions.map(s=>request(path,{action:'answer',game:2,round:0,choice:correctChoice},s)));r=await request(path,null,host.session);check(r.room.players.every(p=>p.correct&&p.points>=1220&&p.points<=1270),'Speed bonus scales to the selected mode at half time');
 r=await request(path,{action:'next',game:2,round:0},host.session);
 await editRoom(s=>s.deadline=Date.now()-1);r=await request(path,null,sessions[1]);check(r.room.phase==='reveal','Timeout reveals unanswered round');
 await editRoom(s=>s.deadline=Date.now()-1);r=await request(path,null,sessions[1]);check(r.room.round===2&&r.room.phase==='question','Reveal automatically advances');
 await editRoom(s=>s.players[0].lastSeen=Date.now()-30000);r=await request(path,null,sessions[1]);check(r.room.hostId===sessions[1].playerId,'Disconnected host handed off');
 const reload=await request(path,null,sessions[2]);check(reload.room.you===sessions[2].playerId&&reload.room.round===2,'Session reconnect restores player and round');
 const invalid=await request('/api/rooms/INVALID',{action:'join',name:'Name'});check(invalid.status===400,'Invalid code rejected');
 }
 console.log(JSON.stringify({passed:true,checks,players:8,rounds:10,modes:['standard','hard'],coverage:['concurrent joins','independent clients','concurrent answers','hidden answers','authoritative scores','ten distinct balanced rounds','final leaderboard','ten-round replay','host-only difficulty','mode-specific timers','mode-scaled speed bonus','reconnect','timeouts','host handoff','authorization']}));
} finally {await mf.dispose();}
