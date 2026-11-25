import * as THREE from 'three';

const trips = [
  {id:'kyoto', city:'Kyoto', country:'Japan', continent:'Asia', title:'The art of slowing down', date:'2025-04-12', end:'18', days:7, lat:35.0116, lng:135.7681, image:'kyoto.jpg', alt:'Traditional Japanese streets and a pagoda framed by the mountains of Kyoto', diary:'The best part of Kyoto was getting lost. A narrow lane, a wooden door, the smell of roasted tea. I walked the same path along the canal every morning and noticed something new each time. On the last day, the cherry blossoms began to fall. Nobody seemed to be in a hurry. For once, neither was I.', note:'A pocket full of fallen petals.'},
  {id:'tokyo', city:'Tokyo', country:'Japan', continent:'Asia', title:'After the last train', date:'2025-04-05', end:'11', days:7, lat:35.6762, lng:139.6503, image:'tokyo.jpg', alt:'Neon signs and colorful storefronts along a busy Tokyo street at night', diary:'Tokyo felt like a hundred little cities stitched together. We spent our mornings in quiet coffee shops and our evenings following the neon. One night we missed the last train and walked back through streets that were, somehow, both enormous and intimate. The city kept us company all the way home.', note:'Best discovered one side street at a time.'},
  {id:'lisbon', city:'Lisbon', country:'Portugal', continent:'Europe', title:'Chasing the afternoon light', date:'2024-09-14', end:'19', days:6, lat:38.7223, lng:-9.1393, image:'lisbon.jpg', alt:'Warm sun over the terracotta rooftops and historic streets of Lisbon', diary:'Every street seemed to lead uphill, and every hill was worth it. I learned to order a bica, ate more pastéis de nata than I could count, and watched the sun turn the Tagus silver. Lisbon is a city that asks you to take the long way home. I was happy to oblige.', note:'One more hill. One more pastel de nata.'},
  {id:'marrakech', city:'Marrakech', country:'Morocco', continent:'Africa', title:'A thousand shades of ochre', date:'2024-03-08', end:'13', days:6, lat:31.6295, lng:-7.9811, image:'marrakech.jpg', alt:'Ochre buildings and intricate Moroccan architecture in Marrakech', diary:'The medina was a beautiful puzzle. We followed the scent of cumin and fresh bread, stopped for mint tea, and forgot the map altogether. At sunset, the rooftops turned the same pink as the sky. The call to prayer drifted across the city, and for a few minutes the whole day stood still.', note:'Mint tea tastes better with no plans.'},
  {id:'cusco', city:'Cusco', country:'Peru', continent:'South America', title:'Closer to the clouds', date:'2023-10-21', end:'28', days:8, lat:-13.5319, lng:-71.9675, image:'peru.jpg', alt:'The stone terraces of Machu Picchu surrounded by green Andean mountain peaks', diary:'The altitude made us slow down before we had a chance to decide otherwise. We spent days wandering the old stone streets, then took the train into the Sacred Valley. In the morning mist, the mountains looked endless. I have never felt so small, or so lucky to be exactly where I was.', note:'Some views stay with you forever.'},
  {id:'new-york', city:'New York', country:'United States', continent:'North America', title:'A city in a hurry', date:'2023-06-03', end:'09', days:7, lat:40.7128, lng:-74.006, image:'newyork.jpg', alt:'Manhattan skyscrapers and New York City streets viewed from above', diary:'Bagels on a park bench. A bookstore I stayed in for two hours. A jazz bar with no sign outside. The big landmarks were wonderful, but it was the little things that made New York feel real. On my last evening I crossed the Brooklyn Bridge slowly, pretending the trip wasn’t almost over.', note:'A very good place to wear out your shoes.'}
];
const $ = id => document.getElementById(id);
const state = {query:'',year:'all',mode:'list',selected:null};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const formatDate = date => new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const filteredTrips = () => trips.filter(t => (state.year==='all'||t.date.startsWith(state.year)) && `${t.city} ${t.country} ${t.continent} ${t.title} ${t.diary}`.toLowerCase().includes(state.query.toLowerCase().trim()));

