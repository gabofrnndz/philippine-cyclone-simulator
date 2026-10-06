import{Sim,fmtTime,tcws,pressure,display,forecast,hazards,LAND,setMap,geoToMap,fictional,PH_LAND,PH_CITIES,CITIES,rng}from'./engine.js';
const $=i=>document.getElementById(i),lines=i=>$(i).value.split('\n').map(x=>x.trim()).filter(Boolean);
const cfg=()=>({seed:$('seed').value,start:$('start').value,step:+$('ts').value,auto:$('auto').checked,prob:+$('prob').value,maxc:+$('maxc').value,sst:+$('sst').value,shear:+$('shear').value,
nmode:$('nmode').value,ln:$('ln').value,inm:$('inm').value,ld:$('ld').value,idn:$('idn').value,sid:$('sid').value,dfmt:$('dfmt').value,lnl:lines('lnl'),inl:lines('inl')});
let sim=new Sim(cfg()),sel=null,timer=null;
const map=L.map('map').setView([13,128],5);
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:10}).addTo(map);
const layer=L.layerGroup().addTo(map);
const col=w=>w>=185?'#e040fb':w>=118?'#f44336':w>=89?'#ff9800':w>=62?'#ffeb3b':'#4fc3f7';
function draw(){layer.clearLayers();for(const s of sim.storms){
L.polyline(s.track,{color:col(s.wind),weight:2,opacity:.7}).addTo(layer);
L.circle([s.lat,s.lon],{radius:Math.max(40,s.wind*1.6)*1000,color:col(s.wind),weight:1,fillOpacity:.12}).addTo(layer);
const m=L.marker([s.lat,s.lon],{icon:L.divIcon({className:'',iconSize:[0,0],html:`<div class="lbl" style="transform:translate(-50%,-50%)"><div style="font-size:26px">🌀</div>${sim.nm(s).split(' (')[0].toUpperCase()}<br>${s.intlDesig}<br>${s.cls.toUpperCase()}</div>`})}).addTo(layer);
m.on('click',()=>{sel=s;info()})}
overlay();drawSat();drawChart();$('clock').textContent=fmtTime(sim.t);$('log').innerHTML=sim.log.slice(0,60).map(x=>`<div>${x}</div>`).join('');info()}
function info(){const s=sim.storms.includes(sel)?sel:null;if(!s){$('sel').textContent='Click a cyclone.';return}
$('sel').innerHTML=`<b>${display(s,'full').replace(/\n/g,'<br>')}</b><br>Local designation: ${s.localDesig}<br>Simulation ID: ${s.simId}<br>Internal ID: ${s.id}<hr>${s.cls}<br>${Math.round(s.wind)} km/h • ${pressure(s.wind)} hPa<br>Moving ${Math.round(s.heading)}° at ${Math.round(s.speed)} km/h<br>${s.lat.toFixed(1)}°N ${s.lon.toFixed(1)}°E<br>${tcws(s.wind)?'Simulated TCWS #'+tcws(s.wind):'No TCWS'}${s.land?'<br>Over land':''}`}
const tick=()=>{sim.cfg=cfg();sim.advance();draw()};
const play=()=>{clearInterval(timer);timer=setInterval(tick,1000/+$('spd').value)};
$('play').onclick=play;$('pause').onclick=()=>clearInterval(timer);$('step').onclick=tick;$('spd').onchange=()=>timer&&play();
$('reset').onclick=()=>{clearInterval(timer);timer=null;sim=new Sim(cfg());sel=null;sim.ev('Simulation reset.');draw()};
const spawn=(la,lo)=>{sim.cfg=cfg();sel=sim.spawn(la,lo,true);draw()};
$('spawn').onclick=()=>{const c=map.getCenter();spawn(c.lat,c.lng)};
map.on('click',e=>{if($('nmode').value==='manual')spawn(e.latlng.lat,e.latlng.lng)});
document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const s=sel;if(!s)return;const g=b.dataset.g;
if(g==='+20'||g==='-20')s.wind=Math.max(20,s.wind+ +g);else if(g==='hl')s.heading=(s.heading+340)%360;else if(g==='hr')s.heading=(s.heading+20)%360;
else if(g==='sp+')s.speed+=5;else if(g==='sp-')s.speed=Math.max(5,s.speed-5);else if(g==='kill')s.wind=1;draw()});
$('save').onclick=()=>localStorage.setItem('phcs',sim.snapshot());
$('load').onclick=()=>{const j=localStorage.getItem('phcs');if(j){sim.restore(j);draw()}};
$('exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([sim.snapshot()],{type:'application/json'}));a.download='scenario.json';a.click()};
sim.ev('Simulation initialized. FICTIONAL SIMULATION.');draw();

function overlay(){const s=sim.storms.includes(sel)?sel:sim.storms[0];if(!s){$('warn').textContent='No active cyclone.';return}
const f=forecast(s,sim.cfg,sim.shear);L.polyline([[s.lat,s.lon],...f.map(p=>[p.lat,p.lon])],{color:'#fff',weight:2,dashArray:'6 6'}).addTo(layer);
f.forEach(p=>{L.circle([p.lat,p.lon],{radius:p.unc*1000,color:'#fff',weight:.5,fillOpacity:.04,interactive:false}).addTo(layer);
if(p.h%24===0)L.circleMarker([p.lat,p.lon],{radius:4,color:col(p.wind)}).bindTooltip(`+${p.h}h • ${Math.round(p.wind)} km/h • ${p.pres} hPa`).addTo(layer)});
const hz=hazards(s);hz.forEach(c=>{const C=cityXY(c.name);L.circleMarker(C,{radius:5,color:c.tcws?col(c.tcws>=5?185:c.tcws>=4?118:c.tcws>=3?89:c.tcws>=2?62:30):'#888',weight:2,fillOpacity:.8}).bindTooltip(`${c.name}: TCWS ${c.tcws||'—'}, ${c.wind} km/h, rain ${c.rain} mm, surge ${c.surge} m`).addTo(layer)});
const pop=hz.reduce((a,c)=>a+c.affected,0);
$('warn').innerHTML=`<b>${sim.nm(s)}</b> — simulated impact-based warning<br>Population under TCWS #2+: ${pop.toLocaleString()}<table style="width:100%;font-size:12px"><tr><th align=left>LGU</th><th>TCWS</th><th>Rain</th><th>Surge</th><th>Flood/Slide</th><th>Status</th></tr>`+hz.slice(0,8).map(c=>`<tr><td>${c.name}</td><td>TCWS ${c.tcws||'—'}</td><td>${c.rainLvl}</td><td>${c.surge?c.surge+' m':''}</td><td>${sim.risk(c.name).flood[0]}/${sim.risk(c.name).slide[0]}</td><td>${c.status}</td></tr>`).join('')+'</table>'+closures(hz.slice(0,8))+
`<small>Forecast: ${f.filter(p=>p.h%24===0).map(p=>`+${p.h}h ${Math.round(p.wind)}km/h`).join(' • ')}</small>`}
const cityXY=n=>{const c=CITIES.find(x=>x[0]===n);return[c[1],c[2]]};
$('pdf').onclick=()=>{const s=sim.storms.includes(sel)?sel:sim.storms[0];if(!s)return;const D=new window.jspdf.jsPDF(),f=forecast(s,sim.cfg,sim.shear),hz=hazards(s);let y=15;
const ln=(t,sz=10)=>{D.setFontSize(sz);D.text(String(t),14,y);y+=sz*.6+2};
ln('FICTIONAL SIMULATION — NOT AN ACTUAL PAGASA PRODUCT',9);ln('TROPICAL CYCLONE '+display(s,'both').toUpperCase(),14);ln('Issued: '+fmtTime(sim.t));
ln(`Local: ${s.local} | Intl: ${s.intl||'-'} | Intl ID: ${s.intlDesig} | Local ID: ${s.localDesig} | Sim ID: ${s.simId}`,8);
ln(`${s.cls}: ${Math.round(s.wind)} km/h, ${pressure(s.wind)} hPa, ${s.lat.toFixed(1)}N ${s.lon.toFixed(1)}E, moving ${Math.round(s.heading)} deg at ${Math.round(s.speed)} km/h`);y+=3;ln('FORECAST',12);
f.filter(p=>[6,12,24,48,72,96,120].includes(p.h)).forEach(p=>ln(`+${p.h}h  ${p.lat.toFixed(1)}N ${p.lon.toFixed(1)}E  ${Math.round(p.wind)} km/h  ${p.pres} hPa  (+/-${Math.round(p.unc)} km)`,9));y+=3;ln('WARNINGS AND IMPACTS (simulated)',12);
hz.slice(0,12).forEach(c=>ln(`${c.name}: TCWS ${c.tcws||'-'} | rain ${c.rainLvl} (${c.rain} mm) | surge ${c.surge} m | ${c.status}`,9));
D.save(`bulletin-${s.simId}.pdf`)};

const landLayer=L.layerGroup().addTo(map);let imgLayer=null;
const drawLand=(polys)=>{landLayer.clearLayers();polys.forEach(p=>L.polygon(p,{color:'#7a9a6a',weight:1,fillColor:'#3d5a3a',fillOpacity:.9,interactive:false}).addTo(landLayer));
if(polys.length)map.fitBounds(L.latLngBounds(polys.flat()),{maxZoom:7})};
function applyMap(kind,gj){if(map.hasLayer(tiles))map.removeLayer(tiles);landLayer.clearLayers();sim.storms=[];sel=null;
$('map').style.background=kind==='osm'?'':'#0b2a45';
if(kind==='osm'){tiles.addTo(map);setMap(PH_LAND,PH_CITIES);map.setView([13,128],5)}
else if(kind==='ph'){setMap(PH_LAND,PH_CITIES);drawLand(PH_LAND)}
else if(kind==='fict'){const m=fictional(rng($('seed').value+'map'));setMap(m.polys,m.cities);drawLand(m.polys)}
else if(kind==='geo'){const m=geoToMap(gj);if(!m.polys.length){alert('No polygons found in file.');return}setMap(m.polys,m.cities);drawLand(m.polys)}
sim.ev('Map changed: '+$('basemap').selectedOptions[0].text+'. Active storms cleared.');draw()}
$('basemap').onchange=()=>{const k=$('basemap').value;k==='geo'?$('mapfile').click():applyMap(k)};
$('mapfile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{applyMap('geo',JSON.parse(await f.text()))}catch(x){alert('Could not read GeoJSON.')}e.target.value=''};
$('imgfile').onchange=e=>{const f=e.target.files[0];if(!f)return;const b=$('imgb').value.split(',').map(Number);
if(b.length!==4||b.some(isNaN)){alert('Enter bounds as south,west,north,east first.');return}
if(imgLayer)map.removeLayer(imgLayer);imgLayer=L.imageOverlay(URL.createObjectURL(f),[[b[0],b[1]],[b[2],b[3]]],{opacity:.75}).addTo(map);map.fitBounds(imgLayer.getBounds());e.target.value=''};
$('imgclr').onclick=()=>{if(imgLayer){map.removeLayer(imgLayer);imgLayer=null}};

const closures=hz=>{const co=n=>CITIES.find(x=>x[0]===n)[4],R=n=>sim.risk(n),pt=hz.filter(c=>co(c.name)&&c.wind>=62).map(c=>c.name),ap=hz.filter(c=>c.wind>=89).map(c=>c.name),
rd=hz.filter(c=>R(c.name).flood==='High'||R(c.name).slide==='High').map(c=>c.name),ev=hz.filter(c=>c.tcws>=3).reduce((t,c)=>t+Math.round(c.pop*.08),0);
return`<small>F/S = flood/landslide risk (H/M/L/N)<br>Ports closed: ${pt.join(', ')||'none'}<br>Airports closed: ${ap.join(', ')||'none'}<br>Roads closed: ${rd.join(', ')||'none'}<br>Evacuated (simulated): ${ev.toLocaleString()}</small><br>`};
function drawSat(){const cv=$('sat'),x=cv.getContext('2d'),W=cv.width,H=cv.height,b=map.getBounds(),m=$('satm').value,
hr=+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',hour:'numeric',hour12:false}).format(sim.t)%24,night=hr<6||hr>=18;
x.fillStyle=m==='wv'?'#16283a':'#0a0a0a';x.fillRect(0,0,W,H);
const dx=b.getEast()-b.getWest(),dy=b.getNorth()-b.getSouth(),X=lo=>(lo-b.getWest())/dx*W,Y=la=>(b.getNorth()-la)/dy*H;
x.strokeStyle=m==='vis'&&!night?'#6a8':'#333';LAND.forEach(p=>{x.beginPath();p.forEach(([la,lo],i)=>i?x.lineTo(X(lo),Y(la)):x.moveTo(X(lo),Y(la)));x.closePath();x.stroke()});
if(!(m==='vis'&&night))for(const s of sim.storms){const R=Math.max(40,s.wind*1.6)/111/dy*H*1.6,cx=X(s.lon),cy=Y(s.lat),rot=sim.t/3.6e6*.05,c=m==='wv'?'160,215,255':'255,255,255';
const g=x.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,`rgba(${c},.95)`);g.addColorStop(.5,`rgba(${c},.45)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
for(let arm=0;arm<3;arm++)for(let t=1;t<15;t+=.3){const r=R*t/14*1.1,an=arm*2.094-t*.45+rot;x.fillStyle=`rgba(${c},${.22*(1-t/16)})`;x.beginPath();x.arc(cx+r*Math.cos(an),cy+r*Math.sin(an),R*.07,0,7);x.fill()}
if(m==='ir'&&s.wind>=118){x.strokeStyle='#f80';x.lineWidth=2;x.beginPath();x.arc(cx,cy,R*.18,0,7);x.stroke();x.lineWidth=1}
if(s.wind>=118){x.fillStyle='#111';x.beginPath();x.arc(cx,cy,R*.06,0,7);x.fill()}}
x.fillStyle='#fb8';x.font='9px sans-serif';x.fillText('FICTIONAL SIMULATION — NOT ACTUAL SATELLITE DATA'+(m==='vis'&&night?' • NIGHT: no visible imagery':''),4,H-4)}
function drawChart(){if(!window.Chart)return;const s=sim.storms.includes(sel)?sel:sim.storms[0],h=((s&&s.hist)||[]).slice(-150);let ch=drawChart.ch;
if(!ch)ch=drawChart.ch=new Chart($('chart'),{type:'line',data:{labels:[],datasets:[{label:'Wind km/h',data:[],borderColor:'#ff9800',yAxisID:'y',pointRadius:0},{label:'Pressure hPa',data:[],borderColor:'#4fc3f7',yAxisID:'y1',pointRadius:0}]},
options:{animation:false,scales:{x:{ticks:{maxTicksLimit:3,color:'#9ab'}},y:{position:'left',ticks:{color:'#ff9800'}},y1:{position:'right',reverse:true,grid:{drawOnChartArea:false},ticks:{color:'#4fc3f7'}}},plugins:{legend:{labels:{color:'#cde'}}}}});
ch.data.labels=h.map(p=>fmtTime(p.t).replace(' PHT • ',' '));ch.data.datasets[0].data=h.map(p=>p.w);ch.data.datasets[1].data=h.map(p=>p.p);ch.update('none')}
$('satm').onchange=drawSat;map.on('moveend',drawSat);
