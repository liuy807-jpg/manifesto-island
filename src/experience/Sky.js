import * as THREE from "three";
import skyVert from "../shaders/sky.vert.glsl?raw";
import skyFrag from "../shaders/sky.frag.glsl?raw";
import { paletteAt } from "../config.js";
import { toonMat, outlineMesh } from "./toon.js";

/** Warm key from the east-northeast, high enough to read the ground. */
const KEY_DIR = new THREE.Vector3(0.55, 0.62, -0.55).normalize();
const KEY_COLOR = new THREE.Color(0xffd4a8);

export class Sky {
  constructor(scene) {
    this.progress = 0;
    this.target = 0;
    this.moonAmount = 1;
    this.material = new THREE.ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uHaze: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0.72, 0.22, -0.2).normalize() },
        uSunAmount: { value: 0.55 },
        uMoonDir: { value: KEY_DIR.clone() },
        uMoonColor: { value: KEY_COLOR.clone() },
        uMoonAmount: { value: 0.35 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 24), this.material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    this.mesh = mesh;

    this.sun = new THREE.DirectionalLight(0xffe2b0, 0.8);
    this.sun.position.set(40, 24, -16);
    scene.add(this.sun);

    // "moon" slot is a warm key light (peach), for water/sky uniforms too
    this.moon = new THREE.DirectionalLight(0xffd4a8, 1.15);
    this.moon.position.copy(KEY_DIR).multiplyScalar(90);
    this.moon.target.position.set(0, 0, 0);
    scene.add(this.moon);
    scene.add(this.moon.target);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    this.moon.shadow.camera.near = 10;
    this.moon.shadow.camera.far = 180;
    this.moon.shadow.camera.left = -42;
    this.moon.shadow.camera.right = 42;
    this.moon.shadow.camera.top = 42;
    this.moon.shadow.camera.bottom = -42;
    this.moon.shadow.bias = -0.0008;
    this.moon.shadow.normalBias = 0.05;
    this.moon.shadow.radius = 6;

    this.hemi = new THREE.HemisphereLight(0xe8d0f0, 0xf0c8b8, 1.55);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffe8dc, 0.85);
    scene.add(this.ambient);

    this._addPlanet(scene);
  }

  _addPlanet(scene) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 18), toonMat(0xe8b8d0, { emissive: 0xf2c8d8, emissiveIntensity: 0.55 }));
    g.add(body);
    outlineMesh(body, 0.16, 0x7a5a88);
    const ringGeo = new THREE.TorusGeometry(28, 1.15, 8, 48);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0xd8c0f0, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.rotation.y = 0.25;
    g.add(ring);
    const ring2 = ring.clone();
    ring2.scale.set(0.82, 0.82, 0.82);
    ring2.material = ring.material.clone();
    ring2.material.color.set(0xf0d4e8);
    ring2.material.opacity = 0.45;
    g.add(ring2);
    g.position.set(-34, 15, -96);
    g.scale.setScalar(0.72);
    scene.add(g);
    this.planet = g;
  }

  setProgress(p) {
    this.target = p;
  }

  getSunDir() {
    return this.material.uniforms.uSunDir.value;
  }

  getMoonDir() {
    return this.material.uniforms.uMoonDir.value;
  }

  getMoonAmount() {
    return this.moonAmount;
  }

  getMoonColor() {
    return this.material.uniforms.uMoonColor.value;
  }

  update(dt, time) {
    this.progress += (this.target - this.progress) * (1 - Math.exp(-1.6 * dt));
    const pal = paletteAt(this.progress);
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uProgress.value = this.progress;
    u.uZenith.value.setRGB(...pal.zenith);
    u.uHorizon.value.setRGB(...pal.horizon);
    u.uHaze.value.setRGB(...pal.haze);
    u.uSun.value.setRGB(...pal.sun);
    u.uSunAmount.value = pal.sunAmount;
    u.uSunDir.value.set(0.78, pal.elevation, -0.18).normalize();
    this.sun.position.copy(u.uSunDir.value).multiplyScalar(80);
    this.sun.color.setRGB(...pal.sun);
    this.sun.intensity = 0.7 + pal.sunAmount * 1.1;

    // Warm key eases as the golden sunrise takes over
    this.moonAmount = 0.45 + pal.sunAmount * 0.2;
    u.uMoonAmount.value = 0.25 * (1 - pal.sunAmount * 0.6);
    u.uMoonDir.value.copy(KEY_DIR);
    u.uMoonColor.value.copy(KEY_COLOR);
    this.moon.position.copy(KEY_DIR).multiplyScalar(90);
    this.moon.intensity = 0.9 + pal.sunAmount * 0.35;
    this.moon.color.set(0xffd4a8).lerp(this.sun.color, pal.sunAmount * 0.5);

    this.hemi.color.setRGB(
      pal.zenith[0] * 1.3 + 0.25,
      pal.zenith[1] * 1.2 + 0.22,
      pal.zenith[2] * 1.1 + 0.2
    );
    this.hemi.groundColor.setRGB(
      pal.haze[0] * 0.7 + 0.25,
      pal.haze[1] * 0.6 + 0.18,
      pal.haze[2] * 0.5 + 0.14
    );
    this.hemi.intensity = 1.45 + pal.sunAmount * 0.2;
    this.ambient.color.setRGB(1.0, 0.9 + pal.sunAmount * 0.05, 0.84);
    this.ambient.intensity = 0.8 + pal.sunAmount * 0.1;

    if (this.planet) this.planet.rotation.y = time * 0.02;
    return pal;
  }
}
