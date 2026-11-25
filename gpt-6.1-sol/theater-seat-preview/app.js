import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s);
const canvas=$('#theater');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xe7dfeb);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xe7dfeb,38,74);
const camera=new THREE.PerspectiveCamera(45,1,.1,130);camera.position.set(21,20,25);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.4,-1);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.46;controls.minDistance=3;controls.maxDistance=50;controls.minPolarAngle=.12;
scene.add(new THREE.AmbientLight(0xf4e8ff,1.65));
const sun=new THREE.DirectionalLight(0xfff2df,3.5);sun.position.set(-12,24,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:25,bottom:-22});sun.shadow.bias=-.001;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd9c2ef,2);fill.position.set(14,9,-9);scene.add(fill);
const mats={floor:new THREE.MeshStandardMaterial({color:0x8c788f,roughness:.9}),step:new THREE.MeshStandardMaterial({color:0xb8a5bf,roughness:.9}),wall:new THREE.MeshStandardMaterial({color:0xe2d7e7,roughness:1}),trim:new THREE.MeshStandardMaterial({color:0xc1adc8,roughness:.6}),seat:new THREE.MeshStandardMaterial({color:0x876199,roughness:.72}),reserved:new THREE.MeshStandardMaterial({color:0xb9a8be,roughness:.9}),chosen:new THREE.MeshStandardMaterial({color:0xc4a66c,roughness:.62}),back:new THREE.MeshStandardMaterial({color:0x64456e,roughness:.7}),wood:new THREE.MeshStandardMaterial({color:0xcab193,roughness:.8}),curtain:new THREE.MeshStandardMaterial({color:0x705276,roughness:.95}),metal:new THREE.MeshStandardMaterial({color:0x736273,roughness:.6,metalness:.25})};
function box(w,h,d,x,y,z,mat,shadow=true){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;scene.add(o);return o;}
function cylinder(rt,rb,h,x,y,z,mat){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
// A cutaway auditorium keeps every seat visible while retaining the architecture.
box(23,.35,31,0,-.3,0,mats.floor);
for(let r=0;r<8;r++)box(21,.28+r*.28,1.75,0,(.28+r*.28)/2-.1,-4+r*1.75,mats.step);
for(let r=0;r<16;r++)box(1.1,.13+r*.14,.875,0,(.13+r*.14)/2-.08,-4.4+r*.875,mats.floor);
box(21,1.1,5.2,0,.45,-11,mats.wood);box(21,.13,5.4,0,1.08,-11,mats.wood);
box(22,11,.6,0,5,-14,mats.wall);box(.7,7,25,-11,3.1,-1,mats.wall);
for(let i=0;i<10;i++){const z=-11+i*2.3;box(.09,4.7,.13,-10.6,3.2,z,mats.trim);}
// Proscenium and folded velvet curtains frame a warmly lit playing space.
box(19,.6,.75,0,8,-12.9,mats.trim);box(.7,7,.9,-9.1,4.2,-12.9,mats.trim);box(.7,7,.9,9.1,4.2,-12.9,mats.trim);
for(let i=0;i<28;i++){const x=-8.5+i*.63;const side=Math.abs(x)>5.3;const curtain=cylinder(.34,.34,side?6.4:1.25,x,side?4.35:7,-13.25,mats.curtain);curtain.scale.z=.75;}
box(10.5,5.9,.15,0,4.1,-13.8,new THREE.MeshStandardMaterial({color:0x423b4f,roughness:1}));
// Minimal scenic garden: moon, an arch, and a pair of abstract trees.
const moon=new THREE.Mesh(new THREE.CircleGeometry(1.15,48),new THREE.MeshBasicMaterial({color:0xe7d5a8}));moon.position.set(.1,5.4,-13.65);scene.add(moon);
const arch=new THREE.Mesh(new THREE.TorusGeometry(2.4,.055,8,70,Math.PI),mats.wood);arch.position.set(0,1.4,-12.4);scene.add(arch);
for(const x of [-2.4,2.4])cylinder(.055,.055,1.4,x,2.1,-12.4,mats.wood);
for(const x of [-5,5]){cylinder(.06,.11,2.4,x,2.3,-12.3,mats.wood);for(let j=0;j<3;j++){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,0),new THREE.MeshStandardMaterial({color:j%2?0x8f9483:0xaaa38e,roughness:1}));leaf.position.set(x+(j-1)*.4,3.4+j*.45,-12.3);leaf.castShadow=true;scene.add(leaf);}}
const stageLight=new THREE.SpotLight(0xffe4ad,95,24,.68,.8,1.2);stageLight.position.set(0,9,-7);stageLight.target.position.set(0,1,-12);scene.add(stageLight,stageLight.target);
// The columns physically intersect some sightlines, matching limited-view markers.
for(const x of [-4.7,4.7]){cylinder(.22,.29,7.3,x,3.6,-1.9,mats.trim);cylinder(.4,.4,.15,x,.05,-1.9,mats.trim);cylinder(.42,.42,.25,x,7.1,-1.9,mats.trim);}
box(21,.48,1,0,7.35,-1.9,mats.trim);
// Brass aisle lights and low wall panels establish depth without enclosing the cutaway.
for(let r=0;r<8;r++){for(const x of [-9.5,9.5]){const lightmat=new THREE.MeshBasicMaterial({color:0xf6d8a2});box(.25,.07,.3,x,r*.28+.09,-3.7+r*1.75,lightmat,false);}}
const reserved=new Set(['A2','A3','A8','B5','B6','B11','C1','C9','C10','D3','D4','E7','E8','F1','F2','F10','G5','G6','H11','H12']);
const seats=[];const clickable=[];let chosen=[],quantity=2,preview=null,comparison=[null,null],anim=null,isEye=false;
for(let r=0;r<8;r++){
 const row=document.createElement('div');row.className='seat-row';row.innerHTML=`<span class="row-letter">${String.fromCharCode(65+r)}</span>`;
 for(let c=0;c<12;c++){
  const id=String.fromCharCode(65+r)+(c+1),x=(c-5.5)*1.34+(c<6?-.42:.42),z=-4+r*1.75,y=r*.28+.08;
  const limited=r>=2&&(c===2||c===3||c===8||c===9);const price=r<3?65:r<6?48:35;
  const seat={id,r,c,x,y,z,price,limited,reserved:reserved.has(id),meshes:[]};seats.push(seat);
  const material=seat.reserved?mats.reserved:mats.seat;
  const cushion=box(.93,.22,.85,x,y+.55,z,material);const back=box(.98,1.05,.22,x,y+.98,z+.36,material);back.rotation.x=-.08;
  seat.meshes.push(cushion,back);
  for(const dx of [-.56,.56]){box(.1,.11,.84,x+dx,y+.86,z,mats.back);box(.08,.48,.1,x+dx,y+.4,z+.24,mats.metal);}
  box(.65,.12,.55,x,y+.21,z,mats.metal);
  for(const m of seat.meshes){m.userData.seat=seat;clickable.push(m);}
  const b=document.createElement('button');seat.button=b;b.className=`seat ${r<3?'premium':r<6?'standard':'value'}${seat.reserved?' reserved':''}${limited?' limited':''}`;b.disabled=seat.reserved;b.title=`Row ${id[0]}, seat ${c+1} · $${price}${seat.reserved?' · Reserved':''}${limited?' · Limited view':''}`;b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed','false');b.onclick=()=>selectSeat(seat);row.appendChild(b);
 }
 row.insertAdjacentHTML('beforeend',`<span class="row-letter">${String.fromCharCode(65+r)}</span>`);$('#seat-map').appendChild(row);
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function updateSelection(){for(const s of seats){const active=chosen.includes(s);s.button.classList.toggle('chosen',active);s.button.classList.toggle('preview',s===preview);s.button.setAttribute('aria-pressed',String(active));for(const m of s.meshes)m.material=active?mats.chosen:s.reserved?mats.reserved:mats.seat;}const total=chosen.reduce((n,s)=>n+s.price,0);$('#quantity').textContent=quantity;$('#less').disabled=quantity===1;$('#more').disabled=quantity===4;$('#ticket-caption').textContent=`${chosen.length} ticket${chosen.length===1?'':'s'}`;$('#total').innerHTML=`$${total}<span>.00</span>`;$('#continue').disabled=!chosen.length;$('#selection-details').innerHTML=chosen.length?`<div class="selected-ticket"><span><b>Row ${chosen[0].id[0]} · Seats ${chosen.map(s=>s.c+1).join(', ')}</b><small>${chosen[0].r<3?'Premium':chosen[0].r<6?'Standard':'Value'} · ${chosen.length} together${chosen.some(s=>s.limited)?' · Limited view':''}</small></span><span>$${chosen[0].price} each<small>All fees included</small></span></div>`:'<span class="empty-icon">⌑</span><p>Your seats are waiting.<small>Choose a seat on the map to get started.</small></p>';}
function moveTo(pos,target){anim={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),target,start:performance.now()};}
function selectSeat(s){if(s.reserved)return;preview=s;const sideStart=s.c<6?0:6,sideEnd=sideStart+6;let start=Math.min(s.c,sideEnd-quantity);let group=seats.filter(a=>a.r===s.r&&a.c>=start&&a.c<start+quantity);if(group.some(a=>a.reserved)){toast('These seats aren’t all available. Try another starting seat.');}else{chosen=group;}isEye=true;controls.maxPolarAngle=Math.PI*.95;moveTo(new THREE.Vector3(s.x,s.y+1.48,s.z+.12),new THREE.Vector3(0,2.7,-12));$('#view-badge').textContent=`◉  Row ${s.id[0]} · Seat ${s.c+1}`;$('#seat-pop').hidden=false;$('#preview-label').textContent=`Row ${s.id[0]} · Seat ${s.c+1} — $${s.price}`;$('#preview-status').textContent=s.limited?'Limited view · a balcony support crosses this sightline':'A lovely, clear view of the stage';updateSelection();}
$('#less').onclick=()=>{if(quantity>1){quantity--;if(preview)selectSeat(preview);else updateSelection();}};$('#more').onclick=()=>{if(quantity<4){quantity++;if(preview)selectSeat(preview);else updateSelection();}};
$('#clear').onclick=()=>{chosen=[];updateSelection();};
function reset(){isEye=false;controls.maxPolarAngle=Math.PI*.46;moveTo(new THREE.Vector3(21,20,25),new THREE.Vector3(0,1.4,-1));$('#view-badge').textContent='✧  Auditorium view';$('#seat-pop').hidden=true;}$('#reset').onclick=reset;
$('#zoom-in').onclick=()=>{const delta=camera.position.clone().sub(controls.target).multiplyScalar(.82);camera.position.copy(controls.target).add(delta);};$('#zoom-out').onclick=()=>{const delta=camera.position.clone().sub(controls.target).multiplyScalar(1.18);camera.position.copy(controls.target).add(delta);};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable)[0];if(hit){const seat=hit.object.userData.seat;if(seat.reserved)toast('This seat is already reserved. Please choose an available seat.');else selectSeat(seat);}});
function capture(s){const oldPos=camera.position.clone(),oldTarget=controls.target.clone();camera.position.set(s.x,s.y+1.48,s.z+.12);controls.target.set(0,2.7,-12);controls.update();renderer.render(scene,camera);const image=renderer.domElement.toDataURL('image/png');camera.position.copy(oldPos);controls.target.copy(oldTarget);controls.update();return image;}
function saveView(index){if(!preview){toast('Choose an available seat first to save its view.');return;}if(index===undefined)index=comparison[0]?1:0;comparison[index]={seat:preview,image:capture(preview)};const b=$(`#slot-${index}`);b.classList.add('filled');b.innerHTML=`◉ <span>${preview.id[0]} · ${preview.c+1}</span>`;b.title=`Saved view: row ${preview.id[0]}, seat ${preview.c+1}. Click to replace.`;$('#compare').disabled=!comparison.every(Boolean);toast(`Row ${preview.id[0]}, seat ${preview.c+1} saved to view ${index+1}.`);}
$('#save-view').onclick=()=>saveView();$('#slot-0').onclick=()=>saveView(0);$('#slot-1').onclick=()=>saveView(1);
const modal=$('#modal');function showModal(html){$('#modal-content').innerHTML=html;modal.showModal();}$('#close-modal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const b=modal.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)modal.close();}});
$('#compare').onclick=()=>showModal(`<span class="eyebrow">A LITTLE PERSPECTIVE</span><h2>Two seats. Your favorite view.</h2><p>Compare the stage from eye level. Supports are part of the actual view.</p><div class="comparison-grid">${comparison.map(v=>`<div><img src="${v.image}" alt="Stage view from row ${v.seat.id[0]}, seat ${v.seat.c+1}"><h3>Row ${v.seat.id[0]} · Seat ${v.seat.c+1} <span style="float:right">$${v.seat.price}</span></h3><p>${v.seat.limited?'Limited view · balcony support in sightline':'Clear view · take in the whole stage'}</p><button class="modal-action" data-pick="${v.seat.id}">Choose this view</button></div>`).join('')}</div>`);
modal.addEventListener('click',e=>{const id=e.target.dataset.pick;if(id){modal.close();selectSeat(seats.find(s=>s.id===id));}});
$('#continue').onclick=()=>{if(!chosen.length)return;showModal(`<span class="eyebrow">YOUR EVENING AT THE GRAND</span><h2>Good seats. Great company.</h2><p>Your local booking summary is ready.</p><div class="receipt"><strong>The Midnight Garden</strong><p>Saturday, November 21 · 7:30 PM<br>Main Stage · The Grand</p><div><span>Row ${chosen[0].id[0]} · Seats ${chosen.map(s=>s.c+1).join(', ')}</span><b>${chosen.length} tickets</b></div>${chosen.some(s=>s.limited)?'<small>Limited view: a balcony support may obscure part of the stage.</small>':''}<div><span>Total, all fees included</span><b>$${chosen.reduce((n,s)=>n+s.price,0)}.00</b></div></div><p style="font-size:11px">This is a local preview. No payment has been taken, and no reservation has been sent.</p><button class="modal-action" id="back-to-seats">Back to my seats</button>`);$('#back-to-seats').onclick=()=>modal.close();};
$('#help').onclick=()=>showModal('<span class="eyebrow">A LITTLE HELP</span><h2>Find your perfect evening.</h2><p>Choose 1–4 tickets, then click an available seat on the map or in the auditorium. We’ll select adjacent seats in the same section and show your view at eye level.</p><p>Gold seats in the auditorium are yours. Gray seats are reserved. A small gold dot marks a limited view. Save two perspectives and select Compare to see them side by side.</p>');$('#venue-link').onclick=e=>{e.preventDefault();showModal('<span class="eyebrow">INTIMATE BY DESIGN</span><h2>Welcome to The Grand.</h2><p>Eight gently raked rows. Ninety-six seats. One extraordinary stage.</p><p>Our balcony supports give this community theater its character. Some seats have a limited view; explore their actual sightlines before choosing.</p>');};
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();updateSelection();
function frame(t){requestAnimationFrame(frame);if(anim){let p=Math.min((t-anim.start)/1100,1);p=p*p*(3-2*p);camera.position.lerpVectors(anim.from,anim.to,p);controls.target.lerpVectors(anim.fromTarget,anim.target,p);if(p>=1)anim=null;}controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);
