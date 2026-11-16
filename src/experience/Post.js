import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import compositeVert from "../shaders/composite.vert.glsl?raw";
import compositeFrag from "../shaders/composite.frag.glsl?raw";

/** Cel look stays clean: post is off unless a quality explicitly asks for it. */
export class Post {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = quality === "high";
    this.bloom = null;
    this.grain = null;
    this.composer = null;
    if (!this.enabled) return;

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const grain = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
        uTime: { value: 0 },
        uGrain: { value: 0.012 },
        uCA: { value: 0 },
      },
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
    });
    this.grain = grain;
    composer.addPass(grain);
    this.composer = composer;
  }

  setSize(w, h, dpr) {
    if (!this.composer) return;
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);
    this.grain?.uniforms.uResolution.value.set(w * dpr, h * dpr);
  }

  render(time) {
    if (this.grain) this.grain.uniforms.uTime.value = time;
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
