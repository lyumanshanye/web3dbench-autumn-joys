<template>
  <div class="demo mnist-cnn">
    <div class="title">
      <span>Basic Convnet for MNIST</span>
    </div>
    <mdl-spinner v-if="modelLoading && loadingProgress < 100"></mdl-spinner>
    <div class="loading-progress" v-if="modelLoading && loadingProgress < 100">
      Loading...{{ loadingProgress }}%
    </div>
    <div class="columns input-output" v-if="!modelLoading">
      <div class="column input-column">
        <div class="input-container">
          <div class="input-label">Draw any digit (0-9) here <span class="arrow">⤸</span></div>
          <div class="canvas-container">
            <canvas
              id="input-canvas" width="240" height="240"
              @mousedown="activateDraw"
              @mouseup="deactivateDrawAndPredict"
              @mouseleave="deactivateDrawAndPredict"
              @mousemove="draw"
              @touchstart="activateDraw"
              @touchend="deactivateDrawAndPredict"
              @touchmove="draw"
            ></canvas>
            <canvas id="input-canvas-scaled" width="28" height="28" style="display:none;"></canvas>
            <canvas id="input-canvas-centercrop" style="display:none;"></canvas>
          </div>
          <div class="input-buttons">
            <div class="input-clear-button" @click="clear"><i class="material-icons">clear</i>CLEAR</div>
            <div class="input-clear-button reset-view-button" @click="resetView"><i class="material-icons">settings_backup_restore</i>RESET VIEW</div>
          </div>
        </div>
      </div>
      <div class="column is-2 controls-column">
        <mdl-switch v-model="useGpu" :disabled="modelLoading || !hasWebgl">use GPU</mdl-switch>
      </div>
      <div class="column output-column">
        <div class="output">
          <div class="output-class"
            :class="{ predicted: i === predictedClass }"
            v-for="i in outputClasses"
            :key="`output-class-${i}`"
          >
            <div class="output-label">{{ i }}</div>
            <div class="output-bar"
              :style="{ height: `${Math.round(100 * output[i])}px`, background: `rgba(27, 188, 155, ${output[i].toFixed(2)})` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <div class="layer-results-container"  v-if="!modelLoading" id="results-container">
    	<div id="webgl_container"></div>
    </div>
    <div class="layer-results-container view-controls-container" v-if="!modelLoading">
      <div class="view-controls">
        <div class="view-controls-heading">LAYER VISIBILITY</div>
        <div class="layer-visibility-controls">
          <label
            v-for="name in layerNames"
            :key="`layer-visibility-${name}`"
            class="layer-visibility-control"
          >
            <input
              type="checkbox"
              :checked="!hiddenLayersMap[name]"
              @change="setLayerVisible(name, $event.target.checked)"
            />
            <span>{{ name }}</span>
          </label>
        </div>
        <label class="labels-rotation-control">
          <input
            type="checkbox"
            :checked="labelsRotating"
            @change="setLabelsRotating($event.target.checked)"
          />
          <span>rotate labels</span>
        </label>
      </div>
    </div>
    <div class="layer-results-container" v-if="!modelLoading">
      <div class="bg-line"></div>
      <div
        v-for="(layerResult, layerIndex) in layerResultImages"
        :key="`intermediate-result-${layerIndex}`"
        class="layer-result"
      >
        <div class="layer-result-heading">
          <span class="layer-class">{{ layerResult.layerClass }}</span>
          <span> {{ layerDisplayConfig[layerResult.name].heading }}</span>
        </div>
        <div class="layer-result-canvas-container">
          <canvas v-for="(image, index) in layerResult.images"
            :key="`intermediate-result-${layerIndex}-${index}`"
            :id="`intermediate-result-${layerIndex}-${index}`"
            :width="image.width"
            :height="image.height"
            style="display:none;"
          ></canvas>
          <canvas v-for="(image, index) in layerResult.images"
            :key="`intermediate-result-${layerIndex}-${index}-scaled`"
            :id="`intermediate-result-${layerIndex}-${index}-scaled`"
            :width="layerDisplayConfig[layerResult.name].scalingFactor * image.width"
            :height="layerDisplayConfig[layerResult.name].scalingFactor * image.height"
          ></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import debounce from 'lodash/debounce'
import range from 'lodash/range'
import * as utils from '../../utils'
require('../../js/controls/myOrbitControls.js')
const MODEL_FILEPATHS_DEV = {
  model: '/demos/data/mnist_cnn/mnist_cnn.json',
  weights: '/demos/data/mnist_cnn/mnist_cnn_weights.buf',
  metadata: '/demos/data/mnist_cnn/mnist_cnn_metadata.json'
}
const MODEL_FILEPATHS_PROD = {
  model: 'https://transcranial.github.io/keras-js-demos-data/mnist_cnn/mnist_cnn.json',
  weights: 'https://transcranial.github.io/keras-js-demos-data/mnist_cnn/mnist_cnn_weights.buf',
  metadata: 'https://transcranial.github.io/keras-js-demos-data/mnist_cnn/mnist_cnn_metadata.json'
}
const MODEL_CONFIG = { filepaths: process.env.NODE_ENV === 'production' ? MODEL_FILEPATHS_PROD : MODEL_FILEPATHS_DEV }

