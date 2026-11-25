import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xf2f1e9, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(0, 3.3, 9.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5.2;
controls.maxDistance = 15;
controls.autoRotateSpeed = .65;
controls.target.set(0, 0, 0);

const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment, .04).texture;
environment.dispose();
const key = new THREE.DirectionalLight(0xfff8e8, 4.5);
key.position.set(-3, 6, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 2.2);
fill.position.set(4, 1, -4);
scene.add(fill);
const top = new THREE.DirectionalLight(0xffeac8, 1.1);
top.position.set(0, -3, 2);
scene.add(top);

const metals = {
  gold: { label: 'Yellow gold', name: '18k yellow gold', color: '#d8ac55', engraving: '#61502b' },
  platinum: { label: 'Platinum', name: 'Platinum 950', color: '#d6d9d7', engraving: '#626967' },
  rose: { label: 'Rose gold', name: '18k rose gold', color: '#d79b81', engraving: '#6d4334' }
};
let metal = 'gold', width = 4, engraving = $('engraving').value, comparing = false, inside = false;
const ringRoot = new THREE.Group();
scene.add(ringRoot);
const ringGroups = [];
const shadowCanvas = document.createElement('canvas');
shadowCanvas.width = shadowCanvas.height = 256;
const shadowContext = shadowCanvas.getContext('2d');
const gradient = shadowContext.createRadialGradient(128,128,0,128,128,128);
gradient.addColorStop(0, 'rgba(88,78,47,0.22)');
gradient.addColorStop(.35, 'rgba(88,78,47,0.11)');
gradient.addColorStop(1, 'rgba(88,78,47,0)');
shadowContext.fillStyle = gradient; shadowContext.fillRect(0,0,256,256);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(shadowCanvas), transparent:true, depthWrite:false, opacity:.65 }));
shadow.rotation.x = -Math.PI/2; shadow.position.y = -2.0;
scene.add(shadow);

