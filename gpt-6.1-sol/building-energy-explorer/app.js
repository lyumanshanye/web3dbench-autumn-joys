import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const dataset = await fetch('./data.json').then(r => r.json());
const rooms = dataset.rooms;
const origin = new Date(dataset.start);
const state = {start:72,end:96,floor:'all',metric:'total',selected:'F2-04',compare:'',sort:'floor',ascending:true};
const fmt = n => n.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const visible = () => rooms.filter(r => state.floor === 'all' || r.floor === +state.floor);
const stats = r => {
 const values = r.readings.slice(state.start,state.end), available = values.filter(v=>v!==null);
 const total=available.reduce((a,b)=>a+b,0), count=available.length;
 const after=values.reduce((a,v,i)=>a+(v!==null&&((i+state.start)%24<8||(i+state.start)%24>=18)?v:0),0);
 return {total,intensity:total/r.area,count,expected:values.length,partial:count<values.length,after};
};
const getSelected=()=>rooms.find(r=>r.id===state.selected);
const roomMeshes=new Map();
const scene=new THREE.Scene();
scene.background=new THREE.Color('#fbfcf8');
const renderer=new THREE.WebGLRenderer({canvas:$('building'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0xffffff,0);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(32,1,.1,150);
camera.position.set(15,13,18);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,2.6,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=15;controls.maxDistance=40;controls.enablePan=false;
scene.add(new THREE.HemisphereLight('#ffffff','#8d9e78',2.4));
const sun=new THREE.DirectionalLight('#ffffff',3);sun.position.set(4,13,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.04;scene.add(sun);
const building=new THREE.Group();scene.add(building);
const floorGroups=[];
function box(w,h,d,color,x,y,z,parent,opacity=1){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85,transparent:opacity<1,opacity}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function label(text,color='#758467',size=26){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.font=`500 ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,transparent:true}));sprite.scale.set(3.25,.61,1);sprite.renderOrder=3;return sprite;}
const hatchCanvas=document.createElement('canvas');hatchCanvas.width=hatchCanvas.height=64;const hc=hatchCanvas.getContext('2d');hc.fillStyle='#dddeda';hc.fillRect(0,0,64,64);hc.strokeStyle='#a6afa1';hc.lineWidth=2;for(let k=-64;k<128;k+=12){hc.beginPath();hc.moveTo(k,0);hc.lineTo(k+64,64);hc.stroke();}const hatch=new THREE.CanvasTexture(hatchCanvas);hatch.wrapS=hatch.wrapT=THREE.RepeatWrapping;hatch.repeat.set(2,2);
for(let floor=1;floor<=3;floor++){
 const group=new THREE.Group();group.position.y=(floor-1)*2.4;building.add(group);floorGroups.push(group);
 box(9,.16,6.5,'#e3e7dc',0,0,0,group);
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9,.16,6.5)),new THREE.LineBasicMaterial({color:'#b7c5ad'}));group.add(edge);
 const sign=label(`FLOOR ${floor}`,'#7b8d72',22);sign.position.set(-5.2,.15,1.6);sign.scale.set(2.2,.41,1);group.add(sign);
 for(let i=0;i<4;i++){
  const room=rooms[(floor-1)*4+i], x=i%2===0?-2.22:2.22,z=i<2?-1.59:1.59;
  const tile=box(4.24,.19,2.95,'#93ae67',x,.18,z,group);tile.userData.room=room.id;
  const trim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.24,.22,2.95)),new THREE.LineBasicMaterial({color:'#6c8b55',transparent:true,opacity:.7}));trim.position.copy(tile.position);group.add(trim);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.35,.32,3.08)),new THREE.LineBasicMaterial({color:'#234f32',linewidth:2}));outline.position.copy(tile.position);outline.position.y+=.05;outline.visible=false;group.add(outline);
  // Low perimeter walls retain the cutaway silhouette without obscuring rooms.
  const wall=box(4.24,.65,.065,'#b7c7a5',x,.59,z-1.44,group,.45);wall.userData.room=room.id;
  const side=box(.065,.65,2.95,'#b7c7a5',x-2.1,.59,z,group,.35);side.userData.room=room.id;
  const nameLabel=label(room.name,'#365132',22);nameLabel.position.set(x,.75,z+.05);nameLabel.scale.set(3.55,.67,1);group.add(nameLabel);
  roomMeshes.set(room.id,{tile,outline,label:nameLabel,wall,side});
 }
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,25),new THREE.ShadowMaterial({opacity:.07}));ground.rotation.x=-Math.PI/2;ground.position.y=-.25;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(21,21,'#dde3d5','#edf0e8');grid.position.y=-.22;grid.material.transparent=true;grid.material.opacity=.4;scene.add(grid);
const colors=['#e0e9cc','#b5c989','#82a358','#527b40','#244e36'].map(c=>new THREE.Color(c));
function colorFor(value,max){let pos=Math.min(value/Math.max(max,.001),1)*4,i=Math.min(Math.floor(pos),3);return colors[i].clone().lerp(colors[i+1],pos-i);}
function updateModel(){
 const maximum=Math.max(...rooms.map(r=>stats(r)[state.metric]));
 $('legend-min').textContent='0';$('legend-max').textContent=`${fmt(maximum)} ${state.metric==='total'?'kWh':'kWh/m²'}`;
 floorGroups.forEach((g,i)=>g.visible=state.floor==='all'||i+1===+state.floor);
 rooms.forEach(r=>{const s=stats(r), item=roomMeshes.get(r.id), color=colorFor(s[state.metric],maximum);item.tile.material.color.copy(s.partial?new THREE.Color('#ffffff'):color);item.tile.material.map=s.partial?hatch:null;item.tile.material.needsUpdate=true;item.outline.visible=r.id===state.selected;item.wall.material.color.copy(color);item.side.material.color.copy(color);});
}
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
function intersect(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...roomMeshes.values()].flatMap(m=>[m.tile,m.wall,m.side])).find(hit=>{const r=rooms.find(r=>r.id===hit.object.userData.room);return state.floor==='all'||r.floor===+state.floor;});}
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const hit=intersect(e);if(hit){state.selected=hit.object.userData.room;if(state.compare===state.selected)state.compare='';update();}}down=null;});
renderer.domElement.addEventListener('pointermove',e=>{const hit=intersect(e),tip=$('room-tooltip');if(hit&&!down){const r=rooms.find(r=>r.id===hit.object.userData.room),s=stats(r);tip.textContent=`${r.name} · ${fmt(s[state.metric])} ${state.metric==='total'?'kWh':'kWh/m²'}${s.partial?' · Partial':''}`;const rect=$('canvas-wrap').getBoundingClientRect();tip.style.left=Math.min(e.clientX-rect.left+10,rect.width-185)+'px';tip.style.top=e.clientY-rect.top-35+'px';tip.style.display='block';renderer.domElement.style.cursor='pointer';}else{tip.style.display='none';renderer.domElement.style.cursor='grab';}});
renderer.domElement.addEventListener('pointerleave',()=>{$('room-tooltip').style.display='none';});
new ResizeObserver(()=>{const rect=$('canvas-wrap').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}).observe($('canvas-wrap'));
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
function chart(){
 const r=getSelected(),other=rooms.find(r=>r.id===state.compare),n=state.end-state.start;
 if(!r){$('chart').innerHTML='<div class="empty-chart" style="padding:45px 12px;text-align:center;color:#8b9681;font-size:12px">Select a visible room to see hourly consumption.</div>';$('chart-key').innerHTML='';return;}
 const W=480,H=158,l=35,right=12,top=18,bottom=29,w=W-l-right,h=H-top-bottom;
 const max=Math.max(1,...[r,other].filter(Boolean).flatMap(room=>room.readings.slice(state.start,state.end).filter(v=>v!==null)));const ceiling=Math.ceil(max/2)*2;
 const x=i=>l+i/Math.max(n-1,1)*w,y=v=>top+h-v/ceiling*h;
 let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hourly energy chart for ${r.name}${other?' and '+other.name:''}"><defs><clipPath id="chartclip"><rect x="${l}" y="${top}" width="${w}" height="${h}"/></clipPath></defs>`;
 for(let i=0;i<n;i++){if((state.start+i)%24<8||(state.start+i)%24>=18)svg+=`<rect x="${x(i)-w/n/2}" y="${top}" width="${w/n+1}" height="${h}" fill="#f5f3e6" clip-path="url(#chartclip)"/>`;}
 for(let t=0;t<=4;t++){const value=ceiling*t/4,yy=y(value);svg+=`<line x1="${l}" x2="${W-right}" y1="${yy}" y2="${yy}" stroke="#e7ecdf" stroke-dasharray="3 3"/><text x="${l-8}" y="${yy+3}" text-anchor="end" fill="#9aa58f" font-size="8">${Number(value.toFixed(1))}</text>`;}
 const ticks=n<=48?[0,6,12,18,n-1]:[0,24,48,72,96,120,144,n-1];
 for(const i of [...new Set(ticks)].filter(i=>i<n)){const d=new Date(+origin+(state.start+i)*3600000),text=n<=48?`${String(d.getHours()).padStart(2,'0')}:00`:`${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;svg+=`<text x="${x(i)}" y="${H-9}" text-anchor="middle" fill="#929e86" font-size="8">${text}</text>`;}
 [r,other].filter(Boolean).forEach((room,series)=>{const vals=room.readings.slice(state.start,state.end);let path='',started=false;const color=series?'#bd995c':'#53783e';vals.forEach((v,i)=>{if(v===null){started=false;svg+=`<rect x="${x(i)-3}" y="${top+h-6}" width="6" height="6" fill="#c1c4b9"><title>Missing reading: ${new Date(+origin+(state.start+i)*3600000).toLocaleString()}</title></rect>`;return;}path+=`${started?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)} `;started=true;});if(!series){let area='',segment=[];function closeSegment(){if(segment.length){area+=`M${x(segment[0][0])},${y(0)} `+segment.map(([i,v])=>`L${x(i)},${y(v)}`).join(' ')+` L${x(segment.at(-1)[0])},${y(0)} Z `;segment=[];}}vals.forEach((v,i)=>{if(v===null)closeSegment();else segment.push([i,v]);});closeSegment();svg+=`<path d="${area}" fill="#d9e5c5" opacity=".55"/>`;}svg+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;vals.forEach((v,i)=>{if(v!==null)svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="${n<=48?2:1.3}" fill="${color}" stroke="#fff" stroke-width=".6"><title>${room.name} · ${new Date(+origin+(state.start+i)*3600000).toLocaleString()} · ${fmt(v)} kWh</title></circle>`;});});
 svg+='</svg>';$('chart').innerHTML=svg;$('chart-key').innerHTML=`<span>${r.name}</span>${other?`<span class="second">${other.name}</span>`:''}<span style="margin-left:auto;color:#a59c76">▧ After hours</span>`;
}
function update(){
 const list=visible(), summaries=list.map(stats),total=summaries.reduce((s,v)=>s+v.total,0),area=list.reduce((s,r)=>s+r.area,0),count=summaries.reduce((s,v)=>s+v.count,0),expected=summaries.reduce((s,v)=>s+v.expected,0),partial=count<expected;
 $('total').textContent=fmt(total);$('total-detail').textContent=`${partial?'Partial total · ':''}${count.toLocaleString()} / ${expected.toLocaleString()} readings available`;$('intensity').textContent=fmt(total/area);$('after').textContent=(total?summaries.reduce((s,v)=>s+v.after,0)/total*100:0).toFixed(0)+'%';
 const spike=state.start<78&&state.end>72&&list.some(r=>r.id==='F2-04');$('anomaly-count').textContent=spike?'1 room':'Explore';$('insight-text').textContent=spike?'Marketing office · unusual overnight use':'Compare room patterns to find opportunities';
 $('room-count').textContent=`${list.length} rooms`;
 $('compare').innerHTML='<option value="">Choose a room to compare</option>'+list.filter(r=>r.id!==state.selected).map(r=>`<option value="${r.id}">${r.name} · F${r.floor}</option>`).join('');$('compare').value=state.compare;$('compare').disabled=!state.selected;
 let sorted=[...list].sort((a,b)=>{const av=a[state.sort]??stats(a)[state.sort],bv=b[state.sort]??stats(b)[state.sort];return(typeof av==='string'?av.localeCompare(bv):av-bv)*(state.ascending?1:-1);});
 const maximum=Math.max(...rooms.map(r=>stats(r)[state.metric]));
 $('rooms').innerHTML=sorted.map(r=>{const s=stats(r),color=colorFor(s[state.metric],maximum).getStyle();return `<tr data-room="${r.id}" tabindex="0" aria-selected="${state.selected===r.id}" class="${state.selected===r.id?'selected':''}"><td><div class="room-cell"><span class="room-swatch" style="background:${s.partial?'repeating-linear-gradient(135deg,#dddeda 0 2px,#a6afa1 2px 3px)':color}"></span><div><b>${r.name}</b><small>${r.id}</small></div></div></td><td><span class="floor-pill">Floor ${r.floor}</span></td><td>${r.area} m²</td><td class="value-cell">${fmt(s.total)} <span style="color:#9ca68f;font-size:8px">kWh${s.partial?' · partial':''}</span></td><td>${fmt(s.intensity)} <span style="font-size:8px;color:#9ca68f">kWh/m²</span></td><td class="${s.partial?'partial':'complete'}">${s.partial?'◐':'✓'} ${s.count}/${s.expected}${s.partial?' · Partial':''}</td><td><span class="profile ${r.id==='F2-04'&&spike?'flag':''}">${r.id==='F2-04'&&spike?'↗ Overnight spike':r.type==='server'?'Continuous load':r.type==='meeting'?'Daytime meetings':'Office hours'}</span></td></tr>`;}).join('');
 const selected=getSelected();if(selected){const s=stats(selected);$('selected-name').textContent=selected.name;$('selected-meta').textContent=`Floor ${selected.floor} · ${selected.area} m² · ${selected.id}`;$('selected-mark').textContent=`F${selected.floor}`;$('room-total').innerHTML=`${fmt(s.total)} <small>kWh${s.partial?' · partial':''}</small>`;$('room-intensity').innerHTML=`${fmt(s.intensity)} <small>kWh/m²</small>`;$('room-readings').innerHTML=`${s.count}/${s.expected} <small>${s.partial?'partial':'complete'}</small>`;$('room-note').textContent=s.partial?`◐ ${s.expected-s.count} missing hourly readings. Gaps are shown in the chart; totals are partial and exclude missing values.`:selected.id==='F2-04'&&spike?'↗ Unusual activity between 00:00 and 06:00 on Oct 22. Check for equipment left running.':selected.type==='server'?'ⓘ A steady load is expected in the server room, including overnight.':'ⓘ Shaded hours are outside 08:00–18:00. Hover over a chart point for an hourly reading.';}else{$('selected-name').textContent='Choose a room';$('selected-meta').textContent='Select a room in the building or table';$('selected-mark').textContent='—';['room-total','room-intensity','room-readings'].forEach(id=>$(id).textContent='—');$('room-note').textContent='The previous selection was cleared because its floor is hidden.';}
 document.querySelectorAll('[data-sort]').forEach(b=>{b.querySelector('span').textContent=state.sort===b.dataset.sort?(state.ascending?'↑':'↓'):'↕';b.closest('th').setAttribute('aria-sort',state.sort===b.dataset.sort?(state.ascending?'ascending':'descending'):'none');});
 updateModel();chart();
}
$('rooms').addEventListener('click',e=>{const row=e.target.closest('[data-room]');if(row){state.selected=row.dataset.room;if(state.compare===state.selected)state.compare='';update();}});
$('rooms').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.target.closest('[data-room]')?.click();}});
$('floors').addEventListener('click',e=>{const button=e.target.closest('[data-floor]');if(!button)return;state.floor=button.dataset.floor;document.querySelectorAll('[data-floor]').forEach(b=>b.classList.toggle('selected',b===button));if(!visible().some(r=>r.id===state.selected))state.selected='';if(!visible().some(r=>r.id===state.compare))state.compare='';update();});
$('metric').addEventListener('change',e=>{state.metric=e.target.value;update();});
$('compare').addEventListener('change',e=>{state.compare=e.target.value;update();});
$('reset').onclick=()=>{camera.position.set(15,13,18);controls.target.set(0,2.6,0);controls.update();};
for(const button of document.querySelectorAll('[data-sort]'))button.addEventListener('click',()=>{if(state.sort===button.dataset.sort)state.ascending=!state.ascending;else{state.sort=button.dataset.sort;state.ascending=true;}update();});
const dateString=index=>{const d=new Date(+origin+index*3600000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:00`;};
function setRange(start,end){if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>168||end<=start){$('range-error').textContent='Choose whole-hour boundaries between Oct 19 and Oct 26, with the end after the start.';return;}$('range-error').textContent='';state.start=start;state.end=end;$('start').value=dateString(start);$('end').value=dateString(end);update();}
for(const id of ['start','end'])$(id).addEventListener('change',()=>setRange((new Date($('start').value)-origin)/3600000,(new Date($('end').value)-origin)/3600000));
$('previous').onclick=()=>{const length=state.end-state.start;if(state.start===0)return;const start=Math.max(0,state.start-24);setRange(start,start+length);};
$('next').onclick=()=>{const length=state.end-state.start;if(state.end===168)return;const end=Math.min(168,state.end+24);setRange(end-length,end);};
$('week').onclick=()=>setRange(0,168);
$('export').onclick=()=>{const headers=['room_id','room_name','floor','floor_area_m2','range_start_local','range_end_exclusive_local','total_energy_kWh','energy_intensity_kWh_per_m2','available_readings','expected_readings','completeness_percent','total_status','sample_data'];const rows=visible().map(r=>{const s=stats(r);return[r.id,r.name,r.floor,r.area,dateString(state.start),dateString(state.end),s.total.toFixed(3),s.intensity.toFixed(4),s.count,s.expected,(s.count/s.expected*100).toFixed(2),s.partial?'partial':'complete',true];});const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`gridwise-room-summaries-${dateString(state.start).slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
update();
