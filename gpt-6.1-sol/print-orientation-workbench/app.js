import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const $ = id => document.getElementById(id);
const host = $('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef2eb');
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4000);
camera.up.set(0, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'Orbitable 3D part on a 220 millimeter printer bed');
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 35;
controls.maxDistance = 1400;
controls.maxPolarAngle = Math.PI * 0.92;
controls.target.set(110, 110, 30);
camera.position.set(420, -360, 335);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9da58f, 2.6));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(80, -100, 400);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, { left: -240, right: 240, top: 240, bottom: -240, near: 1, far: 900 });
light.shadow.normalBias = 0.3;
scene.add(light);
scene.add(light.target);
light.target.position.set(110, 110, 0);
const bed = new THREE.Mesh(new THREE.BoxGeometry(220, 220, 3), new THREE.MeshStandardMaterial({color: 0xe0e7d7, roughness: 0.9}));
bed.position.set(110, 110, -1.65);
bed.receiveShadow = true;
scene.add(bed);
const gridPositions = [];
for (let n=0;n<=220;n+=10) gridPositions.push(n,0,0.03,n,220,0.03,0,n,0.03,220,n,0.03);
const gridGeometry = new THREE.BufferGeometry();
gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions,3));
scene.add(new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({color:0xa8b99c,transparent:true,opacity:0.4})));
const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(220,220,250));
const frame = new THREE.LineSegments(frameGeometry,new THREE.LineBasicMaterial({color:0xa6b59b,transparent:true,opacity:0.45}));
frame.position.set(110,110,125);scene.add(frame);
const bedOutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(220,220,0.1)),new THREE.LineBasicMaterial({color:0x8c9f7c}));
bedOutline.position.set(110,110,0);scene.add(bedOutline);
function label(text, x,y,z) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.font='24px sans-serif';ctx.fillStyle='#8e9e81';ctx.textAlign='center';ctx.fillText(text,128,38);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(43,11,1);scene.add(sprite);
}
label('220 mm',110,-14,0);label('220 mm',237,110,0);label('250 mm',-12,220,130);
// The ground is deliberately separate from the printable build surface.
const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0xeef2e9,roughness:1}));ground.position.z=-4;ground.receiveShadow=true;scene.add(ground);

