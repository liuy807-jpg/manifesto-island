uniform float uTime;
uniform float uCalm;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;

float wave(vec2 p, vec2 dir, float amp, float freq, float speed) {
  return amp * cos(dot(dir, p) * freq + uTime * speed);
}

float height(vec2 p) {
  float c = mix(1.0, 0.55, uCalm);
  float h = 0.0;
  h += wave(p, normalize(vec2(1.0, 0.22)), 0.07 * c, 0.38, 0.7);
  h += wave(p, normalize(vec2(-0.62, 1.0)), 0.04 * c, 0.62, 0.9);
  h += wave(p, normalize(vec2(0.28, 0.96)), 0.018 * c, 1.15, 1.1);
  return h;
}

void main() {
  vUv = uv;
  vec3 p = position;
  float h = height(p.xz);
  p.y += h;
  float e = 0.4;
  vec3 t = vec3(e, height(p.xz + vec2(e, 0.0)) - h, 0.0);
  vec3 b = vec3(0.0, height(p.xz + vec2(0.0, e)) - h, e);
  vNormal = normalize(cross(b, t));
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
