precision highp float;
uniform float uTime;
uniform float uProgress;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uSunAmount;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform float uMoonAmount;
varying vec3 vWorld;

float hash13(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
  vec3 rd = normalize(vWorld);
  float y = rd.y;
  float hz = exp(-max(y, 0.0) * 5.5);
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.08, 0.58, y));
  col = mix(col, uHaze, hz * 0.9 * (0.55 + 0.45 * uSunAmount));

  // Cool horizon band at night — blue hour glow
  float night = 1.0 - smoothstep(0.10, 0.55, uProgress);
  float band = exp(-abs(y - 0.02) * 14.0);
  col += uMoonColor * band * uMoonAmount * 0.16;
  col += uHaze * band * 0.12;

  // Moon disc + soft halo (fades as the sun takes over)
  float mx = 1.0 - max(dot(rd, normalize(uMoonDir)), 0.0);
  float moonDisc = smoothstep(0.0028, 0.0005, mx);
  float moonHalo = exp2(-mx * 28.0) * 0.9 + exp2(-mx * 8.0) * 0.28 + exp2(-mx * 2.4) * 0.06;
  col += uMoonColor * (moonDisc * 2.4 + moonHalo) * uMoonAmount;

  // Sun (payoff at dawn)
  float x = 1.0 - max(dot(rd, uSunDir), 0.0);
  float glow = exp2(-x * 26.0) * 2.2 + exp2(-x * 7.0) * 0.7 + exp2(-x * 2.2) * 0.12;
  float disc = smoothstep(0.0022, 0.0002, x);
  col += uSun * (disc * 3.4 + glow) * uSunAmount;
  float shaft = exp2(-abs(rd.x - uSunDir.x) * 22.0) * smoothstep(0.18, -0.02, y)
              * smoothstep(-0.02, 0.08, uSunDir.y) * uSunAmount;
  col += uSun * shaft * 0.18;

  if (night > 0.02 && y > 0.02) {
    float s = hash13(rd * 160.0);
    float tw = 0.7 + 0.3 * sin(uTime * 0.8 + s * 40.0);
    float star = smoothstep(0.987, 0.998, s) * night * smoothstep(0.02, 0.18, y) * tw;
    col += vec3(0.88, 0.92, 1.0) * star * (0.7 + 0.5 * uMoonAmount);
  }
  if (y < 0.0) {
    col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.2, y));
  }
  gl_FragColor = vec4(col, 1.0);
}
