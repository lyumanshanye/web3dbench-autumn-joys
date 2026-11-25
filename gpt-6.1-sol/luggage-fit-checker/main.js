import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#edf0e6');
const camera = new THREE.PerspectiveCamera(36, 1, 1, 3000);
camera.position.set(180, 165, 205);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor('#edf0e6');
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 22, 0);
controls.enableDamping = true;
controls.minDistance = 100;
controls.maxDistance = 700;
controls.maxPolarAngle = Math.PI / 2.05;
controls.enablePan = false;
scene.add(new THREE.HemisphereLight(0xffffff, 0x7c8767, 2.5));
const sun = new THREE.DirectionalLight(0xfff9e9, 3.2);
sun.position.set(-95, 180, 100);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 1, far: 500 });
sun.shadow.normalBias = .3;
sun.shadow.bias = -.0002;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ color: 0x68754e, opacity: .13 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -2; ground.receiveShadow = true; scene.add(ground);
let boot = { w: 110, d: 90, h: 70 };
let bootGroup = new THREE.Group(); scene.add(bootGroup);
const bagGroup = new THREE.Group(); scene.add(bagGroup);
let bags = [], selected = 1, nextId = 4;
const initial = [
  { id: 1, name: 'The weekender', w: 43, d: 28, h: 65, x: -28, z: -22, y: 0, angle: 0, color: '#b86e4c' },
  { id: 2, name: 'Cabin companion', w: 36, d: 25, h: 53, x: 20, z: -24, y: 0, angle: 0, color: '#657b8f' },
  { id: 3, name: 'The little escape', w: 52, d: 29, h: 34, x: 6, z: 19, y: 0, angle: 0, color: '#b5b17d' }
];
function disposeGroup(group) {
  for (const obj of [...group.children]) { obj.traverse(child => { child.geometry?.dispose(); if (child.material) { for (const m of (Array.isArray(child.material) ? child.material : [child.material])) { m.map?.dispose(); m.dispose(); } } }); group.remove(obj); }
}
function line(points, color = '#9eac8a', dashed = false) {
  const geom = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 2, gapSize: 1.5, transparent: true, opacity: .65 }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7 });
  const obj = new THREE.Line(geom, mat); if (dashed) obj.computeLineDistances(); return obj;
}
function textSprite(text, position) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.font = '500 44px Arial'; ctx.fillStyle = '#7c8c6c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.set(34, 8.5, 1); sprite.position.set(...position); return sprite;
}
function drawBoot() {
  disposeGroup(bootGroup);
  const { w, d, h } = boot;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), new THREE.MeshStandardMaterial({ color: '#d6ddc5', roughness: .95 }));
  floor.position.y = -1; floor.receiveShadow = true; bootGroup.add(floor);
  const gridMat = new THREE.LineBasicMaterial({ color: '#b5c29f', transparent: true, opacity: .35 });
  const points = [];
  for (let x = -w / 2; x <= w / 2; x += 10) points.push(x, .01, -d / 2, x, .01, d / 2);
  for (let z = -d / 2; z <= d / 2; z += 10) points.push(-w / 2, .01, z, w / 2, .01, z);
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); bootGroup.add(new THREE.LineSegments(gridGeo, gridMat));
  // A clear envelope keeps the full usable height visible without hiding the luggage.
  const box = new THREE.BoxGeometry(w, h, d); const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#a8b695', transparent: true, opacity: .7 })); edges.position.y = h / 2; bootGroup.add(edges); box.dispose();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#d8dfcb', transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false })); back.position.set(0, h / 2, -d / 2); bootGroup.add(back);
  bootGroup.add(line([[-w/2, .2, d/2+8], [w/2, .2, d/2+8]]));
  for(const x of [-w/2,w/2]) bootGroup.add(line([[x,.2,d/2+5],[x,.2,d/2+11]]));
  bootGroup.add(textSprite(`${w} cm`, [0, 1, d/2+13]));
  bootGroup.add(line([[-w/2-8,.2,-d/2],[-w/2-8,.2,d/2]]));
  bootGroup.add(textSprite(`${d} cm`, [-w/2-17,2,0]));
  bootGroup.add(textSprite(`${h} cm`, [w/2+12,h/2,-d/2]));
  $('bootVolume').textContent = `${Math.round(w*d*h/1000)} L`;
  $('sceneDims').textContent = `${w} × ${d} × ${h} cm`;
}
function mesh(geometry, material, parent, x=0,y=0,z=0) { const m = new THREE.Mesh(geometry,material); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m; }
function drawBag(b) {
  const group = new THREE.Group(); group.userData.bagId = b.id;
  const shellMat = new THREE.MeshStandardMaterial({color:b.color,roughness:.59,metalness:.08});
  const dark = new THREE.MeshStandardMaterial({color:'#41473f',roughness:.7});
  const trim = new THREE.MeshStandardMaterial({color:new THREE.Color(b.color).multiplyScalar(.74),roughness:.7});
  const shellHeight=b.h-8;
  mesh(new RoundedBoxGeometry(b.w,shellHeight,b.d-1,4,Math.min(3,b.d/8)),shellMat,group,0,0,0);
  // Fine raised shell ribs, zipper seam, side grip, telescopic handle, and spinner wheels.
  for(let i=-2;i<=2;i++) {
    const rib = new THREE.MeshStandardMaterial({color:new THREE.Color(b.color).multiplyScalar(1.1),roughness:.62});
    mesh(new RoundedBoxGeometry(1.2,shellHeight*.74,1,2,.45),rib,group,i*b.w/7,0,b.d/2-.7);
  }
  mesh(new RoundedBoxGeometry(b.w,shellHeight,.6,2,.2),trim,group,0,0,0);
  mesh(new RoundedBoxGeometry(10,2,3.4,3,.8),dark,group,0,b.h/2-3,0);
  mesh(new RoundedBoxGeometry(2,10,3.2,2,.7),trim,group,b.w/2-1,4,0);
  for(const x of [-4,4]) mesh(new THREE.CylinderGeometry(.5,.5,5,8),dark,group,x,b.h/2-3.5,-b.d/4);
  mesh(new RoundedBoxGeometry(10,1.5,2.2,2,.5),dark,group,0,b.h/2-1,-b.d/4);
  for(const x of [-b.w/2+4,b.w/2-4]) for(const z of [-b.d/2+3,b.d/2-3]) {const wheel=mesh(new THREE.CylinderGeometry(2,2,2.2,12),dark,group,x,-b.h/2+2,z);wheel.rotation.z=Math.PI/2;}
  const selectionGeo = new THREE.BoxGeometry(b.w+1.8,b.h+1.8,b.d+1.8);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(selectionGeo), new THREE.LineBasicMaterial({color:'#e8f3bc',transparent:true,opacity:.95}));
  outline.name='outline'; outline.visible=b.id===selected; group.add(outline); selectionGeo.dispose();
  b.object=group; bagGroup.add(group); updateBagTransform(b);
}
function updateBagTransform(b) { b.object.position.set(b.x,b.y+b.h/2,b.z); b.object.rotation.y = b.angle*Math.PI/180; }
function corners(b) {
  const a=b.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:b.x+x*b.w/2*c+z*b.d/2*s,z:b.z-x*b.w/2*s+z*b.d/2*c}));
}
function overlaps(a,b) {
  if(a.y+a.h<=b.y+.1 || b.y+b.h<=a.y+.1) return false;
  const ac=corners(a),bc=corners(b);
  for (const poly of [ac,bc]) for(let i=0;i<2;i++) {
    const edge={x:poly[i+1].x-poly[i].x,z:poly[i+1].z-poly[i].z}; const axis={x:-edge.z,z:edge.x};
    const ap=ac.map(p=>p.x*axis.x+p.z*axis.z),bp=bc.map(p=>p.x*axis.x+p.z*axis.z);
    if(Math.max(...ap)<=Math.min(...bp)+.01 || Math.max(...bp)<=Math.min(...ap)+.01) return false;
  }
  return true;
}
function validate() {
  bags.forEach(b=>{b.outside=b.y<-.1 || b.y+b.h>boot.h+.1 || corners(b).some(p=>Math.abs(p.x)>boot.w/2+.1 || Math.abs(p.z)>boot.d/2+.1);b.overlap=false;});
  for(let i=0;i<bags.length;i++) for(let j=i+1;j<bags.length;j++) if(overlaps(bags[i],bags[j])){bags[i].overlap=true;bags[j].overlap=true;}
  const count=bags.filter(b=>!b.outside&&!b.overlap).length;
  $('fitCount').innerHTML=`${count}<span> / ${bags.length}</span>`;
  const all=count===bags.length;
  $('fitSymbol').textContent=all?'✓':'!'; $('fitSymbol').style.background=all?'#e6edda':'#f5e0d0'; $('fitSymbol').style.color=all?'#738e55':'#b66f46';
  $('fitTitle').textContent=bags.length===0?'A blank boot. A fresh start.':all?'All packed. Looking good.':'A little rearranging needed.';
  $('fitDescription').textContent=bags.length===0?'Add a suitcase to plan your packing.':all?`All ${bags.length} bags fit inside with no overlaps.`:`${bags.filter(b=>b.overlap).length} overlapping · ${bags.filter(b=>b.outside).length} outside the boot. Move or turn the highlighted bags.`;
  bags.forEach(b=>{ const outline=b.object.getObjectByName('outline');outline.visible=b.id===selected||b.outside||b.overlap;outline.material.color.set(b.outside||b.overlap?'#c45636':'#f2f9d3'); });
  renderList();
}
function renderList() {
  $('bagTotal').textContent=`${bags.length} BAGS`;
  $('bagList').replaceChildren(...bags.map(b=>{
    const div=document.createElement('div');div.className=`bag-item ${b.id===selected?'selected':''}`;div.tabIndex=0;div.setAttribute('role','button');div.setAttribute('aria-label',`Select ${b.name}`);
    div.innerHTML=`<span class="bag-icon" style="--bag-color:${b.color}"></span><div class="bag-info"><strong>${b.name}</strong><small>${b.w} × ${b.d} × ${b.h} cm</small></div><span class="bag-status ${b.outside||b.overlap?'bad':''}">${b.outside?'Outside':b.overlap?'Overlap':'Fits ✓'}</span>`;
    div.onclick=()=>selectBag(b.id);div.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectBag(b.id);}};return div;
  }));
}
function selectBag(id) {selected=id;syncInspector();validate();}
function syncInspector() {
  const b=bags.find(b=>b.id===selected);
  document.querySelectorAll('.inspector input,.inspector button').forEach(el=>el.disabled=!b);
  $('selectedName').textContent=b?b.name:'Select or add a suitcase';
  if(!b) return;
  for(const [id,key] of Object.entries({bagW:'w',bagD:'d',bagH:'h',posX:'x',posZ:'z',posY:'y',angle:'angle'})) $(id).value=Math.round(b[key]);
  $('angleValue').textContent=`${Math.round(b.angle)}°`;
}
function rebuildBags() {disposeGroup(bagGroup);bags.forEach(drawBag);syncInspector();validate();}
function reset() { boot={w:110,d:90,h:70};bags=initial.map(b=>({...b}));selected=1;nextId=4;['W','D','H'].forEach(k=>$(`boot${k}`).value=boot[k.toLowerCase()]);drawBoot();rebuildBags();setView('perspective'); }
for(const key of ['w','d','h']) $(`boot${key.toUpperCase()}`).addEventListener('change',e=>{const v=Number(e.target.value);boot[key]=Math.max(+e.target.min,Math.min(+e.target.max,Number.isFinite(v)?v:110));e.target.value=boot[key];drawBoot();validate();});
for(const [id,key] of Object.entries({bagW:'w',bagD:'d',bagH:'h',posX:'x',posZ:'z',posY:'y',angle:'angle'})) $(id).addEventListener(id==='angle'?'input':'change',e=>{
  const b=bags.find(b=>b.id===selected);if(!b)return;let v=Number(e.target.value);if(!Number.isFinite(v))return;
  if(['w','d','h'].includes(key))v=Math.max(10,Math.min(150,v));if(key==='y')v=Math.max(0,v);
  b[key]=v;e.target.value=v;if(['w','d','h'].includes(key))rebuildBags();else{updateBagTransform(b);$('angleValue').textContent=`${Math.round(b.angle)}°`;validate();}
});
$('rotate').onclick=()=>{const b=bags.find(b=>b.id===selected);if(b){b.angle=(b.angle+90)%360;updateBagTransform(b);syncInspector();validate();}};
$('deleteBag').onclick=()=>{bags=bags.filter(b=>b.id!==selected);selected=bags[0]?.id;rebuildBags();};
$('addBag').onclick=()=>{const id=nextId++;bags.push({id,name:`Suitcase ${id}`,w:40,d:26,h:55,x:0,z:0,y:0,angle:0,color:['#7a8c69','#9a869d','#c09461'][id%3]});selected=id;rebuildBags();};
$('reset').onclick=reset;
let view='perspective';
function setView(next) {view=next;const scale=Math.max(boot.w,boot.d,boot.h)/110;controls.target.set(0,20,0);camera.position.set(...(next==='top'?[0,280*scale,.1]:[180*scale,165*scale,205*scale]));controls.maxPolarAngle=Math.PI/2.05;controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('homeView').onclick=()=>setView(view);
function zoom(factor){camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}
$('zoomIn').onclick=()=>zoom(.85);$('zoomOut').onclick=()=>zoom(1.18);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),hit=new THREE.Vector3();let drag=null;
function ray(event) {const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;ray(e);const hits=raycaster.intersectObjects(bagGroup.children,true).filter(h=>h.object.isMesh);if(!hits.length)return;
  let obj=hits[0].object;while(obj.parent!==bagGroup)obj=obj.parent;const b=bags.find(b=>b.id===obj.userData.bagId);selectBag(b.id);
  plane.set(new THREE.Vector3(0,1,0),-(b.y+b.h/2));if(raycaster.ray.intersectPlane(plane,hit)){drag={b,dx:b.x-hit.x,dz:b.z-hit.z};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';}
});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;ray(e);if(raycaster.ray.intersectPlane(plane,hit)){drag.b.x=Math.round((hit.x+drag.dx)*2)/2;drag.b.z=Math.round((hit.z+drag.dz)*2)/2;updateBagTransform(drag.b);syncInspector();validate();}});
function endDrag(){drag=null;controls.enabled=true;renderer.domElement.style.cursor='grab';}
renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);renderer.domElement.style.cursor='grab';
new ResizeObserver(()=>{camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();renderer.setSize(viewport.clientWidth,viewport.clientHeight);}).observe(viewport);
reset();
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
