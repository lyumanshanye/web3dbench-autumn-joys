import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const spaces = [
 {id:'children',name:'Children’s collection',short:'Children’s',floor:0,x:-8,z:-5,icon:'✿',category:'Books, play & little discoveries',color:0xdce5bc},
 {id:'fiction',name:'Fiction & literature',short:'Fiction & literature',floor:0,x:-8,z:5,icon:'▥',category:'Stories for every kind of reader',color:0xe5dfc2},
 {id:'help',name:'Help desk',short:'Help desk',floor:0,x:0,z:-5,icon:'ⓘ',category:'A little help from our librarians',color:0xd4dfca},
 {id:'toilets',name:'Toilets & accessible WC',short:'Toilets',floor:0,x:8,z:-5,icon:'♿',category:'Facilities · accessible',color:0xdde2d3},
 {id:'reading',name:'Reading room',short:'Reading room',floor:1,x:-8,z:-5,icon:'▤',category:'Quiet corners & comfortable chairs',color:0xdce5c5},
 {id:'quiet',name:'Quiet study',short:'Quiet study',floor:1,x:5,z:-5,icon:'✎',category:'Room to focus, space to think',color:0xe5e3ce},
 {id:'meeting-a',name:'Meeting room A',short:'Meeting A',floor:1,x:-8,z:5,icon:'♧',category:'Gather, share & make things happen',color:0xd9e1cb},
 {id:'meeting-b',name:'Meeting room B',short:'Meeting B',floor:1,x:-2,z:5,icon:'♧',category:'A smaller space for big ideas',color:0xe9dfc6}
];
const locations = [...spaces,{id:'entrance',name:'Main entrance',short:'Entrance',floor:0,x:0,z:8},{id:'lift-g',name:'Lift lobby',short:'Lift',floor:0,x:10,z:4}];
const byId=Object.fromEntries(locations.map(p=>[p.id,p]));
let selected='children',viewFloor=0,filter='all',building=false,currentPath=[],routeMode='';
const nodes={},edges=[];
function node(id,x,z,floor){nodes[id]={id,x,z,floor};}
function edge(a,b,type='walk'){edges.push({a,b,type,cost:Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z)+ (type==='lift'?12:type==='stairs'?8:0)});}
for(let f=0;f<2;f++){
 [-10,-8,-2,0,2,5,6,8,10].forEach((x,i,arr)=>{node(`c${f}:${x}`,x,0,f);if(i)edge(`c${f}:${arr[i-1]}`,`c${f}:${x}`);});
 spaces.filter(s=>s.floor===f).forEach(s=>{node(s.id,s.x,s.z,f);node(`${s.id}-door`,s.x,s.z>0?2:-2,f);edge(`c${f}:${s.x}`,`${s.id}-door`);edge(`${s.id}-door`,s.id);});
 node(`stairs-${f}`,6,f?6:2.7,f);edge(`c${f}:6`,`stairs-${f}`);
 node(`lift-${f}`,10,4,f);edge(`c${f}:10`,`lift-${f}`);
}
node('entrance',0,8,0);edge('entrance','c0:0');node('lift-g',10,4,0);edge('lift-g','lift-0');edge('stairs-0','stairs-1','stairs');edge('lift-0','lift-1','lift');
function findPath(start,end){
 const accessible=document.querySelector('#step-free').checked,outage=document.querySelector('#lift-outage').checked;
 const distances={[start]:0},previous={},pending=new Set(Object.keys(nodes));
 while(pending.size){let u=[...pending].sort((a,b)=>(distances[a]??Infinity)-(distances[b]??Infinity))[0];if(!Number.isFinite(distances[u]))break;pending.delete(u);if(u===end)break;
 for(const e of edges){if(e.type==='stairs'&&accessible||e.type==='lift'&&outage)continue;const v=e.a===u?e.b:e.b===u?e.a:null;if(!v||!pending.has(v))continue;let alt=distances[u]+e.cost;if(alt<(distances[v]??Infinity)){distances[v]=alt;previous[v]=u;}}
 }
 if(distances[end]===undefined)return null;const result=[end];while(result[0]!==start){result.unshift(previous[result[0]]);}return result;
}
function directory(){const query=document.querySelector('#search').value.trim().toLowerCase();const visible=spaces.filter(s=>(filter==='all'||s.floor===Number(filter))&&`${s.name} ${s.category}`.toLowerCase().includes(query));document.querySelector('#result-count').textContent=`${visible.length} destination${visible.length===1?'':'s'}`;document.querySelector('#destinations').innerHTML=visible.length?visible.map(s=>`<button class="dest ${selected===s.id?'selected':''}" data-dest="${s.id}" aria-pressed="${selected===s.id}"><span class="dest-icon">${s.icon}</span><span class="dest-copy"><strong>${s.name}</strong><small>${s.category}</small></span><span class="floor-badge">${s.floor?'1':'G'}</span><span class="arrow">↗</span></button>`).join(''):'<div class="empty">No spaces found. Try “reading” or “meeting”.</div>';document.querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>selectSpace(b.dataset.dest));}
function selectSpace(id){selected=id;if(!building)viewFloor=byId[id].floor;directory();updateRoute();updateFloor();}
function updateRoute(){const destination=byId[selected],start=byId[document.querySelector('#start').value];currentPath=findPath(start.id,selected)||[];document.querySelector('#journey-heading').textContent=destination.name;const summary=document.querySelector('#route-summary');summary.classList.toggle('error',!currentPath.length);let steps=[];routeMode='';
 if(!currentPath.length){document.querySelector('#route-time').textContent='Route unavailable';summary.textContent='No step-free route is available between floors while the lift is out of service. Please ask the help desk for assistance.';}
 else if(start.id===selected){document.querySelector('#route-time').textContent='You’re here';summary.textContent='Your starting point and destination are the same. Make yourself comfortable.';}
 else{const cross=start.floor!==destination.floor;routeMode=cross&&(currentPath.includes('lift-0'))?'lift':cross?'stairs':'';let distance=0;for(let i=1;i<currentPath.length;i++){const a=nodes[currentPath[i-1]],b=nodes[currentPath[i]];distance+=Math.hypot(a.x-b.x,a.z-b.z,(a.floor-b.floor)*4.6);}document.querySelector('#route-time').textContent=`${Math.max(1,Math.ceil(distance/45))} min walk · ${Math.round(distance)} m`;summary.textContent=`${start.name}  →  ${destination.name} · ${destination.floor?'First':'Ground'} floor${routeMode?' · via '+(routeMode==='lift'?'lift':'stairs'):''}`;
 if(cross){steps=[`Follow the main corridor to the ${routeMode==='lift'?'lift':'stairs'}.`,`Take the ${routeMode==='lift'?'lift':'stairs'} ${destination.floor?'up to the first':'down to the ground'} floor.`,`Follow the corridor to ${destination.name}; enter through its doorway.`];}
 else{steps=[start.id==='entrance'?'Continue straight from the entrance to the main corridor.':`Leave ${start.name} and join the main corridor.`,`Follow the corridor to ${destination.name}.`,`Turn ${destination.z<0?'into the north':'into the south'} doorway and you’ve arrived.`];}}
 document.querySelector('#directions').innerHTML=steps.map((s,i)=>`<li><b>${i+1}</b>${s}</li>`).join('');drawRoute();}

