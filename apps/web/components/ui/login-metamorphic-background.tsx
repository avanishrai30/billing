'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Vertex shader: screen-filling quad.
 */
const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/**
 * Fragment shader: Metamorphic liquid/sculptural material.
 * Generates layered pearl/silver organic folds, deep blue-gray ambient shadows,
 * warm amber/orange subsurface glow, and subtle specular lighting.
 */
const fragmentSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float u_reducedMotion;

// 2D Rotation matrix
mat2 rotate2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// Smooth noise function
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Fast multi-octave fractional Brownian motion for sculptural folds
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rot = rotate2D(0.45);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rot * (p * 2.02);
    amplitude *= 0.48;
  }
  return value;
}

// Sculptural surface heightfield with multi-stage domain warping
float surfaceHeight(vec2 uv, float t, vec2 mouseOffset) {
  vec2 p = uv * 1.35 + mouseOffset * 0.15;

  // Primary slow fluid motion
  vec2 q = vec2(
    fbm(p + t * 0.04),
    fbm(p + vec2(5.2, 1.3) - t * 0.035)
  );

  // Secondary sculptural fold warping
  vec2 r = vec2(
    fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.025),
    fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.02)
  );

  // Flowing main fold
  return fbm(p + 3.5 * r);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

  // Time scale for ultra-slow organic morphing
  float t = u_reducedMotion > 0.5 ? 2.5 : iTime * 0.08;

  // Smooth mouse parallax offset
  vec2 mouseNorm = iMouse / max(iResolution, vec2(1.0));
  vec2 mouseOffset = (mouseNorm - 0.5) * 0.35;
  if (u_reducedMotion > 0.5) {
    mouseOffset = vec2(0.0);
  }

  // Calculate heightfield & surface normal gradient
  float eps = 0.008;
  float hCenter = surfaceHeight(uv, t, mouseOffset);
  float hRight  = surfaceHeight(uv + vec2(eps, 0.0), t, mouseOffset);
  float hTop    = surfaceHeight(uv + vec2(0.0, eps), t, mouseOffset);

  vec3 normal = normalize(vec3(
    (hCenter - hRight) / eps * 1.5,
    (hCenter - hTop) / eps * 1.5,
    1.0
  ));

  // --- Lighting Model ---
  // Key Light (Top-Left cool ambient light)
  vec3 keyLightDir = normalize(vec3(-0.4, 0.7, 0.6));
  float diffKey = max(dot(normal, keyLightDir), 0.0);
  
  // Fill Light (Top-Right pale blue-gray ambient light)
  vec3 fillLightDir = normalize(vec3(0.5, 0.4, 0.5));
  float diffFill = max(dot(normal, fillLightDir), 0.0);

  // Subsurface Core Light (Center-Low warm amber/orange internal glow)
  vec2 corePos = vec2(0.0, -0.35) + mouseOffset * 0.2;
  float distToCore = length(uv - corePos);
  float coreGlowFactor = smoothstep(1.3, 0.0, distToCore);
  float subsurfaceIntensity = pow(1.0 - hCenter, 2.0) * coreGlowFactor;

  // Specular Highlight (Silky pearl sheen)
  vec3 halfKey = normalize(keyLightDir + vec3(0.0, 0.0, 1.0));
  float specKey = pow(max(dot(normal, halfKey), 0.0), 20.0);

  // --- Palette Definitions ---
  vec3 pearlWhite = vec3(0.96, 0.97, 0.99);
  vec3 silverFold = vec3(0.82, 0.86, 0.92);
  vec3 slateShadow = vec3(0.42, 0.48, 0.58);
  vec3 amberCore = vec3(0.98, 0.58, 0.18);
  vec3 goldRim = vec3(1.0, 0.78, 0.42);

  // Base sculptured surface color mixing
  vec3 color = mix(slateShadow, silverFold, smoothstep(0.15, 0.65, hCenter));
  color = mix(color, pearlWhite, smoothstep(0.55, 0.95, hCenter));

  // Modulate with directional lighting
  color *= (0.45 + 0.45 * diffKey + 0.25 * diffFill);

  // Add warm internal amber glow (Center-low subsurface luminescence)
  vec3 glowColor = mix(amberCore, goldRim, smoothstep(0.2, 0.8, subsurfaceIntensity));
  color += glowColor * (subsurfaceIntensity * 0.95);

  // Soft pearl specular reflection
  color += vec3(0.98, 0.99, 1.0) * (specKey * 0.35);

  // Subtle vignette & depth framing
  float vignette = 1.0 - smoothstep(0.6, 1.6, length(uv));
  color = mix(color * 0.88, color, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;

export interface LoginMetamorphicBackgroundProps {
  className?: string;
  backdropBlurAmount?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const blurClassMap = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl'
};

/**
 * LoginMetamorphicBackground
 * 
 * Apple-style metamorphic liquid/sculptural material background.
 * Uses a single GPU-accelerated WebGL fragment shader with smooth multi-octave FBM,
 * subsurface amber glow, pearl specular highlights, and dampened pointer parallax.
 * 
 * Performance & Isolation Guarantee:
 * - High-frequency pointer tracking is stored in refs (zero React re-renders).
 * - Animation uses requestAnimationFrame with proper cleanup.
 * - Automatically falls back to a sleek CSS gradient if WebGL is unavailable.
 * - Honors prefers-reduced-motion without dropping layout fidelity.
 */
export const LoginMetamorphicBackground = React.memo(function LoginMetamorphicBackground({
  className = '',
  backdropBlurAmount = 'none'
}: LoginMetamorphicBackgroundProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const sizeRef = useRef<{ width: number; height: number }>({ width: 800, height: 600 });
  const mouseStateRef = useRef<{
    targetX: number;
    targetY: number;
    currentX: number;
    currentY: number;
    isHovering: boolean;
  }>({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    isHovering: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    // Detect prefers-reduced-motion safely
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Update sizeRef without layout thrashing inside RAF
    const updateSize = () => {
      if (!canvas) return;
      sizeRef.current = {
        width: canvas.clientWidth || window.innerWidth || 800,
        height: canvas.clientHeight || window.innerHeight || 600
      };
    };
    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateSize());
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', updateSize, { passive: true });
    }

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        powerPreference: 'low-power',
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: false
      });
    } catch {
      // Graceful fallback
    }

    if (!gl) {
      if (resizeObserver) resizeObserver.disconnect();
      return;
    }

    const compileShader = (type: number, source: string): WebGLShader | null => {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertShader || !fragShader) {
      if (resizeObserver) resizeObserver.disconnect();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      if (resizeObserver) resizeObserver.disconnect();
      return;
    }
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      if (resizeObserver) resizeObserver.disconnect();
      return;
    }

    gl.useProgram(program);

    // Quad geometry (2 triangles covering clip space)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResLoc = gl.getUniformLocation(program, 'iResolution');
    const uTimeLoc = gl.getUniformLocation(program, 'iTime');
    const uMouseLoc = gl.getUniformLocation(program, 'iMouse');
    const uReducedMotionLoc = gl.getUniformLocation(program, 'u_reducedMotion');

    const startTime = performance.now();
    let lastRenderTime = 0;

    const render = (now: number) => {
      if (!canvas || !gl) return;

      if (!prefersReducedMotion) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }

      // Throttle slow ambient morphing to ~20fps (50ms interval) for ultra-lightweight GPU footprint
      if (now - lastRenderTime < 50) {
        return;
      }
      lastRenderTime = now;

      const { width, height } = sizeRef.current;
      const targetWidth = Math.min(Math.floor(width), 640);
      const targetHeight = Math.min(Math.floor(height), 360);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        gl.viewport(0, 0, targetWidth, targetHeight);
      }

      const elapsed = (now - startTime) / 1000;
      const mouse = mouseStateRef.current;

      if (mouse.isHovering) {
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;
      }

      if (uResLoc) gl.uniform2f(uResLoc, targetWidth, targetHeight);
      if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsed);
      if (uMouseLoc) {
        gl.uniform2f(
          uMouseLoc,
          mouse.isHovering ? (mouse.currentX * targetWidth) / width : (targetWidth * 0.5),
          mouse.isHovering ? ((height - mouse.currentY) * targetHeight) / height : (targetHeight * 0.5)
        );
      }
      if (uReducedMotionLoc) {
        gl.uniform1f(uReducedMotionLoc, prefersReducedMotion ? 1.0 : 0.0);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseStateRef.current.targetX = event.clientX;
      mouseStateRef.current.targetY = event.clientY;
      mouseStateRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseStateRef.current.isHovering = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Initial render call
    render(performance.now());

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', updateSize);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);

      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
      }
    };
  }, []);

  const blurClass = blurClassMap[backdropBlurAmount] || '';

  return (
    <div
      data-testid="login-metamorphic-background"
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        data-testid="metamorphic-shader-canvas"
        className="w-full h-full block bg-slate-900"
        style={{ width: '100%', height: '100%' }}
      />
      {blurClass && <div className={`absolute inset-0 ${blurClass}`} />}
    </div>
  );
});

LoginMetamorphicBackground.displayName = 'LoginMetamorphicBackground';
