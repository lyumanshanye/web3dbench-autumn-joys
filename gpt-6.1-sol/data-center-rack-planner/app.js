import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const catalog = [
  {type:'Patch panel',height:1,power:0,icon:'▤',description:'Organize connections with a 24-port patch panel.'},
  {type:'Network switch',height:1,power:150,icon:'▦',description:'Connect your infrastructure with a managed network switch.'},
  {type:'Compute server',height:2,power:500,icon:'▣',description:'General-purpose compute for your production workloads.'},
  {type:'Storage array',height:4,power:800,icon:'▥',description:'High-capacity storage for your growing data needs.'},
  {type:'Blank panel',height:1,power:0,icon:'▬',description:'Close unused spaces to improve rack airflow.'}
];
const initial = [
  {id:'a1',rack:'A',start:40,type:'Patch panel'}, {id:'a2',rack:'A',start:39,type:'Network switch'},
  {id:'a3',rack:'A',start:35,type:'Compute server'}, {id:'a4',rack:'A',start:32,type:'Compute server'},
  {id:'a5',rack:'A',start:29,type:'Compute server'}, {id:'a6',rack:'A',start:19,type:'Blank panel'},
  {id:'a7',rack:'A',start:5,type:'Storage array'},
  {id:'b1',rack:'B',start:40,type:'Patch panel'}, {id:'b2',rack:'B',start:39,type:'Network switch'},
  {id:'b3',rack:'B',start:35,type:'Network switch'}, {id:'b4',rack:'B',start:25,type:'Compute server'},
  {id:'b5',rack:'B',start:15,type:'Storage array'}, {id:'b6',rack:'B',start:6,type:'Storage array'}
];
const key='rackspace-plan-v1';
const spec = device => catalog.find(item => item.type===device.type);
function validPlan(value){return Array.isArray(value)&&value.every((device,i)=>{const s=spec(device);return s&&typeof device.id==='string'&&['A','B'].includes(device.rack)&&Number.isInteger(device.start)&&device.start>=1&&device.start+s.height-1<=42&&!value.slice(0,i).some(other=>other.id===device.id||(other.rack===device.rack&&device.start<other.start+spec(other).height&&device.start+s.height>other.start));});}
let devices = structuredClone(initial);
try {const saved=JSON.parse(localStorage.getItem(key));if(validPlan(saved))devices=saved;}catch{}
let selected=devices.find(d=>d.type==='Compute server')?.id||devices[0]?.id||null;
let adding=null, inventoryRack='A', error='', view='front';
const $=selector=>document.querySelector(selector);
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function save(){try{localStorage.setItem(key,JSON.stringify(devices));$('#save-status').textContent='● All changes saved locally';}catch{$('#save-status').textContent='Storage unavailable';toast('Browser storage unavailable. Export CSV to keep your plan.');}}
function validation(candidate){const s=spec(candidate);if(!Number.isInteger(candidate.start)||candidate.start<1||candidate.start+s.height-1>42)return `Choose a starting unit between 1 and ${43-s.height}. This device needs ${s.height} consecutive unit${s.height>1?'s':''}.`;const conflict=devices.find(d=>d.id!==candidate.id&&d.rack===candidate.rack&&candidate.start<d.start+spec(d).height&&candidate.start+s.height>d.start);if(conflict)return `Units overlap with ${conflict.type} at U${conflict.start}. Choose free units; the existing layout has been preserved.`;return '';}
function firstFree(rack,height){for(let start=1;start<=43-height;start++){if(!devices.some(d=>d.rack===rack&&start<d.start+spec(d).height&&start+height>d.start))return start;}return 1;}
function choose(id){selected=id;adding=null;error='';inventoryRack=devices.find(d=>d.id===id)?.rack||inventoryRack;renderUI();rebuildEquipment();}
function renderUI(){
 $('#catalog').innerHTML=catalog.map(item=>`<button class="catalog-item ${adding===item.type?'active':''}" data-type="${item.type}"><span class="equipment-icon">${item.icon}</span><span><strong>${item.type}</strong><small>${item.height}U <span style="margin:0 5px;color:#c4c2ce">·</span> ${item.power} W</small></span><span class="plus">+</span></button>`).join('');
 document.querySelectorAll('[data-type]').forEach(button=>button.onclick=()=>{adding=button.dataset.type;selected=null;error='';renderUI();rebuildEquipment();});
 document.querySelectorAll('[data-inventory]').forEach(button=>{button.classList.toggle('active',button.dataset.inventory===inventoryRack);button.onclick=()=>{inventoryRack=button.dataset.inventory;renderUI();};});
 const inventory=devices.filter(d=>d.rack===inventoryRack).sort((a,b)=>b.start-a.start);
 $('#device-count').textContent=inventory.length;
 $('#inventory').innerHTML=inventory.map(d=>`<button class="inventory-row ${selected===d.id?'active':''}" data-id="${d.id}"><span class="unit-badge">U${String(d.start).padStart(2,'0')}</span><span>${d.type}</span><span style="margin-left:auto;color:#b1a9c5">${spec(d).height}U</span></button>`).join('')||'<p class="small muted">No equipment in this rack.</p>';
 document.querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>choose(button.dataset.id));
 $('#summaries').innerHTML=['A','B'].map(rack=>{const list=devices.filter(d=>d.rack===rack),occupied=list.reduce((n,d)=>n+spec(d).height,0),power=list.reduce((n,d)=>n+spec(d).power,0);return `<div class="summary ${power>3000?'warning':''}"><div class="summary-title"><strong>Rack ${rack}</strong><span class="normal-badge">${power>3000?'⚠ Power exceeded':'● Within budget'}</span></div><div class="capacity-line"><strong>${occupied}</strong> / 42U occupied <span>${42-occupied}U free</span></div><div class="progress"><i style="width:${occupied/42*100}%"></i></div><div class="power-line"><span>ϟ Estimated power</span><strong>${power.toLocaleString()} <span style="color:#b0aebc">/ 3,000 W</span></strong></div>${power>3000?`<div class="error">${(power-3000).toLocaleString()} W over the rack budget</div>`:''}</div>`;}).join('');
 const d=devices.find(d=>d.id===selected);const s=adding?catalog.find(s=>s.type===adding):d?spec(d):null;
 $('#inspector-heading').textContent=adding?'Place equipment':'Equipment details';
 if(!s){$('#inspector-content').innerHTML='<div class="detail-icon">▤</div><h3 class="detail-title">Your next deployment</h3><p class="detail-description">Select a device in the scene or inventory, or add one from the equipment library.</p>';return;}
 $('#inspector-content').innerHTML=`<div class="detail-icon">${s.icon}</div><h3 class="detail-title">${s.type}</h3><p class="detail-description">${s.description}</p><div class="detail-specs"><div><span>RACK HEIGHT</span><strong>${s.height}U</strong></div><div><span>EST. POWER</span><strong>${s.power} <small>W</small></strong></div></div><form id="placement-form"><label class="form-label" for="rack-input">RACK LOCATION</label><select id="rack-input" class="input"><option value="A">Rack A · Production compute</option><option value="B">Rack B · Network & storage</option></select><label class="form-label" for="unit-input">STARTING UNIT</label><input class="input" id="unit-input" type="number" min="1" max="${43-s.height}" required value="${d?d.start:firstFree(inventoryRack,s.height)}"><div class="unit-help" id="unit-help"></div><div id="placement-error" role="alert">${error?`<div class="error">${error}</div>`:''}</div><button class="primary" type="submit">${adding?'+ Add to rack':'Apply placement'} <span style="float:right">→</span></button>${adding?'<button type="button" id="cancel" class="remove">Cancel placement</button>':'<button type="button" id="remove" class="remove">⌫ &nbsp; Remove equipment</button>'}</form>`;
 $('#rack-input').value=d?d.rack:inventoryRack;
 function updateHelp(){const start=Number($('#unit-input').value);$('#unit-help').textContent=`Occupies U${start}–U${start+s.height-1} · ${s.height} rack unit${s.height>1?'s':''}`;}
 updateHelp();$('#unit-input').oninput=updateHelp;
 $('#placement-form').onsubmit=event=>{event.preventDefault();const candidate={id:d?d.id:crypto.randomUUID(),rack:$('#rack-input').value,start:Number($('#unit-input').value),type:s.type};const message=validation(candidate);if(message){error=message;$('#placement-error').innerHTML=`<div class="error">${message}</div>`;toast('Placement rejected — choose free rack units.');return;}if(d)devices=devices.map(old=>old.id===d.id?candidate:old);else devices.push(candidate);selected=candidate.id;inventoryRack=candidate.rack;adding=null;error='';save();renderUI();rebuildEquipment();toast(d?'Equipment placement updated':'Equipment added to rack');};
 if($('#remove'))$('#remove').onclick=()=>{devices=devices.filter(item=>item.id!==selected);selected=null;error='';save();renderUI();rebuildEquipment();toast('Equipment removed');};
 if($('#cancel'))$('#cancel').onclick=()=>{adding=null;error='';renderUI();rebuildEquipment();};
}