const LAYER_DISPLAY_CONFIG = {
  input: { type:'conv', numFilters: 32, filterSize: 3, stride: 1, heading: '32 3x3 filters, padding valid, 1x1 strides', scalingFactor: 2, z: -155},
  conv2d_1: { type:'conv', numFilters: 32, filterSize: 3, stride: 1, heading: '32 3x3 filters, padding valid, 1x1 strides', scalingFactor: 2, z: -155},
  activation_1: { type:'activation', heading: 'ReLU', scalingFactor: 2, z: -105 },
  conv2d_2: { type:'conv', numFilters: 32, filterSize: 3, stride: 1, heading: '32 3x3 filters, padding valid, 1x1 strides', scalingFactor: 2, z: -55 },
  activation_2: { type:'activation',heading: 'ReLU', scalingFactor: 2, z: -5},
  max_pooling2d_1: { type:'pooling',filterSize:2,stride:1, heading: '2x2 pooling, 1x1 strides', scalingFactor: 2, z: 45 },
  dropout_1: { type:'dropout', heading: 'p=0.25 (only active during training phase)', scalingFactor: 2 },
  flatten_1: { type:'flatten', heading: '', scalingFactor: 2 , z: 95},
  dense_1: { type:'fc', outDim: 128, heading: 'output dimensions 128', scalingFactor: 4, z: 135 },
  activation_3: { type:'activation', heading: 'ReLU', scalingFactor: 4, z: 185 },
  dropout_2: { type:'dropout', heading: 'p=0.5 (only active during training phase)', scalingFactor: 4 },
  dense_2: { type:'fc', outDim: 128, heading: 'output dimensions 10', scalingFactor: 8 , z: 235 },
  activation_4: { type:'softmax', heading: 'Softmax', scalingFactor: 8 , z: 285}
}

const VIEW_STORAGE_KEY = 'kerasjs.mnist-cnn.viz.v1'
const LAYER_NAMES = Object.keys(LAYER_DISPLAY_CONFIG)
const DEFAULT_CAMERA_POSITION = [0, 0, 5000]
const DEFAULT_CAMERA_TARGET = [0, 0, 0]

const copyArray = function(value) {
  return value.slice()
}

const defaultViewState = function() {
  return {
    version: 1,
    camera: {
      position: copyArray(DEFAULT_CAMERA_POSITION),
      target: copyArray(DEFAULT_CAMERA_TARGET)
    },
    hiddenLayers: [],
    labelsRotating: true
  }
}

const isFiniteVector = function(value) {
  return Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && isFinite(n))
}

const sameVector = function(a, b) {
  return a.every((value, index) => value === b[index])
}

const normalizeViewState = function(value) {
  const state = defaultViewState()
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) {
    return state
  }

  if (value.camera && typeof value.camera === 'object' && !Array.isArray(value.camera)) {
    if (isFiniteVector(value.camera.position)) {
      state.camera.position = copyArray(value.camera.position)
    }
    if (isFiniteVector(value.camera.target)) {
      state.camera.target = copyArray(value.camera.target)
    }
  }
  if (sameVector(state.camera.position, state.camera.target)) {
    state.camera.position = copyArray(DEFAULT_CAMERA_POSITION)
  }

  if (Array.isArray(value.hiddenLayers)) {
    state.hiddenLayers = value.hiddenLayers.filter((name, index, names) =>
      LAYER_NAMES.indexOf(name) !== -1 && names.indexOf(name) === index
    )
  }
  if (typeof value.labelsRotating === 'boolean') {
    state.labelsRotating = value.labelsRotating
  }
  return state
}

const readViewState = function() {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (raw === null) return defaultViewState()
    return normalizeViewState(JSON.parse(raw))
  } catch (e) {
    return defaultViewState()
  }
}

const writeViewState = function(state) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(normalizeViewState(state)))
  } catch (e) {
    // Storage can be unavailable or full; rendering must continue regardless.
  }
}