// A closed lathed comfort-fit profile: the width changes the actual solid geometry.
function bandGeometry(mm) {
  const half = mm * .073;
  const inner = 1.67, outer = 1.96, bevel = .07;
  const pts = [];
  const curve = [
    [inner + bevel, -half], [outer - bevel, -half],
    [outer - .02, -half + .018], [outer, -half + bevel],
    [outer + .012, 0], [outer, half - bevel],
    [outer - .02, half - .018], [outer - bevel, half],
    [inner + bevel, half], [inner + .018, half - .018],
    [inner, half - bevel], [inner - .012, 0],
    [inner, -half + bevel], [inner + .018, -half + .018],
    [inner + bevel, -half]
  ];
  // Subdivide the profile with a Catmull-Rom spline for softly rounded edges.
  const path = new THREE.CatmullRomCurve3(curve.map(([r,y]) => new THREE.Vector3(r,y,0)), false, 'centripetal');
  for (const p of path.getPoints(160)) pts.push(new THREE.Vector2(p.x, p.y));
  return new THREE.LatheGeometry(pts, 256);
}
function engravingMesh(kind) {
  if (!engraving.trim()) return null;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 2048; textureCanvas.height = 256;
  const ctx = textureCanvas.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'italic 126px Georgia';
  ctx.fillStyle = metals[kind].engraving;
  ctx.fillText(engraving, 1024, 133, 1920);
  const tex = new THREE.CanvasTexture(textureCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const length = Math.min(3.45, Math.max(1.2, engraving.length * .115));
  const span = length / 1.652;
  const positions = [], uvs = [], indices = [];
  const height = Math.min(width * .073 * 1.1, .25);
  for (let i = 0; i <= 100; i++) {
    const u = i / 100, theta = Math.PI + span / 2 - u * span;
    for (let j = 0; j <= 1; j++) {
      // The lettering is a curved decal on the inward-facing wall.
      positions.push(Math.sin(theta) * 1.650, (j - .5) * height, Math.cos(theta) * 1.650);
      uvs.push(u, j);
    }
    if(i < 100) { const k=i*2; indices.push(k,k+1,k+2,k+1,k+3,k+2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-1}));
}
function disposeGroup(group) {
  group.traverse(obj => { if(obj.geometry) obj.geometry.dispose(); if(obj.material){ obj.material.map?.dispose(); obj.material.dispose(); }});
  ringRoot.remove(group);
}
function rebuild() {
  ringGroups.forEach(disposeGroup); ringGroups.length = 0;
  const keys = comparing ? ['gold', 'platinum', 'rose'] : [metal];
  keys.forEach((kind,i) => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color:metals[kind].color, metalness:1, roughness:.19, envMapIntensity:1.6 });
    group.add(new THREE.Mesh(bandGeometry(width), material));
    const words = engravingMesh(kind); if(words) group.add(words);
    group.rotation.set(inside ? .02 : .37, inside ? 0 : -.12, inside ? 0 : -.34);
    if(comparing){group.scale.setScalar(.57); group.position.set((i-1)*2.55, -.1, 0); group.rotation.z=-.27;}
    ringRoot.add(group); ringGroups.push(group);
  });
  $('metal-label').innerHTML = comparing ? 'Three metals. One timeless form.<span>Yellow gold &nbsp; · &nbsp; Platinum &nbsp; · &nbsp; Rose gold</span>' : `${metals[metal].name}<span>The Signature Band · ${width} mm</span>`;
}
function updateSummary() {
  $('metal-name').textContent = metals[metal].label;
  $('width-value').textContent = width;
  $('char-count').textContent = `${engraving.length}/24`;
  $('summary').innerHTML = `${metals[metal].name} <i>·</i> ${width} mm <i>·</i> High polish`;
}
let viewTween = null;
function setView(isInside) {
  inside = isInside;
  $('interior').classList.toggle('active', inside);
  $('exterior').classList.toggle('active', !inside);
  controls.autoRotate = false; $('rotate').classList.remove('active');
  viewTween = { start:performance.now(), from:camera.position.clone(), to:new THREE.Vector3(0, inside ? 5.4 : 3.3, inside ? 7.1 : 9.4) };
  rebuild();
}
for (const button of document.querySelectorAll('.metal')) button.addEventListener('click', () => {
  metal = button.dataset.metal;
  document.querySelectorAll('.metal').forEach(el=>el.classList.toggle('selected',el===button));
  updateSummary(); rebuild();
});
$('width').addEventListener('input', event => {
  width = Number(event.target.value);
  event.target.style.background = `linear-gradient(to right,#77835d ${(width-2)/6*100}%,#e0e4d7 ${(width-2)/6*100}%)`;
  updateSummary(); rebuild();
});
$('engraving').addEventListener('input', event => {engraving=event.target.value;updateSummary();rebuild();});
$('compare').addEventListener('click', () => {
  comparing = !comparing;
  $('compare').classList.toggle('active',comparing);
  $('compare').innerHTML = comparing ? '<span class="compare-icon">◉ ◉</span> Exit comparison' : '<span class="compare-icon">◉ ◉</span> Compare metals';
  if(comparing) {inside=false;setView(false);} else rebuild();
});
$('exterior').addEventListener('click',()=>setView(false));
$('interior').addEventListener('click',()=> {if(comparing) $('compare').click();setView(true);});
$('preview-engraving').addEventListener('click',()=> {if(comparing) $('compare').click();setView(true);});
$('rotate').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('rotate').classList.toggle('active',controls.autoRotate);});
controls.addEventListener('start',()=>{viewTween=null;});
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),3500);}
$('download').addEventListener('click',()=> {
  const oldSize = new THREE.Vector2(); renderer.getSize(oldSize);
  const ratio = oldSize.x / oldSize.y;
  renderer.setSize(2400,Math.round(2400/ratio),false); renderer.render(scene,camera);
  const output=document.createElement('canvas'); output.width=2400;output.height=Math.round(2400/ratio);
  const ctx=output.getContext('2d');
  ctx.fillStyle='#f0f0e7';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(renderer.domElement,0,0);
  ctx.fillStyle='#566044';ctx.textAlign='left';ctx.font='38px Georgia';ctx.fillText('A U R E L',95,105);
  ctx.font='22px Arial';ctx.fillText('THE SIGNATURE BAND',95,153);
  ctx.font='28px Georgia';ctx.fillText(comparing?'Yellow gold · Platinum · Rose gold':metals[metal].name,95,output.height-130);
  ctx.font='22px Arial';ctx.fillText(`${width} mm · High polish${engraving ? ' · “'+engraving+'”':''}`,95,output.height-87);
  const link=document.createElement('a');link.download='Aurel-Your-Signature-Band.png';link.href=output.toDataURL('image/png');link.click();
  renderer.setSize(oldSize.x,oldSize.y,false); toast('Your design has been saved. A little piece of forever.');
});
for(const id of ['story','appointment']) $(id).addEventListener('click',()=>$('info').showModal());
for(const id of ['close-info','dialog-save']) $(id).addEventListener('click',()=>$('info').close());

function resize(){const bounds=$('scene').getBoundingClientRect();renderer.setSize(bounds.width,bounds.height,false);camera.aspect=bounds.width/bounds.height;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('scene'));
rebuild();updateSummary();resize();
function animate(time){
  requestAnimationFrame(animate);
  if(viewTween){const t=Math.min((time-viewTween.start)/650,1);const ease=t*t*(3-2*t);camera.position.lerpVectors(viewTween.from,viewTween.to,ease);if(t===1)viewTween=null;}
  controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(animate);