function renderList(){
  const filtered=filteredTrips();
  $('result-count').textContent=`${filtered.length} ${filtered.length===1?'ENTRY':'ENTRIES'}`;
  $('map-count').textContent=`${filtered.length} ${filtered.length===1?'place':'places'}, countless memories`;
  $('sort-label').textContent=state.mode==='chronological'?'Newest memories first':'A collection of little escapes';
  $('trip-list').classList.toggle('chronological',state.mode==='chronological');
  if(!filtered.length){
    $('trip-list').innerHTML=`<div class="empty"><div class="empty-symbol">◎</div><h3>A little off the map.</h3><p>No memories match these filters.<br>Try another place, word, or year.</p><button class="clear-filters">Clear filters</button></div>`;
    $('trip-list').querySelector('button').addEventListener('click',()=>{$('search').value='';$('year').value='all';state.query='';state.year='all';applyFilters();});
  }else{
    let year='';
    $('trip-list').innerHTML=filtered.map(t=>{
      let heading='';
      if(state.mode==='chronological'&&year!==t.date.slice(0,4)){year=t.date.slice(0,4);heading=`<div class="timeline-year">${year}</div>`;}
      return `${heading}<button class="trip-row ${state.selected===t.id?'selected':''}" data-id="${t.id}" aria-label="Read ${t.city}: ${t.title}" ${state.selected===t.id?'aria-current="true"':''}><img class="trip-thumb" src="./assets/${t.image}" alt="${t.alt}"><span class="trip-info"><span class="trip-location">${t.city}, ${t.country}</span><span class="trip-title">${t.title}</span><span class="trip-date">${formatDate(t.date)}<i></i>${t.days} days</span></span><span class="trip-arrow" aria-hidden="true">↗</span></button>`;
    }).join('');
    $('trip-list').querySelectorAll('[data-id]').forEach(button=>button.addEventListener('click',()=>selectTrip(button.dataset.id)));
  }
  syncMarkers();
}
function renderDetail(){
  const t=trips.find(t=>t.id===state.selected);
  $('trip-detail').hidden=!t;
  $('trip-list').hidden=!!t;
  $('results-heading')?.classList.toggle('detail-open',!!t);
  document.querySelector('.results-heading').hidden=!!t;
  $('selected-caption').hidden=!t;
  if(!t){document.title='Elsewhere — a personal travel journal';return;}
  $('selected-caption').innerHTML=`A memory from <strong>${t.city}.</strong>`;
  document.title=`${t.city}: ${t.title} — Elsewhere`;
  $('trip-detail').innerHTML=`<button class="detail-back" id="back-to-trips">← <span>Back to all entries</span></button><img class="detail-photo" src="./assets/${t.image}" alt="${t.alt}"><div class="detail-meta">${t.city}, ${t.country} <span aria-hidden="true">/</span> ${t.continent}</div><h3 class="detail-title">${t.title}</h3><div class="detail-date"><span>${formatDate(t.date)} · ${t.days} days</span><span>A FIELD NOTE</span></div><p class="detail-diary">${t.diary}</p><div class="detail-foot"><span>${Math.abs(t.lat).toFixed(2)}° ${t.lat>=0?'N':'S'} &nbsp; ${Math.abs(t.lng).toFixed(2)}° ${t.lng>=0?'E':'W'}</span><button class="share-button" id="share-trip">Copy link ↗</button></div>`;
  $('back-to-trips').addEventListener('click',()=>{selectTrip(null);requestAnimationFrame(()=>$('trip-list').querySelector(`[data-id="${t.id}"]`)?.focus({preventScroll:true}));});
  $('share-trip').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(location.href);$('share-trip').textContent='Link copied ✓';}
    catch{const input=document.createElement('input');input.value=location.href;document.body.append(input);input.select();document.execCommand('copy');input.remove();$('share-trip').textContent='Link copied ✓';}
    $('announcement').textContent=`Share link for ${t.city} copied.`;
  });
}
function selectTrip(id,{fromURL=false,focus=false}={}){
  const t=trips.find(t=>t.id===id);
  state.selected=t?.id||null;
  if(!fromURL){const target=t?`#trip/${t.id}`:location.pathname+location.search;if(location.hash!==(t?`#trip/${t.id}`:''))history.pushState(null,'',target);}
  renderList();renderDetail();
  if(t){flyTo(t);$('announcement').textContent=`${t.city}: ${t.title}. ${formatDate(t.date)}. Diary opened.`;if(focus)requestAnimationFrame(()=>$('back-to-trips').focus({preventScroll:true}));}
}
function applyFilters(){
  if(state.selected){state.selected=null;history.pushState(null,'',location.pathname+location.search);renderDetail();}
  renderList();
  $('announcement').textContent=`${filteredTrips().length} journal entries match your filters.`;
}
$('search').addEventListener('input',e=>{state.query=e.target.value;applyFilters();});
$('year').addEventListener('change',e=>{state.year=e.target.value;applyFilters();});
for(const mode of ['list','chrono'])$(mode+'-mode').addEventListener('click',()=>{
  state.mode=mode==='list'?'list':'chronological';
  $('list-mode').classList.toggle('active',mode==='list');$('list-mode').setAttribute('aria-pressed',String(mode==='list'));
  $('chrono-mode').classList.toggle('active',mode==='chrono');$('chrono-mode').setAttribute('aria-pressed',String(mode==='chrono'));
  if(state.selected)selectTrip(null);else renderList();
});
function readURL(){
  const match=location.hash.match(/^#trip\/([\w-]+)$/);
  const trip=match&&trips.find(t=>t.id===match[1]);
  if(trip&&!filteredTrips().includes(trip)){state.query='';state.year='all';$('search').value='';$('year').value='all';}
  selectTrip(trip?.id||null,{fromURL:true});
}
window.addEventListener('popstate',readURL);window.addEventListener('hashchange',readURL);
$('about-button').addEventListener('click',()=>$('about-dialog').showModal());
document.querySelector('.dialog-close').addEventListener('click',()=>$('about-dialog').close());
$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});

