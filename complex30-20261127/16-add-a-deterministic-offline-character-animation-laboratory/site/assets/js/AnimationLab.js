import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DURATION = 4;
const FIXED_STEP = 1 / 120;
const SAMPLE_RATE = 30;
const SAMPLE_COUNT = 121;
const MAX_FRAME_DELTA = 0.25;
const DEG2RAD = Math.PI / 180;

const TIMES = [0, 1, 2, 3, 4];
const KEYS = {
    actorY: [0, 0.25, 0, 0.25, 0],
    leftArmXDeg: [0, -60, 0, 60, 0],
    rightArmXDeg: [0, 60, 0, -60, 0],
};

function interpolate(values, time) {
    if (time <= TIMES[0]) {
        return values[0];
    }
    for (let i = 1; i < TIMES.length; i++) {
        if (time <= TIMES[i]) {
            const ta = TIMES[i - 1];
            const tb = TIMES[i];
            return values[i - 1] + (values[i] - values[i - 1]) * (time - ta) / (tb - ta);
        }
    }
    return values[values.length - 1];
}

function sampleValues(time) {
    return {
        actorY: interpolate(KEYS.actorY, time),
        leftArmXDeg: interpolate(KEYS.leftArmXDeg, time),
        rightArmXDeg: interpolate(KEYS.rightArmXDeg, time),
    };
}

function roundSix(value) {
    return Number(value.toFixed(6));
}

function wrapTime(time) {
    return ((time % DURATION) + DURATION) % DURATION;
}

function makeNode(name) {
    const node = new THREE.Group();
    node.name = name;
    node.userData.nodeId = name;
    return node;
}

function buildActor() {
    const actor = makeNode("actor");

    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x3f8fce, roughness: 0.55 }),
    );
    torso.position.set(0, 1.2, 0);
    torso.name = "torso";
    torso.userData.nodeId = "torso";
    actor.add(torso);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 20),
        new THREE.MeshStandardMaterial({ color: 0xe6b48f, roughness: 0.7 }),
    );
    head.position.set(0, 2, 0);
    head.name = "head";
    head.userData.nodeId = "head";
    actor.add(head);

    for (const [name, x] of [["upperArmL", -0.55], ["upperArmR", 0.55]]) {
        const pivot = makeNode(name);
        pivot.position.set(x, 1.55, 0);

        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.8, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x2e6f9f, roughness: 0.6 }),
        );
        arm.position.set(0, -0.4, 0);
        pivot.add(arm);
        actor.add(pivot);
    }

    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 28, 18),
        new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.35 }),
    );
    ball.position.set(0, 1.1, 0.55);
    ball.name = "ball";
    ball.userData.nodeId = "ball";
    actor.add(ball);

    return actor;
}

function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10161c);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(6, 4, 8);
    camera.lookAt(0, 1, 0);

    scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x2b3034, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(4, 8, 5);
    scene.add(sun);

    const grid = new THREE.GridHelper(12, 24, 0x7ad4ad, 0x3a4a50);
    grid.material.opacity = 0.8;
    grid.material.transparent = true;
    scene.add(grid);

    const actor = buildActor();
    scene.add(actor);

    return { scene, camera, actor };
}

function createLabElement() {
    const lab = document.createElement("section");
    lab.id = "animation-lab";
    lab.setAttribute("aria-label", "Animation Lab");
    lab.innerHTML = `
        <div class="lab-heading">
            <div>
                <h2>Animation Lab</h2>
                <p class="lab-subtitle">Local procedural rig inspection</p>
            </div>
            <button type="button" data-lab-back class="lab-back">Back to menu</button>
        </div>
        <div class="lab-body">
            <div class="lab-canvas"></div>
            <aside class="lab-panel">
                <div class="lab-time">t = <output data-lab-time>0.000</output><span>s</span></div>
                <div class="lab-controls">
                    <button type="button" data-lab-play>Play</button>
                    <button type="button" data-lab-reset>Reset</button>
                    <button type="button" data-lab-step>Step</button>
                </div>
                <label class="lab-field">Speed
                    <select data-lab-speed>
                        <option value="0.5">0.5</option>
                        <option value="1" selected>1</option>
                        <option value="2">2</option>
                    </select>
                </label>
                <div class="lab-set-time">
                    <label class="lab-field">Time
                        <input data-lab-time-input type="text" inputmode="decimal" value="0">
                    </label>
                    <button type="button" data-lab-set-time>Set Time</button>
                </div>
                <p class="lab-status" data-lab-status role="status" aria-live="polite"></p>
                <button type="button" data-lab-export class="lab-export">Export samples</button>
                <textarea data-lab-output readonly spellcheck="false" aria-label="Exported animation samples"></textarea>
            </aside>
        </div>
    `;
    return lab;
}

