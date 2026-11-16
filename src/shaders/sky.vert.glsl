varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = position; // unit sphere: direction
  gl_Position = projectionMatrix * viewMatrix * world;
  gl_Position.z = gl_Position.w; // push to far plane
}
