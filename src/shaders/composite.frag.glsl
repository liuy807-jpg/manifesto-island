precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGrain;
uniform float uCA;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 mid = uv - 0.5;
  float r = texture2D(tDiffuse, uv + mid * uCA).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - mid * uCA).b;
  vec3 col = vec3(r, g, b);
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 0.7) * 40.0) - 0.5) * uGrain;
  col += grain;
  float vig = 0.55 + 0.45 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.32);
  col *= vig;
  gl_FragColor = vec4(col, 1.0);
}