export function launchAnimationLab(uiElement) {
    const originalMenu = uiElement.querySelector("#menu");
    if (!originalMenu) {
        throw new Error("Main menu not found");
    }

    const originalHeader = uiElement.querySelector("header");
    const originalFooter = uiElement.querySelector("footer");
    originalMenu.classList.add("hidden");
    originalHeader?.classList.add("lab-menu-hidden");
    originalFooter?.classList.add("lab-menu-hidden");

    const labElement = createLabElement();
    uiElement.appendChild(labElement);
    uiElement.classList.add("animation-lab-open");

    const { scene, camera, actor } = createScene();
    const canvasHost = labElement.querySelector(".lab-canvas");
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    canvasHost.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.update();

    const timeOutput = labElement.querySelector("[data-lab-time]");
    const statusElement = labElement.querySelector("[data-lab-status]");
    const outputElement = labElement.querySelector("[data-lab-output]");
    const playButton = labElement.querySelector("[data-lab-play]");
    const resetButton = labElement.querySelector("[data-lab-reset]");
    const stepButton = labElement.querySelector("[data-lab-step]");
    const speedSelect = labElement.querySelector("[data-lab-speed]");
    const timeInput = labElement.querySelector("[data-lab-time-input]");
    const setTimeButton = labElement.querySelector("[data-lab-set-time]");
    const exportButton = labElement.querySelector("[data-lab-export]");
    const backButton = labElement.querySelector("[data-lab-back]");

    let time = 0;
    let speed = 1;
    let playing = false;
    let lastTimestamp = null;
    let accumulated = 0;
    let frameId = null;
    let disposed = false;

    function sampleClip(sampleTime) {
        const values = sampleValues(sampleTime);
        actor.position.y = values.actorY;
        actor.getObjectByName("upperArmL").rotation.x = values.leftArmXDeg * DEG2RAD;
        actor.getObjectByName("upperArmR").rotation.x = values.rightArmXDeg * DEG2RAD;
        return values;
    }

    function updateTimeDisplay() {
        timeOutput.textContent = time.toFixed(3);
    }

    function setStatus(message, isError = false) {
        statusElement.textContent = message;
        statusElement.classList.toggle("is-error", isError);
    }

    function updatePlayButton() {
        playButton.textContent = playing ? "Pause" : "Play";
        playButton.setAttribute("aria-pressed", String(playing));
        stepButton.disabled = playing;
    }

    function setPlaying(nextPlaying) {
        if (disposed || playing === nextPlaying) {
            return;
        }
        playing = nextPlaying;
        lastTimestamp = null;
        accumulated = 0;
        updatePlayButton();
    }

    function advance(seconds) {
        time = wrapTime(time + seconds);
        sampleClip(time);
        updateTimeDisplay();
    }

    function resize() {
        const width = canvasHost.clientWidth;
        const height = canvasHost.clientHeight;
        if (width <= 0 || height <= 0) {
            return;
        }
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function renderFrame(timestamp) {
        frameId = null;
        if (disposed) {
            return;
        }
        if (playing) {
            const frameDelta = lastTimestamp === null
                ? 0
                : Math.min(Math.max((timestamp - lastTimestamp) / 1000, 0), MAX_FRAME_DELTA);
            lastTimestamp = timestamp;
            accumulated += frameDelta;
            while (accumulated + Number.EPSILON >= FIXED_STEP) {
                advance(FIXED_STEP * speed);
                accumulated -= FIXED_STEP;
            }
        }
        controls.update();
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(renderFrame);
    }

    playButton.addEventListener("click", () => setPlaying(!playing));

    resetButton.addEventListener("click", () => {
        playing = false;
        lastTimestamp = null;
        accumulated = 0;
        time = 0;
        speed = 1;
        speedSelect.value = "1";
        sampleClip(time);
        updateTimeDisplay();
        updatePlayButton();
        outputElement.value = "";
        setStatus("");
    });

    stepButton.addEventListener("click", () => {
        if (playing || disposed) {
            return;
        }
        advance(FIXED_STEP);
        setStatus("");
    });

    speedSelect.addEventListener("change", () => {
        const nextSpeed = Number(speedSelect.value);
        if ([0.5, 1, 2].includes(nextSpeed)) {
            speed = nextSpeed;
        }
    });

    setTimeButton.addEventListener("click", () => {
        const raw = timeInput.value.trim();
        const value = Number(raw);
        if (raw === "" || !Number.isFinite(value) || value < 0 || value > DURATION) {
            setStatus("Invalid time", true);
            return;
        }
        playing = false;
        lastTimestamp = null;
        accumulated = 0;
        time = value;
        sampleClip(time);
        updateTimeDisplay();
        updatePlayButton();
        setStatus("");
    });

    exportButton.addEventListener("click", () => {
        const samples = [];
        for (let i = 0; i < SAMPLE_COUNT; i++) {
            const sampleTime = i / SAMPLE_RATE;
            const values = sampleValues(sampleTime);
            samples.push({
                time: roundSix(sampleTime),
                actorY: roundSix(values.actorY),
                leftArmXDeg: roundSix(values.leftArmXDeg),
                rightArmXDeg: roundSix(values.rightArmXDeg),
            });
        }
        outputElement.value = JSON.stringify({
            duration: DURATION,
            sampleRate: SAMPLE_RATE,
            samples,
        }, null, 2);
        setStatus("Exported 121 samples");
    });

    backButton.addEventListener("click", () => dispose());

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvasHost);

    window.animationLab = {
        scene,
        camera,
        actor,
        sampleClip,
    };

    function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        playing = false;
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
        resizeObserver.disconnect();
        controls.dispose();
        scene.traverse((object) => {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
            } else {
                object.material?.dispose();
            }
        });
        renderer.dispose();
        renderer.domElement.remove();
        labElement.remove();
        uiElement.classList.remove("animation-lab-open");
        originalMenu.classList.remove("hidden");
        originalHeader?.classList.remove("lab-menu-hidden");
        originalFooter?.classList.remove("lab-menu-hidden");
        delete window.animationLab;
    }

    sampleClip(0);
    updatePlayButton();
    resize();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(renderFrame);

    return { dispose };
}
