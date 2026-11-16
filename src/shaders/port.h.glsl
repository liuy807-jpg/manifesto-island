// APPROACH_SHADER_PORT
// A thin compatibility layer so this GLSL can be pasted into a
// TouchDesigner GLSL TOP with only the define below changed.
//
// Web uniforms:        uTime, uResolution, vUv
// TouchDesigner:       define TOUCHDESIGNER
//   uResolution    <-  uTDOutputInfo.res.zw
//   vUv            <-  vUV.st
//   gl_FragColor   <-  wrap with TDOutputSwizzle(...)
//
// Shared uniforms both environments should bind:
//   uTime, uProgress, uCalm, uSunDir, uSunAmount,
//   uZenith, uHorizon, uHaze, uSun, uDeep, uShallow, uFog

#if defined(TOUCHDESIGNER)
  #define VUV           vUV.st
  #define RESOLUTION    uTDOutputInfo.res.zw
  #define OUT(c)        fragColor = TDOutputSwizzle(c)
#else
  #define VUV           vUv
  #define RESOLUTION    uResolution
  #define OUT(c)        gl_FragColor = (c)
#endif
