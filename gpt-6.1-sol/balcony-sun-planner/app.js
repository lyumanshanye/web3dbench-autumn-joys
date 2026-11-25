import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $ = id => document.getElementById(id);
const host = $('viewport');
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0xeef1e8);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
host.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xeef1e8,23,47);
const camera=new THREE.PerspectiveCamera(36,1,.1,100);
camera.position.set(8.4,7.5,10.5);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,.9,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.06;controls.minDistance=6;controls.maxDistance=19;
const hemi=new THREE.HemisphereLight(0xe9f0dd,0x77745f,2.0);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffedc8,3.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.camera.near=.1;sun.shadow.camera.far=40;sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
const balcony=new THREE.Group();scene.add(balcony);
const obstacles=[];
function mat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.85,...opts});}
const stone=mat('#d5d5c0'),plaster=mat('#e2e3ce'),edge=mat('#b5bba8'),dark=mat('#4c5f50'),wood=mat('#a28760'),woodLight=mat('#baa37c'),cream=mat('#e4e2cb'),soil=mat('#554b35'),terra=mat('#bb8267');
function box(w,h,d,m,x,y,z,parent=balcony,shadow=true){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
function cyl(r1,r2,h,m,x,y,z,parent=balcony,n=32){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(r,m,x,y,z,parent=balcony,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function solid(o){obstacles.push(o);return o;}
// A full-size architectural model. All dimensions are in meters.
box(200,.12,200,mat('#edf0e5'),0,-.53,0,scene,false);
box(5.9,.28,3.9,edge,0,-.18,0);
box(5.6,.09,3.6,stone,0,-.005,0);
for(let x=-2.75;x<2.76;x+=.55)box(.009,.006,3.5,mat('#c3c6b3'),x,.045,0,balcony,false);
for(let z=-1.75;z<1.76;z+=.58)box(5.5,.006,.009,mat('#c3c6b3'),0,.047,z,balcony,false);
solid(box(5.7,3.1,.16,plaster,0,1.55,-1.85));
solid(box(.16,3.1,3.7,plaster,-2.85,1.55,-.08));
const overhang=solid(box(5.85,.15,1.15,cream.clone(),0,3.18,-1.37));
box(5.86,.05,.06,edge,0,3.08,-.8);
// Sliding doors reflect a quiet blue-green interior.
const glass=mat('#627b75',{metalness:.25,roughness:.28});
box(3.1,2.5,.045,glass,.45,1.41,-1.75);
for(const x of [-1.13,.43,2.03])box(.045,2.58,.08,cream,x,1.42,-1.7);
for(const y of [.15,2.7])box(3.23,.055,.08,cream,.45,y,-1.7);
box(.025,2.4,.03,mat('#8fa197'),.5,1.42,-1.65);
box(.04,.2,.06,dark,.31,1.3,-1.64);box(.04,.2,.06,dark,.56,1.3,-1.64);
// Slender railings also participate in the shadow map.
for(let x=-2.7;x<=2.71;x+=.26)solid(box(.025,1.03,.025,dark,x,.58,1.79));
for(let z=-1.65;z<=1.8;z+=.26)solid(box(.025,1.03,.025,dark,2.78,.58,z));
solid(box(5.63,.055,.065,dark,0,1.12,1.79));solid(box(.065,.055,3.55,dark,2.78,1.12,.04));
box(5.6,.04,.045,dark,0,.15,1.79);
// A woven outdoor rug, with individual edge stitches.
const rug=mat('#c2c8a9');box(2.5,.025,1.55,rug,.25,.07,.05);
for(let i=-12;i<=12;i++)box(.013,.005,1.48,mat(i%2?'#d6dac4':'#b6bea0'),.25+i*.095,.085,.05,balcony,false);
for(let i=0;i<27;i++){box(.018,.007,.1,cream,-.98+i*.094,.08,.85,balcony,false);box(.018,.007,.1,cream,-.98+i*.094,.08,-.75,balcony,false);}
// Low timber loveseat.
const sofa=new THREE.Group();sofa.position.set(-.55,0,-1.08);balcony.add(sofa);
for(const x of [-.95,.95])for(const z of [-.26,.26])solid(box(.085,.36,.085,wood,x,.22,z,sofa));
solid(box(2.18,.12,.78,wood,0,.44,0,sofa));
for(const x of [-1.08,1.08]){solid(box(.075,.48,.76,wood,x,.67,0,sofa));box(.1,.05,.83,woodLight,x,.92,0,sofa);}
solid(box(2.12,.53,.08,wood,0,.78,-.36,sofa));
for(const x of [-.53,.53]){solid(box(1.01,.18,.65,cream,x,.59,.02,sofa));const back=solid(box(1,.44,.15,cream,x,.88,-.28,sofa));back.rotation.x=-.13;}
const pillow=box(.37,.36,.14,mat('#7d916d'),-.83,.86,-.11,sofa);pillow.rotation.z=.2;
const pillow2=box(.37,.35,.14,mat('#c5a77c'),.81,.85,-.11,sofa);pillow2.rotation.z=-.2;
// Round bistro table and a small book.
solid(cyl(.49,.49,.065,woodLight,.85,.65,.28));solid(cyl(.055,.07,.59,dark,.85,.32,.28));cyl(.3,.3,.035,dark,.85,.08,.28);
const book=box(.26,.035,.18,mat('#e0d7b1'),.86,.701,.3);book.rotation.y=.25;
cyl(.055,.045,.085,cream,.62,.727,.21);cyl(.044,.044,.005,mat('#644c34'),.62,.772,.21);
// Woven chair on the right.
const chair=new THREE.Group();chair.position.set(1.95,0,-.5);chair.rotation.y=-.42;balcony.add(chair);
for(const x of [-.3,.3])for(const z of [-.28,.28]){const leg=solid(box(.035,.51,.035,wood,x,.27,z,chair));leg.rotation.z=x*.16;}
solid(box(.69,.1,.7,woodLight,0,.53,0,chair));solid(box(.63,.09,.62,cream,0,.61,0,chair));
for(let x=-.3;x<=.31;x+=.06)solid(box(.025,.52,.03,woodLight,x,.84,-.32,chair));
for(const x of [-.37,.37]){solid(box(.035,.38,.035,wood,x,.75,.26,chair));solid(box(.06,.055,.7,woodLight,x,.94,0,chair));}solid(box(.74,.06,.045,wood,0,1.1,-.32,chair));
// Terracotta wall shelf and a small watering can.
box(.49,.055,.38,wood,-2.51,1.43,-.85);cyl(.085,.07,.18,mat('#d1be9b'),-2.5,1.55,-.85);
cyl(.13,.14,.23,mat('#7b8d78'),-2.31,.17,-.7);const spout=cyl(.025,.035,.35,mat('#7b8d78'),-2.1,.22,-.7);spout.rotation.z=-1.1;
const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,8,24),mat('#7b8d78'));handle.position.set(-2.43,.27,-.7);balcony.add(handle);
let seed=42;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const plants=[{name:'Olive tree',latin:'Olea europaea',icon:'🌿',need:'Full sun',x:-2.22,z:.94,type:'olive',color:'#b38369',height:1.85},{name:'Monstera',latin:'Monstera deliciosa',icon:'🌱',need:'Filtered light',x:-1.98,z:-.35,type:'monstera',color:'#d0ccad',height:1.2},{name:'Lavender',latin:'Lavandula angustifolia',icon:'🪻',need:'Full sun',x:1.96,z:1.15,type:'lavender',color:'#bd876a',height:.8},{name:'Rosemary',latin:'Salvia rosmarinus',icon:'🌿',need:'Full sun',x:.25,z:1.22,type:'rosemary',color:'#b2b8a2',height:.72}];
function createPlant(p){const g=new THREE.Group();const pot=mat(p.color);const radius=p.type==='olive'?.27:.24;const h=p.type==='olive'?.48:.37;cyl(radius,radius*.73,h,pot,0,h/2+.055,0,g);cyl(radius+.015,radius+.015,.045,pot,0,h+.04,0,g);cyl(radius*.88,radius*.88,.012,soil,0,h+.065,0,g);const leaves=[mat('#627a3c'),mat('#81905b'),mat('#536c3b'),mat('#98a570')];
if(p.type==='olive'){cyl(.025,.045,1.18,wood,0,.99,0,g);for(let i=0;i<65;i++){const a=rand()*Math.PI*2,r=rand()*.5,y=1.1+rand()*.85;const leaf=sphere(.14,leaves[i%4],Math.cos(a)*r,y,Math.sin(a)*r,g,1,.47,.42);leaf.rotation.set(rand()*2,rand()*6,rand()*2);}}
else if(p.type==='monstera'){for(let i=0;i<13;i++){const a=i*2.4,r=.12+rand()*.32,y=.65+rand()*.55;const stem=cyl(.009,.012,y-.35,leaves[2],Math.cos(a)*r*.5,.38+(y-.35)/2,Math.sin(a)*r*.5,g,7);stem.rotation.z=-Math.cos(a)*.35;const leaf=sphere(.22,leaves[i%3],Math.cos(a)*r,y,Math.sin(a)*r,g,1,.14,1.55);leaf.rotation.set(.3+rand()*.5,a,.25);}}
else {for(let i=0;i<52;i++){const a=rand()*6.28,r=Math.sqrt(rand())*.25,hh=.14+rand()*.3;const stem=cyl(.006,.009,hh,leaves[i%3],Math.cos(a)*r,.42+hh/2,Math.sin(a)*r,g,6);stem.rotation.z=(rand()-.5)*.45;if(p.type==='lavender')sphere(.033,mat(i%2?'#a598af':'#8c84a2'),Math.cos(a)*r,.43+hh,Math.sin(a)*r,g,.7,2,.7);else{for(let j=0;j<3;j++)sphere(.035,leaves[i%4],Math.cos(a)*r,.48+j*hh/3,Math.sin(a)*r,g,1.1,.5,1.1);}}}
g.position.set(p.x,0,p.z);g.userData.plantIndex=plants.indexOf(p);balcony.add(g);return g;}
plants.forEach(p=>{p.group=createPlant(p);p.label=document.createElement('div');p.label.className='plant-label';$('plant-labels').appendChild(p.label);});
const selectedRing=new THREE.Mesh(new THREE.RingGeometry(.34,.355,64),new THREE.MeshBasicMaterial({color:'#708957',side:THREE.DoubleSide,transparent:true,opacity:.7}));selectedRing.rotation.x=-Math.PI/2;selectedRing.position.y=.065;selectedRing.visible=false;balcony.add(selectedRing);
const cities={london:{lat:51.51,lon:-.13,coords:'51.51° N · 0.13° W'},lisbon:{lat:38.72,lon:-9.14,coords:'38.72° N · 9.14° W'},newyork:{lat:40.71,lon:-74.01,coords:'40.71° N · 74.01° W'},sydney:{lat:-33.87,lon:151.21,coords:'33.87° S · 151.21° E'},singapore:{lat:1.35,lon:103.82,coords:'1.35° N · 103.82° E'}};
let isTop=false,comparison=false,selected=-1,saved=plants.map(p=>({x:p.x,z:p.z})),hasSaved=false,playing=false,dragging=-1,lastFrame=0,lastUI=0;
const deg=Math.PI/180,sunDirection=new THREE.Vector3(),ray=new THREE.Raycaster();
function solar(){const date=new Date($('date').value+'T12:00:00Z');const start=new Date(Date.UTC(date.getUTCFullYear(),0,0));const day=Math.floor((date-start)/86400000);const lat=cities[$('location').value].lat*deg;const dec=23.44*deg*Math.sin(2*Math.PI*(day-81)/365);const h=(Number($('time').value)-12)*15*deg;const alt=Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(h));const az=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(lat)-Math.tan(dec)*Math.cos(lat))/deg+180+360)%360;const dayAngle=Math.acos(THREE.MathUtils.clamp(-Math.tan(lat)*Math.tan(dec),-1,1))/deg/15;return{alt:alt/deg,az,sunrise:12-dayAngle,sunset:12+dayAngle};}
function fmt(t){let hh=Math.floor(t),mm=Math.round((t-hh)*60);if(mm===60){hh++;mm=0;}return `${hh%12||12}:${String(mm).padStart(2,'0')}`;}
function shaded(p,pos=p){if(solar().alt<=0)return true;ray.set(new THREE.Vector3(pos.x,p.height*.72,pos.z),sunDirection);return ray.intersectObjects(obstacles,false).length>0;}
function updateSun(){const s=solar();$('time').min=s.sunrise.toFixed(2);$('time').max=s.sunset.toFixed(2);const ticks=$('time').parentElement.querySelectorAll('.hour-ticks span');[1,2,3].forEach(i=>{const t=s.sunrise+(s.sunset-s.sunrise)*i/4;ticks[i].textContent=`${Math.round(t)%12||12} ${t>=12?'PM':'AM'}`;});const bearing=Number($('orientation').value);const a=(s.az-bearing)*deg;sunDirection.set(Math.sin(a)*Math.cos(s.alt*deg),Math.sin(s.alt*deg),Math.cos(a)*Math.cos(s.alt*deg));sun.position.copy(sunDirection).multiplyScalar(16);sun.target.position.set(0,0,0);sun.intensity=s.alt>0?3.2:0;hemi.intensity=s.alt>0?1.85:.65;const t=Number($('time').value);$('time-text').textContent=fmt(t);$('ampm').textContent=t>=12?'PM':'AM';$('altitude').textContent=Math.round(s.alt)+'°';$('azimuth').textContent=Math.round(s.az)+'°';$('sunrise').textContent='☀ '+fmt(s.sunrise)+' AM';$('sunset').textContent=fmt(s.sunset)+' PM ☾';const dirs=['North','Northeast','East','Southeast','South','Southwest','West','Northwest'],short=['N','NE','E','SE','S','SW','W','NW'];let idx=Math.round(bearing/45)%8;$('bearing').textContent=`${dirs[idx]} · ${bearing}°`;$('direction').textContent=short[idx];$('needle').style.transform=`rotate(${bearing}deg)`;$('mini-needle').style.transform=`rotate(${-bearing}deg)`;updateCards();}
function updateCards(){scene.updateMatrixWorld(true);let sunny=0;plants.forEach((p,i)=>{p.shade=shaded(p);if(!p.shade)sunny++;p.label.innerHTML=`<i></i>${p.name}`;p.label.classList.toggle('shade',p.shade);});$('plant-summary').textContent=`${sunny} soaking up the sun · ${4-sunny} in the shade`;$('plant-cards').innerHTML=plants.map((p,i)=>`<div class="plant-card ${selected===i?'selected':''}" tabindex="0" role="button" data-index="${i}" aria-label="Select ${p.name}"><div class="plant-art">${p.icon}</div><div><h3>${p.name}</h3><small>${p.need}</small></div><div class="plant-status ${p.shade?'shaded':''}"><b>${p.shade?'◑ In the shade':'☀ In direct sun'}</b><span>${comparison?(shaded(p,saved[i])?'A: shade':'A: sun'):'↗'}</span></div></div>`).join('');}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function setTop(value){isTop=value;overhang.material.transparent=value;overhang.material.opacity=value?.12:1;overhang.material.depthWrite=!value;overhang.material.needsUpdate=true;controls.enableRotate=!value;controls.enablePan=!value;if(value){camera.position.set(0,11,.001);controls.target.set(0,0,0);}else{camera.position.set(8.4,7.5,10.5);controls.target.set(0,.9,0);}$('top').classList.toggle('active',value);$('perspective').classList.toggle('active',!value);$('scene-hint').textContent=value?'Drag a planter to find its happy place':'Drag to orbit · Scroll to explore';controls.update();}
$('top').onclick=() => setTop(true);$('top-side').onclick=()=>setTop(true);$('perspective').onclick=()=>setTop(false);
$('save').onclick=()=>{saved=plants.map(p=>({x:p.x,z:p.z}));hasSaved=true;$('save').innerHTML='<span>✓</span> Arrangement A saved';toast('Arrangement A saved. Move planters to create arrangement B.');updateCards();};
$('compare').onclick=()=>{if(!hasSaved){saved=plants.map(p=>({x:p.x,z:p.z}));hasSaved=true;toast('A saved. Drag planters in top view to explore B.');}comparison=!comparison;$('compare').classList.toggle('active',comparison);$('view-label').style.display=comparison?'block':'none';$('view-label').textContent='A · Saved arrangement';$('compare-label').style.display=comparison?'block':'none';plants.forEach(p=>p.label.style.display=comparison?'none':'block');if(comparison)setTop(true);resize();updateCards();};
$('reset').onclick=()=>{const defaults=[[-2.22,.94],[-1.98,-.35],[1.96,1.15],[.25,1.22]];plants.forEach((p,i)=>{[p.x,p.z]=defaults[i];p.group.position.set(p.x,0,p.z);});selected=-1;selectedRing.visible=false;setTop(false);updateCards();toast('Balcony and camera reset.');};
for(const id of ['time','orientation'])$(id).addEventListener('input',updateSun);
for(const id of ['date','location'])$(id).addEventListener('change',()=>{if(!$('date').value)return;$('coordinates').textContent=cities[$('location').value].coords;const month=Number($('date').value.slice(5,7));const south=cities[$('location').value].lat<0;let summer=month>=5&&month<=8;if(south)summer=!summer;$('season').textContent=summer?'☀ Summer light · Make the most of it':'◑ Seasonal light · Watch the shifting shade';updateSun();});
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Ⅱ':'▶';$('play').title=playing?'Pause the sun study':'Play through the day';};
$('help').onclick=()=>$('info').showModal();$('close-info').onclick=()=>$('info').close();$('info').onclick=e=>{if(e.target===$('info'))$('info').close();};
function selectPlant(i){selected=i;selectedRing.visible=true;selectedRing.position.set(plants[i].x,.065,plants[i].z);updateCards();}
$('plant-cards').addEventListener('click',e=>{const card=e.target.closest('[data-index]');if(card){selectPlant(+card.dataset.index);if(!isTop){setTop(true);toast(`${plants[selected].name} selected. Drag it to a new spot.`);}}});$('plant-cards').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.target.click();}});
const pointer=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function pointerRay(e){const rect=renderer.domElement.getBoundingClientRect();let px=e.clientX-rect.left;if(comparison){if(px<rect.width/2)return false;px-=rect.width/2;}pointer.set(px/(rect.width/(comparison?2:1))*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return true;}
renderer.domElement.addEventListener('pointerdown',e=>{if(!isTop||!pointerRay(e))return;const hits=ray.intersectObjects(plants.map(p=>p.group),true);if(hits.length){let o=hits[0].object;while(o.parent!==balcony)o=o.parent;dragging=o.userData.plantIndex;selectPlant(dragging);controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';}});
renderer.domElement.addEventListener('pointermove',e=>{if(!isTop||!pointerRay(e))return;if(dragging<0){const hits=ray.intersectObjects(plants.map(p=>p.group),true);renderer.domElement.style.cursor=hits.length?'grab':'default';return;}if(ray.ray.intersectPlane(groundPlane,hit)){const p=plants[dragging];p.x=THREE.MathUtils.clamp(hit.x,-2.45,2.4);p.z=THREE.MathUtils.clamp(hit.z,-1.35,1.45);p.group.position.set(p.x,0,p.z);selectedRing.position.set(p.x,.065,p.z);updateCards();}});
function endDrag(){if(dragging>=0){dragging=-1;controls.enabled=true;renderer.domElement.style.cursor='grab';updateCards();}}renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/(comparison?2:1)/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
function renderFrame(now){requestAnimationFrame(renderFrame);const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;if(playing){let t=Number($('time').value)+dt*.5;if(t>Number($('time').max))t=Number($('time').min);$('time').value=t;if(now-lastUI>100){updateSun();lastUI=now;}}controls.update();const w=host.clientWidth,h=host.clientHeight;if(comparison){renderer.setScissorTest(true);selectedRing.visible=false;plants.forEach((p,i)=>p.group.position.set(saved[i].x,0,saved[i].z));renderer.setViewport(0,0,w/2,h);renderer.setScissor(0,0,w/2,h);renderer.render(scene,camera);plants.forEach(p=>p.group.position.set(p.x,0,p.z));selectedRing.visible=selected>=0;renderer.setViewport(w/2,0,w/2,h);renderer.setScissor(w/2,0,w/2,h);renderer.render(scene,camera);renderer.setScissorTest(false);}else{renderer.setViewport(0,0,w,h);renderer.render(scene,camera);plants.forEach(p=>{const pos=new THREE.Vector3(p.x,p.height+.1,p.z).project(camera);p.label.style.left=(pos.x*.5+.5)*w+'px';p.label.style.top=(-pos.y*.5+.5)*h+'px';p.label.style.opacity=pos.z>1?'0':'1';});}}
resize();updateSun();requestAnimationFrame(renderFrame);
