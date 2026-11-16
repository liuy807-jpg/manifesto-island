// APPROACH_SHADER_PORT — water, GLSL TOP version
// TouchDesigner: paste into a GLSL TOP pixel shader.
// Uniforms: uTime, uProgress, uCalm (0-1, 1 = still).

#define TOUCHDESIGNER
precision highp float;

uniform float uTime;
uniform float uProgress;
uniform float uCalm;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSun;
uniform vec3 uHaze;
uniform vec3 uSunDir;

#ifndef TOUCHDESIGNER
varying vec2 vUv;
#endif

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
#ifdef TOUCHDESIGNER
  vec2 uv = vUV.st;
#else
  vec2 uv = vUv;
#endif

  vec3 deep = length(uDeep) > 0.001 ? uDeep : mix(vec3(0.01, 0.02, 0.04), vec3(0.03, 0.06, 0.1), uProgress);
  vec3 shallow = length(uShallow) > 0.001 ? uShallow : mix(vec3(0.05, 0.1, 0.13), vec3(0.14, 0.16, 0.16), uProgress);
  vec3 sunC = length(uSun) > 0.001 ? uSun : vec3(1.0, 0.82, 0.52);
  vec3 haze = length(uHaze) > 0.001 ? uHaze : mix(vec3(0.06, 0.09, 0.14), vec3(1.0, 0.66, 0.38), uProgress);
  vec3 sunDir = length(uSunDir) > 0.1 ? normalize(uSunDir) : normalize(vec3(0.78, 0.12, -0.18));
  float calm = uCalm;

  // Camera looking out over a Gerstner-ish height field
  vec2 p = (uv - vec2(0.5, 0.32)) * vec2(8.0, 6.5);
  float t = uTime * mix(0.55, 0.18, calm);
  float h = 0.0;
  h += 0.28 * sin(p.x * 0.9 + p.y * 0.3 + t);
  h += 0.16 * sin(p.x * 1.7 - p.y * 0.8 + t * 1.3);
  h += 0.07 * noise(p * 3.4 + t * 0.4);
  h *= mix(1.0, 0.45, calm);

  vec3 col = mix(deep, shallow, uv.y * 0.7 + h * 0.35);
  // horizon band
  float hz = smoothstep(0.62, 0.72, uv.y);
  col = mix(col, haze, hz);
  // sun glitter
  float glitter = pow(max(0.0, 1.0 - abs(uv.x - 0.62 - sunDir.x * 0.1)), 40.0) * (1.0 - hz);
  glitter *= 0.35 + 0.65 * noise(p * 18.0 + t * 2.0);
  col += sunC * glitter * (0.4 + uProgress * 0.8);
  // foam
  col += vec3(0.85, 0.9, 0.92) * smoothstep(0.18, 0.32, h) * 0.12 * (1.0 - calm);

#ifdef TOUCHDESIGNER
  fragColor = TDOutputSwizzle(vec4(col, 1.0));
#else
  gl_FragColor = vec4(col, 1.0);
#endif
}
