import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.querySelector('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
host.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; controls.enablePan = false;
controls.enableDamping = true; controls.dampingFactor = .06;
controls.minPolarAngle = .45; controls.maxPolarAngle = 2.5;
controls.autoRotate = true; controls.autoRotateSpeed = .38;
controls.addEventListener('start', () => { controls.autoRotate = false; });
const ambient = new THREE.HemisphereLight(0xffffff, 0x50392a, 2.8); scene.add(ambient);
function light(color, intensity, position, size) {const l = new THREE.DirectionalLight(color,intensity);l.position.set(...position);scene.add(l);return l;}
const key=light(0xfff5de,4,[2,6,5]);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;
light(0xd1e0ff,2.5,[-4,2,-2]);light(0xffffff,3,[1,1,-4]);
const shell = new THREE.MeshStandardMaterial({color:0x181a1c,roughness:.3,metalness:.48});
const rim = new THREE.MeshStandardMaterial({color:0x343638,roughness:.25,metalness:.75});
const leather = new THREE.MeshStandardMaterial({color:0x101112,roughness:.9,metalness:0});
const softLeather = new THREE.MeshStandardMaterial({color:0x181a1a,roughness:.7});
const metal = new THREE.MeshStandardMaterial({color:0x9faaa9,roughness:.22,metalness:.95});
const grill = new THREE.MeshStandardMaterial({color:0x080909,roughness:.95});
const model = new THREE.Group();scene.add(model);
function mesh(geo,mat,parent=model){const o=new THREE.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(radius,depth,mat,parent){const o=mesh(new THREE.CylinderGeometry(radius,radius,depth,80),mat,parent);o.rotation.x=Math.PI/2;return o;}
// The continuous arched band has a broad solid profile and padded underside.
function bandShape(outerX,outerY,innerX,innerY){const s=new THREE.Shape();s.absellipse(0,.1,outerX,outerY,0,Math.PI,false,0);s.lineTo(-innerX,.1);s.absellipse(0,.1,innerX,innerY,Math.PI,0,true,0);s.closePath();return s;}
const band=mesh(new THREE.ExtrudeGeometry(bandShape(1.45,1.72,1.25,1.5),{depth:.38,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.045,bevelThickness:.045,curveSegments:72}),shell);band.position.z=-.19;
const padding=mesh(new THREE.ExtrudeGeometry(bandShape(1.27,1.51,1.16,1.4),{depth:.28,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.04,bevelThickness:.04,curveSegments:72}),softLeather);padding.position.z=-.14;
for(const side of [-1,1]){
  const stem=mesh(new THREE.BoxGeometry(.13,.65,.12),metal);stem.position.set(side*1.33,-.06,0);stem.rotation.z=-side*.13;
  const end=mesh(new THREE.CapsuleGeometry(.12,.37,8,20),shell);end.position.set(side*1.41,.03,0);end.rotation.z=-side*.12;
  const cup=new THREE.Group();cup.position.set(side*1.24,-.59,.02);cup.rotation.y=side*-.25;cup.rotation.z=side*-.13;model.add(cup);
  const housing=cylinder(.64,.33,shell,cup);housing.scale.y=1.29;
  const seam=cylinder(.651,.045,rim,cup);seam.position.z=.175;seam.scale.y=1.29;
  const face=cylinder(.62,.065,shell,cup);face.position.z=.21;face.scale.y=1.29;
  const rear=cylinder(.61,.09,shell,cup);rear.position.z=-.19;rear.scale.y=1.29;
  const cushion=mesh(new THREE.TorusGeometry(.475,.145,24,90),leather,cup);cushion.scale.y=1.36;cushion.position.z=-.3;
  const inner=cylinder(.405,.018,grill,cup);inner.position.z=-.315;inner.scale.y=1.4;
  // Small, evenly spaced perforations give the acoustic mesh real geometry.
  const dotGeometry=new THREE.CircleGeometry(.009,5);
  for(let y=-.45;y<=.45;y+=.065){for(let x=-.28;x<=.28;x+=.058){if(x*x/(.34*.34)+y*y/(.54*.54)<1){const dot=mesh(dotGeometry,rim,cup);dot.position.set(x,y,-.328);dot.rotation.y=Math.PI;}}}
  const hinge=cylinder(.14,.15,rim,cup);hinge.position.set(0,.63,.04);hinge.scale.y=1;
  // Discreet embossed logo on the earcup face.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#a1a5a3';ctx.font='500 50px Arial';ctx.textAlign='center';ctx.fillText('F Ø R M',256,270);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const logo=mesh(new THREE.PlaneGeometry(.62,.62),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.8,depthWrite:false}),cup);logo.position.z=.246;
  if(side===1){
    for(let j=0;j<3;j++){const button=mesh(new THREE.CapsuleGeometry(.025,.09,4,8),rim,cup);button.position.set(.52,-.2+j*.15,.03);}
    const port=mesh(new THREE.BoxGeometry(.12,.025,.015),grill,cup);port.position.set(.22,-.73,.17);
    const led=mesh(new THREE.SphereGeometry(.014,10,10),new THREE.MeshBasicMaterial({color:0xd0f6a8}),cup);led.position.set(.4,-.55,.23);
  }
}
model.rotation.set(-.10,-.45,-.16);
const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-2.25;floor.castShadow=false;
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;const mobile=innerWidth<651;camera.position.set(mobile?0:3.5,mobile?1.8:2.8,mobile?9.4:11.6);controls.target.set(mobile?0:-1.45,.1,0);camera.lookAt(controls.target);controls.update();}
new ResizeObserver(resize).observe(host);resize();
let t=0;
renderer.setAnimationLoop(()=>{t+=.01;model.position.y=Math.sin(t*.6)*.045;controls.update();renderer.render(scene,camera);});
document.querySelector('#reset').onclick=()=>{controls.autoRotate=true;resize();};
let finish='Obsidian';let hasItem=false;
document.querySelectorAll('.swatch').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('active'));button.classList.add('active');
  finish=button.dataset.finish;document.querySelector('#finish-name').textContent=finish.toUpperCase();
  shell.color.set(button.dataset.color);rim.color.set(button.dataset.color).multiplyScalar(finish==='Obsidian'?1.7:.8);
  leather.color.set(finish==='Chalk'?'#c2bcae':finish==='Ultramarine'?'#101a4b':'#101112');
  softLeather.color.copy(leather.color);
}));
let toastTimer;
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
const cart=document.querySelector('#cart');
function updateCart(){document.querySelector('#bag-count').textContent=hasItem?'1':'0';document.querySelector('.cart-item').style.display=hasItem?'flex':'none';document.querySelector('#cart-empty').style.display=hasItem?'none':'block';document.querySelector('#remove').style.display=hasItem?'inline':'none';document.querySelector('#subtotal').textContent=hasItem?'$299':'$0';document.querySelector('#checkout').disabled=!hasItem;document.querySelector('#checkout').style.opacity=hasItem?'1':'.4';}
document.querySelector('#purchase').onclick=()=>{hasItem=true;document.querySelector('#cart-finish').textContent=finish;updateCart();toast(`FORM / 01 in ${finish} added to your bag.`);};
document.querySelector('#bag').onclick=()=>{updateCart();cart.showModal();};
document.querySelector('#close-cart').onclick=()=>cart.close();
cart.addEventListener('click',e=>{if(e.target===cart){const r=cart.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cart.close();}});
document.querySelector('#remove').onclick=()=>{hasItem=false;updateCart();};
document.querySelector('#checkout').onclick=()=>toast('This is a product concept. No payment will be collected.');
let audioContext, oscillators=[], playing=false;
document.querySelector('#listen').onclick=async()=>{
  if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
  await audioContext.resume();playing=!playing;
  if(playing){const master=audioContext.createGain();master.gain.setValueAtTime(0,audioContext.currentTime);master.gain.linearRampToValueAtTime(.028,audioContext.currentTime+.8);master.connect(audioContext.destination);[110,164.81,220,277.18,329.63].forEach((f,i)=>{const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=i*1.3;o.connect(master);o.start();oscillators.push(o);});}
  else{oscillators.forEach(o=>o.stop());oscillators=[];}
  document.querySelector('#listen').classList.toggle('playing',playing);document.querySelector('#play-icon').textContent=playing?'Ⅱ':'▶';document.querySelector('#listen-label').textContent=playing?'PAUSE THE EXPERIENCE':'EXPERIENCE THE FREQUENCY';
};
