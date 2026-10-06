// Simulation engine: clock, environment, cyclone physics, identity. FICTIONAL.
export const LAND=[
[[18.6,121.0],[18.5,122.3],[16.2,122.5],[14.1,124.1],[13.0,123.9],[13.6,121.5],[14.0,120.6],[16.0,119.8],[18.3,120.4]],
[[12.0,122.0],[12.5,124.5],[10.5,125.2],[9.3,124.0],[9.5,122.5],[10.5,121.9]],
[[9.5,123.2],[9.2,126.2],[6.5,126.4],[5.9,125.4],[6.9,122.0],[8.5,123.4]],
[[11.3,119.4],[9.5,118.3],[8.4,117.2],[9.8,118.6]]];
const inPoly=(la,lo,p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[a,b]=p[i],[d,e]=p[j];if((b>lo)!=(e>lo)&&la<(d-a)*(lo-b)/(e-b)+a)c=!c}return c};
export const onLand=(la,lo)=>LAND.some(p=>inPoly(la,lo,p));
export function rng(seed){let h=1779033703^String(seed).length;for(const ch of String(seed))h=Math.imul(h^ch.charCodeAt(0),3432918353),h=h<<13|h>>>19;let a=h>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const fmtTime=ms=>{const d=new Date(ms),p=o=>new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',...o}).format(d);return`${p({hour:'numeric',minute:'2-digit',hour12:true})} PHT • ${p({month:'long',day:'numeric',year:'numeric'})}`};
export const classify=w=>w>=185?'Super Typhoon':w>=118?'Typhoon':w>=89?'Severe Tropical Storm':w>=62?'Tropical Storm':'Tropical Depression';
export const tcws=w=>w>=185?5:w>=118?4:w>=89?3:w>=62?2:w>=39?1:0;
export const pressure=w=>Math.round(1008-(w/21.5)**2);
const pad=(n,l)=>String(n).padStart(l,'0');
export const fill=(t,n,y)=>t.replace(/{NUMBER3}/g,pad(n,3)).replace(/{NUMBER}/g,pad(n+11,2)).replace(/{NN}/g,pad(n,2)).replace(/{YEAR}/g,y);
export function display(s,f){const L=s.local||s.intl||'Unnamed',I=s.intl,D=s.intlDesig;switch(f){
case'local':return`${L} (${D})`;case'intl':return`${I||L} (${D})`;case'desig':return`${D} — ${L}${I?' / '+I:''}`;
case'full':return`${L}\nInternational: ${I||'—'}\nDesignation: ${D}`;default:return`${L}${I?' / '+I:''} (${D})`}}
const RANK=['Tropical Depression','Tropical Storm','Severe Tropical Storm','Typhoon','Super Typhoon'];
export class Sim{
constructor(cfg){this.cfg=cfg;this.reset()}
reset(){const c=this.cfg;this.r=rng(c.seed);this.t=Date.parse(c.start+':00+08:00');this.storms=[];this.n=0;this.log=[];this.shear=c.shear}
ev(m){this.log.unshift(`${fmtTime(this.t)} — ${m}`);this.log.length=Math.min(this.log.length,200)}
nm(s){return display(s,this.cfg.dfmt).split('\n')[0]}
spawn(lat,lon,manual){const c=this.cfg,y=new Date(this.t).getUTCFullYear();this.n++;let L,I;
if(manual&&c.ln){L=c.ln;I=c.inm}
if(!L){const a=c.lnl,b=c.inl,used=new Set(this.storms.map(x=>x.local)),pool=a.filter(x=>!used.has(x)),p=pool.length?pool:a;L=p[Math.floor(this.r()*p.length)];I=b[(this.n-1)%b.length]}
const s={id:'CYCLONE-'+y+'-'+pad(this.n,4),lat,lon,wind:35+this.r()*15,heading:285+this.r()*30,speed:14+this.r()*8,local:L,intl:I,
localDesig:fill(c.ld,this.n,y),intlDesig:fill(c.idn,this.n,y),simId:fill(c.sid,this.n,y),track:[[lat,lon]],cls:'',land:false,peak:0};
s.cls=classify(s.wind);this.storms.push(s);this.ev(`${this.nm(s)} forms as a ${s.cls}.`);return s}
advance(){const c=this.cfg,dt=c.step/60;this.t+=c.step*60000;
this.shear=Math.max(0,Math.min(40,this.shear+(this.r()-.5)*2*dt+(c.shear-this.shear)*.02*dt));
if(c.auto&&this.storms.length<c.maxc&&this.r()<c.prob*dt/24)this.spawn(ZONE.lat[0]+this.r()*(ZONE.lat[1]-ZONE.lat[0]),ZONE.lon[0]+this.r()*(ZONE.lon[1]-ZONE.lon[0]));
for(const s of[...this.storms]){const pot=Math.max(30,Math.min(260,40+(c.sst-26)*55-this.shear*4-(s.lat>24?(s.lat-24)*12:0)));
const land=onLand(s.lat,s.lon);
if(land)s.wind*=Math.exp(-dt/7);else s.wind+=(pot-s.wind)*Math.min(1,.06*dt)*(pot>s.wind?1:1.5);
if(land&&!s.land)this.ev(`${this.nm(s)} makes landfall near ${s.lat.toFixed(1)}°N, ${s.lon.toFixed(1)}°E (${Math.round(s.wind)} km/h).`);
if(!land&&s.land)this.ev(`${this.nm(s)} re-emerges over water.`);s.land=land;
const target=s.lat>21?20+(s.lat-21)*4:292,d=((target-s.heading+540)%360)-180;
s.heading=(s.heading+Math.sign(d)*Math.min(Math.abs(d),4*dt)+(this.r()-.5)*3*dt+360)%360;
s.speed=Math.max(8,Math.min(40,s.speed+(this.r()-.5)*2*dt+(s.lat>24?.5*dt:0)));
const h=s.heading*Math.PI/180,k=s.speed*dt;s.lat+=k*Math.cos(h)/111;s.lon+=k*Math.sin(h)/(111*Math.cos(s.lat*Math.PI/180));
s.track.push([s.lat,s.lon]);s.peak=Math.max(s.peak,s.wind);const cl=classify(s.wind);
if(cl!==s.cls){const up=RANK.indexOf(cl)>RANK.indexOf(s.cls);this.ev(`${this.nm(s)} ${up?'strengthens into':'weakens to'} a ${cl}${tcws(s.wind)?` — TCWS #${tcws(s.wind)} simulated`:''}.`);s.cls=cl}
if(s.wind<30||s.lat>ZONE.kill[1]||s.lon<ZONE.kill[2]||s.lon>ZONE.kill[3]||s.lat<ZONE.kill[0]){this.ev(`${this.nm(s)} dissipates (peak ${Math.round(s.peak)} km/h).`);this.storms.splice(this.storms.indexOf(s),1)}}}
snapshot(){return JSON.stringify({t:this.t,n:this.n,shear:this.shear,storms:this.storms,log:this.log})}
restore(j){Object.assign(this,JSON.parse(j))}}

// ---- v0.2: forecast, hazards, LGU impacts (all simulated) ----
export const CITIES=[
['Laoag',18.20,120.59,111000,1],['Tuguegarao',17.61,121.73,166000,0],['Baguio',16.41,120.59,366000,0],['Dagupan',16.04,120.34,174000,1],
['Manila',14.60,120.98,1846000,1],['Quezon City',14.68,121.04,2960000,0],['Legazpi',13.14,123.74,209000,1],['Puerto Princesa',9.74,118.74,255000,1],
['Roxas',11.58,122.75,179000,1],['Iloilo',10.72,122.56,457000,1],['Cebu',10.32,123.89,964000,1],['Tacloban',11.24,125.00,251000,1],
['Cagayan de Oro',8.48,124.65,728000,1],['Davao',7.07,125.61,1776000,1],['General Santos',6.11,125.17,697000,1],['Zamboanga',6.91,122.07,977000,1]]
const hav=(a,b,c,d)=>{const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 12742*Math.asin(Math.sqrt(x))}
export const radiusKm=w=>Math.max(60,w*1.6);
export function forecast(s,cfg,shear){ // deterministic 6-hourly projection to 120 h
let {lat,lon,wind,heading,speed}=s,out=[];
for(let h=6;h<=120;h+=6){const pot=Math.max(30,Math.min(260,40+(cfg.sst-26)*55-shear*4-(lat>24?(lat-24)*12:0)));
const land=onLand(lat,lon);wind=land?wind*Math.exp(-6/7):wind+(pot-wind)*.36*(pot>wind?1:1.5);
const t=lat>21?20+(lat-21)*4:292,d=((t-heading+540)%360)-180;heading=(heading+Math.sign(d)*Math.min(Math.abs(d),24)+360)%360;
const k=speed*6,r=heading*Math.PI/180;lat+=k*Math.cos(r)/111;lon+=k*Math.sin(r)/(111*Math.cos(lat*Math.PI/180));
out.push({h,lat,lon,wind,pres:pressure(wind),unc:60+h*2.2});if(wind<30)break}
return out}
export function hazards(s){ // per-city wind, rain, surge, TCWS, status for one storm
const R=radiusKm(s.wind);return CITIES.map(([name,la,lo,pop,coast])=>{const d=hav(s.lat,s.lon,la,lo);
const w=s.wind*(d<R?1-.5*d/R:.5*Math.exp(-(d-R)/150));const rain=Math.round(w*1.5*(s.land?1.2:1));
const surge=coast&&d<2*R&&w>=89?+Math.min(6,(w-60)/40).toFixed(1):0;const lv=tcws(w);
const status=lv>=5?'OVERWHELMED':lv>=3?'EVACUATING':lv>=1?'PREPARED':'NORMAL';
return{name,pop,d:Math.round(d),wind:Math.round(w),rain,surge,tcws:lv,status,rainLvl:rain>=200?'Red':rain>=100?'Orange':rain>=50?'Yellow':'None',
affected:lv>=2?pop:0}}).filter(c=>c.tcws>0||c.d<400).sort((a,b)=>b.wind-a.wind)}

// ---- v0.3: swappable maps (built-in PH, fictional archipelago, uploaded GeoJSON) ----
export const PH_LAND=LAND.map(p=>p.slice()), PH_CITIES=CITIES.map(c=>c.slice());
export const ZONE={lat:[7,15],lon:[128,148],kill:[0,45,100,170]};
export function setMap(polys,cities){LAND.length=0;LAND.push(...polys);CITIES.length=0;CITIES.push(...cities);
let a=90,b=-90,c=180,d=-180;for(const p of polys)for(const[y,x]of p){if(y<a)a=y;if(y>b)b=y;if(x<c)c=x;if(x>d)d=x}
if(a>b)return;const h=Math.max(b-a,4);ZONE.lat=[a+.1*h,a+.6*h];ZONE.lon=[d+2.5,d+21.5];ZONE.kill=[a-15,b+25,c-25,d+45]}
export function geoToMap(g){const polys=[],cities=[],pts=[];
const feats=g.type==='FeatureCollection'?g.features:g.type==='Feature'?[g]:[{geometry:g,properties:{}}];
feats.forEach((f,i)=>{const gm=f&&f.geometry;if(!gm)return;const pr=f.properties||{},nm=pr.name||pr.NAME||pr.Name;
if(gm.type==='Point'){pts.push([nm||'Point '+(i+1),gm.coordinates[1],gm.coordinates[0],+pr.pop||+pr.population||100000,1]);return}
const outers=gm.type==='Polygon'?[gm.coordinates[0]]:gm.type==='MultiPolygon'?gm.coordinates.map(p=>p[0]):[];if(!outers.length)return;
const rings=outers.map(r=>r.map(([x,y])=>[y,x]));polys.push(...rings);
if(cities.length<40){const big=rings.reduce((m,r)=>r.length>m.length?r:m,rings[0]);
cities.push([nm||'Area '+(i+1),big.reduce((s,p)=>s+p[0],0)/big.length,big.reduce((s,p)=>s+p[1],0)/big.length,+pr.pop||+pr.population||100000,1])}});
return{polys,cities:pts.length?pts:cities}}
export function fictional(r){const polys=[],cities=[],S=['Ba','Ka','Lu','Ma','Sa','Ta','Ri','Do','Ne','Va'],E=['gan','lon','ria','bay','tos','dan'],q=a=>a[Math.floor(r()*a.length)];
for(let i=0;i<6;i++){const la=8+r()*12,lo=117+r()*13,R=.7+r()*1.8,p=[];for(let k=0;k<16;k++){const a=k/16*2*Math.PI,rr=R*(.6+.6*r());p.push([la+rr*Math.sin(a)*.8,lo+rr*Math.cos(a)*1.3])}polys.push(p);
for(let c=0;c<2;c++)cities.push([q(S)+q(S).toLowerCase()+q(E),la+(r()-.5)*R*.8,lo+(r()-.5)*R*.8,Math.round(50000+r()*900000),c])}
return{polys,cities}}

// ---- v0.4: interaction, flood/landslide, emergency stats, history ----
const hsh=n=>{let h=0;for(const ch of n)h=(h*31+ch.charCodeAt(0))%1000;return h/1000};
const lvl=v=>v>=150?'High':v>=70?'Moderate':v>=25?'Low':'None';
Sim.prototype.interact=function(dt){const S=this.storms;
for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j],d=hav(a.lat,a.lon,b.lat,b.lon);if(d>1400)continue;const f=1-d/1400;
for(const[x,y]of[[a,b],[b,a]]){const br=(Math.atan2((y.lon-x.lon)*Math.cos(x.lat*Math.PI/180),y.lat-x.lat)*180/Math.PI+360)%360; // Fujiwhara: counter-clockwise orbit
const dd=((br+90-x.heading+540)%360)-180;x.heading=(x.heading+Math.sign(dd)*Math.min(Math.abs(dd),6*f*dt)+360)%360;
if(x.wind<y.wind)x.wind=Math.max(25,x.wind-1.5*f*dt)} // moisture/outflow competition
if(d<250){const[w,s]=a.wind>=b.wind?[a,b]:[b,a];if(s.wind<.85*w.wind){w.wind+=.1*s.wind;S.splice(S.indexOf(s),1);this.ev(`${this.nm(s)} is absorbed by ${this.nm(w)} (merger).`);return}}
else if(d<700){const k=[a.id,b.id].sort().join('|');this.pairs=this.pairs||new Set();if(!this.pairs.has(k)){this.pairs.add(k);this.ev(`${this.nm(a)} and ${this.nm(b)} begin Fujiwhara-type interaction (${Math.round(d)} km apart).`)}}}};
Sim.prototype.addStats=function(){const dt=this.cfg.step/60,rain={};this.acc=this.acc||{};
for(const s of this.storms){for(const c of hazards(s))rain[c.name]=Math.max(rain[c.name]||0,c.rain);
(s.hist=s.hist||[]).push({t:this.t,w:Math.round(s.wind),p:pressure(s.wind)});if(s.hist.length>600)s.hist.shift()}
for(const c of CITIES)this.acc[c[0]]=(this.acc[c[0]]||0)*Math.exp(-dt/48)+(rain[c[0]]||0)/24*dt};
Sim.prototype.risk=function(n){const a=(this.acc||{})[n]||0,c=CITIES.find(x=>x[0]===n),h=hsh(n);
return{flood:lvl(a*(.4+.6*h)),slide:lvl(a*(c&&c[4]?.3+.4*(1-h):.5+.5*h)*.8),acc:Math.round(a)}};
const _adv=Sim.prototype.advance;Sim.prototype.advance=function(){_adv.call(this);this.interact(this.cfg.step/60);this.addStats()};
const _rs=Sim.prototype.reset;Sim.prototype.reset=function(){_rs.call(this);this.acc={}};