function bracketGeometry() {
  const shape=new THREE.Shape();shape.moveTo(-24,-22);shape.lineTo(24,-22);shape.lineTo(24,40);shape.lineTo(-24,40);shape.closePath();
  const hole=new THREE.Path();hole.absarc(0,21,6.5,0,Math.PI*2,true);shape.holes.push(hole);
  const base=new THREE.ExtrudeGeometry(shape,{depth:8,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:0.7,bevelThickness:0.7,curveSegments:40});base.translate(0,0,0.7);
  const wall=new THREE.BoxGeometry(48,8,60);wall.translate(0,-18,34);
  const lip=new THREE.BoxGeometry(48,29,8);lip.translate(0,-7.5,64);
  const geometries=[base,wall.toNonIndexed(),lip.toNonIndexed()];const all=[];
  for(const geometry of geometries){all.push(...geometry.attributes.position.array);geometry.dispose();}
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(all,3));result.computeVertexNormals();return result;
}
const uniforms={overhangEnabled:{value:true},angle:{value:Math.sin(Math.PI/4)},sectionEnabled:{value:false},sectionHeight:{value:34}};
const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,vertexShader:`
varying vec3 worldPosition; varying vec3 faceNormal; varying float onBed;
attribute float bedContact;
void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPosition=p.xyz;faceNormal=normalize(mat3(modelMatrix)*normal);onBed=bedContact;gl_Position=projectionMatrix*viewMatrix*p;}`,
fragmentShader:`
uniform bool overhangEnabled; uniform float angle; uniform bool sectionEnabled; uniform float sectionHeight;
varying vec3 worldPosition; varying vec3 faceNormal; varying float onBed;
void main(){if(sectionEnabled&&worldPosition.z>sectionHeight)discard;
vec3 n=normalize(faceNormal);vec3 color=vec3(.28,.49,.39);
if(overhangEnabled&&n.z < -angle&&onBed<.5) color=vec3(.84,.60,.25);
if(worldPosition.x<-.01||worldPosition.x>220.01||worldPosition.y<-.01||worldPosition.y>220.01||worldPosition.z<-.01||worldPosition.z>250.01)color=vec3(.85,.30,.23);
float light=.52+.48*max(dot(n,normalize(vec3(-.45,-.65,1.0))),0.0);color*=light;gl_FragColor=vec4(color,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
let mesh, originalGeometry, bounds=new THREE.Box3(), currentName='L-bracket.stl', transforms={x:0,y:0,z:0,scale:1,px:110,py:110,pz:0};
const sectionMaterial=new THREE.LineBasicMaterial({color:0xdca34d,depthTest:false});
const sectionLines=new THREE.LineSegments(new THREE.BufferGeometry(),sectionMaterial);sectionLines.renderOrder=5;sectionLines.visible=false;scene.add(sectionLines);
const sectionPlane=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshBasicMaterial({color:0xdfbf70,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false}));sectionPlane.position.set(110,110,34);sectionPlane.visible=false;scene.add(sectionPlane);
const planeEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(220,220)),new THREE.LineBasicMaterial({color:0xc6aa68,transparent:true,opacity:.65}));planeEdge.position.set(110,110,34);planeEdge.visible=false;scene.add(planeEdge);
function syncInputs(){for(const axis of ['x','y','z']) $('r'+axis).value=Number(transforms[axis].toFixed(3));$('scale').value=Number((transforms.scale*100).toFixed(3));for(const axis of ['x','y','z']) $('p'+axis).value=Number(transforms['p'+axis].toFixed(3));}
function bakedGeometry(){mesh.updateMatrixWorld(true);return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);}
function updateSection(){
  const enabled=$('section').checked,h=Number($('section-height').value);uniforms.sectionEnabled.value=enabled;uniforms.sectionHeight.value=h;
  $('section-value').textContent=h.toFixed(1);sectionPlane.visible=enabled;planeEdge.visible=enabled;sectionLines.visible=enabled;sectionPlane.position.z=h;planeEdge.position.z=h;
  if(!mesh||!enabled)return;
  const geometry=bakedGeometry(),p=geometry.attributes.position,lines=[],v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  for(let i=0;i<p.count;i+=3){for(let j=0;j<3;j++)v[j].fromBufferAttribute(p,i+j);const hits=[];
    for(let j=0;j<3;j++){const a=v[j],b=v[(j+1)%3],da=a.z-h,db=b.z-h;if((da<=0&&db>0)||(db<=0&&da>0)){const t=da/(da-db);hits.push(a.clone().lerp(b,t));}}
    if(hits.length===2)lines.push(hits[0].x,hits[0].y,h+.02,hits[1].x,hits[1].y,h+.02);
  }
  sectionLines.geometry.dispose();sectionLines.geometry=new THREE.BufferGeometry();sectionLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));geometry.dispose();
}
function update(){
  if(!mesh)return;
  mesh.rotation.set(...['x','y','z'].map(a=>THREE.MathUtils.degToRad(transforms[a])),'XYZ');mesh.scale.setScalar(transforms.scale);mesh.position.set(transforms.px,transforms.py,transforms.pz);mesh.updateMatrixWorld(true);
  const geometry=bakedGeometry();geometry.computeBoundingBox();bounds.copy(geometry.boundingBox);const size=bounds.getSize(new THREE.Vector3());
  ['width','depth','height'].forEach((id,i)=>$(id).innerHTML=`${[size.x,size.y,size.z][i].toFixed(1)} <small>mm</small>`);
  const fits=bounds.min.x>=-.01&&bounds.min.y>=-.01&&bounds.min.z>=-.01&&bounds.max.x<=220.01&&bounds.max.y<=220.01&&bounds.max.z<=250.01;
  $('fit-card').classList.toggle('bad',!fits);$('fit-card').querySelector('.check-icon').textContent=fits?'✓':'!';$('fit-title').textContent=fits?'Fits the build volume':'Outside the build volume';$('fit-description').textContent=fits?'Your part is within the printer limits.':'Red areas exceed the printer limits.';
  const p=geometry.attributes.position,flags=new Float32Array(p.count),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();let overhangArea=0,totalArea=0;
  for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);normal.crossVectors(b.clone().sub(a),c.clone().sub(a));const area=normal.length()/2;normal.normalize();const contact=Math.max(Math.abs(a.z),Math.abs(b.z),Math.abs(c.z))<=.08;flags[i]=flags[i+1]=flags[i+2]=contact?1:0;totalArea+=area;if(!contact&&normal.z < -uniforms.angle.value)overhangArea+=area;}
  mesh.geometry.setAttribute('bedContact',new THREE.Float32BufferAttribute(flags,1));
  $('overhang-count').textContent=overhangArea>0?`${(100*overhangArea/totalArea).toFixed(1)}% of surface flagged`:'No unsupported downward faces';
  geometry.dispose();updateSection();
}
function loadGeometry(geometry,name,sample=false){
  if(geometry.index){const unindexed=geometry.toNonIndexed();geometry.dispose();geometry=unindexed;}
  geometry.computeVertexNormals();geometry.computeBoundingBox();
  if(!geometry.attributes.position?.count||geometry.attributes.position.count%3!==0||geometry.attributes.position.count<3)throw new Error('No valid triangles found.');
  const p=geometry.attributes.position;for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))throw new Error('Invalid coordinates in STL.');
  const size=geometry.boundingBox.getSize(new THREE.Vector3());if(size.length()===0)throw new Error('The STL contains no measurable geometry.');
  if(mesh){scene.remove(mesh);mesh.geometry.dispose();originalGeometry.dispose();}
  originalGeometry=geometry.clone();mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;scene.add(mesh);
  transforms={x:0,y:0,z:0,scale:1,px:sample?110:0,py:sample?110:0,pz:0};currentName=name;$('filename').textContent=name;$('filemeta').textContent=sample?'Procedural sample · ready to explore':`${(p.count/3).toLocaleString()} triangles · STL in millimeters`;
  syncInputs();update();$('message').classList.remove('error');$('message').textContent=sample?'A little bracket. Lots of possibilities.':'Imported locally. Original STL coordinates preserved.';
}
loadGeometry(bracketGeometry(),'L-bracket.stl',true);
for(const axis of ['x','y','z']){
  $('r'+axis).addEventListener('input',()=>{const value=Number($('r'+axis).value);if(Number.isFinite(value)){transforms[axis]=value;update();}});
  $('p'+axis).addEventListener('input',()=>{const value=Number($('p'+axis).value);if(Number.isFinite(value)){transforms['p'+axis]=value;update();}});
}
document.querySelectorAll('[data-rotate]').forEach(button=>button.onclick=()=>{transforms[button.dataset.rotate]+=90;syncInputs();update();});
$('scale').addEventListener('input',()=>{const value=Number($('scale').value);if(value>0&&Number.isFinite(value)){transforms.scale=value/100;update();}});
$('place').onclick=()=>{transforms.pz-=bounds.min.z;syncInputs();update();$('message').textContent='Lowest point placed at Z = 0 mm.';};
$('reset').onclick=()=>{transforms={x:0,y:0,z:0,scale:1,px:currentName==='L-bracket.stl'&&$('filemeta').textContent.startsWith('Procedural')?110:0,py:currentName==='L-bracket.stl'&&$('filemeta').textContent.startsWith('Procedural')?110:0,pz:0};syncInputs();update();$('message').textContent='Restored the initially loaded part.';};
$('overhang').onchange=()=>{uniforms.overhangEnabled.value=$('overhang').checked;};
$('angle').oninput=()=>{$('angle-value').textContent=$('angle').value;uniforms.angle.value=Math.sin(THREE.MathUtils.degToRad(Number($('angle').value)));update();};
$('section').onchange=updateSection;$('section-height').oninput=updateSection;
function cameraView(view){const center=new THREE.Vector3(110,110,50);controls.target.copy(center);camera.up.set(0,0,1);const offsets={orbit:[310,-470,285],front:[0,-540,0],side:[540,0,0],top:[0,0,540]};if(view==='top')camera.up.set(0,1,0);camera.position.copy(center).add(new THREE.Vector3(...offsets[view]));controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>cameraView(button.dataset.view));
controls.addEventListener('start',()=>document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active')));
async function importFile(file){if(!file)return;try{const data=await file.arrayBuffer();if(data.byteLength<15)throw new Error('File is too short.');const geometry=new STLLoader().parse(data);loadGeometry(geometry,file.name);$('file').value='';}catch(error){$('message').classList.add('error');$('message').textContent='Could not read this STL. Your current part is still here.';console.warn('STL import failed:',error.message);}}
$('file').onchange=()=>importFile($('file').files[0]);const drop=document.querySelector('.upload');for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('drag');});for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('drag');});drop.addEventListener('drop',e=>importFile(e.dataTransfer.files[0]));
$('export').onclick=()=>{const geometry=bakedGeometry();const exportMesh=new THREE.Mesh(geometry);const data=new STLExporter().parse(exportMesh,{binary:true});const url=URL.createObjectURL(new Blob([data],{type:'model/stl'}));const link=document.createElement('a');link.href=url;link.download=currentName.replace(/\.stl$/i,'')+'-prepared.stl';link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);geometry.dispose();$('message').classList.remove('error');$('message').textContent='STL exported with current transforms baked in.';};
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