// A real, depth-tested globe. Texture and all photography are served locally.
const stage=$('globe-stage');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.1,100);
const renderer=new THREE.WebGLRenderer({canvas:$('globe-canvas'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.AmbientLight(0xe9f1d9,2.0));
const sunlight=new THREE.DirectionalLight(0xfff3cf,2.2);sunlight.position.set(-3,5,5);scene.add(sunlight);
const radius=1.4;
let globe;
const latLngVector=(lat,lng,r=radius)=>new THREE.Vector3(Math.cos(THREE.MathUtils.degToRad(lat))*Math.cos(THREE.MathUtils.degToRad(lng))*r,Math.sin(THREE.MathUtils.degToRad(lat))*r,-Math.cos(THREE.MathUtils.degToRad(lat))*Math.sin(THREE.MathUtils.degToRad(lng))*r);
const view={lng:30,lat:23,distance:5.6};
let targetView={...view};
function flyTo(t){targetView={lng:t.lng,lat:t.lat,distance:5.35};if(reducedMotion.matches)Object.assign(view,targetView);}
function resetView(){targetView={lng:30,lat:23,distance:5.6};if(reducedMotion.matches)Object.assign(view,targetView);$('announcement').textContent='Full globe view restored. Your journal filters are unchanged.';}
$('reset-view').addEventListener('click',resetView);
$('zoom-in').addEventListener('click',()=>{targetView.distance=Math.max(3.8,targetView.distance-.55);if(reducedMotion.matches)view.distance=targetView.distance;});
$('zoom-out').addEventListener('click',()=>{targetView.distance=Math.min(7.7,targetView.distance+.55);if(reducedMotion.matches)view.distance=targetView.distance;});

const markerElements=new Map();
for(const t of trips){
  const b=document.createElement('button');b.className='globe-marker';b.dataset.id=t.id;b.setAttribute('aria-label',`Open ${t.city}, ${t.country}: ${t.title}`);b.innerHTML=`<span class="marker-dot"></span><span class="marker-label">${t.city}</span>`;
  b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();selectTrip(t.id,{focus:true});});
  $('marker-layer').append(b);markerElements.set(t.id,{element:b,position:latLngVector(t.lat,t.lng,radius+.025)});
}
function syncMarkers(){const ids=new Set(filteredTrips().map(t=>t.id));for(const [id,m]of markerElements){m.filtered=!ids.has(id);m.element.classList.toggle('selected',state.selected===id);m.element.setAttribute('aria-pressed',String(state.selected===id));}}
function updateMarkers(){
  const w=stage.clientWidth,h=stage.clientHeight;const visible=[];
  for(const [id,m]of markerElements){
    // Exact tangent-plane visibility test keeps the back hemisphere unpickable.
    const front=camera.position.dot(m.position)>radius*radius+.01;
    const p=m.position.clone().project(camera);
    m.element.hidden=m.filtered||!front||p.z>1;
    if(m.element.hidden)continue;
    const x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
    visible.push({m,x,y,offset:0});
  }
  // Close destinations retain individual buttons and a leader to their true location.
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
    if(Math.hypot(visible[i].x-visible[j].x,visible[i].y-visible[j].y)<52){visible[i].offset=-23;visible[j].offset=23;}
  }
  for(const v of visible){v.m.element.style.left=`${v.x}px`;v.m.element.style.top=`${v.y+v.offset}px`;v.m.element.classList.toggle('offset',!!v.offset);v.m.element.style.setProperty('--leader-width',`${Math.abs(v.offset)}px`);v.m.element.style.setProperty('--leader-angle',`${v.offset<0?90:-90}deg`);}
}

