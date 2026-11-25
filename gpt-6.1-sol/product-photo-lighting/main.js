import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const viewport = document.querySelector('#viewport');
const preview = document.querySelector('#preview');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e8df');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
viewport.appendChild(renderer.domElement);
const shotRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
shotRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
shotRenderer.shadowMap.enabled = true;
shotRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
shotRenderer.toneMapping = THREE.ACESFilmicToneMapping;
shotRenderer.toneMappingExposure = 1.1;
preview.appendChild(shotRenderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnvironment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const shotEnvironment = new THREE.PMREMGenerator(shotRenderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = studioEnvironment;
const studioCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
studioCamera.position.set(7.6, 6.1, 8.9);
studioCamera.layers.enable(1);
const orbit = new OrbitControls(studioCamera, renderer.domElement);
orbit.target.set(0, 1.1, 0);
orbit.enableDamping = true;
orbit.minDistance = 5;
orbit.maxDistance = 17;
orbit.maxPolarAngle = Math.PI * 0.48;
const shotCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
const target = new THREE.Vector3(0, 0.88, 0);
scene.add(new THREE.HemisphereLight('#fff8e8', '#75816e', 0.25));
const guides = new THREE.Group();
scene.add(guides);
function editorLayer(object) { object.traverse(child => child.layers.set(1)); return object; }
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#dfe4d8', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.065;
ground.receiveShadow = true;
guides.add(ground);
const grid = new THREE.GridHelper(24, 48, '#b8c2ab', '#ced6c4');
grid.position.y = -0.055;
grid.material.opacity = 0.23;
grid.material.transparent = true;
guides.add(grid);
// The continuous floor-to-wall sweep has no visible horizon in the product shot.
const backdropMat = new THREE.MeshStandardMaterial({ color: '#d7c8b3', roughness: 0.96, side: THREE.DoubleSide });
const section = [[-6, 0], [1.5, 0]];
for (let i = 1; i <= 32; i++) { const angle = i / 32 * Math.PI / 2; section.push([1.5 + 1.7 * Math.sin(angle), 1.7 - 1.7 * Math.cos(angle)]); }
section.push([3.2, 7]);
const vertices = [], indices = [];
section.forEach(([z, y]) => vertices.push(-5, y - 0.025, -z, 5, y - 0.025, -z));
for (let i = 0; i < section.length - 1; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
const sweepGeo = new THREE.BufferGeometry();
sweepGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
sweepGeo.setIndex(indices); sweepGeo.computeVertexNormals();
const sweep = new THREE.Mesh(sweepGeo, backdropMat); sweep.receiveShadow = true; scene.add(sweep);

const ceramic = new THREE.MeshPhysicalMaterial({ color: '#eee8dc', roughness: 0.2, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.13, envMapIntensity: 0.28 });
const profile = [[0.0, 0.05], [.41, .05], [.48, .07], [.52, .13], [.55, .27], [.58, .53], [.61, .86], [.62, 1.23], [.615, 1.31], [.595, 1.34], [.565, 1.34], [.545, 1.31], [.55, 1.21], [.54, .88], [.51, .52], [.48, .23], [.43, .18], [0, .18]].map(p => new THREE.Vector2(...p));
const mug = new THREE.Group();
const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), ceramic);
body.castShadow = true; body.receiveShadow = true; mug.add(body);
const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(.52,1.09,0), new THREE.Vector3(.9,1.12,0), new THREE.Vector3(1.11,.91,0), new THREE.Vector3(1.1,.56,0), new THREE.Vector3(.88,.36,0), new THREE.Vector3(.54,.42,0)]);
const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 64, .095, 16, false), ceramic);
handle.castShadow = true; handle.receiveShadow = true; mug.add(handle);
mug.rotation.y = -0.16; scene.add(mug);
const foot = new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.045,64), ceramic); foot.position.y=.045; foot.castShadow=true; mug.add(foot);
const hardware = new THREE.MeshStandardMaterial({ color: '#3d443a', roughness: .65, metalness: .45 });
const panelMaterial = new THREE.MeshStandardMaterial({ color: '#fffcec', emissive: '#ffefd5', emissiveIntensity: .6, roughness: .8 });
const rigs = {};
function cylinderBetween(a, b, radius = .018, material = hardware) {
 const delta = new THREE.Vector3().subVectors(b,a); const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),10),material); mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return mesh;
}
function makeStand(group, height) {
 group.add(cylinderBetween(new THREE.Vector3(0,-height+.04,0), new THREE.Vector3(0,-.15,0),.022));
 for(let n=0;n<3;n++){const a=n*Math.PI*2/3;group.add(cylinderBetween(new THREE.Vector3(0,-height+.4,0),new THREE.Vector3(Math.cos(a)*.42,-height+.02,Math.sin(a)*.42),.018));}
}
function createLight(id, position, power, color) {
 const rig=new THREE.Group(); rig.position.copy(position); guides.add(rig);
 const panel=new THREE.Group(); rig.add(panel);
 const shell=new THREE.Mesh(new THREE.BoxGeometry(.91,1.13,.16),hardware); panel.add(shell);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.83,1.05),panelMaterial.clone()); face.position.z=.086; panel.add(face);
 for(let i=-1;i<=1;i++){const strip=new THREE.Mesh(new THREE.BoxGeometry(.83,.006,.005),new THREE.MeshBasicMaterial({color:'#dad9c9'}));strip.position.set(0,i*.27,.09);panel.add(strip);}
 const stand=new THREE.Group();rig.add(stand);
 const light=new THREE.SpotLight(color,power,20,Math.PI*.35,.85,2);light.position.copy(position);light.target.position.copy(target);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0004;light.shadow.normalBias=.025;light.shadow.radius=5;scene.add(light,light.target);
 rigs[id]={rig,panel,stand,light,power,initial:position.clone(),intensity:100}; updateRig(id);return rig;
}
function updateRig(id){const item=rigs[id];if(!item)return;if(item.panel)item.panel.lookAt(target);if(item.stand){item.stand.clear();makeStand(item.stand,item.rig.position.y);editorLayer(item.stand);}if(item.light){item.light.position.copy(item.rig.position);item.light.intensity=item.power*item.intensity/100;}if(id==='camera'){shotCamera.position.copy(item.rig.position);shotCamera.lookAt(target);item.rig.lookAt(target);}editorLayer(item.rig);}
createLight('key',new THREE.Vector3(-2.7,3.2,2.0),100,'#fff0da');
createLight('fill',new THREE.Vector3(2.8,2.4,.7),52,'#eef3ff');
const reflectorRig = new THREE.Group(); reflectorRig.position.set(-1.8,1.1,-.7);guides.add(reflectorRig);
const reflectorPanel = new THREE.Group();reflectorRig.add(reflectorPanel);
const reflectorMesh = new THREE.Mesh(new THREE.CircleGeometry(.68,64),new THREE.MeshStandardMaterial({color:'#f1f0dd',roughness:1,side:THREE.DoubleSide}));reflectorMesh.scale.y=1.2;reflectorPanel.add(reflectorMesh);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.68,.021,8,64),hardware);ring.scale.y=1.2;reflectorPanel.add(ring);
const reflectStand=new THREE.Group();reflectorRig.add(reflectStand);
const bounce=new THREE.PointLight('#fff4d7',7,5,2);scene.add(bounce);
rigs.reflector={rig:reflectorRig,panel:reflectorPanel,stand:reflectStand,light:bounce,power:7,intensity:100,initial:reflectorRig.position.clone()};updateRig('reflector');
const cameraRig=new THREE.Group();cameraRig.position.set(1.8,1.8,3.65);guides.add(cameraRig);
const cameraBox=new THREE.Mesh(new THREE.BoxGeometry(.48,.34,.3),hardware);cameraRig.add(cameraBox);
const lens=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.25,24),hardware);lens.rotation.x=Math.PI/2;lens.position.z=.24;cameraRig.add(lens);
const lensGlass=new THREE.Mesh(new THREE.CircleGeometry(.11,24),new THREE.MeshStandardMaterial({color:'#38584b',metalness:.8,roughness:.1}));lensGlass.position.z=.37;cameraRig.add(lensGlass);
rigs.camera={rig:cameraRig,initial:cameraRig.position.clone()};updateRig('camera');
const cameraStand=new THREE.Group();guides.add(cameraStand);
function updateCameraStand(){cameraStand.clear();cameraStand.position.copy(cameraRig.position);makeStand(cameraStand,cameraRig.position.y);editorLayer(cameraStand);}updateCameraStand();
editorLayer(guides);
const transform=new TransformControls(studioCamera,renderer.domElement);
transform.setSize(.75);transform.setSpace('world');transform.getRaycaster().layers.enable(1);scene.add(transform);transform.traverse(c=>c.layers.set(1));
let selected='key';let crop='square';let guidesVisible=true;
function syncInputs(){const obj=rigs[selected];['x','y','z'].forEach(axis=>document.querySelector(`#pos-${axis}`).value=obj.rig.position[axis].toFixed(1));document.querySelector('#power').value=obj.intensity??100;document.querySelector('#power-value').textContent=`${obj.intensity??100}%`;}
function select(id){selected=id;document.querySelectorAll('[data-object]').forEach(b=>b.classList.toggle('selected',b.dataset.object===id));document.querySelector('#selected-label').textContent=({key:'KEY LIGHT',fill:'FILL LIGHT',reflector:'REFLECTOR',camera:'CAMERA'})[id];document.querySelector('#light-settings').style.display=id==='camera'?'none':'block';transform.attach(rigs[id].rig);transform.visible=guidesVisible;syncInputs();}
transform.addEventListener('dragging-changed',event=>{orbit.enabled=!event.value;});
transform.addEventListener('objectChange',()=>{rigs[selected].rig.position.y=Math.max(.3,rigs[selected].rig.position.y);updateRig(selected);if(selected==='camera')updateCameraStand();syncInputs();});
document.querySelectorAll('[data-object]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.object)));
['x','y','z'].forEach(axis=>document.querySelector(`#pos-${axis}`).addEventListener('change',event=>{let value=Number(event.target.value);if(!Number.isFinite(value))return;if(axis==='y')value=Math.max(.3,value);rigs[selected].rig.position[axis]=THREE.MathUtils.clamp(value,-8,8);updateRig(selected);if(selected==='camera')updateCameraStand();syncInputs();}));
document.querySelector('#power').addEventListener('input',event=>{rigs[selected].intensity=Number(event.target.value);updateRig(selected);syncInputs();});
const raycaster=new THREE.Raycaster();raycaster.layers.set(1);const pointer=new THREE.Vector2();let pointerStart;
renderer.domElement.addEventListener('pointerdown',event=>{pointerStart=[event.clientX,event.clientY];});
renderer.domElement.addEventListener('pointerup',event=>{if(!pointerStart||Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>4||transform.dragging||!guidesVisible)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,studioCamera);const hits=raycaster.intersectObjects(Object.values(rigs).map(v=>v.rig),true);if(hits.length){let object=hits[0].object;while(object.parent&&!Object.values(rigs).some(v=>v.rig===object))object=object.parent;const id=Object.keys(rigs).find(id=>rigs[id].rig===object);if(id)select(id);}});
function resize(){const width=viewport.clientWidth,height=viewport.clientHeight;renderer.setSize(width,height);studioCamera.aspect=width/height;studioCamera.updateProjectionMatrix();const w=preview.clientWidth;const h=crop==='square'?w:w*1.25;shotRenderer.setSize(w,h);shotCamera.aspect=w/h;shotCamera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);new ResizeObserver(resize).observe(preview);
document.querySelectorAll('[data-crop]').forEach(button=>button.addEventListener('click',()=>{crop=button.dataset.crop;document.querySelectorAll('[data-crop]').forEach(b=>b.classList.toggle('active',b===button));preview.style.aspectRatio=crop==='square'?'1':'4 / 5';document.querySelector('#crop-caption').textContent=crop==='square'?'1:1':'4:5';document.querySelector('#export-size').textContent=crop==='square'?'2000 × 2000 px · PNG':'1600 × 2000 px · PNG';resize();}));
function setBackdrop(color,name){backdropMat.color.set(color);document.querySelector('.backdrop-name').textContent=name;document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color===color));document.querySelector('#custom-color').value=color;}
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>setBackdrop(b.dataset.color,b.dataset.name)));
document.querySelector('#custom-color').addEventListener('input',event=>setBackdrop(event.target.value,'Custom color'));
function resetView(){studioCamera.position.set(7.6,6.1,8.9);orbit.target.set(0,1.1,0);orbit.update();}
document.querySelector('#reset-view').addEventListener('click',resetView);
document.querySelector('#toggle-guides').addEventListener('click',event=>{guidesVisible=!guidesVisible;guides.visible=guidesVisible;transform.visible=guidesVisible;event.currentTarget.classList.toggle('active',guidesVisible);});
document.querySelector('#reset').addEventListener('click',()=>{Object.keys(rigs).forEach(id=>{rigs[id].rig.position.copy(rigs[id].initial);rigs[id].intensity=100;updateRig(id);});updateCameraStand();setBackdrop('#d7c8b3','Warm sand');document.querySelector('[data-crop="square"]').click();resetView();guidesVisible=true;guides.visible=true;document.querySelector('#toggle-guides').classList.add('active');select('key');showToast('Your starting setup is restored.');});
let toastTimer;function showToast(message){document.querySelector('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>document.querySelector('#toast').textContent='',4500);}
document.querySelectorAll('.export').forEach(button=>button.addEventListener('click',()=>{const w=crop==='square'?2000:1600,h=2000;const oldPixelRatio=shotRenderer.getPixelRatio();shotRenderer.setPixelRatio(1);shotRenderer.setSize(w,h,false);shotCamera.aspect=w/h;shotCamera.updateProjectionMatrix();scene.environment=shotEnvironment;shotRenderer.render(scene,shotCamera);shotRenderer.domElement.toBlob(blob=>{if(!blob){showToast('Export failed. Please try again.');return;}const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`stillroom-everyday-mug-${crop}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);showToast('Your finished shot is downloaded.');},'image/png');shotRenderer.setPixelRatio(oldPixelRatio);resize();}));
select('key');resize();
function animate(){requestAnimationFrame(animate);orbit.update();scene.environment=studioEnvironment;renderer.render(scene,studioCamera);scene.environment=shotEnvironment;shotRenderer.render(scene,shotCamera);}animate();
