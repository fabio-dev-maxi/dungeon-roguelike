'use strict';

// ---------- Replica fedele delle formule di gioco ----------
function rnd(n){ return Math.floor(Math.random()*n)+1; }
function rollNdM(n,d){ let t=0; for(let i=0;i<n;i++) t+=rnd(d); return t; }
function mod(stat){ return Math.floor((stat-10)/2); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function weightedPick(items){
  const total = items.reduce((s,i)=>s+i.w,0);
  let r = Math.random()*total;
  for(const it of items){ if(r<it.w) return it.v; r-=it.w; }
  return items[items.length-1].v;
}

const CLASS_DATA = {
  fighter: { atkStat:'str', hpBase:10, armor:3, weaponDice:[1,10], hitDie:10, baseCrit:20 },
  rogue:   { atkStat:'dex', hpBase:8,  armor:2, weaponDice:[1,8],  hitDie:8,  baseCrit:19 },
  wizard:  { atkStat:'dex', hpBase:6,  armor:0, weaponDice:[1,8],  hitDie:6,  baseCrit:20 },
  cleric:  { atkStat:'str', hpBase:8,  armor:2, weaponDice:[1,6],  hitDie:8,  baseCrit:20 }
};

const MONSTER_IDS_TIER = {
  1: ['rat','goblin','skeleton','raven'],
  2: ['orc','wolf','ghoul','knight'],
  3: ['ogre','wraith','troll','basilisk'],
  4: ['manticore','minotaur','gargoyle','vampire_spawn'],
  5: ['wyvern','vampire','demon','beholder'],
  6: ['archmage','death_knight','storm_giant','iron_golem']
};
const MONSTER_STATS = {
  rat:{hpBase:5,dmg:[1,4],ac:10}, goblin:{hpBase:7,dmg:[1,6],ac:12}, skeleton:{hpBase:9,dmg:[1,6],ac:13}, raven:{hpBase:6,dmg:[1,4],ac:12},
  orc:{hpBase:16,dmg:[1,8],ac:13}, wolf:{hpBase:13,dmg:[1,6],ac:13}, ghoul:{hpBase:14,dmg:[1,6],ac:12}, knight:{hpBase:18,dmg:[1,8],ac:15},
  ogre:{hpBase:30,dmg:[2,6],ac:14}, wraith:{hpBase:22,dmg:[1,8],ac:15}, troll:{hpBase:36,dmg:[1,10],ac:13}, basilisk:{hpBase:28,dmg:[2,6],ac:16},
  manticore:{hpBase:42,dmg:[2,6],ac:16}, minotaur:{hpBase:48,dmg:[2,8],ac:15}, gargoyle:{hpBase:40,dmg:[1,10],ac:17}, vampire_spawn:{hpBase:52,dmg:[2,6],ac:15},
  wyvern:{hpBase:65,dmg:[2,8],ac:16}, vampire:{hpBase:75,dmg:[2,8],ac:17}, demon:{hpBase:85,dmg:[3,6],ac:17}, beholder:{hpBase:95,dmg:[2,10],ac:18},
  archmage:{hpBase:105,dmg:[3,8],ac:17}, death_knight:{hpBase:120,dmg:[3,8],ac:19}, storm_giant:{hpBase:150,dmg:[4,8],ac:18}, iron_golem:{hpBase:165,dmg:[3,10],ac:20}
};
const BOSS_STATS = {
  boss1:{hpBase:20,dmg:[1,6],ac:13,atDepth:5}, boss2:{hpBase:35,dmg:[2,8],ac:15,atDepth:10}, boss3:{hpBase:50,dmg:[2,10],ac:16,atDepth:15},
  chimera:{hpBase:65,dmg:[3,6],ac:16,atDepth:20}, archdemon:{hpBase:80,dmg:[3,8],ac:17,atDepth:25}, lich:{hpBase:110,dmg:[3,8],ac:17,atDepth:30},
  hydra:{hpBase:140,dmg:[3,10],ac:17,atDepth:35}, dragon_red:{hpBase:190,dmg:[4,8],ac:18,atDepth:40}, kraken:{hpBase:230,dmg:[4,10],ac:19,atDepth:45},
  tarrasque:{hpBase:300,dmg:[5,10],ac:20,atDepth:50}
};
const BOSS_IDS = Object.keys(BOSS_STATS);
const MONSTER_XP = { rat:8,goblin:10,skeleton:12,raven:9, orc:18,wolf:16,ghoul:17,knight:20, ogre:30,wraith:28,troll:35,basilisk:32,
  manticore:45,minotaur:50,gargoyle:42,vampire_spawn:55, wyvern:70,vampire:85,demon:100,beholder:120,
  archmage:140,death_knight:165,storm_giant:220,iron_golem:250 };
const BOSS_XP = { boss1:80,boss2:150,boss3:250, chimera:300,archdemon:350,lich:400,hydra:550,dragon_red:800,kraken:1100,tarrasque:1600 };
function xpToNext(level){ return 20*level; }

function pickMonsterTier(depth){
  if (depth<=4) return 1;
  if (depth<=9) return weightedPick([{v:1,w:60},{v:2,w:40}]);
  if (depth<=14) return weightedPick([{v:1,w:30},{v:2,w:50},{v:3,w:20}]);
  if (depth<=19) return weightedPick([{v:1,w:10},{v:2,w:60},{v:3,w:30}]);
  if (depth<=24) return weightedPick([{v:2,w:30},{v:3,w:50},{v:4,w:20}]);
  if (depth<=29) return weightedPick([{v:2,w:10},{v:3,w:60},{v:4,w:30}]);
  if (depth<=34) return weightedPick([{v:3,w:30},{v:4,w:50},{v:5,w:20}]);
  if (depth<=39) return weightedPick([{v:3,w:10},{v:4,w:60},{v:5,w:30}]);
  if (depth<=44) return weightedPick([{v:4,w:30},{v:5,w:50},{v:6,w:20}]);
  if (depth<=49) return weightedPick([{v:4,w:10},{v:5,w:60},{v:6,w:30}]);
  return weightedPick([{v:5,w:30},{v:6,w:70}]);
}
function makeMonster(depth){
  const bossId = BOSS_IDS.find(id=>BOSS_STATS[id].atDepth===depth);
  let id, base, isBoss=false;
  if (bossId){ id=bossId; base=BOSS_STATS[bossId]; isBoss=true; }
  else { const tier=pickMonsterTier(depth); id=pick(MONSTER_IDS_TIER[tier]); base=MONSTER_STATS[id]; }
  const bracket = clamp(Math.floor(depth/5),0,4);
  const scale = 1+bracket*0.35;
  let effHp = base.hpBase, acVar=0;
  if (isBoss){ const factor=1+(Math.random()*2-1)*0.15; effHp=Math.round(base.hpBase*factor); acVar=Math.floor(Math.random()*3)-1; }
  const hp = Math.round(effHp*scale)+Math.floor(depth/2);
  return { id, isBoss, hp, maxHp:hp, dmg:base.dmg, ac:base.ac+acVar };
}
function encounterWeights(depth, lastTavern){
  let w;
  if (depth<=5) w=[{v:'combat',w:70},{v:'trap',w:12},{v:'treasure',w:14},{v:'shrine',w:2},{v:'merchant',w:2},{v:'tavern',w:0.5}];
  else if (depth<=9) w=[{v:'combat',w:52},{v:'trap',w:15},{v:'treasure',w:15},{v:'shrine',w:7},{v:'merchant',w:8},{v:'tavern',w:3}];
  else if (depth<=14) w=[{v:'combat',w:45},{v:'trap',w:15},{v:'treasure',w:13},{v:'shrine',w:10},{v:'merchant',w:11},{v:'tavern',w:6}];
  else w=[{v:'combat',w:38},{v:'trap',w:14},{v:'treasure',w:13},{v:'shrine',w:14},{v:'merchant',w:14},{v:'tavern',w:7}];
  if (depth-lastTavern<5) w=w.filter(x=>x.v!=='tavern');
  return w;
}

// ---------- Talenti (ordine di scelta "greedy" per la simulazione) ----------
const CLASS_FEATS_ORDER = {
  fighter: ['weapon_master','iron_skin','savage_striker','battle_vigors','devastating_crit']
};
function applyFeat(p, featId){
  if (featId==='weapon_master'){ p.flatAtk=(p.flatAtk||0)+1; p.flatDmg=(p.flatDmg||0)+1; }
  else if (featId==='iron_skin'){ p.ac+=1; }
  else if (featId==='savage_striker'){ p.crit=Math.max(15,(p.crit||20)-1); }
  else if (featId==='battle_vigors'){ p.maxHp+=6; p.hp+=6; }
  else if (featId==='devastating_crit'){ p.critMult=2.5; }
}
const RELIC_POOL_FIGHTER = ['shadow_ring','giant_belt','blood_amulet'];
function applyRelic(p, id){
  if (id==='blood_amulet') p.crit = Math.max(15,(p.crit||20)-1);
  else if (id==='giant_belt'){ p.str=(p.str||0)+3; p.maxHp+=10; p.hp+=10; }
  else if (id==='shadow_ring'){ p.dex=(p.dex||0)+2; p.ac+=1; }
}

// ---------- Personaggio ----------
function roll4d6(){ const r=[rnd(6),rnd(6),rnd(6),rnd(6)]; r.sort((a,b)=>a-b); r.shift(); return r.reduce((a,b)=>a+b,0); }
function makeChar(cls){
  const c = CLASS_DATA[cls];
  const stats = { str:roll4d6(), dex:roll4d6(), con:roll4d6(), int:roll4d6(), wis:roll4d6(), cha:roll4d6() };
  const conMod = mod(stats.con);
  const maxHp = c.hpBase+conMod;
  return {
    cls, stats, hp:maxHp, maxHp, ac: 10+mod(stats.dex)+c.armor,
    weaponBonus:0, level:1, xp:0, gold: rollNdM(2,6), potions:2,
    crit: c.baseCrit, flatAtk:0, flatDmg:0, critMult:2,
    feats:[], relics:[], usedSpecialThisFight:false
  };
}

function atkStatVal(p){ const c=CLASS_DATA[p.cls]; return p.stats[c.atkStat]; }

function doFight(p, m, depth, log){
  p.usedSpecialThisFight = false;
  let rounds = 0;
  while (p.hp>0 && m.hp>0 && rounds<200){
    rounds++;
    // --- turno giocatore ---
    if (p.hp < p.maxHp*0.35 && p.potions>0){
      p.potions--; p.hp = clamp(p.hp+rollNdM(2,6), 0, p.maxHp);
    } else if (!p.usedSpecialThisFight && (p.cls==='fighter' || p.cls==='wizard')) {
      p.usedSpecialThisFight = true;
      let dmg;
      if (p.cls==='fighter'){ const [n,d]=CLASS_DATA.fighter.weaponDice; const bonus=mod(p.stats.str)+(p.weaponBonus||0)+(p.flatDmg||0); dmg=(rollNdM(n,d)+bonus)*2; }
      else { const bonus=mod(p.stats.int); dmg=rollNdM(2,4)+bonus; }
      m.hp = clamp(m.hp-dmg,0,m.maxHp);
    } else if (!p.usedSpecialThisFight && p.cls==='cleric' && p.hp < p.maxHp*0.6) {
      p.usedSpecialThisFight = true;
      const heal = rollNdM(2,6)+mod(p.stats.wis);
      p.hp = clamp(p.hp+heal,0,p.maxHp);
    } else {
      const c = CLASS_DATA[p.cls];
      const statMod = mod(atkStatVal(p)) + (p.flatAtk||0);
      const raw = rnd(20);
      const isCrit = raw>=p.crit;
      const total = raw+statMod;
      const hit = raw===20 || isCrit || total>=m.ac;
      if (raw!==1 && hit){
        const [n,d]=c.weaponDice;
        const bonus = mod(atkStatVal(p))+(p.weaponBonus||0)+(p.flatDmg||0);
        let dmg = rollNdM(n,d)+bonus;
        if (isCrit) dmg = Math.floor(dmg*(p.critMult||2));
        m.hp = clamp(m.hp-dmg,0,m.maxHp);
      }
    }
    if (m.hp<=0) break;
    // --- turno mostro ---
    const monsterAtkMod = 2+Math.floor(depth/5);
    const toHit = rnd(20);
    const total = toHit+monsterAtkMod;
    if (toHit!==1 && (total>=p.ac || toHit===20)){
      const [n,d]=m.dmg;
      const dmg = rollNdM(n,d);
      p.hp = clamp(p.hp-dmg,0,p.maxHp);
    }
  }
  return m.hp<=0; // true se il mostro e' morto (vittoria)
}

function levelUpGain(p){
  const c = CLASS_DATA[p.cls];
  const conMod = mod(p.stats.con);
  let roll1 = rnd(c.hitDie);
  if (roll1 < c.hitDie/2){ const roll2 = rnd(c.hitDie); roll1 = Math.max(roll1, roll2); } // simula il reroll "furbo"
  const gain = Math.max(1, roll1+conMod);
  p.maxHp += gain; p.hp += gain;
}

function grantLevel(p, useCon){
  p.level++;
  if (p.level % 2 === 0) {
    if (useCon) p.stats.con += 1; else { const c=CLASS_DATA[p.cls]; p.stats[c.atkStat]+=1; }
  } else if (p.level % 3 === 0) {
    const order = CLASS_FEATS_ORDER[p.cls] || [];
    const next = order.find(f => !p.feats.includes(f));
    if (next){ p.feats.push(next); applyFeat(p, next); }
  }
  levelUpGain(p);
}

function simulateRun(cls){
  const p = makeChar(cls);
  let lastTavern = -99;
  const deaths = {};
  const bossEncounters = {}; // depth -> {reached, survived, level}
  for (let depth=1; depth<=50; depth++){
    const forcedBoss = BOSS_IDS.some(id=>BOSS_STATS[id].atDepth===depth);
    const type = forcedBoss ? 'combat' : weightedPick(encounterWeights(depth, lastTavern));
    if (type === 'tavern') lastTavern = depth;

    if (type === 'combat'){
      const m = makeMonster(depth);
      if (m.isBoss) bossEncounters[m.id] = { depth, level: p.level, survived: false };
      let alternate = true;
      const survived = doFight(p, m, depth, null);
      if (!survived){
        return { died:true, depth, level:p.level, bossId: m.isBoss? m.id : null, monsterId:m.id };
      }
      if (m.isBoss) bossEncounters[m.id].survived = true;
      const gold = rollNdM(1,6)+Math.floor(depth/2);
      const xp = m.isBoss ? BOSS_XP[m.id]+depth : MONSTER_XP[m.id]+Math.floor(depth/2);
      p.gold += gold; p.xp += xp;
      if (m.isBoss){
        const pool = cls==='fighter' ? RELIC_POOL_FIGHTER : (global.EXTRA_RELIC_POOLS && global.EXTRA_RELIC_POOLS[cls]) || [];
        const avail = pool.filter(r=>!p.relics.includes(r));
        if (avail.length>0){ const rid=pick(avail); p.relics.push(rid); applyRelic(p, rid); }
      }
      let leveled = 0;
      while (p.xp >= xpToNext(p.level)){ p.xp -= xpToNext(p.level); grantLevel(p, leveled%2===1); leveled++; }
    } else if (type === 'trap'){
      const dc = 10+Math.floor(depth/3);
      const statMod = mod(p.stats.dex); // approssimazione: usa sempre destrezza
      const roll = rnd(20);
      if (roll+statMod >= dc) p.gold += rollNdM(1,6);
      else { p.hp = clamp(p.hp-rollNdM(1,6), 0, p.maxHp); if (p.hp<=0) return { died:true, depth, level:p.level, bossId:null, monsterId:'trap' }; }
    } else if (type === 'treasure'){
      p.gold += rollNdM(2,6)+depth;
      if (Math.random()<0.4) p.potions++;
    } else if (type === 'shrine'){
      if (p.hp < p.maxHp) p.hp = clamp(p.hp+rollNdM(2,6)+2, 0, p.maxHp);
    } else if (type === 'merchant'){
      const potionCost = 8;
      if (p.gold >= potionCost && p.potions < 4){ p.gold -= potionCost; p.potions++; }
      else if (p.gold >= 15+depth){ p.gold -= (15+depth); p.weaponBonus=(p.weaponBonus||0)+1; }
    } else if (type === 'tavern'){
      const restCost = 18+Math.floor(depth*1.5);
      if (p.gold >= restCost && p.hp < p.maxHp*0.7){ p.gold -= restCost; p.hp = p.maxHp; }
      else p.hp = clamp(p.hp+rollNdM(1,6)+1, 0, p.maxHp);
    }
  }
  return { died:false, depth:50, level:p.level, bossId:null, monsterId:null };
}

function runBatch(cls, N){
  const deathsByDepth = {};
  const deathsByBoss = {};
  const bossReach = {}; // bossId -> {reach:0, survive:0, levels:[]}
  BOSS_IDS.forEach(id=>bossReach[id]={reach:0, survive:0, levels:[]});
  let completions = 0;
  let totalDeathDepth = 0, deathCount=0;

  for (let i=0;i<N;i++){
    const r = simulateRun(cls);
    if (r.died){
      deathCount++;
      totalDeathDepth += r.depth;
      const bucket = Math.ceil(r.depth/5)*5;
      deathsByDepth[bucket] = (deathsByDepth[bucket]||0)+1;
      if (r.bossId) deathsByBoss[r.bossId] = (deathsByBoss[r.bossId]||0)+1;
    } else completions++;
  }

  // seconda passata per statistiche sui boss (serve tracciare reach/survive per singolo incontro)
  for (let i=0;i<N;i++){
    const p = makeChar(cls);
    let lastTavern=-99;
    let dead=false;
    for (let depth=1; depth<=50 && !dead; depth++){
      const forcedBoss = BOSS_IDS.some(id=>BOSS_STATS[id].atDepth===depth);
      const type = forcedBoss ? 'combat' : weightedPick(encounterWeights(depth,lastTavern));
      if (type==='tavern') lastTavern=depth;
      if (type==='combat'){
        const m = makeMonster(depth);
        if (m.isBoss){ bossReach[m.id].reach++; bossReach[m.id].levels.push(p.level); }
        const survived = doFight(p,m,depth,null);
        if (!survived){ dead=true; break; }
        if (m.isBoss) bossReach[m.id].survive++;
        const gold = rollNdM(1,6)+Math.floor(depth/2);
        const xp = m.isBoss ? BOSS_XP[m.id]+depth : MONSTER_XP[m.id]+Math.floor(depth/2);
        p.gold+=gold; p.xp+=xp;
        if (m.isBoss){
          const pool = cls==='fighter' ? RELIC_POOL_FIGHTER : (global.EXTRA_RELIC_POOLS && global.EXTRA_RELIC_POOLS[cls]) || [];
          const avail = pool.filter(r=>!p.relics.includes(r));
          if (avail.length>0){ const rid=pick(avail); p.relics.push(rid); applyRelic(p,rid); }
        }
        let leveled=0;
        while (p.xp>=xpToNext(p.level)){ p.xp-=xpToNext(p.level); grantLevel(p, leveled%2===1); leveled++; }
      } else if (type==='trap'){
        const dc=10+Math.floor(depth/3); const statMod=mod(p.stats.dex); const roll=rnd(20);
        if (roll+statMod>=dc) p.gold+=rollNdM(1,6);
        else { p.hp=clamp(p.hp-rollNdM(1,6),0,p.maxHp); if (p.hp<=0){dead=true;} }
      } else if (type==='treasure'){ p.gold+=rollNdM(2,6)+depth; if (Math.random()<0.4) p.potions++; }
      else if (type==='shrine'){ if (p.hp<p.maxHp) p.hp=clamp(p.hp+rollNdM(2,6)+2,0,p.maxHp); }
      else if (type==='merchant'){ const pc=8; if (p.gold>=pc && p.potions<4){p.gold-=pc;p.potions++;} else if (p.gold>=15+depth){p.gold-=(15+depth); p.weaponBonus=(p.weaponBonus||0)+1;} }
      else if (type==='tavern'){ const rc=18+Math.floor(depth*1.5); if (p.gold>=rc && p.hp<p.maxHp*0.7){p.gold-=rc;p.hp=p.maxHp;} else p.hp=clamp(p.hp+rollNdM(1,6)+1,0,p.maxHp); }
    }
  }

  return { cls, N, completions, completionRate: completions/N,
    avgDeathDepth: deathCount? (totalDeathDepth/deathCount) : null,
    deathsByDepth, deathsByBoss, bossReach };
}

const classes = ['fighter','rogue','wizard','cleric'];
const N = 4000;
for (const cls of classes){
  const res = runBatch(cls, N);
  console.log(`\n=== ${cls.toUpperCase()} (N=${N}) ===`);
  console.log(`Run completati (arrivano al fondo, depth 50): ${(res.completionRate*100).toFixed(1)}%`);
  if (res.avgDeathDepth) console.log(`Profondita' media di morte (tra chi muore): ${res.avgDeathDepth.toFixed(1)}`);
  console.log('Morti per fascia di profondita (bucket 5):', JSON.stringify(res.deathsByDepth));
  console.log('Morti causate specificamente da un boss:', JSON.stringify(res.deathsByBoss));
  console.log('Per boss -> {incontri, tasso di sopravvivenza%, livello medio incontro}:');
  for (const id of Object.keys(res.bossReach)){
    const b = res.bossReach[id];
    const survRate = b.reach? (100*b.survive/b.reach).toFixed(1) : 'n/a';
    const avgLvl = b.levels.length? (b.levels.reduce((a,c)=>a+c,0)/b.levels.length).toFixed(1) : 'n/a';
    console.log(`  ${id} (depth ${BOSS_STATS[id].atDepth}): incontri=${b.reach}, sopravvivenza=${survRate}%, livello medio=${avgLvl}`);
  }
}