
(function(){
'use strict';
// Migrated from the shop's Venen Engel finder. Product roles and fit rules are
// retained; IDs, money and availability are supplied by current Shopify Liquid.
if (window.upswingVenenEngel) { window.upswingVenenEngel.mount(document); return; }
function mount(scope) {
  const roots = scope.matches && scope.matches('[data-venen-engel-configurator]') ? [scope] : scope.querySelectorAll('[data-venen-engel-configurator]');
  roots.forEach(boot);
}
function boot(root){
if(!root || root.dataset.ready)return;
const ROOT_ID=root.id;
let DATA;
try { DATA=JSON.parse(root.querySelector('script[data-ve-data]').textContent); }
catch(error) { return; } // Keep the server-rendered consultation link usable.
root.dataset.ready='1';
const MAP=Object.create(null), duplicates=new Set();
(DATA.products||[]).forEach(v=>{
  if(!v || typeof v.sku!=='string' || !v.sku || !Number.isSafeInteger(v.id) || v.id<=0 || !Number.isSafeInteger(v.price) || v.price<0)return;
  const sku=v.sku;
  if(MAP[sku] && MAP[sku].id!==v.id)duplicates.add(sku);
  MAP[sku]={...v,compare:Number.isSafeInteger(v.compare)&&v.compare>v.price?v.compare:0,available:v.available===true};
});
duplicates.forEach(sku=>{delete MAP[sku];});
const SET=DATA.settings||{};
const complete=DATA.catalogue_complete===true;
const routeRoot=typeof SET.root_url==='string' && /^\/(?!\/)[^?#]*$/.test(SET.root_url)?SET.root_url.replace(/\/?$/,'/'):'/';
const cartURL=typeof SET.cart_url==='string' && /^\/(?!\/)[^?#]*$/.test(SET.cart_url)?SET.cart_url:routeRoot+'cart';
const currency=typeof SET.currency==='string' && /^[A-Z]{3}$/.test(SET.currency)?SET.currency:'CHF';
const language=String(SET.locale||'de').split(/[-_]/)[0];
const moneyLocale=currency==='CHF'?(['de','fr','it','en'].includes(language)?language+'-CH':'de-CH'):(SET.locale||'de-CH');
let formatter;
try {formatter=new Intl.NumberFormat(moneyLocale,{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2});}
catch(error){formatter=new Intl.NumberFormat('de-CH',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2});}
let cartState='idle';

/* ---------- Produkte: Aico-Artikelnummer = Shopify-SKU ---------- */
const P={
  ve6bm:{aico:'204397',ve:'VE-352',n:'Venen Engel 6 Premium mit Bein',s:'6 Luftkammern · 6 Programme · Füsse bis Leiste'},
  ve8bm:{aico:'204399',ve:'VE-354',n:'Venen Engel 8 Premium mit Bein',s:'8 Luftkammern · Füsse bis Leiste'},
  ve6lfp:{aico:'204398',ve:'VE-356',n:'Venen Engel 6 Premium mit Lymph-Flow Pants',s:'6 Luftkammern · 6 Programme · Füsse bis Bauch'},
  ve8lfp:{aico:'204395',ve:'VE-358',n:'Venen Engel 8 Premium mit Lymph-Flow Pants',s:'8 Luftkammern · Füsse bis Bauch'},
  ve8armL:{aico:'644197002375links',ve:'VE-363',n:'Venen Engel 8 Premium mit Lymph-Flow Armmanschette, links',s:'8 Luftkammern · Arm mit Brustkammer'},
  ve8armR:{aico:'644197002375rechts',ve:'VE-364',n:'Venen Engel 8 Premium mit Lymph-Flow Armmanschette, rechts',s:'8 Luftkammern · Arm mit Brustkammer'},
  mini:{aico:'202976',ve:'VE-330',n:'Venen Engel Mini mit Bein',s:'1 Beauty-Programm · 4 Kammern · bis Leiste'},
  minibauch:{aico:'203321',ve:'VE-343',n:'Venen Engel Mini mit Bein und Bauch',s:'4 Kammern · Bein- und Bauchmanschette'},
  plus:{aico:'202990',ve:'VE-331',n:'Venen Engel Plus mit Lymph-Flow Pants',s:'7 Programme · App-Steuerung · 4 Kammern · bis Bauch'},
  pro:{aico:'203318',ve:'VE-349',n:'Venen Engel Pro mit Lymph-Flow Pants',s:'12 Luftkammern · 8 Programme · Druck pro Kammer einstellbar'},
  miniArmL:{aico:'203323Links',ve:'VE-345',n:'Venen Engel Mini mit Lymph-Flow Armmanschette, links',s:'4 Kammern · Schulter- und Brustkammer'},
  miniArmR:{aico:'203323Rechts',ve:'VE-346',n:'Venen Engel Mini mit Lymph-Flow Armmanschette, rechts',s:'4 Kammern · Schulter- und Brustkammer'},
  armPremL:{aico:'644197002371_89296',ve:'VE-367',n:'Lymph-Flow Armmanschette 8 Kammern, links'},
  armPremR:{aico:'644197002371_58645',ve:'VE-368',n:'Lymph-Flow Armmanschette 8 Kammern, rechts'},
  armBeautyL:{aico:null,ve:'VE-347',n:'Lymph-Flow Armmanschette Mini/Plus, links'},
  armBeautyR:{aico:null,ve:'VE-348',n:'Lymph-Flow Armmanschette Mini/Plus, rechts'},
  conn:{aico:'202449',ve:'VE-241',n:'Adapter Armmanschette 8 auf 12 Kammern'},
  flex:{aico:'204401',ve:'VE-360',n:'Erweiterungslaschen Flex Fit'},
  comfort:{aico:'204402',ve:'VE-361',n:'Erweiterungslaschen Comfort Fit'},
  classic:{aico:'204403',ve:'VE-362',n:'Erweiterungslaschen Classic Fit'},
  extBM:{aico:null,ve:'VE-383',n:'10 cm Erweiterungslaschen, Beinmanschetten Premium'},
  extMini:{aico:'202993',ve:'VE-334',n:'10 cm Erweiterungslaschen, Beinmanschetten Beauty'},
  extPlus:{aico:'202992',ve:'VE-335',n:'10 cm Erweiterungslaschen, Lymph-Flow Pants Beauty'},
  extBauch:{aico:null,ve:'VE-369',n:'10 cm Erweiterung Bauchmanschette Mini'},
  kissen:{aico:'201786',ve:'VE-106',n:'Venen Engel Venenkissen'},
  knie:{n:'Kompressionsstrümpfe Knie'},schenkel:{n:'Kompressionsstrümpfe Schenkel'},hose:{n:'Kompressionsstrumpfhose'}
};
/* Strümpfe: Aico-Artikel je Farbe, Variante = Grösse (z.B. 203276-4) */
const STR={knie:{'Classic Nude':'202420-','Black Beauty':'202419-','Sky Blue':'203276-','Blossom Lavender':'203275-','Matcha Green':null},
  schenkel:{'Classic Nude':null,'Black Beauty':null,'Sky Blue':null,'Blossom Lavender':null,'Matcha Green':null},
  hose:{'Classic Nude':null,'Black Beauty':null}};
const ALLSIZES=['2','3','4','5','6'];
const strAico=(t,c,z)=>STR[t]&&STR[t][c]?STR[t][c]+z:null;
const strColors=t=>Object.keys(STR[t]).filter(c=>ALLSIZES.some(z=>MAP[strAico(t,c,z)]?.available));
const strSizes=(t,c)=>ALLSIZES.filter(z=>MAP[strAico(t,c,z)]?.available);
const strTypes=()=>['knie','schenkel','hose'].filter(t=>strColors(t).length);

const V=aico=>aico?MAP[aico]||null:null;
const price=k=>{const v=V(P[k].aico);return v?v.price:null;};
const cmp=k=>{const v=V(P[k].aico);return v&&v.compare>v.price?v.compare:null;};
/* Preis-HTML: Aktionspreis mit durchgestrichenem Normalpreis */
const money=(now,was)=>was&&was>now?'<span class="ve-sale">'+chf(now)+'</span> <s class="ve-was">'+chf(was)+'</s>':chf(now);
const ph=k=>{const p=price(k);return p==null?'':money(p,cmp(k));};
const chf=n=>formatter.format(n/100);
const pf=n=>n==null?'':chf(n);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const EMPTY={goal:null,diag:null,area:null,cuff:null,level:null,arm:null,mmode:'cm',thigh:null,belly:null,size:null,skip:false,health:null,cleared:false,
  xs:{kissen:false,str:'',color:'',ssize:'',b:null,c:null,g:null}};
const clone=o=>JSON.parse(JSON.stringify(o));
let S=clone(EMPTY),cur='start';

const G=()=>S.goal==='unsure'?(S.diag==='yes'?'med':S.diag==='no'?'beauty':null):S.goal;
const hasLegs=()=>S.area==='legs'||S.area==='both';
const hasArms=()=>S.area==='arms'||S.area==='both';
const bellyNeeded=()=>S.cuff==='lfp'||S.cuff==='bmbauch';
const premiumPants=()=>G()==='med'&&S.cuff==='lfp'&&S.level!=='pro';
function flow(){
  const f=['goal'];
  if(S.goal==='unsure')f.push('unsure');
  f.push('area');
  if(hasLegs()){f.push('cuff');if((G()==='med'&&(!hasArms()||S.cuff==='lfp'))||(G()==='beauty'&&S.cuff==='lfp'))f.push('level');}
  if(hasArms())f.push('arm');
  if(hasLegs())f.push('measure');
  f.push('health');
  return f;
}
function sanitize(){
  const g=G();
  const cuffs=g==='med'?['bm','lfp']:['bm','bmbauch','lfp'];
  if(S.cuff&&!cuffs.includes(S.cuff))S.cuff=null;
  if(g==='med'&&hasLegs()&&hasArms()&&S.cuff!=='lfp')S.level='8';
  const lv=g==='med'?(S.cuff==='lfp'?(hasArms()?['8','pro']:['6','8','pro']):['6','8']):(S.cuff==='lfp'?['plus','pro']:[]);
  if(S.level&&!lv.includes(S.level))S.level=null;
  if(premiumPants())S.mmode='cm';
}

function figBody(t){
  const on='var(--ve-accent)',off='var(--ve-line)',L=t==='legs'||t==='both'?on:off,A=t==='arms'||t==='both'?on:off;
  return '<svg class="ve-fig fig" viewBox="0 0 80 120" aria-hidden="true">'+
   '<circle cx="40" cy="10" r="8" fill="'+off+'"/>'+
   '<rect x="25" y="21" width="30" height="40" rx="9" fill="'+off+'"/>'+
   '<rect x="13" y="23" width="10" height="42" rx="5" fill="'+A+'"/><rect x="57" y="23" width="10" height="42" rx="5" fill="'+A+'"/>'+
   '<rect x="26" y="58" width="13" height="58" rx="6" fill="'+L+'"/><rect x="41" y="58" width="13" height="58" rx="6" fill="'+L+'"/></svg>';
}
function figGoal(t){
  const on='var(--ve-accent)',off='var(--ve-line)',bg='var(--ve-bg)';
  const mark=t==='goal-med'?'<rect x="59" y="3" width="8" height="24" rx="2" fill="'+on+'"/><rect x="51" y="11" width="24" height="8" rx="2" fill="'+on+'"/>'
   :t==='goal-beauty'?'<path d="M63 2C64.6 10.6 67.4 13.4 76 15C67.4 16.6 64.6 19.4 63 28C61.4 19.4 58.6 16.6 50 15C58.6 13.4 61.4 10.6 63 2Z" fill="'+on+'"/>'
   :'<circle cx="63" cy="15" r="12" fill="'+on+'"/><text x="63" y="20.5" text-anchor="middle" font-size="16" font-weight="700" font-family="inherit" fill="'+bg+'">?</text>';
  return '<svg class="ve-fig fig" viewBox="0 0 80 120" aria-hidden="true"><g transform="translate(-8 0)">'+
   '<circle cx="40" cy="10" r="8" fill="'+off+'"/><rect x="25" y="21" width="30" height="40" rx="9" fill="'+off+'"/>'+
   '<rect x="13" y="23" width="10" height="42" rx="5" fill="'+off+'"/><rect x="57" y="23" width="10" height="42" rx="5" fill="'+off+'"/>'+
   '<rect x="26" y="58" width="13" height="58" rx="6" fill="'+off+'"/><rect x="41" y="58" width="13" height="58" rx="6" fill="'+off+'"/></g>'+mark+'</svg>';
}
function fig(t){
  if(t&&t.indexOf('goal-')===0)return figGoal(t);
  if(t==='legs'||t==='arms'||t==='both')return figBody(t);
  const on='var(--ve-accent)',base='var(--ve-line)',hip=t==='lfp'?on:base;
  return '<svg class="ve-fig" viewBox="0 0 80 120" aria-hidden="true"><rect x="18" y="6" width="44" height="34" rx="12" fill="'+hip+'"/>'+
   (t==='bmbauch'?'<rect x="15" y="12" width="50" height="14" rx="5" fill="'+on+'" stroke="var(--ve-bg)" stroke-width="2"/>':'')+
   '<rect x="20" y="30" width="18" height="86" rx="8" fill="'+on+'"/><rect x="42" y="30" width="18" height="86" rx="8" fill="'+on+'"/>'+
   (t!=='lfp'?'<line x1="16" y1="38" x2="64" y2="38" stroke="var(--ve-bg)" stroke-width="2.5"/>':'')+'</svg>';
}
const ico=c=>'<span class="ve-ico" aria-hidden="true">'+c+'</span>';
const imgOf=k=>{if(!k)return null;const v=typeof k==='string'?V(P[k]&&P[k].aico):V(k.aico);return v&&v.image?v.image:null;};
const thumb=(src,cls)=>src?'<img class="'+cls+'" src="'+esc(src)+'" alt="" loading="lazy" decoding="async">':'<span class="'+cls+' ve-noimg" aria-hidden="true"></span>';
const from=k=>{const p=price(k);return p==null?'':'ab '+money(p,cmp(k));};

function Q(id){
  const g=G();
  switch(id){
  case 'goal':return{t:'Was wünschst du dir vom Venen Engel?',lead:'Davon hängt ab, ob ein medizinisch zertifiziertes Gerät oder ein Beauty-Gerät passt.',o:[
    {v:'med',l:'Linderung bei Beschwerden',d:'Schwere oder geschwollene Beine, Wassereinlagerungen, Venenbeschwerden, Lymph- oder Lipödem',f:'goal-med'},
    {v:'beauty',l:'Schöne Haut & Entspannung',d:'Straffere Haut, weniger Cellulite, Erholung nach Sport oder einem langen Tag',f:'goal-beauty'},
    {v:'unsure',l:'Ich bin unsicher',d:'Wir helfen dir mit einer kurzen Zusatzfrage',f:'goal-unsure'}]};
  case 'unsure':return{t:'Hast du eine ärztliche Diagnose oder oft geschwollene Beine?',lead:'Zum Beispiel Venenschwäche, Lymphödem, Lipödem oder dicke Beine am Abend.',o:[
    {v:'yes',l:'Ja',d:'Dann empfehlen wir ein medizinisch zertifiziertes Gerät'},
    {v:'no',l:'Nein, eher nicht',d:'Dann passt ein Beauty-Gerät für Wohlbefinden und Haut'}],two:1};
  case 'area':return{t:'Wo möchtest du die Massage spüren?',o:[
    {v:'legs',f:'legs',l:'Beine',d:'Von den Füssen bis zur Leiste oder bis zum Bauch'},
    {v:'arms',f:'arms',l:'Arme',d:'Armmanschette mit Brustkammer'},
    {v:'both',f:'both',l:'Beine und Arme',d:'Beingerät mit zusätzlicher Armmanschette'}]};
  case 'cuff':{
    const o=[{v:'bm',l:'Bis zur Leiste',d:g==='med'?'Zwei separate Beinmanschetten. Einfach anzuziehen.':'Zwei Beinmanschetten. Der einfache Einstieg.',f:'bm',p:g==='med'?from('ve6bm'):ph('mini')}];
    if(g==='beauty')o.push({v:'bmbauch',l:'Bis zur Leiste, plus Bauch',d:'Beinmanschetten und eine separate Bauchmanschette',f:'bmbauch',p:ph('minibauch')});
    o.push({v:'lfp',l:'Bis zum Bauch, in einem Stück',d:'Lymph-Flow Pants massieren auch Gesäss und unteren Bauch',f:'lfp',p:g==='med'?from('ve6lfp')||from('ve8lfp'):from('plus'),rec:g==='med'});
    return{t:'Bis wohin soll die Massage reichen?',lead:g==='med'?'Bei Lip- oder Lymphödem an Hüfte und Gesäss empfehlen wir die Lymph-Flow Pants.':'Für Cellulite an Po und Hüfte sind die Lymph-Flow Pants ideal.',o};}
  case 'level':
    if(g==='med'){const pants=S.cuff==='lfp',o=[];
      if(!(pants&&hasArms()))o.push({v:'6',k:pants?'ve6lfp':'ve6bm',l:'6 Luftkammern',d:'Der Einstieg mit 6 Programmen.',p:ph(pants?'ve6lfp':'ve6bm'),i:'6'});
      o.push({v:'8',k:pants?'ve8lfp':'ve8bm',l:'8 Luftkammern',d:'Feiner unterteilt, sanftere Druckwelle.',p:ph(pants?'ve8lfp':'ve8bm'),rec:1,i:'8'});
      if(pants)o.push({v:'pro',k:'pro',l:'12 Luftkammern',d:'Venen Engel Pro mit individuell einstellbarem Druck je Kammer.',warn:'Noch nicht medizinisch zertifiziert',p:ph('pro'),i:'12'});
      return{t:'Wie fein soll die Druckwelle sein?',lead:'Die Luftkammern füllen sich nacheinander vom Fuss nach oben. Mehr Kammern bedeuten mehr Zonen und einen sanfteren Übergang. Wir empfehlen 8 Luftkammern.',o,two:o.length===2};}
    return{t:'Welche Ausführung passt zu dir?',lead:'Beide massieren mit Lymph-Flow Pants von den Füssen bis zum Bauch.',o:[
      {v:'plus',k:'plus',l:'Plus',d:'4 Kammern, 7 Programme, Steuerung per App',p:ph('plus'),rec:1},
      {v:'pro',k:'pro',l:'Pro',d:'12 Kammern, 8 Programme, Druck für jede Kammer einzeln einstellbar. Behandlungen wie im Studio.',p:ph('pro')}],two:1};
  case 'arm':{const set=S.area==='arms',prem=g==='med'||S.level==='pro';
    const kL=set?(g==='med'?'ve8armL':'miniArmL'):(prem?'armPremL':'armBeautyL'),kR=set?(g==='med'?'ve8armR':'miniArmR'):(prem?'armPremR':'armBeautyR');
    return{t:'Für welchen Arm?',lead:'Die Armmanschette gibt es für links oder rechts.',o:[
    {v:'left',k:kL,l:'Links'},{v:'right',k:kR,l:'Rechts'},{v:'both',k:kL,l:'Beide Arme',d:'mit einer zweiten Manschette'}],two:1};}
  case 'health':return{t:'Kurzer Gesundheits-Check',lead:'Trifft eines davon auf dich zu?',list:[
    'Akute Venenentzündung, Thrombose oder eine Lungenembolie',
    'Akute Herzschwäche, Herzrhythmusstörungen oder Wasser in der Lunge',
    'Herzschrittmacher oder schlecht eingestellter Bluthochdruck',
    'Durchblutungsstörung der Arterien',
    'Infektion, Wundrose, entzündliche Hauterkrankung, offene Wunde oder Knochenbruch im Anwendungsbereich',
    'Tumor im oder nahe dem Anwendungsbereich',
    'Du nimmst Blutverdünner',
    'Du bist schwanger'],o:[
    {v:'no',l:'Nein, nichts davon trifft zu'},
    {v:'yes',l:'Ja, mindestens eines trifft zu'}],two:1,help:'Diese Punkte gelten für alle Kompressionsmassagegeräte.'};
  }
}

/* ---------- Masse ---------- */
// Model-specific approximate capacities, checked against the exact shop SKU and
// manufacturer's model number. See docs/Venen-Engel-Konfigurator.md. A generic
// 70 cm threshold must not be applied to Mini (67), Plus (74) or Pro (78).
const THIGH_LIMIT={mini:67,ve6bm:70,ve8bm:70,plus:74,pro:78};
const legRole=()=>G()==='med'?(S.level==='pro'?'pro':'ve'+S.level+S.cuff):({bm:'mini',bmbauch:'minibauch',lfp:S.level}[S.cuff]);
const SIZES=[['bis 42',0],['44',1],['46–48',2],['50–52',3],['ab 54',4]];
const zone=(v,b)=>{if(v==null||isNaN(v))return null;for(let i=0;i<b.length;i++)if(v<=b[i])return i;return 5;};
/* Venen-Engel-Massrechner für Premium Lymph-Flow Pants (Regeln von venenengel.de, Stand 30.10.2026) */
const FIT={thresholds:{belly:122,thigh:74},
  bellySteps:['std','a0','c1','b0','cc','cb','bb'],thighSteps:['std','c1','a0','cc','ca','aa'],combinedSimple:['a0','b0'],
  thighUpgrades:{a0:'ca',b0:'cb',c1:'cc',cc:'cb'},
  configs:[{id:'std',t:74,b:122,a:0,c2:0,c:0},{id:'c1',t:81.5,b:142,a:0,c2:0,c:1},{id:'a0',t:82,b:136,a:1,c2:0,c:0},{id:'b0',t:82,b:152,a:0,c2:1,c:0},
    {id:'cc',t:89,b:162,a:0,c2:0,c:2},{id:'ca',t:89.5,b:156,a:1,c2:0,c:0},{id:'cb',t:89.5,b:172,a:0,c2:1,c:0},{id:'aa',t:90,b:150,a:2,c2:0,c:0},{id:'bb',t:90,b:182,a:0,c2:2,c:0}]};
const cfg=id=>FIT.configs.find(c=>c.id===id)||null;
const fits=(c,b,t)=>t<=c.t&&b<=c.b;
function stepLookup(m,steps,dim){for(const id of steps){const c=cfg(id);if(!c)continue;if(m<=(dim==='belly'?c.b:c.t))return id;}return null;}
function thighUp(id,t){const c=cfg(id);return !c||t<=c.t?id:(FIT.thighUpgrades[id]||id);}
function bellyUp(id,b,t){const c=cfg(id);if(!c||b<=c.b)return id;const st=FIT.bellySteps,s=Math.max(0,st.indexOf(id));for(let i=s+1;i<st.length;i++){const k=cfg(st[i]);if(k&&b<=k.b&&fits(k,b,t))return st[i];}return id;}
function fitTarget(b,t){
  const B=FIT.thresholds.belly,T=FIT.thresholds.thigh;
  if(b<=B&&t<=T)return'std';
  if(b>B&&t<=T)return stepLookup(b,FIT.bellySteps,'belly');
  if(b<=B&&t>T)return stepLookup(t,FIT.thighSteps,'thigh');
  for(const id of FIT.combinedSimple){const c=cfg(id);if(c&&fits(c,b,t))return id;}
  if(b-B>=t-T)return thighUp(stepLookup(b,FIT.bellySteps,'belly'),t);
  return bellyUp(stepLookup(t,FIT.thighSteps,'thigh'),b,t);
}
function fitSelect(b,t){if(!Number.isFinite(b)||!Number.isFinite(t)||b<=0||t<=0)return null;const ok=FIT.configs.filter(c=>fits(c,b,t));if(!ok.length)return null;const id=fitTarget(b,t);return ok.find(c=>c.id===id)||ok.slice().sort((x,y)=>x.b-y.b||x.t-y.t)[0];}

function hasMeasures(){
  if(S.mmode==='size'&&!premiumPants())return Number.isInteger(S.size)&&S.size>=0&&S.size<SIZES.length;
  const valid=v=>Number.isFinite(v)&&v>=30&&v<=240;
  return valid(S.thigh)&&(!bellyNeeded()||valid(S.belly));
}
function extNeed(ignoreSkip){
  if(S.skip&&!ignoreSkip)return null;
  if(!hasMeasures())return null;
  if(premiumPants()){
    const c=fitSelect(S.belly,S.thigh);if(!c)return{support:true};
    const src='Bauch '+S.belly+' cm, Oberschenkel '+S.thigh+' cm',items=[];
    if(c.a)items.push([c.a,'flex','Laut Venen-Engel-Massrechner']);
    if(c.c2)items.push([c.c2,'comfort','Laut Venen-Engel-Massrechner']);
    if(c.c)items.push([c.c,'classic','Laut Venen-Engel-Massrechner']);
    return{items,count:c.a+c.c2+c.c,src,fit:true};
  }
  const model=legRole();
  if(model==='minibauch')return{support:true,reason:'Für das Mini-Set mit Bauchmanschette ist die genaue Masszuordnung nicht bestätigt. Bitte lass die Passform vor der Bestellung persönlich prüfen.'};
  const ext={bm:G()==='med'?'extBM':'extMini',lfp:model==='pro'?null:'extPlus'}[S.cuff];
  let leg,bel=0,src,bsrc;
  if(S.mmode==='size'){leg=SIZES[S.size][1];bel=S.cuff==='bmbauch'?leg:0;src=bsrc='Kleidergrösse '+SIZES[S.size][0];}
  else{
    const base=THIGH_LIMIT[model];
    if(base==null)return{support:true,reason:'Für dieses Modell ist die Masszuordnung nicht bestätigt. Bitte lass dich persönlich beraten.'};
    leg=Math.max(0,Math.ceil((S.thigh-base)/10));src='Oberschenkel '+S.thigh+' cm';
    // No unverified generic abdomen limit or +20 cm increments for Plus/Pro.
    // Their exact device descriptions verify thigh capacity only.
  }
  if(leg>4||bel>4)return{support:true};
  if(leg>0&&!ext)return{support:true,reason:'Für den Venen Engel Pro ist die passende Erweiterung im Shop nicht eindeutig zugeordnet. Bitte lass die Erweiterung persönlich prüfen.'};
  const items=[];
  if(leg>0)items.push([leg,ext,'je 10 cm mehr Umfang · '+src]);
  if(bel>0)items.push([bel,'extBauch','je 10 cm mehr Umfang · '+bsrc]);
  return{items,count:leg,bcount:bel,src,four:leg===4||bel===4,thighOnly:S.cuff==='lfp',unconfirmed:S.cuff==='lfp'};
}
function compatibilityIssue(){return hasLegs()&&hasArms()&&legRole()==='pro'?'Die Kombination aus Venen Engel Pro und Armmanschette ist für die vorhandenen Zubehörartikel nicht bestätigt. Das Verbindungsstück im Shop ist nur für den 12 Premium ausgewiesen. Bitte lass diese Kombination persönlich prüfen.':'';}

function bareFitIssue(force){
  if(!hasLegs()||(!S.skip&&!force))return '';
  const model=legRole();
  if(model==='minibauch')return 'Für dieses Mini-Set ist die Masszuordnung nicht bestätigt. Bitte prüfe das Gerät auf der Produktseite oder lass dich persönlich beraten.';
  if(premiumPants()&&((Number.isFinite(S.thigh)&&S.thigh>74)||(Number.isFinite(S.belly)&&S.belly>122)))return 'Deine eingegebenen Masse benötigen eine Passformprüfung mit Erweiterungen. Bitte übernimm die gemessene Konfiguration oder lass dich beraten.';
  const max=THIGH_LIMIT[model];
  if(max!=null&&Number.isFinite(S.thigh)&&S.thigh>max)return 'Dein eingegebener Oberschenkelumfang liegt über dem Richtbereich des Grundgeräts. Bitte prüfe die nötigen Erweiterungen persönlich.';
  if(S.mmode==='size'&&Number.isInteger(S.size)&&S.size>0)return 'Deine eingegebene Kleidergrösse benötigt eine Prüfung der Erweiterungen. Bitte lass dich persönlich beraten.';
  return '';
}

/* ---------- Strumpfgrösse ---------- */
const SB=[[20,22],[22,25],[25,28],[28,32],[32,35]],SC=[[32,40],[34,44],[38,48],[41,51],[45,54]],SG=[[43,58],[46,62],[50,67],[54,73],[68,78]];
function strSize(){const x=S.xs;if(!x.str)return null;const g=x.g!=null?x.g:S.thigh,needG=x.str!=='knie';if(x.b==null||x.c==null||(needG&&g==null))return null;
  const inr=(r,v)=>v>=r[0]&&v<=r[1];const ok=[0,1,2,3,4].filter(i=>inr(SB[i],x.b)&&inr(SC[i],x.c)&&(!needG||inr(SG[i],g)));
  if(!ok.length)return{none:true};const size=String(ok[0]+2);return strSizes(x.str,x.color).includes(size)?{size}:{unavailable:size};}
function stockingIssue(){
  const x=S.xs;if(!x.str)return '';
  if(!x.color||!x.ssize)return 'Bitte wähle Farbe und Grösse für die Kompressionsstrümpfe.';
  if(x.b==null&&x.c==null&&x.g==null)return '';
  const fit=strSize();
  if(!fit)return 'Bitte vervollständige die Strumpfmasse oder setze sie zurück, wenn du deine passende Grösse bereits kennst.';
  if(fit.none)return 'Zu diesen Strumpfmassen passt keine Standardgrösse. Bitte lass dich persönlich beraten.';
  if(fit.unavailable)return 'Die passende Strumpfgrösse '+fit.unavailable+' ist in dieser Ausführung nicht verfügbar.';
  if(fit.size!==x.ssize)return 'Zu deinen Massen passt Strumpfgrösse '+fit.size+'. Bitte passe die gewählte Grösse an.';
  return '';
}

/* ---------- Navigation ---------- */
const $=s=>root.querySelector(s);
function setAccent(){const g=G();root.classList.toggle('ve-is-med',g==='med');root.classList.toggle('ve-is-beauty',g==='beauty');}
function go(id){cur=id;render(true);}
function next(){const f=flow(),i=f.indexOf(cur);if(i>=0&&i<f.length-1)go(f[i+1]);else go(S.health==='yes'&&!S.cleared?'stop':'result');}
function back(){if(cur==='result'||cur==='stop')return go('health');const f=flow(),i=f.indexOf(cur);go(i>0?f[i-1]:'start');}


function render(focus){
  setAccent();root.dataset.veAt=cur;
  const scr=$('[data-ve-screen]'),f=flow();
  $('[data-ve-back]').disabled=cur==='start';
  const idx=f.indexOf(cur),cnt=$('[data-ve-count]'),prog=$('[data-ve-prog]');
  if(idx>=0){cnt.textContent='Frage '+(idx+1)+' von '+f.length;prog.style.width=(idx/f.length*100)+'%';}
  else if(cur==='start'){cnt.textContent='ca. 2 Minuten';prog.style.width='0';}
  else{cnt.textContent=cur==='stop'?'Hinweis':'Deine Empfehlung';prog.style.width='100%';}
  scr.innerHTML=cur==='start'?startHTML():cur==='measure'?measureHTML():cur==='stop'?stopHTML():cur==='result'?resultHTML():qHTML(cur);
  bind();
  if(focus){const h=scr.querySelector('h2');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}
    const r=root.getBoundingClientRect();if(r.top<0)root.scrollIntoView({block:'start',behavior:'smooth'});}
}

function startVisual(){
  if(SET.start_image)return '<div class="ve-start-visual ve-start-photo"><img src="'+esc(SET.start_image)+'" alt="" loading="lazy" decoding="async"></div>';
  const line=[['ve8lfp','8 Premium mit Pants','Medical'],['ve6bm','6 Premium mit Bein','Medical'],['plus','Plus mit Pants','Beauty'],['pro','Pro mit Pants','12 Kammern']]
    .map(([k,n,t])=>({im:imgOf(k),n,t})).filter(x=>x.im).slice(0,4);
  if(!line.length)return '';
  return '<div class="ve-start-visual"><ul class="ve-lineup">'+line.map(x=>'<li><span class="ve-lu-img"><img src="'+esc(x.im)+'" alt="" loading="lazy" decoding="async"></span><span class="ve-lu-tag">'+esc(x.t)+'</span><b>'+esc(x.n)+'</b></li>').join('')+'</ul></div>';
}
function startHTML(){const vis=startVisual();return '<div class="ve-start'+(vis?' ve-start-split':'')+'"><div class="ve-start-text"><ol class="ve-steps">'+
  '<li><span class="ve-stepnr">1</span><span class="ve-step-t"><b>Bedürfnis wählen</b><span>Linderung bei Beschwerden oder Beauty und Wellness</span></span></li>'+
  '<li><span class="ve-stepnr">2</span><span class="ve-step-t"><b>Gerät eingrenzen</b><span>Beine oder Arme, Beinmanschette oder Lymph-Flow Pants</span></span></li>'+
  '<li><span class="ve-stepnr">3</span><span class="ve-step-t"><b>Masse eingeben</b><span>Wir berechnen die passenden Erweiterungen für dich</span></span></li></ol>'+
  '<div class="ve-row"><button type="button" class="ve-btn" data-act="begin">Jetzt starten</button><span class="ve-muted">ca. 2 Minuten · halte ein Massband bereit</span></div></div>'+vis+'</div>';}

function qHTML(id){
  const q=Q(id),key=id==='unsure'?'diag':id;
  const available=o=>{
    if(o.k&&!V(P[o.k]?.aico)?.available)return false;
    if(id==='arm'){
      const prem=G()==='med'||S.level==='pro';
      if(o.v==='both'&&!V(P[prem?'armPremR':'armBeautyR'].aico)?.available)return false;
      if(S.area!=='arms'&&S.level==='pro')return false;
    }
    return true;
  };
  return '<h2>'+esc(q.t)+'</h2>'+(q.lead?'<p class="ve-lead">'+esc(q.lead)+'</p>':'')+
  (q.list?'<ul class="ve-list ve-cond">'+q.list.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+
  (()=>{const stack=q.o.some(o=>imgOf(o.k));return '<div class="ve-opts'+(stack?' ve-stack':(q.two?' ve-two':''))+'">'+q.o.map(o=>{
    const im=imgOf(o.k);let vis=im?thumb(im,'ve-thumb'):(o.f?fig(o.f):(o.i?ico(esc(o.i)):''));
    if(stack)vis='<span class="ve-media">'+(im?'<img src="'+esc(im)+'" alt="" loading="lazy" decoding="async">':(o.f?fig(o.f):(o.i?ico(esc(o.i)):'')))+'</span>';
    return '<button type="button" class="ve-opt'+(vis?'':' ve-nofig')+'" data-k="'+key+'" data-v="'+o.v+'" aria-pressed="'+(S[key]===o.v)+'"'+(available(o)?'':' disabled')+'>'+vis+
      '<span class="ve-txt"><b>'+esc(o.l)+'</b>'+(o.d?'<span class="ve-d">'+esc(o.d)+'</span>':'')+
      ((o.p||o.rec||o.warn)?'<span class="ve-meta">'+(o.rec?'<span class="ve-rec">Empfohlen</span>':'')+(o.warn?'<span class="ve-warnbadge">'+esc(o.warn)+'</span>':'')+(o.p?'<span class="ve-p">'+o.p+'</span>':'')+'</span>':'')+(!available(o)?'<span class="ve-d">'+(id==='arm'&&S.level==='pro'?'Kompatibilität persönlich prüfen':'Online derzeit nicht verfügbar')+'</span>':'')+'</span></button>';}).join('')+'</div>';})()+
  (q.help?'<p class="ve-help">'+esc(q.help)+'</p>':'')+
  (q.o.some(o=>!available(o))?'<div class="ve-row"><p class="ve-help">Deine gewünschte Ausführung ist nicht online verfügbar? Wir prüfen gerne die Möglichkeiten.</p>'+storeLink('Persönlich beraten lassen')+'</div>':'');
}

function measureHTML(){
  const pp=premiumPants(),cm=pp||S.mmode==='cm',b=bellyNeeded();
  const field=(id,l,v,ph)=>'<div class="ve-mfield"><label for="'+ROOT_ID+'-'+id+'">'+l+'</label><input id="'+ROOT_ID+'-'+id+'" data-m="'+id+'" type="number" inputmode="decimal" min="30" max="240" step="0.1" value="'+(v==null?'':v)+'" placeholder="'+ph+'"><span class="ve-unit">cm</span></div>';
  return '<h2>Deine Masse</h2><p class="ve-lead">'+(pp?'Mit dem Massrechner von Venen Engel prüfen wir, ob die Lymph-Flow Pants passen und welche Erweiterungen du brauchst.':'Damit die Manschette richtig sitzt, berechnen wir, ob du Erweiterungen brauchst.')+'</p>'+
  (pp?'':'<div class="ve-tabs" role="tablist"><button type="button" class="ve-tab" role="tab" data-mm="cm" aria-selected="'+cm+'">Ich messe</button><button type="button" class="ve-tab" role="tab" data-mm="size" aria-selected="'+(!cm)+'">Ich kenne nur meine Kleidergrösse</button></div>')+
  (cm?'<p class="ve-help">Miss an der breitesten Stelle, anliegend aber nicht einschnürend.</p>'+(b?field('belly','Bauch-/Hüftumfang',S.belly,'z.B. 100'):'')+field('thigh','Oberschenkelumfang',S.thigh,'z.B. 62')
   :'<p class="ve-help">Kleidergrösse für Hosen. Das ist ein Richtwert, genauer wird es mit dem Massband.</p><div class="ve-chips">'+SIZES.map((s,i)=>'<button type="button" class="ve-chip" data-size="'+i+'" aria-pressed="'+(S.size===i)+'">'+s[0]+'</button>').join('')+'</div>')+
  '<div class="ve-live" data-ve-live aria-live="polite">'+liveHTML()+'</div>'+
  '<div class="ve-row"><button type="button" class="ve-btn" data-act="mnext" data-ve-mnext'+(hasMeasures()?'':' disabled')+'>Weiter</button><button type="button" class="ve-link" data-act="skip">Überspringen, ich messe später</button></div>';
}
function liveHTML(){
  const e=extNeed(true);
  if(!e)return '<span class="ve-muted">Gib '+(bellyNeeded()&&(premiumPants()||S.mmode==='cm')?'beide Masse':'deine Masse')+' ein, dann siehst du hier das Ergebnis.</span>';
  if(e.support)return '<span>'+esc(e.reason||'Für diese Masse gibt es keine fertige Passform. Wir beraten dich gerne persönlich.')+'</span>';
  if(e.fit)return e.items.length?'<span>Empfohlen:</span>'+e.items.map(([q,k])=>'<strong>'+q+'×</strong><span>'+esc(P[k].n.replace('Erweiterungslaschen ',''))+'</span>').join(''):'<strong>✓</strong><span>Die Standardgrösse passt, keine Erweiterung nötig.</span>';
  let s='<strong>'+e.count+'</strong><span>'+(e.count===1?'Erweiterung':'Erweiterungen')+' laut Oberschenkelmass'+(e.count===0?' im angegebenen Richtbereich':'')+'</span>';
  if(e.thighOnly)s+='<span>Die Bauch-/Hüftpassform ist damit nicht bestätigt. Bitte prüfe sie persönlich.</span>';
  if(S.cuff==='bmbauch')s+='<span>· <b>'+e.bcount+'</b> für die Bauchmanschette</span>';
  return s;
}

function storeLink(label){const u=typeof SET.store_url==='string'&&/^\/(?!\/)/.test(SET.store_url)?SET.store_url:null;return u?'<a class="ve-btn ve-ghost" href="'+esc(u)+'">'+esc(label)+'</a>':'';}
function stopHTML(){return '<span class="ve-pill ve-pill-warn">Bitte zuerst abklären</span><h2>Sprich vor dem Kauf mit deiner Ärztin oder deinem Arzt</h2>'+
  '<p class="ve-lead">Bei den genannten Punkten kann eine Kompressionsmassage schaden. Wenn deine Ärztin oder dein Arzt einverstanden ist, zeigen wir dir gerne deine Empfehlung. Oder du lässt dich in einer unserer Filialen beraten.</p>'+
  '<div class="ve-row"><button type="button" class="ve-btn" data-act="cleared">Ist abgeklärt, Empfehlung zeigen</button>'+storeLink('Beratung in der Filiale')+'</div>';}

/* ---------- Empfehlung ---------- */
function compute(){
  const g=G(),lines=[],notes=[],tips=[],why=[];let title,alt=null,mainKey;
  const nArms=hasArms()?(S.arm==='both'?2:1):0;
  why.push(g==='med'&&S.level==='pro'&&hasLegs()?'Du wählst den Pro mit 12 Luftkammern. Dieses Modell ist kein zertifiziertes Medizinprodukt.':g==='med'?(S.goal==='unsure'?'Du hast eine Diagnose oder oft geschwollene Beine: darum ein medizinisch zertifiziertes Gerät.':'Du möchtest Beschwerden lindern: darum ein medizinisch zertifiziertes Gerät.'):'Dir geht es um Haut und Wohlbefinden: darum ein Beauty-Gerät ohne medizinische Zertifizierung.');
  if(S.area==='arms'){
    const first=S.arm==='right'?'R':'L';
    if(g==='med'){mainKey='ve8arm'+first;lines.push([1,mainKey,P[mainKey].s,'main']);
      if(nArms===2)lines.push([1,'armPremR','für den zweiten Arm']);
      title='8 Premium mit Lymph-Flow Armmanschette';why.push('Für die Arme gibt es ein eigenes Medical-Set mit 8 Kammern.');
    }else{mainKey='miniArm'+first;lines.push([1,mainKey,P[mainKey].s,'main']);
      if(nArms===2)lines.push([1,'armBeautyR','für den zweiten Arm']);
      title='Mini mit Lymph-Flow Armmanschette';why.push('Das Mini Arm-Set ist das Beauty-Gerät speziell für die Arme.');
      alt={k:'ve8armL',label:'8 Premium mit Lymph-Flow Armmanschette',sub:'Medizinisch zertifiziert, 8 Kammern',apply:()=>{S.goal='med';S.diag=null;}};
    }
  }else{
    if(g==='med'){
      if(S.level==='pro'){mainKey='pro';title='Pro mit Lymph-Flow Pants';
        notes.push('<b>Hinweis:</b> Der Venen Engel Pro ist kein zertifiziertes Medizinprodukt. Wenn du ein zertifiziertes Gerät suchst, wähle den 8 Premium oder lass dich persönlich beraten.');
        alt={k:'ve8lfp',label:'8 Premium mit Lymph-Flow Pants',sub:'Medizinisch zertifiziert, 8 Luftkammern',apply:()=>{S.level='8';}};}
      else{mainKey='ve'+S.level+S.cuff;title=S.level+' Premium mit '+(S.cuff==='lfp'?'Lymph-Flow Pants':'Bein');
        if(S.level==='6')alt={k:'ve8'+S.cuff,label:'8 Premium mit '+(S.cuff==='lfp'?'Lymph-Flow Pants':'Bein'),sub:'Unsere Empfehlung: feiner unterteilt mit 8 Luftkammern',apply:()=>{S.level='8';}};
        else if(S.cuff==='lfp')alt={k:'pro',label:'Pro mit Lymph-Flow Pants',sub:'12 Luftkammern, kein zertifiziertes Medizinprodukt',apply:()=>{S.level='pro';}};
        else alt={k:'ve8lfp',label:'8 Premium mit Lymph-Flow Pants',sub:'Unsere Empfehlung: Massage bis zum Bauch',apply:()=>{S.cuff='lfp';S.level='8';}};}
    }else{
      mainKey={bm:'mini',bmbauch:'minibauch',lfp:S.level}[S.cuff];
      title={mini:'Mini mit Bein',minibauch:'Mini mit Bein und Bauch',plus:'Plus mit Lymph-Flow Pants',pro:'Pro mit Lymph-Flow Pants'}[mainKey];
      alt={mini:{k:'minibauch',label:'Mini mit Bein und Bauch',sub:'Zusätzlich mit Bauchmanschette',apply:()=>{S.cuff='bmbauch';}},
        minibauch:{k:'plus',label:'Plus mit Lymph-Flow Pants',sub:'Bis zum Bauch in einem Stück, mit App',apply:()=>{S.cuff='lfp';S.level='plus';}},
        plus:{k:'pro',label:'Pro mit Lymph-Flow Pants',sub:'12 Kammern, Druck pro Kammer einstellbar',apply:()=>{S.level='pro';}},
        pro:{k:'plus',label:'Plus mit Lymph-Flow Pants',sub:'4 Kammern, 7 Programme, App',apply:()=>{S.level='plus';}}}[mainKey];
    }
    why.push(S.cuff==='lfp'?'Massage bis zum Bauch: darum die Lymph-Flow Pants.':S.cuff==='bmbauch'?'Beine bis zur Leiste plus Bauch: darum Bein- und Bauchmanschette.':'Massage bis zur Leiste: darum Beinmanschetten.');
    lines.push([1,mainKey,P[mainKey].s,'main']);
    if(nArms&&mainKey!=='pro'){const prem=g==='med',sides=S.arm==='both'?['L','R']:[S.arm==='right'?'R':'L'];
      sides.forEach(sd=>lines.push([1,(prem?'armPrem':'armBeauty')+sd,'Zusatzmanschette']));
      if(g==='med'&&S.cuff!=='lfp')why.push('Die Zusatzmanschette für die Arme gibt es mit 8 Kammern: darum der 8 Premium.');
      if(g==='beauty'&&mainKey.indexOf('mini')===0)tips.push('<b>Anwendung:</b> Arme und Beine nacheinander massieren, nicht gleichzeitig am Mini anschliessen.');}
    const e=extNeed();
    if(!e)notes.push(S.skip?'<b>Ohne Passformprüfung:</b> Du wählst das Grundgerät ohne berechnete Erweiterungen. Manschettenweite und benötigtes Zubehör bitte persönlich prüfen. Eine passende Weite ist nicht bestätigt.':'<b>Masse fehlen:</b> Miss vor der Bestellung deinen Oberschenkel'+(bellyNeeded()?' und Bauch':'')+'. So siehst du, ob du Erweiterungen brauchst.');
    else if(e.support)notes.push('<b>Persönliche Beratung:</b> '+esc(e.reason||'Für deine Masse gibt es keine fertige Passform. Teile uns deine Masse mit, gemeinsam finden wir die beste Lösung.'));
    else{
      if(e.items.length){e.items.forEach(([q,k,sub])=>lines.push([q,k,sub]));why.push(e.fit?'Deine Masse ('+e.src+'): passende Erweiterungen laut Venen-Engel-Massrechner.':e.src+': '+e.count+' '+(e.count===1?'Erweiterung':'Erweiterungen')+' für eine gute Passform.');}
      else lines.push([0,null,e.thighOnly?'Laut Oberschenkelmass keine Erweiterung nötig':'Keine Erweiterung nötig']);
      if(e.thighOnly)notes.push('<b>Passform am Bauch:</b> Die Berechnung prüft nur das Oberschenkelmass dieses Modells. Eine passende Bauch-/Hüftweite ist damit nicht bestätigt. Bitte prüfe sie vor der Bestellung persönlich.');
      if(e.four)notes.push('<b>Vier Erweiterungen:</b> Der Hersteller empfiehlt hier eine Beratung. Gerne in der Filiale.');
      if(S.mmode==='size'&&!premiumPants())notes.push('<b>Richtwert:</b> Die Erweiterungen basieren auf deiner Kleidergrösse. Miss zur Sicherheit nach.');
    }
  }
  const compatibility=compatibilityIssue();if(compatibility)notes.push('<b>Kompatibilität prüfen:</b> '+esc(compatibility));
  const bareIssue=bareFitIssue();if(bareIssue)notes.push('<b>Passform prüfen:</b> '+esc(bareIssue));
  if(g==='med'){
    tips.push(mainKey==='pro'?'<b>Krankenkasse:</b> Der Pro ist noch nicht zertifiziert. Kläre vor dem Kauf selbst mit deiner Krankenkasse ab, ob sie sich beteiligt.':'<b>Krankenkasse:</b> Je nach Diagnose beteiligt sich deine Krankenkasse. Bitte kläre das vor dem Kauf selbst mit ihr ab.');
    tips.push('<b>Tipp für den Start:</b> Beginne bei der ersten Anwendung mit der niedrigsten Druckstufe. Danach kannst du die Intensität Schritt für Schritt steigern.');
  }
  if(S.xs.kissen)lines.push([1,'kissen','Zusatzartikel']);
  if(S.xs.str&&S.xs.color&&S.xs.ssize)lines.push([1,{n:P[S.xs.str].n+', '+S.xs.color+', Grösse '+S.xs.ssize,aico:strAico(S.xs.str,S.xs.color,S.xs.ssize)},'Zusatzartikel']);
  if(alt&&!V(P[alt.k].aico)?.available)alt=null;
  return{lines,notes,tips,why,title,alt,mainKey};
}
/* Zeile → {name,sub,qty,variant} */
function resolve([q,k,sub,role]){
  if(k==null)return{empty:true,sub};
  const p=typeof k==='string'?P[k]:k;const v=V(p.aico);
  const name=v&&v.title?v.title+(v.variant_title&&v.variant_title!=='Default Title'?' · '+v.variant_title:''):p.n;
  return{qty:q,name,sub,variant:v,role,key:typeof k==='string'?k:null};
}
function answersText(){
  const g=G();const parts=[g==='med'?'Medical':'Beauty',{legs:'Beine',arms:'Arme',both:'Beine + Arme'}[S.area]];
  if(S.cuff)parts.push({bm:'bis Leiste',bmbauch:'Leiste + Bauch',lfp:'bis Bauch'}[S.cuff]);
  if(S.arm)parts.push({left:'Arm links',right:'Arm rechts',both:'beide Arme'}[S.arm]);
  return parts.join(' · ');
}
function measureText(){
  if(!hasLegs())return'';if(S.skip)return'später';
  if(S.mmode==='size'&&!premiumPants()&&S.size!=null)return'Kleidergrösse '+SIZES[S.size][0];
  return (bellyNeeded()&&S.belly?'Bauch '+S.belly+' cm, ':'')+(S.thigh?'Oberschenkel '+S.thigh+' cm':'');
}

function xsHTML(){
  const x=S.xs,parts=[];
  if(V(P.kissen.aico)?.available){
    parts.push('<div class="ve-xsi"><div class="ve-xhead">'+thumb(imgOf('kissen'),'ve-xthumb')+'<div class="ve-t"><b>Venenkissen · '+ph('kissen')+'</b><span>Beine bequem hochlagern, für Entlastung und Entspannung</span></div></div>'+
      '<button type="button" class="ve-btn ve-small'+(x.kissen?' ve-on':' ve-ghost')+'" data-xs="kissen" aria-pressed="'+x.kissen+'">'+(x.kissen?'✓ Hinzugefügt':'Hinzufügen')+'</button></div>');
  }
  const types=strTypes();
  if(types.length){
    const priceOf=t=>{for(const c of strColors(t))for(const z of strSizes(t,c)){const v=MAP[strAico(t,c,z)];if(v)return v.compare>v.price?chf(v.price)+' statt '+chf(v.compare):chf(v.price);}return '';};
    const cols=x.str?strColors(x.str):[],sizes=x.str&&x.color?strSizes(x.str,x.color):[];
    let finder='';
    if(x.str){
      const r=strSize(),needG=x.str!=='knie',g=x.g!=null?x.g:S.thigh;
      const msg=stockingIssue()||(!r?'Kennst du deine passende Grösse? Wähle sie oben aus. Oder gib deine Masse ein, dann ermitteln wir die Grösse.':r.none?'Zu diesen Massen passt keine Standardgrösse. Wir beraten dich gerne.':r.unavailable?'Du brauchst Grösse '+r.unavailable+'. Diese ist in dieser Ausführung nicht erhältlich.':'✓ Grösse '+r.size+' passt zu deinen Massen.');
      const f=(id,l,v,h)=>'<div class="ve-sfrow"><label for="'+ROOT_ID+'-'+id+'">'+l+'</label><input id="'+ROOT_ID+'-'+id+'" data-sf="'+id+'" type="number" inputmode="numeric" min="10" max="100" value="'+(v==null?'':v)+'"><span class="ve-unit">cm</span><small>'+h+'</small></div>';
      finder='<div class="ve-sfind"><span class="ve-eyebrow">Grösse ermitteln</span>'+f('b','Fessel',x.b,'schmalste Stelle über dem Knöchel')+f('c','Wade',x.c,'dickste Stelle')+(needG?f('g','Oberschenkel',g,'ganz oben, unter dem Gesäss'):'')+
        '<p class="ve-sfres">'+esc(msg)+'</p><p class="ve-help">Standardlänge: Ferse bis Kniekehle 38–44 cm'+(needG?', Ferse bis Oberschenkel 72–83 cm':'')+'.</p>'+((x.b!=null||x.c!=null||x.g!=null)?'<button type="button" class="ve-link" data-act="clear-stock-measures">Massangaben zurücksetzen und Grösse selbst wählen</button>':'')+'</div>';
    }
    const sImg=(()=>{if(x.str&&x.color){const a=strAico(x.str,x.color,x.ssize)||strAico(x.str,x.color,strSizes(x.str,x.color)[0]);if(MAP[a]&&MAP[a].image)return MAP[a].image;}for(const t of types)for(const c of strColors(t))for(const z of strSizes(t,c)){const v=MAP[strAico(t,c,z)];if(v&&v.image)return v.image;}return null;})();
    parts.push('<div class="ve-xsi"><div class="ve-xhead">'+thumb(sImg,'ve-xthumb')+'<div class="ve-t"><b>Kompressionsstrümpfe Klasse II</b><span>Für leichte Beine zwischen den Anwendungen, im Alltag</span></div></div><span></span>'+
      '<div class="ve-sel"><select data-xsel="str" aria-label="Strümpfe"><option value="">Keine Strümpfe</option>'+
      types.map(t=>'<option value="'+t+'"'+(x.str===t?' selected':'')+'>'+{knie:'Knie',schenkel:'Schenkel',hose:'Strumpfhose'}[t]+' · '+priceOf(t)+'</option>').join('')+'</select>'+
      (x.str?'<select data-xsel="color" aria-label="Farbe">'+cols.map(c=>'<option'+(c===x.color?' selected':'')+'>'+c+'</option>').join('')+'</select>'+
        '<select data-xsel="ssize" aria-label="Grösse"><option value=""'+(!x.ssize?' selected':'')+'>Grösse wählen</option>'+sizes.map(z=>'<option value="'+z+'"'+(z===x.ssize?' selected':'')+'>Grösse '+z+'</option>').join('')+'</select>':'')+
      '</div>'+finder+'</div>');
  }
  return parts.length?'<div class="ve-xs"><span class="ve-eyebrow">Passt dazu</span>'+parts.join('')+'</div>':'';
}

function resultHTML(){
  const r=compute(),g=G();
  const rows=r.lines.map(resolve);
  const main=rows.find(x=>x.role==='main');
  let total=0,totalWas=0,offline=[];
  const li=rows.map(x=>{
    if(x.empty)return '<li><span class="ve-qty">–</span><span class="ve-lthumb ve-noimg ve-blank"></span><span class="ve-nm">'+esc(x.sub)+'</span><span class="ve-pr"></span></li>';
    if(!x.variant || !x.variant.available){offline.push(x.name);return '<li class="ve-off"><span class="ve-qty">'+x.qty+'×</span>'+thumb(null,'ve-lthumb')+'<span class="ve-nm">'+esc(x.name)+'<small>Online nicht verfügbar</small></span><span class="ve-pr">–</span></li>';}
    const now=x.qty*x.variant.price,was=x.variant.compare>x.variant.price?x.qty*x.variant.compare:now;
    total+=now;totalWas+=was;
    return '<li><span class="ve-qty">'+x.qty+'×</span>'+thumb(x.variant.image,'ve-lthumb')+'<span class="ve-nm">'+esc(x.name)+(x.sub?'<small>'+esc(x.sub)+'</small>':'')+'</span><span class="ve-pr">'+money(now,was)+'</span></li>';}).join('');
  const save=totalWas-total;
  const img=main&&main.variant&&main.variant.image?'<img class="ve-img" src="'+esc(main.variant.image)+'" alt="" width="240" height="240" loading="lazy" decoding="async">':'';
  const mainOffline=!main||!main.variant||!main.variant.available;
  const fit=hasLegs()?extNeed():null;
  const unavailable=mainOffline||offline.length>0||!complete||!!(fit&&(fit.support||fit.unconfirmed))||!!stockingIssue()||!!compatibilityIssue()||!!bareFitIssue();
  const blocked=unavailable||cartState!=='idle';
  const f=flow();
  const lab={goal:{med:'Beschwerden',beauty:'Beauty',unsure:'Unsicher'}[S.goal],unsure:S.diag==='yes'?'Diagnose: ja':'Diagnose: nein',
    area:{legs:'Beine',arms:'Arme',both:'Beine + Arme'}[S.area],cuff:{bm:'Bis Leiste',bmbauch:'Leiste + Bauch',lfp:'Bis Bauch'}[S.cuff],
    level:{'6':'6 Kammern','8':'8 Kammern',plus:'Plus',pro:'Pro'}[S.level],arm:{left:'Arm links',right:'Arm rechts',both:'Beide Arme'}[S.arm],
    measure:S.skip?'Masse später':(S.mmode==='size'&&!premiumPants()&&S.size!=null)?'Grösse '+SIZES[S.size][0]:S.thigh?S.thigh+(bellyNeeded()&&S.belly?' / '+S.belly:'')+' cm':'Masse',health:'Check ok'};
  const altP=r.alt?price(r.alt.k):null;
  return '<div class="ve-result"><div class="ve-res-main"><div class="ve-res-head">'+img+'<div><div class="ve-res-pills">'+(main&&main.variant&&main.variant.price>0&&main.variant.compare>main.variant.price&&Math.floor((main.variant.compare-main.variant.price)*100/main.variant.compare)>0?'<span class="ve-pill ve-pill-sale">Aktion · '+Math.floor((main.variant.compare-main.variant.price)*100/main.variant.compare)+' % günstiger</span>':'')+'<span class="ve-pill">'+(g==='med'?(r.mainKey==='pro'?'Medical-Auswahl · nicht zertifiziert':'Medical · zertifiziert'):'Beauty & Wellness')+'</span></div><h2>Venen Engel '+esc(r.title)+'</h2></div></div>'+
    '<ul class="ve-list ve-why">'+r.why.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>'+
    '<div class="ve-pack"><span class="ve-eyebrow">Dein Paket</span><ul class="ve-lines">'+li+'</ul>'+
    '</div>'+
    r.notes.map(n=>'<div class="ve-note">'+n+'</div>').join('')+
    (offline.length?'<div class="ve-note" role="status"><b>Paket online nicht vollständig verfügbar:</b> '+esc(offline.join(', '))+'. Bitte lass dich beraten oder ändere deine Auswahl. Es wird kein unvollständiges Paket hinzugefügt.</div>':'')+
    (!complete?'<div class="ve-note" role="status">Das Sortiment konnte nicht vollständig geladen werden. Bitte nutze die persönliche Beratung.</div>':'')+
    xsHTML()+'</div>'+
    '<aside class="ve-res-side"><div class="ve-sumbox"><div class="ve-total"><span>Total</span><span class="ve-pr">'+(unavailable?'–':money(total,totalWas))+'</span></div>'+(save>0&&!unavailable?'<span class="ve-saving">Du sparst '+chf(save)+' mit der Venen-Engel-Aktion</span>':'')+'<span class="ve-muted ve-fine">inkl. MwSt.</span>'+
    '<div class="ve-actions">'+(fit&&fit.unconfirmed&&!bareFitIssue(true)&&!compatibilityIssue()?'<button type="button" class="ve-btn ve-ghost" data-act="bare-device">Ohne Passformprüfung wählen – Masse später prüfen</button>':'')+'<button type="button" class="ve-btn ve-block" data-act="cart"'+(blocked?' disabled':'')+'>'+({pending:'Wird hinzugefügt …',uncertain:'Bitte Warenkorb prüfen',added:'✓ Im Warenkorb'}[cartState]||'Alles in den Warenkorb')+'</button>'+storeLink('In einer Filiale testen')+(unavailable&&main?.variant?.url&&/^\/(?!\/)/.test(main.variant.url)?'<a class="ve-link" href="'+esc(main.variant.url)+'">Gerät auf der Produktseite ansehen (ohne Passformbestätigung)</a>':'')+'</div></div>'+
    r.tips.map(n=>'<div class="ve-tip">'+n+'</div>').join('')+
    (r.alt&&altP!=null?'<div class="ve-alt"><div class="ve-xhead">'+thumb(imgOf(r.alt.k),'ve-xthumb')+'<div class="ve-t"><b>Auch interessant: '+esc(r.alt.label)+'</b><span>'+esc(r.alt.sub)+' · '+money(altP,cmp(r.alt.k))+'</span></div></div><button type="button" class="ve-btn ve-ghost" data-act="alt">Stattdessen wählen</button></div>':'')+
    '<div class="ve-sumwrap"><span class="ve-eyebrow">Deine Antworten · antippen zum Ändern</span><div class="ve-sum">'+f.map(id=>'<button type="button" data-jump="'+id+'">'+esc(lab[id]||id)+'</button>').join('')+'</div>'+
    '<button type="button" class="ve-link" data-act="restart">Neu starten</button></div></aside></div>';
}

/* ---------- Warenkorb ---------- */
function cartItems(){
  const f=flow();
  const valid=f.every(id=>id==='measure'?(S.skip||hasMeasures()):id==='unsure'?['yes','no'].includes(S.diag):Q(id).o.some(option=>option.v===S[id]));
  if(!valid||S.health==='yes'&&!S.cleared)throw new Error('Bitte beantworte zuerst alle Fragen und den Gesundheits-Check.');
  if(!complete)throw new Error('Das Sortiment ist nicht vollständig verfügbar. Bitte nutze die persönliche Beratung.');
  const compatibility=compatibilityIssue();if(compatibility)throw new Error(compatibility);
  const fit=hasLegs()?extNeed():null;
  if(fit&&(fit.support||fit.unconfirmed))throw new Error('Für diese Masse ist zuerst eine persönliche Beratung nötig oder eine ausdrückliche Auswahl ohne Passformprüfung.');
  const bareIssue=bareFitIssue();if(bareIssue)throw new Error(bareIssue);
  const stockingProblem=stockingIssue();if(stockingProblem)throw new Error(stockingProblem);
  const rows=compute().lines.map(resolve).filter(x=>!x.empty&&x.qty>0);
  if(!rows.length||!rows.some(x=>x.role==='main')||rows.some(x=>!x.variant||!x.variant.available))throw new Error('Das Paket ist online nicht vollständig verfügbar. Bitte ändere die Auswahl oder lass dich beraten.');
  const props={'_Konfigurator':answersText()};const m=measureText();if(m)props['_Masse']=m;if(S.skip)props['_Passform']='Ohne Passformprüfung; Manschettenweite und Zubehör persönlich prüfen';
  const items=rows.map(x=>({id:x.variant.id,quantity:x.qty,properties:x.role==='main'?props:{'_Konfigurator':'Venen Engel Konfigurator'}}));
  if(items.some(x=>!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>10))throw new Error('Bitte prüfe die Menge oder lass dich beraten.');
  return items;
}
async function addToCart(btn){
  if(cartState!=='idle'||cur!=='result')return;
  // The notice is outside the replaceable question/result screen, so changing
  // answers while the batch is pending cannot detach or hide its outcome.
  const msg=$('[data-ve-cartmsg]');
  const show=message=>{msg.textContent=message;msg.hidden=false;};
  let items;
  try {items=cartItems();}catch(error){show(error.message);return;}
  const label=text=>{const current=$('[data-act="cart"]');if(current){current.disabled=true;current.textContent=text;}};
  cartState='pending';label('Wird hinzugefügt …');show('Dein Paket wird hinzugefügt. Bitte warte auf die Bestätigung.');
  let response;
  try {
    // Exactly one batch. Never retry individual lines after an ambiguous response:
    // Shopify may already have added some/all of the original request.
    response=await fetch(routeRoot+'cart/add.js',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({items})});
  }catch(error){
    cartState='uncertain';label('Bitte Warenkorb prüfen');
    show('Die Verbindung wurde unterbrochen. Prüfe zuerst deinen Warenkorb, bevor du erneut bestellst.');
    const link=document.createElement('a');link.href=cartURL;link.textContent='Zum Warenkorb';msg.append(' ',link);return;
  }
  if(!response.ok){
    // A rejected batch can have side effects in Shopify (for example quantity
    // limits). Keep this page locked until the customer checks their cart.
    cartState='uncertain';label('Bitte Warenkorb prüfen');
    let description='Das Paket konnte nicht wie ausgewählt hinzugefügt werden.';
    try{const data=await response.json();if(typeof data.description==='string')description=data.description;}catch(error){}
    show(description+' Bitte prüfe deinen Warenkorb und die aktuelle Verfügbarkeit.');
    const link=document.createElement('a');link.href=cartURL;link.textContent='Zum Warenkorb';msg.append(' ',link);return;
  }
  cartState='added';label('✓ Im Warenkorb');
  document.dispatchEvent(new CustomEvent('cart:refresh',{bubbles:true}));
  if(SET.redirect!==false){window.location.assign(cartURL);}
  else {show('Alles im Warenkorb.');const link=document.createElement('a');link.href=cartURL;link.textContent='Zum Warenkorb';msg.append(' ',link);}
}

/* ---------- Events ---------- */
function bind(){
  const scr=$('[data-ve-screen]');
  scr.querySelectorAll('.ve-opt').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.k,v=b.dataset.v;S[k]=v;
    if(k==='goal'&&v!=='unsure')S.diag=null;
    if(k==='health')S.cleared=false;
    sanitize();b.setAttribute('aria-pressed','true');next();
  }));
  scr.querySelectorAll('[data-mm]').forEach(b=>b.addEventListener('click',()=>{S.mmode=b.dataset.mm;S.skip=false;render(false);}));
  scr.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{S.size=Number(b.dataset.size);S.skip=false;render(false);}));
  scr.querySelectorAll('[data-m]').forEach(el=>el.addEventListener('input',()=>{S[el.dataset.m]=el.value===''?null:Number(el.value);S.skip=false;$('[data-ve-live]').innerHTML=liveHTML();$('[data-ve-mnext]').disabled=!hasMeasures();}));
  scr.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.jump)));
  scr.querySelectorAll('[data-xs]').forEach(b=>b.addEventListener('click',()=>{S.xs.kissen=!S.xs.kissen;render(false);}));
  scr.querySelectorAll('[data-xsel]').forEach(s=>s.addEventListener('change',()=>{
    const k=s.dataset.xsel;S.xs[k]=s.value;
    if(k==='str'&&S.xs.str){const cols=strColors(S.xs.str);if(!cols.includes(S.xs.color))S.xs.color=cols[0];}
    if((k==='str'||k==='color')&&S.xs.str){const zs=strSizes(S.xs.str,S.xs.color);const r=strSize();S.xs.ssize=r&&r.size&&zs.includes(r.size)?r.size:(zs.includes(S.xs.ssize)?S.xs.ssize:'');}
    render(false);const n=scr.querySelector('[data-xsel="'+k+'"]');if(n)n.focus();}));
  scr.querySelectorAll('[data-sf]').forEach(el=>el.addEventListener('input',()=>{
    const k=el.dataset.sf;S.xs[k]=el.value===''?null:Number(el.value);const r=strSize();if(r&&r.size)S.xs.ssize=r.size;
    render(false);const n=scr.querySelector('[data-sf="'+k+'"]');if(n){n.focus();const v=n.value;n.value='';n.value=v;}}));
  scr.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.act;
    if(a==='begin')go(flow()[0]);
    if(a==='mnext'&&hasMeasures()){S.skip=false;next();}
    if(a==='skip'){S.skip=true;next();}
    if(a==='cleared'){S.cleared=true;go('result');}
    if(a==='cart')addToCart(b);
    if(a==='bare-device'&&!bareFitIssue(true)){S.skip=true;render(false);}
    if(a==='clear-stock-measures'){S.xs.b=null;S.xs.c=null;S.xs.g=null;render(false);}
    if(a==='alt'){const r=compute();if(r.alt){r.alt.apply();sanitize();render(true);}}
    if(a==='restart'){S=clone(EMPTY);go('start');}
  }));
}
$('[data-ve-back]').addEventListener('click',back);
render(false);
/* für Tests */
root.__ve={get S(){return S},set S(v){S=v},compute,resolve,fitSelect,strSize,cartItems,render,go:id=>{cur=id;render(false);},sanitize};
}
window.upswingVenenEngel={mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(document),{once:true});else mount(document);
document.addEventListener('shopify:section:load',event=>mount(event.target));
})();
