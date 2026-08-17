'use client';

import React, { useEffect, useRef } from 'react';

// Vertex shader source code
const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader source code for the smokey background effect
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.4;

    // Normalize mouse input (0.0 - 1.0) and remap to -1.0 ~ 1.0
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    // Apply distortion for a wavy, smokey effect
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    // Create a glowing wave pattern
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export type BlurSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface SmokeyBackgroundProps {
  backdropBlurAmount?: BlurSize;
  color?: string;
  className?: string;
}

const blurClassMap: Record<BlurSize, string> = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl'
};

// Helper to convert hex color to RGB (0-1 range)
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.1;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.25;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.7;
  return [r, g, b];
}

/**
 * SmokeyBackground — High-performance, anti-flicker WebGL interactive shader background.
 * Wrapped in React.memo to isolate rendering from parent tree and input keystrokes.
 * Uses refs for high-frequency mouse state to eliminate unnecessary React re-renders.
 */
export const SmokeyBackground = React.memo(function SmokeyBackground({
  backdropBlurAmount = 'md',
  color = '#003882',
  className = ''
}: SmokeyBackgroundProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseStateRef = useRef<{ x: number; y: number; isHovering: boolean }>({
    x: 0,
    y: 0,
    isHovering: false
  });
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { powerPreference: 'low-power', alpha: false });
    } catch {
      // Graceful fallback when WebGL is disabled
    }

    if (!gl) {
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

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const iTimeLocation = gl.getUniformLocation(program, 'iTime');
    const iMouseLocation = gl.getUniformLocation(program, 'iMouse');
    const uColorLocation = gl.getUniformLocation(program, 'u_color');

    const startTime = Date.now();
    const [r, g, b] = hexToRgb(color);
    if (uColorLocation) {
      gl.uniform3f(uColorLocation, r, g, b);
    }

    const render = () => {
      if (!canvas || !gl) return;

      const width = canvas.clientWidth || 300;
      const height = canvas.clientHeight || 150;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      const currentTime = (Date.now() - startTime) / 1000;
      const mouse = mouseStateRef.current;

      if (iResolutionLocation) gl.uniform2f(iResolutionLocation, width, height);
      if (iTimeLocation) gl.uniform1f(iTimeLocation, currentTime);
      if (iMouseLocation) {
        gl.uniform2f(
          iMouseLocation,
          mouse.isHovering ? mouse.x : width / 2,
          mouse.isHovering ? height - mouse.y : height / 2
        );
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseStateRef.current.x = event.clientX - rect.left;
      mouseStateRef.current.y = event.clientY - rect.top;
      mouseStateRef.current.isHovering = true;
    };

    const handleMouseEnter = () => {
      mouseStateRef.current.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouseStateRef.current.isHovering = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);

      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      }
    };
  }, [color]);

  const finalBlurClass = blurClassMap[backdropBlurAmount] || blurClassMap.md;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
      />
      <div className={`absolute inset-0 bg-[#001845]/40 ${finalBlurClass}`} />
    </div>
  );
});

SmokeyBackground.displayName = 'SmokeyBackground';
