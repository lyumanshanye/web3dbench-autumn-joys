import * as THREE from 'three';

const $ = (selector) => document.querySelector(selector);
const cycle = 29.5;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let day = 7.375;
let playing = !reducedMotion;
let overhead = false;
let lastTime = 0;
let questionIndex = 0;
let correctCount = 0;
const phases = [
  {name:'New moon',description:'The sunlit half faces away from Earth. The Moon is almost invisible to us.',symbol:'●'},
  {name:'Waxing crescent',description:'A little more sunlight appears each day. The bright side is growing.',symbol:'☽'},
  {name:'First quarter',description:"Half the Moon’s visible face is lit. The bright side is growing.",symbol:'◐'},
  {name:'Waxing gibbous',description:'More than half is lit. The Moon is getting closer to full.',symbol:'◕'},
  {name:'Full moon',description:'The sunlit half faces Earth. We see the whole bright disk.',symbol:'○'},
  {name:'Waning gibbous',description:'More than half is still lit, but the bright side is shrinking.',symbol:'◕'},
  {name:'Last quarter',description:'Half the visible face is lit. This time, the bright side is shrinking.',symbol:'◑'},
  {name:'Waning crescent',description:'Just a sliver of sunlight remains before a new cycle begins.',symbol:'☾'}
];

// A circular orbit in the x-z plane. The Sun is always on the negative x side.
// At day zero the Moon is between Earth and Sun; it casts no phase-making shadow.
const scene = new THREE.Scene();
scene.background = new THREE.Color('#151729');
const camera = new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,100);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#scene').append(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden','true');
const earthCenter = new THREE.Vector3(1.2,0,0);
const orbitRadius = 3.45;
scene.add(new THREE.AmbientLight(0x8b95c5,.28));
const sunlight = new THREE.DirectionalLight(0xffefdc,3.3);
sunlight.position.set(-15,0,0);
sunlight.target.position.copy(earthCenter);
scene.add(sunlight,sunlight.target);