const canvas=document.querySelector('#scene'),map=document.querySelector('#map');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xf9faf5,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,150);camera.position.set(28,35,32);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=26;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*.42;controls.minPolarAngle=.3;controls.enableRotate=false;
scene.add(new THREE.HemisphereLight(0xffffeb,0x8f9b7c,2.7));const sun=new THREE.DirectionalLight(0xfffae8,4);sun.position.set(-15,35,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30});sun.shadow.normalBias=.04;scene.add(sun);
const floorGroups=[new THREE.Group(),new THREE.Group()],routeGroups=[new THREE.Group(),new THREE.Group()];floorGroups.forEach((g,f)=>{scene.add(g);g.add(routeGroups[f]);});const pickables=[],labelRecords=[];
const materials={};function mat(color){return materials[color]||(materials[color]=new THREE.MeshStandardMaterial({color,roughness:.85}));}
function box(group,x,y,z,w,h,d,color,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;group.add(m);return m;}
function cylinder(group,x,y,z,r,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,28),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function wall(g,x,z,w,d,h=1.1){return box(g,x,h/2+.15,z,w,h,d,0x54725c);}
function plant(g,x,z){cylinder(g,x,.39,z,.3,.5,0xc5bd9e);const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.53,1),mat(0x708a52));m.position.set(x,1.0,z);m.scale.set(.85,1.3,.85);m.castShadow=true;g.add(m);}
function chair(g,x,z,color=0xa6b28b,rotation=0){const o=new THREE.Group();o.position.set(x,0,z);o.rotation.y=rotation;g.add(o);box(o,0,.57,0,.68,.16,.65,color);box(o,0,.92,.27,.68,.65,.13,color);for(const a of[-.23,.23])for(const b of[-.22,.22])box(o,a,.28,b,.05,.5,.05,0x8f947c);}
function table(g,x,z,w=2.2,d=1.2){box(g,x,.88,z,w,.15,d,0xc2ab7e);for(const a of[-w/2+.17,w/2-.17])for(const b of[-d/2+.17,d/2-.17])box(g,x+a,.46,z+b,.07,.8,.07,0x92967f);}
function shelf(g,x,z,rotation=0){const o=new THREE.Group();o.position.set(x,0,z);o.rotation.y=rotation;g.add(o);box(o,0,.72,0,.6,1.35,3.35,0xa9a784);for(const y of[.2,.67,1.13]){box(o,0,y,0,.7,.08,3.5,0xd5c49c);for(let i=0;i<15;i++){const c=[0x7b936a,0xcdb88e,0x8c9c88,0xd6d2b6,0x6e8770][i%5];box(o,.05,y+.21,-1.55+i*.21,.57,.33+(i%3)*.035,.14,c);}}}
function label(g,p){const el=document.createElement('button');el.className='map-label';el.innerHTML=`<span class="label-dot"></span>${p.short}`;el.setAttribute('aria-label',`Go to ${p.name}, ${p.floor?'first':'ground'} floor`);el.onclick=()=>{if(byId[p.id]&&spaces.some(s=>s.id===p.id))selectSpace(p.id);else if(p.id==='entrance'){document.querySelector('#start').value='entrance';updateRoute();}};document.querySelector('#labels').append(el);labelRecords.push({el,p,g});}
for(let f=0;f<2;f++){
 const g=floorGroups[f];box(g,0,-.23,0,27.2,.6,19.4,0xc2cbb2);box(g,0,.09,0,26.8,.14,19,0xecebdc);box(g,0,.17,0,26,.025,3.9,0xe0e4cd);box(g,0,.18,5,3.8,.025,8,0xe0e4cd);
 // Low cutaway walls preserve every room and doorway from the kiosk viewpoint.
 wall(g,0,-9.3,26.8,.25);wall(g,-13.25,0,.25,18.5);wall(g,13.25,0,.25,18.5);wall(g,-7.2,9.3,12.2,.25,.6);wall(g,8.2,9.3,10,.25,.6);
 if(!f){wall(g,-4,-5.6,.2,7.2);wall(g,4,-5.6,.2,7.2);wall(g,-4,5.7,.2,7.2);}
 else{wall(g,-3,-5.6,.2,7.2);wall(g,-5,5.7,.2,7.2);wall(g,1,5.7,.2,7.2);}
 const rooms=spaces.filter(s=>s.floor===f);
 for(const p of rooms){const w=p.id==='quiet'?15.6:p.id==='reading'?9.7:p.id==='meeting-b'?5.6:p.id==='meeting-a'?7.7:7.6;const tile=box(g,p.x,.2,p.z,w,.025,6.5,p.color,false);tile.userData.destination=p.id;pickables.push(tile);
 // Each room has an explicit two-metre opening into the central corridor.
 const left=p.x-w/2,right=p.x+w/2;wall(g,(left+p.x-1)/2,p.z>0?2:-2,p.x-1-left,.16,.7);wall(g,(p.x+1+right)/2,p.z>0?2:-2,right-p.x-1,.16,.7);
 box(g,p.x,.23,p.z>0?2:-2,1.8,.025,.6,0xf3edd9,false);label(g,p);
 }
 // Circulation core: stairs and lift occupy the same footprint on both levels.
 box(g,6,.21,4.6,3,.05,5.3,0xd4dbc5,false);for(let i=0;i<13;i++)box(g,6,.3+i*.13,3+i*.25,2.25,.16,.26,0xb0b8a0);box(g,4.76,1,4.6,.05,1.2,4.2,0x8c9c7b);box(g,7.23,1,4.6,.05,1.2,4.2,0x8c9c7b);
 box(g,10,.23,4.4,3,.1,4,0xc2cbb6);wall(g,11.5,4.4,.15,4,1.8);wall(g,10,6.4,3,.15,1.8);box(g,10,1.05,2.8,1.8,1.7,.16,0xa5b4a0);box(g,10,1.05,2.69,.03,1.7,.03,0xe4e7d9);box(g,11.17,1.1,2.7,.2,.4,.08,0x63775c);
 label(g,{id:`stairlabel${f}`,short:'↗ Stairs',name:'Stairs',floor:f,x:6,z:6.5});label(g,{id:`liftlabel${f}`,short:'↕ Lift',name:'Lift',floor:f,x:10,z:5});
 if(!f){shelf(g,-11,5);shelf(g,-8.7,5);shelf(g,-6.3,5);shelf(g,-11,-5.7);shelf(g,-8.7,-5.7);table(g,-6.2,-4.5,1.8,1.4);chair(g,-6.2,-3.3,0xc8ad70);chair(g,-6.2,-5.7,0xa0b487,Math.PI);cylinder(g,-10,.32,-3.1,.6,.23,0xc6ac75);cylinder(g,-8.6,.32,-3,.5,.23,0xa8bd87);box(g,0,.7,-4.5,4.2,1,1.4,0xa4b48c);box(g,0,1.25,-4.5,4.4,.12,1.6,0xd6caa9);box(g,.7,1.52,-4.55,.9,.5,.07,0x526c59);box(g,.7,1.3,-4.5,.07,.3,.2,0x526c59);chair(g,0,-6.1);for(let x=5.6;x<12;x+=2){box(g,x,.45,-7.6,1.6,.5,2,0xecebdd);box(g,x,.95,-8.5,1.7,1.1,.12,0x9aab91);cylinder(g,x,.6,-5,.38,.45,0xeef0e4);}plant(g,-11.8,-8);plant(g,2.7,-7.8);label(g,byId.entrance);box(g,0,.23,8,2.8,.05,1.2,0xbdc7a8);}
 else{shelf(g,-11,-6);shelf(g,-9,-6);table(g,-6,-6,2.6,1.4);chair(g,-6,-4.8);chair(g,-6,-7.2,0xa6b28b,Math.PI);chair(g,-11,-3.2,0xb9b88c);chair(g,-9.2,-3.2,0xb9b88c);for(const x of[0,3,6,9]){table(g,x,-6,2,1.25);chair(g,x,-4.9);box(g,x,.99,-6,.7,.05,.5,0xf0ecda);}table(g,-8,5,3.8,1.65);for(const x of[-9.1,-7]){chair(g,x,3.7,0xa1b18a);chair(g,x,6.3,0xa1b18a,Math.PI);}table(g,-2,5,2.7,1.5);chair(g,-2,3.8,0xbcb18c);chair(g,-2,6.2,0xbcb18c,Math.PI);plant(g,-12,-8);plant(g,11.5,-8);plant(g,-11.8,8);}
 plant(g,-11.8,.2);plant(g,12,.2);
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.ShadowMaterial({opacity:.09}));ground.rotation.x=-Math.PI/2;ground.position.y=-.55;ground.receiveShadow=true;scene.add(ground);
function clearGroup(g){while(g.children.length){const child=g.children[0];g.remove(child);child.geometry?.dispose();}}
function drawRoute(){if(!routeGroups)return;routeGroups.forEach(clearGroup);if(!currentPath.length)return;
 for(let f=0;f<2;f++){const group=routeGroups[f];const run=[];const flush=()=>{if(run.length>1){const curve=new THREE.CurvePath();for(let i=1;i<run.length;i++)curve.add(new THREE.LineCurve3(run[i-1],run[i]));const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(4,run.length*12),.075,8,false),mat(0x4d7f46));group.add(tube);}run.length=0;};for(const id of currentPath){const n=nodes[id];if(n.floor===f)run.push(new THREE.Vector3(n.x,.37,n.z));else flush();}flush();}
 const start=nodes[currentPath[0]],dest=nodes[currentPath.at(-1)];cylinder(routeGroups[start.floor],start.x,.39,start.z,.25,.12,0xe1aa4b);cylinder(routeGroups[start.floor],start.x,.31,start.z,.43,.06,0xefe4c6);const ring=new THREE.Mesh(new THREE.TorusGeometry(.4,.075,10,36),mat(0x3b744e));ring.rotation.x=Math.PI/2;ring.position.set(dest.x,.43,dest.z);routeGroups[dest.floor].add(ring);const pin=new THREE.Mesh(new THREE.SphereGeometry(.19,20,20),mat(0x315c3a));pin.position.set(dest.x,.85,dest.z);routeGroups[dest.floor].add(pin);cylinder(routeGroups[dest.floor],dest.x,.63,dest.z,.04,.4,0x315c3a);
}
function updateFloor(){floorGroups.forEach((g,f)=>{g.visible=building||f===viewFloor;g.position.y=building?f*6:0;});document.querySelectorAll('[data-floor]').forEach(b=>{b.classList.toggle('active',!building&&Number(b.dataset.floor)===viewFloor);b.setAttribute('aria-pressed',!building&&Number(b.dataset.floor)===viewFloor);});document.querySelector('#building-view').classList.toggle('active',building);document.querySelector('#floor-area').textContent=building?'BOTH FLOORS · 920 M²':`${viewFloor?'FIRST':'GROUND'} FLOOR · 460 M²`;labelRecords.forEach(({el,p})=>{el.classList.toggle('selected',p.id===selected);});controls.target.y=building?2.5:0;}
function resetCamera(){const narrow=map.clientWidth<540;camera.position.set(narrow?32:28,narrow?40:35,narrow?37:32);controls.target.set(0,building?2.5:0,0);controls.update();}
function resize(){const {width,height}=map.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(map);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDown=null;canvas.addEventListener('pointerdown',e=>{pointerDown=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!pointerDown||Math.hypot(e.clientX-pointerDown[0],e.clientY-pointerDown[1])>8)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickables.filter(m=>m.parent.visible));if(hits.length)selectSpace(hits[0].object.userData.destination);});
function animate(){requestAnimationFrame(animate);controls.update();scene.updateMatrixWorld();for(const {el,p,g} of labelRecords){el.style.display=g.visible?'flex':'none';if(!g.visible)continue;const v=new THREE.Vector3(p.x,1.8,p.z).applyMatrix4(g.matrixWorld).project(camera);el.style.left=`${(v.x+1)*map.clientWidth/2}px`;el.style.top=`${(-v.y+1)*map.clientHeight/2}px`;}renderer.render(scene,camera);}
document.querySelector('#search').addEventListener('input',directory);document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(k=>k.classList.toggle('active',k===b));directory();});document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{viewFloor=Number(b.dataset.floor);building=false;updateFloor();});document.querySelector('#building-view').onclick=()=>{building=!building;updateFloor();};document.querySelector('#start').onchange=updateRoute;document.querySelector('#step-free').onchange=updateRoute;document.querySelector('#lift-outage').onchange=()=>{updateRoute();labelRecords.filter(r=>r.p.id.startsWith('liftlabel')).forEach(r=>r.el.innerHTML=`<span class="label-dot"></span>${document.querySelector('#lift-outage').checked?'Lift unavailable':'↕ Lift'}`);};document.querySelector('#zoom-in').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(.86).add(controls.target);};document.querySelector('#zoom-out').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(1.16).add(controls.target);};document.querySelector('#reset-view').onclick=resetCamera;
directory();updateRoute();updateFloor();resize();resetCamera();animate();
