// Global imports -
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import gsap from 'gsap';

// Local imports -
// Components
import Renderer from './components/renderer';
import Camera from './components/camera';
import Light from './components/light';
import Controls from './components/controls';
import Geometry from './components/geometry';

// Helpers
import Stats from './helpers/stats';
import MeshHelper from './helpers/meshHelper';

// Model
import Texture from './model/texture';
import Model from './model/model';

// Managers
import Interaction from './managers/interaction';
import DatGUI from './managers/datGUI';

// data
import Config from './../data/config';
// -- End of imports



// This class instantiates and ties all of the components together, starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    // Set container property to container element
    this.container = container;

    // Start Three clock
    this.clock = new THREE.Clock();

    // Main scene creation
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(Config.fog.color, Config.fog.near);

    // Get Device Pixel Ratio first for retina
    if(window.devicePixelRatio) {
      Config.dpr = window.devicePixelRatio;
    }

    // Main renderer constructor
    this.renderer = new Renderer(this.scene, container);

    // Components instantiations
    this.camera = new Camera(this.renderer.threeRenderer);
    this.controls = new Controls(this.camera.threeCamera, container);
    this.light = new Light(this.scene);

    // Create and place lights in scene
    const lights = ['ambient', 'directional', 'point', 'hemi'];
    lights.forEach((light) => this.light.place(light));

    // // Create and place geo in scene
    // this.geometry = new Geometry(this.scene);
    // this.geometry.make('plane')(150, 150, 10, 10);
    // this.geometry.place([0, -20, 0], [Math.PI / 2, 0, 0]);

    // Set up rStats if dev environment
    if(Config.isDev && Config.isShowingStats) {
      this.stats = new Stats(this.renderer);
      this.stats.setUp();
    }

    // Set up gui
    if (Config.isDev) {
      this.gui = new DatGUI(this)
    }

    // Instantiate texture class
    this.texture = new Texture();

    // Start loading the textures and then go on to load the model after the texture Promises have resolved
    this.texture.load().then(() => {
      this.manager = new THREE.LoadingManager();

      // Textures loaded, load model
      this.model = new Model(this.scene, this.manager, this.texture.textures);
      this.model.load(Config.models[Config.model.selected].type);

      // onProgress callback
      this.manager.onProgress = (item, loaded, total) => {
        console.log(`${item}: ${loaded} ${total}`);
      };

      // All loaders done now
      this.manager.onLoad = () => {
        // Set up interaction manager with the app now that the model is finished loading
        new Interaction(this.renderer.threeRenderer, this.scene, this.camera.threeCamera, this.controls.threeControls);

        // Add dat.GUI controls if dev
        if(Config.isDev) {
          this.meshHelper = new MeshHelper(this.scene, this.model.obj);
          if (Config.mesh.enableHelper) this.meshHelper.enable();

          this.gui.load(this, this.model.obj);
        }

        // Everything is now fully loaded
        Config.isLoaded = true;
        this.container.querySelector('#loading').style.display = 'none';
      };

    
      window.addEventListener('click', (event) => {
        this.controls.threeControls.autoRotate = false;
        this.THREE
        // raycaster and pointer objects
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        var duration = 2;
        var target = new THREE.Vector3();
        
        pointer.x = (event.clientX / this.renderer.threeRenderer.domElement.clientWidth) * 2 - 1;
        pointer.y = -(event.clientY / this.renderer.threeRenderer.domElement.clientHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, this.camera.threeCamera);

        // See if the ray from the camera into the world hits one of our meshes
        const intersects = raycaster.intersectObject(this.model.group, true);
        if (intersects && intersects.length > 0) 
            target.x = 0;
            target.y = -20;
            target.z = this.camera.threeCamera.position.z;

            gsap.to(this.camera.threeCamera.position, {
              duration: 5,
              x: target.x,
              y: target.y,
              z: target.z,
              onUpdate: () => {
                this.camera.threeCamera.lookAt(new THREE.Vector3(0,0,0));
              },
              onComplete: () => {
                this.controls.threeControls.minDistance = 0;
              }
            });
            
        })
      });

    // Start render which does not wait for model fully loaded
    this.render();
  }

  render() {
    // Render rStats if Dev
    if(Config.isDev && Config.isShowingStats) {
      Stats.start();
    }

    // Call render function and pass in created scene and camera
    this.renderer.render(this.scene, this.camera.threeCamera);

    // rStats has finished determining render call now
    if(Config.isDev && Config.isShowingStats) {
      Stats.end();
    }

    // Delta time is sometimes needed for certain updates
    //const delta = this.clock.getDelta();

    // Call any vendor or module frame updates here
    TWEEN.update();
    this.controls.threeControls.update();

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
