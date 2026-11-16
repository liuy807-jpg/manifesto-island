// APPROACH_SHADER_PORT — sky, GLSL TOP version
// TouchDesigner: make a GLSL TOP, paste this into the pixel shader.
// Add uniforms: uTime (seconds), uProgress (0-1), uSunAmount (0-1)
// Resolution / UV are remapped by the TOUCHDESIGNER define.

#define TOUCHDESIGNER
precision highp float;

uniform float uTime;
uniform float uProgress;
uniform float uSunAmount;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uSun;
uniform vec3 uSunDir;

#ifndef TOUCHDESIGNER
varying vec2 vUv;
uniform vec2 uResolution;
#endif

float hash13(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
#ifdef TOUCHDESIGNER
  vec2 uv = vUV.st;
#else
  vec2 uv = vUv;
#endif
  // Equirect-like sky from a 2D quad: x = azimuth, y = elevation
  float az = (uv.x - 0.5) * 6.2831853;
  float el = mix(-0.15, 1.0, uv.y);
  vec3 rd = normalize(vec3(sin(az) * (1.0 - el), el, -cos(az) * (1.0 - el)));

  vec3 zenith = uZenith;
  vec3 horizon = uHorizon;
  vec3 haze = uHaze;
  vec3 sunC = uSun;
  if (length(zenith) < 0.001) {
    zenith = mix(vec3(0.012, 0.02, 0.055), vec3(0.08, 0.12, 0.3), uProgress);
    horizon = mix(vec3(0.03, 0.05, 0.09), vec3(0.8, 0.46, 0.26), uProgress);
    haze = mix(vec3(0.06, 0.09, 0.14), vec3(1.0, 0.66, 0.38), uProgress);
    sunC = mix(vec3(1.0, 0.72, 0.5), vec3(1.0, 0.9, 0.68), uProgress);
  }
  float amount = uSunAmount > 0.0 ? uSunAmount : mix(0.1, 1.0, uProgress);
  vec3 sunDir = length(uSunDir) > 0.1 ? normalize(uSunDir)
                                      : normalize(vec3(0.78, mix(-0.08, 0.2, uProgress), -0.18));

  float y = rd.y;
  vec3 col = mix(horizon, zenith, smoothstep(-0.06, 0.55, y));
  col = mix(col, haze, exp(-max(y, 0.0) * 7.5) * 0.85);
  float sun = pow(max(0.0, dot(rd, sunDir)), 48.0);
  col += sunC * sun * (1.2 + amount * 1.6);
  col += sunC * pow(max(0.0, dot(rd, sunDir)), 6.0) * 0.18 * amount;

  // sparse stars that fade with dawn
  float stars = step(0.996, hash13(rd * 180.0));
  col += vec3(0.85, 0.9, 1.0) * stars * (1.0 - amount);

  // gentle grain
  col += (hash13(rd * 20.0 + uTime) - 0.5) * 0.02;

#ifdef TOUCHDESIGNER
  fragColor = TDOutputSwizzle(vec4(col, 1.0));
#else
  gl_FragColor = vec4(col, 1.0);
#endif
}