export default {
  props: ['hasWebgl'],

  data: function() {
    const initialView = readViewState()
    const model = new KerasJS.Model(Object.assign({ gpu: this.hasWebgl }, MODEL_CONFIG)) // eslint-disable-line
    model.ready().catch(() => {})
    return {
      useGpu: this.hasWebgl,
      model,
      modelLoading: true,
      modelReady: false,
      input: new Float32Array(784),
      output: new Float32Array(10),
      outputClasses: range(10),
      layerResultImages: [],
      layerDisplayConfig: LAYER_DISPLAY_CONFIG,
      layerNames: LAYER_NAMES,
      hiddenLayers: initialView.hiddenLayers.slice(),
      labelsRotating: initialView.labelsRotating,
      initialView,
      drawing: false,
      strokes: []
    }
  },

  watch: {
    useGpu: function(value) {
      this.model.toggleGpu(value)
    }
  },

  computed: {
    loadingProgress: function() {
      return this.model.getLoadingProgress()
    },
    predictedClass: function() {
      if (this.output.reduce((a, b) => a + b, 0) === 0) {
        return -1
      }
      return this.output.reduce((argmax, n, i) => (n > this.output[argmax] ? i : argmax), 0)
    },
    hiddenLayersMap: function() {
      const map = {}
      this.hiddenLayers.forEach(name => { map[name] = true })
      return map
    }
  },

  mounted: function() {
    this.$nextTick(() => {
      this.initWebgl()
      this.model.ready().then(() => {
        this.modelReady = true
        this.modelLoading = false
        this.$nextTick(() => this.getIntermediateResults())
      }).catch(() => {
        this.modelLoading = false
      })
    })
  },

  methods: {
	initWebgl: function() {			
		const container = document.getElementById("webgl_container");
        this.container = container;

        this.originalWidth = 0.95*container.offsetWidth ;
		this.originalHeight = 1000;
        this.rotatingCam = false;
		this.posX = [];
		this.posY = [];
		this.posZ = [];
		this.layerNum = [];
		this.points = null;
		this.pointLayers = [];
		this.pointImages = [];
		this.pointMap = {};
		this.pickedPoint = null;
		this.lines = null;
		this.textPivots = null;
		this.layerObjects = {};
		this.viewObjects = [];
		this.fixtureMode = false;
		this.restoringView = true;
		this.clicked = false;

		const scene = new THREE.Scene();
        //scene.background = new THREE.Color( 0xff0000 );
        this.scene = scene;

		scene.fog = new THREE.Fog( 0xffffff, 1, 10000 );
		scene.fog.color.setHSL( 0.6, 0, 1 );

		const highlightBox = new THREE.Mesh(
			new THREE.BoxGeometry( 12,12,12 ),
			new THREE.MeshLambertMaterial( { color: 0xffff00 }
		) );
		highlightBox.visible = false;
		scene.add( highlightBox );
        this.highlightBox = highlightBox;

	    const camera = new THREE.PerspectiveCamera( 75, this.originalWidth / this.originalHeight, 1, 15000 );
	    camera.position.set( DEFAULT_CAMERA_POSITION[0], DEFAULT_CAMERA_POSITION[1], DEFAULT_CAMERA_POSITION[2] );
        this.camera = camera;

	    const renderer = new THREE.WebGLRenderer({ antialias: true});
        renderer.setClearColor( 0xFFAAFF );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.sortObjects = false;
	    renderer.setSize( this.originalWidth, this.originalHeight );
        this.renderer = renderer;

		var cameraControls = new THREE.OrbitControls( this.camera, renderer.domElement );
		cameraControls.target.set( DEFAULT_CAMERA_TARGET[0], DEFAULT_CAMERA_TARGET[1], DEFAULT_CAMERA_TARGET[2] );
		cameraControls.addEventListener( 'change', this.onCameraChange );
		this.cameraControls = cameraControls;

		var loader = new THREE.FontLoader();
		loader.load( 'https://raw.githubusercontent.com/rollup/three-jsnext/master/examples/fonts/droid/droid_sans_bold.typeface.json',
			font => this.setFont(font),
			undefined,
			() => this.setFont(null)
		);

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

	    container.appendChild( renderer.domElement );
		renderer.domElement.addEventListener( 'mousemove', this.onMouseMove );
		renderer.domElement.addEventListener( 'mousedown', this.onMouseDown );
		renderer.domElement.addEventListener( 'click', this.onClick );
		renderer.domElement.addEventListener( 'mouseup', this.onMouseUp );
		window.addEventListener( 'resize', this.onWindowResize, false );

		this.restoreView();
		this.restoringView = false;
		this.installVizApi();
		this.animate();
	},

	restoreView: function() {
		const state = this.initialView
		this.hiddenLayers = state.hiddenLayers.slice()
		this.labelsRotating = state.labelsRotating
		this.camera.position.set( ...state.camera.position )
		this.cameraControls.target.set( ...state.camera.target )
		this.cameraControls.update()
		this.applyAllLayerVisibility()
	},

	animate: function() {
		requestAnimationFrame( this.animate );
		if(this.textPivots !== null) {
			if (this.labelsRotating) {
				this.textPivots.forEach((pivot, pivotNum) => {
					pivot.rotation.y += 0.015;
				});
			}
		}
		this.render();
    },
 
	render: function() {
		if(!this.clicked){
			this.raycaster.setFromCamera( this.mouse, this.camera );
			if(this.points !== null){
				var intersects = this.raycaster.intersectObject( this.points );
				if ( intersects.length > 0 ) {
					console.log(intersects);
					if ( this.pickedPoint != intersects[ 0 ].index ) {
						//attributes.size.array[ this.pickedPoint ] = 14;
						//this.pickedPoint = intersects[ 0 ].index;
						//attributes.size.array[ this.pickedPoint ] = 16;
						//attributes.size.needsUpdate = true;
					}
				} else if ( this.pickedPoint !== null ) {
					//attributes.size.array[ this.pickedPoint ] = 14;
					//attributes.size.needsUpdate = true;
					//this.pickedPoint = null;
				}
			}
		}
		this.renderer.render( this.scene, this.camera );
	},

	

	setFont: function( font ) {
		this.font = font;
	},
		
	onWindowResize: function( e ) {
			//render();
	},
		
	onMouseDown: function( e ) {
		this.rotatingCam = true;
		this.clicked = true;
	},
	
	onClick: function( e ) {
		//console.log('click');
	},
	
	onMouseUp: function( e ) {
		//console.log('mouse up');
		this.rotatingCam = false;	
		this.clicked = false;
		
	},

	onMouseMove: function( e ) {
		event.preventDefault();
		this.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
	},

    clear: function() {
      this.clearIntermediateResults();
      const ctx = document.getElementById('input-canvas').getContext('2d')
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      const ctxCenterCrop = document.getElementById('input-canvas-centercrop').getContext('2d')
      ctxCenterCrop.clearRect(0, 0, ctxCenterCrop.canvas.width, ctxCenterCrop.canvas.height)
      const ctxScaled = document.getElementById('input-canvas-scaled').getContext('2d')
      ctxScaled.clearRect(0, 0, ctxScaled.canvas.width, ctxScaled.canvas.height)
      this.output = new Float32Array(10)
      this.drawing = false
      this.strokes = []
      this.layerResultImages = []
      this.clearActivationGeometry()
    },

    removeViewObject: function(object) {
      if (!object || !this.scene) return
      if (object.parent) object.parent.remove(object)
      this.scene.remove(object)
      if (object.geometry && typeof object.geometry.dispose === 'function') object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(material => {
        if (material && typeof material.dispose === 'function') material.dispose()
      })
    },

    clearActivationGeometry: function() {
      const objects = []
      this.scene.children.slice().forEach(object => {
        if (object === this.highlightBox) return
        if (object.userData && object.userData.mnistActivation) objects.push(object)
      })
      this.viewObjects.forEach(object => {
        if (objects.indexOf(object) === -1) objects.push(object)
      })
      objects.forEach(object => this.removeViewObject(object))
      this.viewObjects = []
      this.layerObjects = {}
      this.points = null
      this.textPivots = null
      this.pointLayers = []
      this.pointImages = []
      this.pointMap = {}
    },

    addViewObject: function(object, layerName) {
      if (object.userData === undefined) object.userData = {}
      object.userData.mnistActivation = true
      object.userData.mnistLayer = layerName
      this.scene.add(object)
      this.viewObjects.push(object)
      if (!this.layerObjects[layerName]) {
        this.layerObjects[layerName] = { points: [], lines: [], text: [], all: [] }
      }
      this.layerObjects[layerName].all.push(object)
      return object
    },

    registerLayerObject: function(layerName, kind, object) {
      if (!this.layerObjects[layerName]) {
        this.layerObjects[layerName] = { points: [], lines: [], text: [], all: [] }
      }
      this.layerObjects[layerName][kind].push(object)
    },

    smallLabel: function(text, x, y, z, size, color, layerName) {
      const geometry = new THREE.BoxGeometry( size, size * 0.6, 4 )
      const material = new THREE.MeshBasicMaterial({ color })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      if (this.font) {
        const textMesh = this.createLabel(text, x, y, z, size, color)
        this.scene.add(textMesh)
        this.viewObjects.push(textMesh)
        textMesh.userData.mnistActivation = true
        textMesh.userData.mnistLayer = layerName
        this.registerLayerObject(layerName, 'text', textMesh)
        this.registerLayerObject(layerName, 'text', mesh)
      }
      return mesh
    },

    createFixtureLayer: function(name, z) {
      const geometry = new THREE.Geometry()
      const coordinates = [-10, 0, 10]
      coordinates.forEach(y => {
        coordinates.forEach(x => {
          geometry.vertices.push(new THREE.Vector3(x, y, z))
          geometry.colors.push(new THREE.Color(1, 1, 1))
        })
      })
      const material = new THREE.PointsMaterial({
        size: 14,
        transparent: false,
        opacity: 0.9,
        vertexColors: THREE.VertexColors
      })
      const points = new THREE.Points(geometry, material)
      points.name = `layer:${name}`
      this.addViewObject(points, name)
      this.registerLayerObject(name, 'points', points)

      const lineGeometry = new THREE.BufferGeometry()
      lineGeometry.addAttribute('position', new THREE.Float32BufferAttribute(
        geometry.vertices.reduce((values, vertex) => values.concat([vertex.x, vertex.y, vertex.z]), []),
        3
      ))
      const line = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0xffffff }))
      line.name = `lines:${name}`
      this.addViewObject(line, name)
      this.registerLayerObject(name, 'lines', line)

      const pivot = new THREE.Object3D()
      pivot.name = `text:${name}`
      const labelObject = this.smallLabel(name, 0, 100, z, 30, 0xffffff, name)
      pivot.add(labelObject)
      this.addViewObject(pivot, name)
      this.registerLayerObject(name, 'text', pivot)
      return points
    },

    loadFixture: function() {
      if (!this.scene) return null
      this.clearActivationGeometry()
      this.fixtureMode = true
      this.createFixtureLayer('input', -155)
      this.createFixtureLayer('activation_1', -105)
      this.createFixtureLayer('dense_2', 285)
      this.output = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => i / 45))
      this.textPivots = []
      for (let i = 0; i < 10; i++) {
        const pivot = new THREE.Object3D()
        pivot.name = `output-label:${i}`
        pivot.add(this.smallLabel(i.toString(), (i - 4) * 100, 2000, 300, 10, 0x00ffff, 'labels'))
        this.outputLabels = this.outputLabels || []
        this.outputLabels.push(pivot)
        this.scene.add(pivot)
        this.viewObjects.push(pivot)
        pivot.userData.mnistActivation = true
        pivot.userData.mnistLayer = null
        this.textPivots.push(pivot)
      }
      this.applyAllLayerVisibility()
      return this.layerObjects
    },

    applyLayerVisibility: function(name) {
      const objects = this.layerObjects[name]
      if (!objects) return
      const visible = this.hiddenLayers.indexOf(name) === -1
      objects.all.forEach(object => { object.visible = visible })
      if (this.highlightBox && this.highlightBox.visible && !visible) {
        this.highlightBox.visible = false
      }
    },

    applyAllLayerVisibility: function() {
      Object.keys(this.layerObjects).forEach(name => this.applyLayerVisibility(name))
    },

    setLayerVisible: function(name, visible) {
      if (typeof visible !== 'boolean' || LAYER_NAMES.indexOf(name) === -1) return false
      const hidden = this.hiddenLayers.filter(layerName => layerName !== name)
      if (!visible) hidden.push(name)
      hidden.sort((a, b) => LAYER_NAMES.indexOf(a) - LAYER_NAMES.indexOf(b))
      this.hiddenLayers = hidden
      this.applyLayerVisibility(name)
      this.saveViewState()
      return true
    },

    setLabelsRotating: function(value) {
      if (typeof value !== 'boolean') return false
      this.labelsRotating = value
      this.saveViewState()
      return true
    },

    onCameraChange: function() {
      if (this.restoringView) return
      this.saveViewState()
    },

    getCameraState: function() {
      return {
        position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
        target: [this.cameraControls.target.x, this.cameraControls.target.y, this.cameraControls.target.z]
      }
    },

    getViewState: function() {
      const camera = this.camera && this.cameraControls ? this.getCameraState() : {
        position: copyArray(this.initialView.camera.position),
        target: copyArray(this.initialView.camera.target)
      }
      return {
        version: 1,
        camera: {
          position: copyArray(camera.position),
          target: copyArray(camera.target)
        },
        hiddenLayers: this.hiddenLayers.slice(),
        labelsRotating: this.labelsRotating
      }
    },

    saveViewState: function() {
      writeViewState(this.getViewState())
    },

    setCamera: function(position, target) {
      if (!this.camera || !this.cameraControls) return false
      if (!isFiniteVector(position) || !isFiniteVector(target) || sameVector(position, target)) return false
      this.camera.position.set(...position)
      this.cameraControls.target.set(...target)
      this.cameraControls.update()
      this.saveViewState()
      return true
    },

    resetView: function() {
      this.hiddenLayers = []
      this.labelsRotating = true
      if (this.camera && this.cameraControls) {
        this.camera.position.set(...DEFAULT_CAMERA_POSITION)
        this.cameraControls.target.set(...DEFAULT_CAMERA_TARGET)
        this.cameraControls.update()
      }
      this.applyAllLayerVisibility()
      this.saveViewState()
      return true
    },

    getSnapshot: function() {
      const state = this.getViewState()
      const camera = this.camera && this.cameraControls ? this.getCameraState() : state.camera
      const objects = (this.viewObjects || [])
        .filter(object => object.isPoints && object.name.indexOf('layer:') === 0)
        .map(object => {
          const positions = []
          object.geometry.vertices.forEach(vertex => positions.push(vertex.x, vertex.y, vertex.z))
          return {
            name: object.name,
            visible: object.visible,
            position: positions
          }
        })
      return {
        state: normalizeViewState(JSON.parse(JSON.stringify(state))),
        camera: {
          position: copyArray(camera.position),
          target: copyArray(camera.target)
        },
        objects,
        labelPivotRotations: (this.textPivots || []).map(pivot => pivot.rotation.y),
        highlightBoxPresent: !!(this.highlightBox && this.highlightBox.parent === this.scene)
      }
    },

    installVizApi: function() {
      window.__mnistViz = {
        loadFixture: () => this.loadFixture(),
        getSnapshot: () => this.getSnapshot(),
        setCamera: (position, target) => this.setCamera(position, target),
        setLayerVisible: (name, visible) => this.setLayerVisible(name, visible),
        setLabelsRotating: value => this.setLabelsRotating(value),
        resetView: () => this.resetView()
      }
    },

    createConnectingLines: function(geometry, layerName) {
      if (!geometry.vertices.length) return
      const positions = []
      geometry.vertices.forEach(vertex => positions.push(vertex.x, vertex.y, vertex.z))
      const lineGeometry = new THREE.BufferGeometry()
      lineGeometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      const line = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0xffffff }))
      line.name = `lines:${layerName}`
      this.addViewObject(line, layerName)
      this.registerLayerObject(layerName, 'lines', line)
    },
    activateDraw: function(e) {
      this.drawing = true
      this.strokes.push([])
      let points = this.strokes[this.strokes.length - 1]
      points.push(utils.getCoordinates(e))
    },
    draw: function(e) {
      if (!this.drawing) return

      const ctx = document.getElementById('input-canvas').getContext('2d')

      ctx.lineWidth = 20
      ctx.lineJoin = ctx.lineCap = 'round'
      ctx.strokeStyle = '#393E46'

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      let points = this.strokes[this.strokes.length - 1]
      points.push(utils.getCoordinates(e))

      // draw individual strokes
      for (let s = 0, slen = this.strokes.length; s < slen; s++) {
        points = this.strokes[s]

        let p1 = points[0]
        let p2 = points[1]
        ctx.beginPath()
        ctx.moveTo(...p1)

        // draw points in stroke
        // quadratic bezier curve
        for (let i = 1, len = points.length; i < len; i++) {
          ctx.quadraticCurveTo(...p1, ...utils.getMidpoint(p1, p2))
          p1 = points[i]
          p2 = points[i + 1]
        }
        ctx.lineTo(...p1)
        ctx.stroke()
      }
    },
    deactivateDrawAndPredict: debounce(
      function() {
        if (!this.drawing) return
        this.drawing = false

        const ctx = document.getElementById('input-canvas').getContext('2d')

        // center crop
        const imageDataCenterCrop = utils.centerCrop(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height))
        const ctxCenterCrop = document.getElementById('input-canvas-centercrop').getContext('2d')
        ctxCenterCrop.canvas.width = imageDataCenterCrop.width
        ctxCenterCrop.canvas.height = imageDataCenterCrop.height
        ctxCenterCrop.putImageData(imageDataCenterCrop, 0, 0)

        // scaled to 28 x 28
        const ctxScaled = document.getElementById('input-canvas-scaled').getContext('2d')
        ctxScaled.save()
        ctxScaled.scale(28 / ctxCenterCrop.canvas.width, 28 / ctxCenterCrop.canvas.height)
        ctxScaled.clearRect(0, 0, ctxCenterCrop.canvas.width, ctxCenterCrop.canvas.height)
        ctxScaled.drawImage(document.getElementById('input-canvas-centercrop'), 0, 0)
        const imageDataScaled = ctxScaled.getImageData(0, 0, ctxScaled.canvas.width, ctxScaled.canvas.height)
        ctxScaled.restore()

        // process image data for model input
        const { data } = imageDataScaled
        this.input = new Float32Array(784)
        for (let i = 0, len = data.length; i < len; i += 4) {
          this.input[i / 4] = data[i + 3] / 255
        }

        this.model.predict({ input: this.input }).then(outputData => {
          this.output = outputData.output;
          this.fixtureMode = false
          this.clearActivationGeometry()
          this.getIntermediateResults();
        })
      },
      200,
      { leading: true, trailing: true }
    ),
    getIntermediateResults: function() {
      if (!this.modelReady) return
      let results = []
      for (let [name, layer] of this.model.modelLayersMap.entries()) {
        if (name.startsWith('dropout')) continue

        const layerClass = layer.layerClass || ''

        let images = []
		console.log(layer)
		if (layer.result) {
		    if (layer.result.tensor.shape.length === 3) {
		      images = utils.unroll3Dtensor(layer.result.tensor)
		    } else if (layer.result.tensor.shape.length === 2) {
		      images = [utils.image2Dtensor(layer.result.tensor)]
		    } else if (layer.result.tensor.shape.length === 1) {
		      images = [utils.image1Dtensor(layer.result.tensor)]
		    }
		    results.push({ name, layerClass, images })
		}
      }
      this.layerResultImages = results
      setTimeout(() => {
        this.showIntermediateResults()
        this.displayOutput()
      }, 0)
    },

    showIntermediateResults: function() {
      this.layerResultImages.forEach((result, layerNum) => {
        if (!this.layerDisplayConfig[result.name]) return
        const scalingFactor = this.layerDisplayConfig[result.name].scalingFactor
        result.images.forEach((image, imageNum) => {
          const ctx = document.getElementById(`intermediate-result-${layerNum}-${imageNum}`).getContext('2d')
          ctx.putImageData(image, 0, 0)
          const ctxScaled = document
            .getElementById(`intermediate-result-${layerNum}-${imageNum}-scaled`)
            .getContext('2d')
          ctxScaled.save()
          ctxScaled.scale(scalingFactor, scalingFactor)
          ctxScaled.clearRect(0, 0, ctxScaled.canvas.width, ctxScaled.canvas.height)
          ctxScaled.drawImage(document.getElementById(`intermediate-result-${layerNum}-${imageNum}`), 0, 0)
          ctxScaled.restore()
        })
      })
    },
    clearIntermediateResults: function() {
      this.layerResultImages.forEach((result, layerNum) => {
        if (!this.layerDisplayConfig[result.name]) return
        const scalingFactor = this.layerDisplayConfig[result.name].scalingFactor
        result.images.forEach((image, imageNum) => {
          const ctxScaled = document
            .getElementById(`intermediate-result-${layerNum}-${imageNum}-scaled`)
            .getContext('2d')
          ctxScaled.save()
          ctxScaled.scale(scalingFactor, scalingFactor)
          ctxScaled.clearRect(0, 0, ctxScaled.canvas.width, ctxScaled.canvas.height)
          ctxScaled.restore()
        })
      })
    },
	displayOutput: function() {
        if(this.layerResultImages.length <= 1) {
			return;	
		}
		//if(this.points === null) { 
		var geometry = new THREE.Geometry();
		var colors = [];
		geometry.colors = colors;

		if (this.viewObjects.length > 0) {
			this.clearActivationGeometry();
		}
		this.fixtureMode = false;

		// material
		var material = new THREE.PointsMaterial( {
			size: 14,
			transparent: false,
			opacity: 0.9,
			vertexColors: THREE.VertexColors
		} );

		this.pointLayers = [];
		this.pointImages = [];
		this.pointMap = {};
		var nPoints = 0;
	    var layerX = 0; var layerY = 0; var layerZ = 0; var height = 0; var width = 0; var fc = false; var xPos = 0; var yPos = 0; var spacing = 0; var len = 0; 
		this.layerResultImages.forEach((result, layerNum) => {
	        var images = result.images;
	        len = Math.ceil(Math.sqrt(images.length));
	        layerZ = -layerNum * 450;
	    	layerY =  0;
	        if(images.length==1 && images[0].height==1) {
	            fc = true;
	            spacing = 18;
			} else {
	            fc = false;
	            spacing = 10;
	    		xPos = layerY - len/2 *images[0].width*11;
				yPos = layerX + len/2 *images[0].height*11;
				var text = this.createLabel(result.name, 0, yPos+100, layerZ, 100, "white");
				this.addViewObject(text, result.name);
				this.registerLayerObject(result.name, 'text', text);
			}
	    	images.forEach((image, imageNum) => {
	            width = image.width;
	            height = image.height;
	            if(fc) {  
	                len = Math.ceil(Math.sqrt(width));
	            	width = len;
	            	height = Math.ceil(width/height);
	        		xPos = layerX - len/2 * 18;
	    			yPos = layerY + len/2 * 18;
					var text = this.createLabel(result.name, 0, yPos+100, layerZ, 30, "white");
					this.addViewObject(text, result.name);
				this.registerLayerObject(result.name, 'text', text);
	            } else {
	        		xPos = layerY + (-len/2 + imageNum%len)*image.width*11;
	    			yPos = layerX - (-len/2 + Math.floor(imageNum/len))*image.height*11;
	            }
				for ( var xInd = 0; xInd < width; xInd ++ ) {
					for ( var yInd = 0; yInd < height; yInd ++ ) {
			            if(fc && (xInd*width + yInd >= image.width)) { 
			            	break;
			            }
						var position = new THREE.Vector3();
						position.y = yPos-xInd*spacing;
						position.x = xPos+yInd*spacing;
						position.z = layerZ;

						this.pointMap[position] = nPoints;
						this.pointLayers.push(layerNum);
						this.pointImages.push(imageNum);
						// add it to the geometry
						geometry.vertices.push(position);
		
						var v = image.data[(xInd*width+yInd)*4];
						if(fc)
							v = image.data[(xInd*width+yInd)*4+3];
	                    colors.push(new THREE.Color( v/255.0,v/255.0,v/255.0));
	                    nPoints++;
					}
				}
			});
		});
		this.textPivots = [];
		for(var i = 0 ; i<10; i++){
			var text = this.createLabel(i.toString(), (i-4)*100, yPos+2000, layerZ+200*this.output[i], 600*this.output[i], "cyan");
			this.addViewObject(text, 'labels');
			this.textPivots.push(text);
		}
		this.points = [];
		this.layerResultImages.forEach((result, layerNum) => {
			const layerGeometry = new THREE.Geometry();
			let inLayer = false;
			for (let pointIndex = 0; pointIndex < this.pointLayers.length; pointIndex++) {
				const pointLayer = this.pointLayers[pointIndex];
				if (pointLayer === layerNum) {
					inLayer = true;
					layerGeometry.vertices.push(geometry.vertices[pointIndex].clone());
					layerGeometry.colors.push(geometry.colors[pointIndex]);
				} else if (inLayer) {
					break;
				}
			}
			var pointCloud = new THREE.Points( layerGeometry, material.clone() );
			pointCloud.name = `layer:${result.name}`;
			this.addViewObject( pointCloud, result.name );
			this.registerLayerObject(result.name, 'points', pointCloud);
			this.points.push(pointCloud);
			this.createConnectingLines(layerGeometry, result.name);
		});
		this.applyAllLayerVisibility();
		/*} else {
			var nPoints = 0;
			this.layerResultImages.forEach((result, layerNum) => {
		    	result.images.forEach((image, imageNum) => {
					for ( var xInd = 0; xInd < image.width; xInd ++ ) {
						for ( var yInd = 0; yInd < image.height; yInd ++ ) {
							var v = image.data[(xInd*width+yInd)*4+3];
		                    this.points.geometry.colors[nPoints].setRGB(v/255.0,v/255.0,v/255.0);
							nPoints++;
						}
					}
				});
			});
			this.points.geometry.colorsNeedUpdate = true;
		}*/		
	},
    createLabel: function(text, x, y, z, size, color) {
		if (!this.font || !THREE.TextGeometry) {
			var fallback = new THREE.Mesh(
				new THREE.BoxGeometry( Math.max( size, 1 ), Math.max( size * 0.6, 1 ), 4 ),
				new THREE.MeshBasicMaterial({ color: color })
			);
			fallback.position.set( x, y, z );
			fallback.name = `label:${text}`;
			return fallback;
		}
		var materialFront = new THREE.MeshBasicMaterial( { color: color} );
		var materialSide = new THREE.MeshBasicMaterial( { color: 0x000088 } );
		var materialArray = [ materialFront, materialSide ];
		var textGeom = new THREE.TextGeometry( text, 
		{
			size: size, height: 4, curveSegments: 3, font: this.font,
			bevelThickness: 1, bevelSize: 2, bevelEnabled: true,
			material: 0, extrudeMaterial: 1
		});
	
		var textMesh = new THREE.Mesh(textGeom, materialArray );
		textGeom.computeBoundingBox();
    	textGeom.textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;
		textMesh.position.set( x-textGeom.textWidth/2, y, z );
		return textMesh;
	}
  }
}
</script>

