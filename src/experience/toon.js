/**
 * Shared cel-shading helpers. Original look, in the spirit of a
 * bright pastel graphic novel — not a copy of any particular asset.
 */
import * as THREE from "three";

let _gradient = null;
export function toonGradient(steps = 4) {
  if (_gradient) return _gradient;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.floor((Math.pow(i / (steps - 1), 0.85)) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.unpackAlignment = 1;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  _gradient = tex;
  return tex;
}

export function toonMat(color, opts = {}) {
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(opts.steps || 4),
    vertexColors: !!opts.vertexColors,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity || 0,
  });
  return mat;
}

const outlineMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x2c2438) },
    uThick: { value: 0.035 },
  },
  vertexShader: `
    uniform float uThick;
    void main() {
      vec3 p = position + normal * uThick;
      #ifdef USE_INSTANCING
        p = (instanceMatrix * vec4(p, 1.0)).xyz;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }
  `,
  side: THREE.BackSide,
});

export function makeOutlineMaterial(thick = 0.04, color = 0x2c2438) {
  const mat = outlineMat.clone();
  mat.uniforms.uColor.value = new THREE.Color(color);
  mat.uniforms.uThick.value = thick;
  return mat;
}

export function outlineMesh(mesh, thick = 0.04, color = 0x2c2438) {
  if (!mesh || !mesh.geometry) return null;
  const mat = outlineMat.clone();
  mat.uniforms.uColor.value = new THREE.Color(color);
  mat.uniforms.uThick.value = thick;
  const ol = new THREE.Mesh(mesh.geometry, mat);
  ol.frustumCulled = false;
  ol.userData.isOutline = true;
  mesh.add(ol);
  return ol;
}

export function outlineGroup(group, thick = 0.04) {
  group.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline && !o.userData.noOutline) outlineMesh(o, thick);
  });
}
