precision highp float;
uniform float uTime;
uniform float uProgress;
uniform float uCalm;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uSun;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFog;
uniform vec3 uSunDir;
uniform float uSunAmount;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform float uMoonAmount;
uniform vec3 uCamera;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;

vec3 sky(vec3 rd) {
  float y = rd.y;
  float hz = exp(-max(y, 0.0) * 5.5);
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.04, 0.55, y));
  col = mix(col, uHaze, hz * 0.85 * (0.5 + 0.5 * uSunAmount));
  float mx = 1.0 - max(dot(rd, normalize(uMoonDir)), 0.0);
  col += uMoonColor * (exp2(-mx * 36.0) * 0.28 + exp2(-mx * 10.0) * 0.08) * uMoonAmount;
  float x = 1.0 - max(dot(rd, uSunDir), 0.0);
  float glow = exp2(-x * 30.0) * 0.85 + exp2(-x * 8.0) * 0.28;
  float disc = smoothstep(0.0022, 0.0002, x);
  col += uSun * (disc * 1.4 + glow) * uSunAmount;
  return col;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 rd = normalize(vWorld - uCamera);
  vec3 refl = reflect(rd, n);
  vec3 skyCol = sky(refl);
  float ndv = max(dot(n, -rd), 0.0);
  float fres = pow(1.0 - ndv, 5.0);
  float ndl = max(dot(n, uSunDir), 0.0);
  float ndm = max(dot(n, normalize(uMoonDir)), 0.0);
  vec3 water = mix(uDeep, uShallow, ndl * 0.35 + ndm * 0.35 + n.y * 0.28);
  vec3 col = mix(water, skyCol, mix(0.22, 0.55, fres));
  col += uShallow * 0.10;
  col += uMoonColor * ndm * uMoonAmount * 0.05;

  // Moon glitter path, then sun glitter as dawn arrives
  float moonSpec = 1.0 - max(dot(refl, normalize(uMoonDir)), 0.0);
  col += uMoonColor * (exp2(-moonSpec * 110.0) * 0.35 + exp2(-moonSpec * 22.0) * 0.08) * uMoonAmount;
  float spark = fract(sin(dot(vWorld.xz, vec2(12.9898, 78.233))) * 43758.5453);
  col += uMoonColor * step(0.997, spark) * uMoonAmount * 0.06;

  float specX = 1.0 - max(dot(refl, uSunDir), 0.0);
  col += uSun * (exp2(-specX * 90.0) * 0.55 + exp2(-specX * 18.0) * 0.12) * uSunAmount;

  float dist = length(vWorld - uCamera);
  float fogAmt = 1.0 - exp(-dist * 0.0040);
  col = mix(col, mix(uFog, sky(rd), 0.6), fogAmt);
  gl_FragColor = vec4(col, 0.94);
}