<style scoped>
@import '../../variables.css';

.demo.mnist-cnn {
  & .column {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  & .column.input-column {
    justify-content: flex-end;

    & .input-container {
      text-align: right;
      margin: 20px;
      position: relative;
      user-select: none;

      & .input-label {
        font-family: var(--font-cursive);
        font-size: 18px;
        color: var(--color-lightgray);
        text-align: right;

        & span.arrow {
          font-size: 36px;
          color: #CCCCCC;
          position: absolute;
          right: -32px;
          top: 8px;
        }
      }

      & .canvas-container {
        display: inline-flex;
        justify-content: flex-end;
        margin: 10px 0;
        border: 15px solid var(--color-green-lighter);
        transition: border-color 0.2s ease-in;

        &:hover {
          border-color: var(--color-green-light);
        }

        & canvas {
          background: whitesmoke;

          &:hover {
            cursor: crosshair;
          }
        }
      }

      & .input-buttons {
        display: flex;
        align-items: center;
        justify-content: flex-end;

        & .input-clear-button {
          display: flex;
          align-items: center;
          color: var(--color-lightgray);
          transition: color 0.2s ease-in;

          & .material-icons {
            margin-right: 5px;
          }

          &:hover {
            color: var(--color-green-lighter);
            cursor: pointer;
          }

          &.reset-view-button {
            margin-left: 20px;
          }
        }
      }
    }
  }

  & .column.controls-column {
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: 80px;
  }

  & .column.output-column {
    justify-content: center;

    & .output {
      height: 160px;
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      justify-content: center;
      user-select: none;
      cursor: default;

      & .output-class {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        border-bottom: 2px solid var(--color-green-lighter);

        & .output-label {
          font-family: var(--font-monospace);
          font-size: 1.5rem;
          color: var(--color-lightgray);
        }

        & .output-bar {
          width: 8px;
          background: #EEEEEE;
          transition: height 0.2s ease-out;
        }
      }

      & .output-class.predicted {
        border-bottom-color: var(--color-green);

        & .output-label {
          color: var(--color-green);
        }
      }
    }
  }

  & .layer-results-container {
    position: relative;
    height: 1000px;
    & #webgl_container {
		z-index: 10;
        display: block;
    }

    & .bg-line {
      position: absolute;
      z-index: 0;
      top: 0;
      left: 50%;
      background: whitesmoke;
      width: 15px;
      height: 100%;
    }

    & .layer-result {
      position: relative;
      z-index: 1;
      margin: 30px 20px;
      background: whitesmoke;
      border-radius: 10px;
      padding: 20px;
      overflow-x: auto;

      & .layer-result-heading {
        font-size: 1rem;
        color: #999999;
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        font-size: 12px;

        & span.layer-class {
          color: var(--color-green);
          font-size: 14px;
          font-weight: bold;
        }
      }

      & .layer-result-canvas-container {
        display: inline-flex;
        flex-wrap: wrap;
        background: whitesmoke;

        & canvas {
          border: 1px solid lightgray;
          margin: 1px;
        }
      }
    }
  }

  & .view-controls-container {
    height: auto;
    margin-top: -30px;

    & .view-controls {
      position: relative;
      z-index: 2;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: whitesmoke;
      border-radius: 10px;
      color: var(--color-lightgray);
      font-family: var(--font-monospace);
      font-size: 12px;

      & .view-controls-heading {
        margin-bottom: 10px;
        color: var(--color-green);
        font-weight: bold;
      }

      & .layer-visibility-controls {
        display: flex;
        flex-wrap: wrap;
      }

      & .layer-visibility-control,
      & .labels-rotation-control {
        display: flex;
        align-items: center;
        margin: 4px 14px 4px 0;
        cursor: pointer;

        & input {
          margin-right: 5px;
        }
      }

      & .labels-rotation-control {
        margin-top: 12px;
      }
    }
  }
}

</style>