// Every rack unit, equipment body, connector and rail is rendered in the 3D scene.
const container=$('#scene');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.1,80);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;container.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.43,0);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=17;controls.maxPolarAngle=Math.PI/2.04;controls.minPolarAngle=.3;controls.enablePan=false;
scene.add(new THREE.HemisphereLight(0xf6f5ff,0x66707f,3));const keyLight=new THREE.DirectionalLight(0xffffff,5);keyLight.position.set(-3,8,5);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-6;keyLight.shadow.camera.right=6;keyLight.shadow.camera.top=7;keyLight.shadow.camera.bottom=-3;keyLight.shadow.normalBias=.03;scene.add(keyLight);const rim=new THREE.DirectionalLight(0xd2cafa,3);rim.position.set(5,4,-4);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x687183,opacity:.12}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(22,44,0xe5e8ee,0xe8eaf0);grid.position.y=.005;grid.material.transparent=true;grid.material.opacity=.6;scene.add(grid);
const material=(color,metalness=.15,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const dark=material(0x242c37,.65,.45),rail=material(0x525d6c,.7,.4),inner=material(0x101722,.2,.8),side=material(0x363e49,.65,.5),boltMat=material(0xa3acb7,.8,.3);
function box(parent,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function canvasTexture(width,height,draw){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'));const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;}
const U=.105,base=.31,centers={A:-1.02,B:1.02};
const numberTexture=canvasTexture(64,2048,ctx=>{ctx.fillStyle='#697586';ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';for(let u=1;u<=42;u++)ctx.fillText(String(u).padStart(2,'0'),32,2048-(u-.5)/42*2048);});
for(const rack of ['A','B']){const group=new THREE.Group();group.position.x=centers[rack];scene.add(group);
 box(group,1.46,.15,1.44,0,.18,0,dark);box(group,1.46,.14,1.44,0,4.85,0,dark);
 for(const x of [-.69,.69]){box(group,.085,4.55,1.38,x,2.52,0,dark);for(const z of [-.63,.63])box(group,.085,4.48,.065,x*.85,2.53,z,rail);}
 box(group,.035,4.48,1.3,-.715,2.53,0,side);box(group,.035,4.48,1.3,.715,2.53,0,side);
 for(const z of [-.677,.677]){const plate=new THREE.Mesh(new THREE.PlaneGeometry(.08,U*42),new THREE.MeshBasicMaterial({map:numberTexture,transparent:true}));plate.position.set(z>0?-.552:.552,base+U*21,z);if(z<0)plate.rotation.y=Math.PI;group.add(plate);}
 // Mounting slots make all forty-two units discernible from either side.
 for(let u=1;u<=42;u++){const y=base+(u-.5)*U;for(const x of [-.625,.625])for(const z of [-.67,.67])box(group,.028,.026,.009,x,y,z,inner);box(group,1.12,.006,.016,0,base+u*U,-.57,rail);}
 for(const x of [-.56,.56])for(const z of [-.49,.49])box(group,.15,.09,.19,x,.06,z,inner);
 const roofTexture=canvasTexture(256,128,ctx=>{ctx.fillStyle='#252d38';ctx.fillRect(0,0,256,128);ctx.fillStyle='#131b25';for(let i=0;i<20;i++)ctx.fillRect(20+i*11,12,4,100);});const vent=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),new THREE.MeshStandardMaterial({map:roofTexture,roughness:.7}));vent.rotation.x=-Math.PI/2;vent.position.y=4.925;group.add(vent);
}
const equipment=new THREE.Group();scene.add(equipment);let clickable=[];
const textureCache=new Map();
function faceTexture(type,rear){const cacheKey=type+rear;if(textureCache.has(cacheKey))return textureCache.get(cacheKey);const s=catalog.find(s=>s.type===type);const texture=canvasTexture(800,100*s.height,ctx=>{const h=100*s.height;ctx.fillStyle=type==='Blank panel'?'#424d5d':'#647080';ctx.fillRect(0,0,800,h);ctx.fillStyle='#465263';ctx.fillRect(0,0,800,5);ctx.fillRect(0,h-5,800,5);ctx.fillStyle='#c1cad5';ctx.font='bold 16px Arial';ctx.fillText(rear?'REAR I/O':type.toUpperCase(),25,26);ctx.fillStyle='#8693a4';ctx.font='11px Arial';ctx.fillText(rear?'POWER / NETWORK':'RACKSPACE  /  '+(type==='Compute server'?'RS-2400':type==='Storage array'?'DS-4800':'INFRASTRUCTURE'),25,h-15);
 if(type==='Patch panel'||type==='Network switch'){for(let i=0;i<24;i++){const x=125+i*24;ctx.fillStyle='#202c3b';ctx.fillRect(x,38,18,24);ctx.fillStyle='#8e9aaa';ctx.fillRect(x+3,41,12,10);ctx.fillStyle='#b7c1cb';ctx.font='8px Arial';ctx.fillText(String(i+1),x+3,75);if(type==='Network switch'){ctx.fillStyle=i<18?'#86d0a1':'#515e6a';ctx.fillRect(x+4,64,4,3);}}}
 else if(type==='Compute server'||type==='Storage array'){if(rear){for(let n=0;n<(type==='Storage array'?4:3);n++){const x=250+n*110;ctx.strokeStyle='#293544';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,h/2,Math.min(h*.28,43),0,Math.PI*2);ctx.stroke();for(let t=0;t<8;t++){ctx.beginPath();ctx.moveTo(x,h/2);ctx.lineTo(x+Math.cos(t*Math.PI/4)*35,h/2+Math.sin(t*Math.PI/4)*35);ctx.stroke();}}ctx.fillStyle='#1f2937';ctx.fillRect(665,35,65,h-70);ctx.fillStyle='#b8c5ce';ctx.fillRect(680,h/2-8,24,16);}else{const rows=s.height===4?4:2;for(let row=0;row<rows;row++)for(let col=0;col<6;col++){let x=145+col*96,y=39+row*(h-58)/rows;ctx.fillStyle='#313e4e';ctx.fillRect(x,y,86,(h-68)/rows);ctx.fillStyle='#556577';for(let j=0;j<8;j++)ctx.fillRect(x+7+j*8,y+6,3,(h-90)/rows);ctx.fillStyle='#8dcbb0';ctx.fillRect(x+73,y+8,4,4);}}ctx.fillStyle='#97d8b2';ctx.beginPath();ctx.arc(55,h/2,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a7b2c0';ctx.lineWidth=3;ctx.strokeRect(20,40,8,h-82);ctx.strokeRect(772,40,8,h-82);}
 else{ctx.fillStyle='#4d596a';for(let i=0;i<60;i++)ctx.fillRect(60+i*11,40,5,20);}
 });textureCache.set(cacheKey,texture);return texture;}
function rebuildEquipment(){for(const child of [...equipment.children]){equipment.remove(child);child.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});}clickable=[];
 for(const d of devices){const s=spec(d),group=new THREE.Group();group.position.set(centers[d.rack],base+(d.start-1+s.height/2)*U,0);equipment.add(group);const height=s.height*U-.009;const body=box(group,1.115,height,1.09,0,0,.035,material(d.id===selected?0x9a83ce:0x4d5867,.6,.45));body.userData.id=d.id;clickable.push(body);
 for(const rear of [false,true]){const mat=new THREE.MeshStandardMaterial({map:faceTexture(d.type,rear),color:d.id===selected?0xc9b8ff:0xffffff,metalness:.3,roughness:.6});const face=new THREE.Mesh(new THREE.PlaneGeometry(1.1,height),mat);face.position.z=rear?-.517:.588;if(rear)face.rotation.y=Math.PI;face.userData.id=d.id;group.add(face);clickable.push(face);for(const x of [-.59,.59]){const ear=box(group,.065,height,.028,x,0,rear?-.53:.59,d.id===selected?material(0x9b84d6):rail);ear.userData.id=d.id;clickable.push(ear);for(const y of [-height/2+.024,height/2-.024]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.008,8),boltMat);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,rear?-.55:.61);group.add(bolt);}}}
 if(d.id===selected){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.26,height+.012,1.17)),new THREE.LineBasicMaterial({color:0xb499ff}));group.add(edge);}
 }
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart;
renderer.domElement.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointerup',event=>{if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable)[0];if(hit)choose(hit.object.userData.id);});
renderer.domElement.addEventListener('pointermove',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);renderer.domElement.style.cursor=raycaster.intersectObjects(clickable).length?'pointer':'grab';});
function setView(next){view=next;camera.position.set(next==='front'?4.7:-4.7,3.9,next==='front'?10.4:-10.4);controls.target.set(0,2.45,0);controls.update();$('#front').classList.toggle('active',next==='front');$('#rear').classList.toggle('active',next==='rear');}
$('#front').onclick=()=>setView('front');$('#rear').onclick=()=>setView('rear');$('#reset-view').onclick=()=>setView(view);
function zoom(factor){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor);offset.setLength(THREE.MathUtils.clamp(offset.length(),5,17));camera.position.copy(controls.target).add(offset);controls.update();}
$('#zoom-in').onclick=()=>zoom(.86);$('#zoom-out').onclick=()=>zoom(1.16);
$('#export').onclick=()=>{const rows=[['rack','starting unit','device type','height','power'],...devices.slice().sort((a,b)=>a.rack.localeCompare(b.rack)||a.start-b.start).map(d=>[d.rack,d.start,d.type,spec(d).height,spec(d).power])];const content=rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='rackspace-inventory.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Rack inventory exported');};
new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(container);
setView('front');renderUI();rebuildEquipment();save();
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