let seed=147;
function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
function sphereTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=kind==='earth'?'#255b83':kind==='sun'?'#f7a447':'#a8a5a3';ctx.fillRect(0,0,1024,512);
  if(kind==='earth'){
    const continents=[[[70,120],[130,65],[240,70],[290,115],[250,155],[230,200],[170,200],[150,245],[115,210]],[[230,245],[300,270],[325,320],[292,370],[260,440],[230,395],[220,325]],[[450,120],[500,90],[550,110],[570,160],[620,185],[610,260],[555,340],[505,295],[480,210]],[[550,100],[650,60],[780,75],[880,120],[900,175],[825,220],[740,190],[710,250],[665,200],[620,165]],[[810,315],[870,290],[930,330],[910,370],[840,380]],[[0,470],[200,460],[400,475],[600,460],[800,472],[1024,460],[1024,512],[0,512]]];
    for(const points of continents){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#669d8c';ctx.fill();ctx.strokeStyle='#82ae98';ctx.lineWidth=4;ctx.stroke();}
    for(let i=0;i<90;i++){ctx.beginPath();ctx.ellipse(random()*1024,random()*420,random()*70+12,random()*7+2,-.2,0,Math.PI*2);ctx.fillStyle='rgba(232,244,239,.20)';ctx.fill();}
  } else {
    for(let i=0;i<1500;i++){const x=random()*1024,y=random()*512,r=kind==='sun'?random()*11+2:random()*14+1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=kind==='sun'?`rgba(255,224,130,${random()*.18})`:`rgba(${random()>.5?'60,57,59':'235,229,220'},${random()*.18})`;ctx.fill();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const earth=new THREE.Mesh(new THREE.SphereGeometry(.83,64,48),new THREE.MeshStandardMaterial({map:sphereTexture('earth'),roughness:1}));
earth.position.copy(earthCenter);earth.rotation.y=2.1;earth.rotation.z=.18;scene.add(earth);
const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(.865,48,32),new THREE.MeshBasicMaterial({color:0x6aa6cc,transparent:true,opacity:.085,side:THREE.BackSide}));atmosphere.position.copy(earthCenter);scene.add(atmosphere);
const moon=new THREE.Mesh(new THREE.SphereGeometry(.33,48,32),new THREE.MeshStandardMaterial({map:sphereTexture('moon'),roughness:1}));scene.add(moon);
const sun=new THREE.Mesh(new THREE.SphereGeometry(1.16,64,48),new THREE.MeshBasicMaterial({map:sphereTexture('sun'),color:0xffc770}));sun.position.set(-6.5,0,0);scene.add(sun);
const glowCanvas=document.createElement('canvas');glowCanvas.width=256;glowCanvas.height=256;const glowCtx=glowCanvas.getContext('2d');const gradient=glowCtx.createRadialGradient(128,128,28,128,128,128);gradient.addColorStop(0,'rgba(255,184,88,.55)');gradient.addColorStop(.4,'rgba(255,162,63,.12)');gradient.addColorStop(1,'rgba(255,162,63,0)');glowCtx.fillStyle=gradient;glowCtx.fillRect(0,0,256,256);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.position.copy(sun.position);glow.scale.set(5.2,5.2,1);scene.add(glow);
const orbitPoints=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;orbitPoints.push(new THREE.Vector3(earthCenter.x+Math.cos(a)*orbitRadius,0,Math.sin(a)*orbitRadius));}
const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints),new THREE.LineDashedMaterial({color:0x8b78bb,dashSize:.065,gapSize:.10,transparent:true,opacity:.65}));orbit.computeLineDistances();scene.add(orbit);
const stars=new Float32Array(330*3);for(let i=0;i<330;i++){stars[i*3]=(random()-.5)*30;stars[i*3+1]=(random()-.5)*12-3;stars[i*3+2]=(random()-.5)*20-4;}const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xc6c6df,size:.024,transparent:true,opacity:.5})));
// Straight, parallel rays show the distant Sun's lighting direction.
for(const z of [-1.3,0,1.3]){const points=[new THREE.Vector3(-4.85,-.12,z),new THREE.Vector3(-3.4,-.12,z)];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xc59564,transparent:true,opacity:.2}));scene.add(line);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.065,.17,3),new THREE.MeshBasicMaterial({color:0xc59564,transparent:true,opacity:.3}));arrow.rotation.z=-Math.PI/2;arrow.position.set(-3.35,-.12,z);scene.add(arrow);}
function resize(){const host=$('#scene');const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);const aspect=width/height;const halfWidth=Math.max(8.5,4.2*aspect);camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth/aspect;camera.bottom=-halfWidth/aspect;camera.position.set(-.8,overhead?18:13,overhead?.01:12);camera.lookAt(-.8,0,0);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe($('#scene'));
function placeLabel(selector,position,offsetY){const p=position.clone().project(camera);const host=$('#scene');const label=$(selector);label.style.left=`${(p.x*.5+.5)*host.clientWidth}px`;label.style.top=`${(-p.y*.5+.5)*host.clientHeight+offsetY}px`;}
const preview=$('#moon-preview');const ctx=preview.getContext('2d');const pixels=ctx.createImageData(440,440);const size=440,radius=174,center=size/2;
const terrain=new Float32Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x-center)/radius,ny=(y-center)/radius;let texture=.91+.035*Math.sin(x*.21)*Math.cos(y*.17)+random()*.065;const maria=[[-.32,-.28,.26],[.1,-.43,.2],[.37,-.05,.25],[-.13,.12,.2],[-.4,.35,.14]];for(const [mx,my,r]of maria){const d=Math.hypot(nx-mx,ny-my);if(d<r)texture-=.15*(1-d/r);}terrain[y*size+x]=texture;}
function drawPreview(angle){const lx=Math.sin(angle),lz=-Math.cos(angle);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x-center)/radius,ny=(center-y)/radius,d=nx*nx+ny*ny,index=(y*size+x)*4;if(d>1){pixels.data[index+3]=0;continue;}const nz=Math.sqrt(1-d);const light=Math.max(0,nx*lx+nz*lz);const brightness=(.07+.93*Math.pow(light,.72))*terrain[y*size+x];pixels.data[index]=Math.round(225*brightness);pixels.data[index+1]=Math.round(223*brightness);pixels.data[index+2]=Math.round(219*brightness);pixels.data[index+3]=Math.min(255,(1-d)*9000);}ctx.clearRect(0,0,size,size);ctx.putImageData(pixels,0,0);}
function phaseIndex(fraction){const scaled=fraction*8;const nearKey=Math.round(scaled);if(nearKey%2===0&&Math.abs(scaled-nearKey)<.075)return nearKey%8;return (Math.floor(scaled/2)*2+1)%8;}
function update(){const fraction=day/cycle,angle=fraction*Math.PI*2;moon.position.set(earthCenter.x-orbitRadius*Math.cos(angle),0,orbitRadius*Math.sin(angle));moon.rotation.y=-angle;const phase=phases[phaseIndex(fraction)];$('#phase-name').textContent=phase.name;$('#phase-description').textContent=phase.description;$('#phase-symbol').textContent=phase.symbol;$('#illumination').innerHTML=`${Math.round((1-Math.cos(angle))/2*100)}<span>%</span>`;$('#day-display').innerHTML=`${day.toFixed(1)}<span> / 29.5</span>`;$('#day-slider').value=day;$('#day-slider').setAttribute('aria-valuetext',`Day ${day.toFixed(1)} of 29.5, ${phase.name}`);$('#day-slider').style.background=`linear-gradient(to right,#9c88ca ${fraction*100}%,#ebe7f1 ${fraction*100}%)`;document.querySelectorAll('[data-day]').forEach(button=>{const selected=Math.abs(day-Number(button.dataset.day))<.16;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});drawPreview(angle);}
function setPlaying(value){playing=value;$('#play-icon').textContent=playing?'Ⅱ':'▶';$('#play-text').textContent=playing?'Pause orbit':'Play orbit';$('#play').setAttribute('aria-label',playing?'Pause orbit animation':'Play orbit animation');$('#play').setAttribute('aria-pressed',String(playing));}
function jumpTo(value){setPlaying(false);day=value;update();}
$('#day-slider').addEventListener('input',event=>jumpTo(Number(event.target.value)));
document.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>jumpTo(Number(button.dataset.day))));
$('#play').addEventListener('click',()=>setPlaying(!playing));
$('#reset').addEventListener('click',()=>{jumpTo(0);questionIndex=0;correctCount=0;renderQuestion();});
$('#view-button').addEventListener('click',()=>{overhead=!overhead;$('#view-button span').textContent=overhead?'Tilted view':'Top view';resize();});
const questions=[
{question:'At full moon, how much of the Moon’s visible face is lit?',options:['None of it','Half of it','All of it'],answer:2,day:14.75,explanation:'At full moon, Earth faces the sunlit half. Look at the model: Earth is between the Sun and Moon.',hint:'The model is now showing a full moon.'},
{question:'What causes the Moon’s changing phases?',options:['Earth’s shadow','Our changing view','The Moon makes light'],answer:1,day:7.375,explanation:'The Sun lights half of the Moon. As it orbits, our viewing angle changes. At first quarter, we see half of the sunlit face.',hint:'The model is now showing first quarter.'},
{question:'At new moon, where is the Moon in its orbit?',options:['Between Earth & Sun','Behind Earth','Above the Sun'],answer:0,day:0,explanation:'The Moon is on the Sun’s side of Earth. Its lit half faces away from us, so the Earth-view disk looks dark.',hint:'The model is now showing a new moon.'}
];
function renderQuestion(){const question=questions[questionIndex];$('#question-count').textContent=`${questionIndex+1} / 3`;$('#quiz-question').textContent=question.question;$('#quiz-options').replaceChildren();$('#quiz-feedback').textContent='';$('#quiz-hint').textContent='Choose an answer. Then see it in the model.';$('#quiz-next').hidden=true;$('#quiz-retry').hidden=true;question.options.forEach((option,index)=>{const button=document.createElement('button');button.textContent=option;button.addEventListener('click',()=>{jumpTo(question.day);const isCorrect=index===question.answer;if(isCorrect)correctCount++;[...$('#quiz-options').children].forEach((choice,i)=>{choice.disabled=true;choice.classList.toggle('correct',i===question.answer);choice.classList.toggle('incorrect',i===index&&!isCorrect);});$('#quiz-feedback').textContent=`${isCorrect?'That’s right!':'Not quite. See the highlighted answer.'} ${question.explanation}`;$('#quiz-hint').textContent=question.hint;if(questionIndex<2){$('#quiz-next').hidden=false;}else{$('#quiz-retry').hidden=false;$('#question-count').textContent=`${correctCount} / 3 correct`;$('#quiz-hint').textContent='Exploration complete. Keep experimenting!';}});$('#quiz-options').append(button);});}
$('#quiz-next').addEventListener('click',()=>{questionIndex++;renderQuestion();$('#quiz-options button').focus();});
$('#quiz-retry').addEventListener('click',()=>{questionIndex=0;correctCount=0;renderQuestion();$('#quiz-options button').focus();});
function animate(time){requestAnimationFrame(animate);const delta=lastTime?Math.min((time-lastTime)/1000,.1):0;lastTime=time;if(playing){day=(day+delta*.48)%cycle;update();}placeLabel('.sun-label',sun.position,63);placeLabel('.earth-label',earth.position,52);placeLabel('.moon-label',moon.position,-30);renderer.render(scene,camera);}
setPlaying(playing);resize();update();renderQuestion();requestAnimationFrame(animate);
