import * as THREE from "three";
import waterVert from "../shaders/water.vert.glsl?raw";
import waterFrag from "../shaders/water.frag.glsl?raw";

export class Water {
  constructor(scene, camera) {
    this.camera = camera;
    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uCalm: { value: 0.3 },
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uHaze: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uDeep: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() },
        uFog: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3() },
        uSunAmount: { value: 0.1 },
        uMoonDir: { value: new THREE.Vector3(-0.30, 0.42, -0.80) },
        uMoonColor: { value: new THREE.Color(0xd4e2ff) },
        uMoonAmount: { value: 1 },
        uCamera: { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(220, 220, 80, 80);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = 0;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  setQuality(level) {
    const segs = level === "high" ? 96 : level === "medium" ? 64 : 36;
    const geo = new THREE.PlaneGeometry(220, 220, segs, segs);
    geo.rotateX(-Math.PI / 2);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
  }

  update(time, pal, sunDir, progress, calm, moonDir, moonAmount, moonColor) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uProgress.value = progress;
    u.uCalm.value = calm;
    u.uZenith.value.setRGB(...pal.zenith);
    u.uHorizon.value.setRGB(...pal.horizon);
    u.uHaze.value.setRGB(...pal.haze);
    u.uSun.value.setRGB(...pal.sun);
    u.uDeep.value.setRGB(...pal.deep);
    u.uShallow.value.setRGB(...pal.shallow);
    u.uFog.value.setRGB(...pal.fog);
    u.uSunDir.value.copy(sunDir);
    u.uSunAmount.value = pal.sunAmount;
    if (moonDir) u.uMoonDir.value.copy(moonDir);
    if (moonColor) u.uMoonColor.value.copy(moonColor);
    if (moonAmount != null) u.uMoonAmount.value = moonAmount;
    u.uCamera.value.copy(this.camera.position);
  }
}
