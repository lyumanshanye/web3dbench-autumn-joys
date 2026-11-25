import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const host=document.querySelector('#desk'),note=document.querySelector('#desk-note');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);host.append(renderer.domElement);host.querySelector('.desk-fallback').remove();
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.1,50);camera.position.set(5.1,5.7,6.6);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.55,0);controls.enableZoom=false;controls.enablePan=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.25;controls.enableDamping=false;controls.autoRotate=false;
scene.add(new THREE.HemisphereLight(0xfff8e7,0x8c977d,2.2));const sun=new THREE.DirectionalLight(0xffeed7,3.2);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.025;scene.add(sun);
const objects=[];const mat=(c,r=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const wood=mat(0xb28558), edge=mat(0x98724d), cream=mat(0xe8ddbf), red=mat(0x9c4933), dark=mat(0x333e33), green=mat(0x6b8254), metal=mat(0xb28e50,.4);
function mesh(geometry,material,parent=scene){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(w,h,d,material,x,y,z,parent=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m}
function cylinder(rt,rb,h,material,x,y,z,parent=scene){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,48),material,parent);m.position.set(x,y,z);return m}
function lineBetween(a,b,r,material,parent=scene){const vec=new THREE.Vector3().subVectors(b,a);const m=mesh(new THREE.CylinderGeometry(r,r,vec.length(),12),material,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());return m}
const ground=mesh(new THREE.PlaneGeometry(200,200),mat(0xe9e8dd));ground.rotation.x=-Math.PI/2;ground.position.y=-.53;ground.castShadow=false;
// A miniature writing desk, with real depth and a deliberately quiet silhouette.
box(4,.18,2.45,wood,0,.5,0);box(3.86,.07,2.32,edge,0,.39,0);
for(const x of [-1.66,1.66])for(const z of [-.87,.87]){const leg=box(.14,.86,.14,dark,x,-.06,z);leg.rotation.z=x>0?-.035:.035;}
box(3.2,.1,.11,dark,0,-.28,-.87);
// Soft green desk mat.
box(2.13,.025,1.45,mat(0xa6ad8d),.03,.608,.12);
const notebook=new THREE.Group();notebook.position.set(-.26,.66,.3);notebook.rotation.y=-.14;scene.add(notebook);box(1.15,.07,.9,red,0,0,0,notebook);box(1.1,.045,.86,cream,0,.045,0,notebook);box(.52,.015,.85,mat(0xf2e9d4),-.275,.076,0,notebook);box(.52,.015,.85,mat(0xf5eedc),.275,.076,0,notebook);box(.012,.02,.85,mat(0xc4b59a),0,.078,0,notebook);
for(let i=0;i<7;i++){box(.36,.003,.007,mat(0xc5c0a7),-.28,.087,-.25+i*.065,notebook);box(.36,.003,.007,mat(0xc5c0a7),.28,.087,-.25+i*.065,notebook)}
const pencil=box(.035,.035,.73,mat(0xbb7d3c),.39,.13,.12,notebook);pencil.rotation.y=.25;
notebook.userData.note='The notebook: a place to begin, imperfectly.';objects.push(notebook);
// Coffee in a hand-thrown ceramic cup.
const mug=new THREE.Group();mug.position.set(1.13,.62,.45);scene.add(mug);cylinder(.22,.17,.36,cream,0,.18,0,mug);cylinder(.193,.193,.008,mat(0x53402b),0,.364,0,mug);const rim=mesh(new THREE.TorusGeometry(.209,.016,8,48),cream,mug);rim.rotation.x=Math.PI/2;rim.position.y=.365;const handle=mesh(new THREE.TorusGeometry(.13,.036,12,32),cream,mug);handle.position.set(.22,.2,0);handle.rotation.y=Math.PI/2;mug.userData.note='The coffee: best enjoyed away from the keyboard.';objects.push(mug);
// Little plant with modeled leaves.
const plant=new THREE.Group();plant.position.set(1.35,.6,-.75);scene.add(plant);cylinder(.25,.17,.4,red,0,.2,0,plant);cylinder(.22,.22,.02,mat(0x504733),0,.4,0,plant);cylinder(.266,.266,.065,red,0,.38,0,plant);
for(let i=0;i<9;i++){const angle=i*2.4;const length=.35+(i%3)*.13;const start=new THREE.Vector3(0,.4,0);const tip=new THREE.Vector3(Math.cos(angle)*length,.65+(i%3)*.17,Math.sin(angle)*length*.7);lineBetween(start,tip,.012,dark,plant);const leaf=mesh(new THREE.SphereGeometry(1,16,10),i%2?green:mat(0x899760),plant);leaf.scale.set(.13,.27,.035);leaf.position.copy(tip);leaf.rotation.set(.3,angle,Math.cos(angle)*.65)}plant.userData.note='The plant: still here, despite my best intentions.';objects.push(plant);
// An articulated brass task lamp, with a warm underside.
const lamp=new THREE.Group();lamp.position.set(-1.32,.6,-.63);scene.add(lamp);cylinder(.35,.39,.065,dark,0,.032,0,lamp);lineBetween(new THREE.Vector3(0,.08,0),new THREE.Vector3(0,1.04,0),.035,metal,lamp);cylinder(.065,.065,.08,dark,0,1.04,0,lamp).rotation.z=Math.PI/2;lineBetween(new THREE.Vector3(0,1.04,0),new THREE.Vector3(.5,1.44,0),.035,metal,lamp);const shade=mesh(new THREE.ConeGeometry(.32,.32,48,1,true),dark,lamp);shade.position.set(.53,1.36,0);shade.rotation.z=-.3;const lampInside=cylinder(.28,.28,.015,mat(0xf2d29a),.58,1.21,0,lamp);lampInside.rotation.z=-.3;
// A small stack of well-loved books and a loose note.
const books=new THREE.Group();books.position.set(-.65,.65,-.73);books.rotation.y=.1;scene.add(books);box(.85,.11,.53,mat(0xc2bb94),0,0,0,books);box(.79,.065,.49,cream,0,.09,0,books);box(.85,.025,.53,mat(0x455c52),0,.14,0,books);box(.72,.09,.45,mat(0x9e674e),.04,.2,.02,books);
const noteCard=box(.4,.007,.31,mat(0xe9ce8d),.64,.637,-.21);noteCard.rotation.y=.15;
function render(){renderer.render(scene,camera)}controls.addEventListener('change',render);
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render()};new ResizeObserver(resize).observe(host);controls.update();resize();
let turning=false;document.querySelector('#rotate-desk').addEventListener('click',()=>{if(turning)return;const offset=camera.position.clone().sub(controls.target);const start=Math.atan2(offset.x,offset.z),radius=Math.hypot(offset.x,offset.z);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const duration=reduced?0:650;const began=performance.now();turning=true;function turn(now){const progress=duration?Math.min(1,(now-began)/duration):1;const eased=progress*progress*(3-2*progress);const angle=start+Math.PI/3*eased;camera.position.x=controls.target.x+Math.sin(angle)*radius;camera.position.z=controls.target.z+Math.cos(angle)*radius;controls.update();render();if(progress<1)requestAnimationFrame(turn);else turning=false}requestAnimationFrame(turn)});
let down;host.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY}});host.addEventListener('pointerup',event=>{if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)return;const bounds=host.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const hit=ray.intersectObjects(objects,true)[0];if(hit){let object=hit.object;while(object&&!object.userData.note)object=object.parent;if(object)note.textContent=object.userData.note}});
const objectNav=document.createElement('div');objectNav.className='desk-objects';objectNav.setAttribute('aria-label','Explore objects on Maya’s desk');objects.forEach((object,index)=>{const b=document.createElement('button');b.textContent=['Notebook','Coffee','Plant'][index];b.addEventListener('click',()=>{note.textContent=object.userData.note;objectNav.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});b.setAttribute('aria-pressed','false');objectNav.append(b)});host.after(objectNav);