async function makeGlobe(){
  const texture=await new THREE.TextureLoader().loadAsync('./assets/world-map.png');
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  globe=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),new THREE.MeshStandardMaterial({map:texture,roughness:.95,metalness:0}));scene.add(globe);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.025,64,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{glowColor:{value:new THREE.Color('#a5b590')}},vertexShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 vNormal;varying vec3 vPosition;uniform vec3 glowColor;void main(){float intensity=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.0);gl_FragColor=vec4(glowColor,intensity*.25);}'}));scene.add(atmosphere);
  // Thin great-circle paths tie the collection together without obscuring the geography.
  for(let i=0;i<trips.length-1;i++){
    const a=latLngVector(trips[i].lat,trips[i].lng,1),b=latLngVector(trips[i+1].lat,trips[i+1].lng,1);const angle=a.angleTo(b),points=[];
    for(let j=0;j<=80;j++){const f=j/80;let p;if(angle<.001)p=a.clone();else p=a.clone().multiplyScalar(Math.sin((1-f)*angle)/Math.sin(angle)).add(b.clone().multiplyScalar(Math.sin(f*angle)/Math.sin(angle)));points.push(p.normalize().multiplyScalar(radius+.012+Math.sin(f*Math.PI)*.09));}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xd7bd87,transparent:true,opacity:.4,dashSize:.025,gapSize:.026}));line.computeLineDistances();scene.add(line);
  }
  stage.classList.add('ready');
}
makeGlobe().catch(error=>{console.error(error);document.querySelector('.globe-loading').textContent='The globe could not load. Every memory is still available in the journal.';});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
let pointer=null;
stage.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,touch:e.pointerType==='touch',locked:false};
  if(e.pointerType!=='touch')stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(pointer.touch&&!pointer.locked){if(Math.abs(e.clientY-pointer.startY)>Math.abs(e.clientX-pointer.startX)+5){pointer=null;return;}if(Math.abs(e.clientX-pointer.startX)<6)return;pointer.locked=true;}
  targetView.lng-=dx*.32;targetView.lat=THREE.MathUtils.clamp(targetView.lat+(pointer.touch?0:dy*.27),-70,70);
  Object.assign(view,targetView);pointer.x=e.clientX;pointer.y=e.clientY;
});
window.addEventListener('pointerup',()=>pointer=null);stage.addEventListener('pointercancel',()=>pointer=null);
let last=0;
function animate(time){
  requestAnimationFrame(animate);
  const ease=reducedMotion.matches?1:Math.min(1,(time-last)/170);last=time;
  let delta=((targetView.lng-view.lng+540)%360)-180;
  view.lng+=delta*ease;view.lat+=(targetView.lat-view.lat)*ease;view.distance+=(targetView.distance-view.distance)*ease;
  camera.position.copy(latLngVector(view.lat,view.lng,view.distance));camera.lookAt(0,0,0);camera.updateMatrixWorld();
  $('coordinates').textContent=`${Math.abs(view.lat).toFixed(3)}° ${view.lat>=0?'N':'S'}  ${Math.abs(((view.lng+540)%360)-180).toFixed(3)}° ${((view.lng+540)%360)-180>=0?'E':'W'}`;
  renderer.render(scene,camera);updateMarkers();
}
renderList();readURL();requestAnimationFrame(animate);
