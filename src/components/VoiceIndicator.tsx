import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================================
// Props
// ============================================================

export interface VoiceIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
}

// ============================================================
// Fibonacci Sphere
// ============================================================

function fibonacciSphere(n: number, radius: number): Float32Array {
  const out = new Float32Array(n * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

// ============================================================
// Particle Layer
// ============================================================

interface LayerConfig {
  count: number; radius: number; baseSize: number; baseColor: string;
  speedMult: number; pulseMult: number;
}

function ParticleLayer({ cfg, isListening, isProcessing }: {
  cfg: LayerConfig; isListening: boolean; isProcessing: boolean;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(Math.random() * 100);
  const { count, radius, baseSize, baseColor, speedMult, pulseMult } = cfg;

  const positions = useMemo(() => fibonacciSphere(count, radius), [count, radius]);
  const basePositions = useMemo(() => new Float32Array(positions), [positions]);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    return geo;
  }, [positions]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const posAttr = geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const bx = basePositions[i3];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];
      const baseLen = Math.sqrt(bx*bx + by*by + bz*bz) || 1;

      let angle = t * 0.3 * speedMult;
      let expand = 1.0;

      if (isProcessing) {
        angle = t * 2 * speedMult;
        expand = 1 + Math.sin(t * 5 * speedMult + i * 0.25) * 0.32 * pulseMult;
      } else if (isListening) {
        angle = t * 0.7 * speedMult;
        expand = 1 + Math.sin(t * 3 * speedMult + i * 0.12) * 0.2 * pulseMult;
      }

      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const sc = radius * expand;
      // rotate around Y + subtle X wobble
      const rx = (bx * cosA - bz * sinA) * (sc / baseLen);
      const ry = by * (sc / baseLen) + (isProcessing ? Math.cos(t * 6 + i) * 0.08 : 0);
      const rz = (bx * sinA + bz * cosA) * (sc / baseLen);

      arr[i3] = rx;
      arr[i3 + 1] = ry;
      arr[i3 + 2] = rz;
    }
    posAttr.needsUpdate = true;

    const mat = meshRef.current.material as THREE.PointsMaterial;
    const targetColor = isProcessing ? '#fb923c' : isListening ? '#fbbf24' : baseColor;
    const targetSize = isProcessing ? baseSize * 1.5 : isListening ? baseSize * 1.3 : baseSize;
    mat.color.lerp(new THREE.Color(targetColor), 0.07);
    mat.size = THREE.MathUtils.lerp(mat.size, targetSize, 0.07);
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial color={baseColor} size={baseSize} sizeAttenuation
        transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ============================================================
// Glow Ring
// ============================================================

function GlowRing({ radius, rotBase, isListening, isProcessing }: {
  radius: number; rotBase: number; isListening: boolean; isProcessing: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.TorusGeometry(radius, 0.01, 24, 120), [radius]);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    ringRef.current.rotation.set(rotBase, rotBase, 0);
    if (isProcessing) {
      mat.color.lerp(new THREE.Color('#fb923c'), 0.09);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.5, 0.09);
      ringRef.current.rotation.x += delta * 1.6;
      ringRef.current.rotation.y += delta * 2.0;
      ringRef.current.rotation.z += delta * 0.5;
    } else if (isListening) {
      mat.color.lerp(new THREE.Color('#fbbf24'), 0.09);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.35, 0.09);
      ringRef.current.rotation.x += delta * 0.8;
      ringRef.current.rotation.y += delta * 1.1;
    } else {
      mat.color.lerp(new THREE.Color('#f59e0b'), 0.05);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.15, 0.05);
      ringRef.current.rotation.x += delta * 0.25;
      ringRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={ringRef} geometry={geo}>
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.15}
        depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// ============================================================
// Scene
// ============================================================

const CORE: LayerConfig   = { count: 800, radius: 1.28, baseSize: 0.018, baseColor: '#fbbf24', speedMult: 1.1, pulseMult: 1 };
const MID: LayerConfig    = { count: 350, radius: 1.55, baseSize: 0.028, baseColor: '#fcd34d', speedMult: 0.75, pulseMult: 1.25 };
const OUTER: LayerConfig  = { count: 120, radius: 1.90, baseSize: 0.040, baseColor: '#fef3c7', speedMult: 0.55, pulseMult: 1.6 };

function Scene({ isListening, isProcessing }: { isListening: boolean; isProcessing: boolean }) {
  return (
    <>
      <ParticleLayer cfg={CORE}  isListening={isListening} isProcessing={isProcessing} />
      <ParticleLayer cfg={MID}   isListening={isListening} isProcessing={isProcessing} />
      <ParticleLayer cfg={OUTER} isListening={isListening} isProcessing={isProcessing} />
      <GlowRing radius={1.68} rotBase={0}       isListening={isListening} isProcessing={isProcessing} />
      <GlowRing radius={1.88} rotBase={Math.PI/3} isListening={isListening} isProcessing={isProcessing} />
    </>
  );
}

// ============================================================
// VoiceIndicator
// ============================================================

const LABEL: Record<string, string> = { idle: '待命中', listening: '正在听…', processing: '分析中…', };
const LABEL_CLASS: Record<string, string> = { idle: '', listening: 'voice-label--listening', processing: 'voice-label--processing' };

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening, isProcessing, transcript,
}) => {
  const k = isProcessing ? 'processing' : isListening ? 'listening' : 'idle';
  return (
    <div className="voice-indicator">
      <div className="voice-particle-stage">
        <Suspense fallback={<div className="voice-particle-fallback" />}>
          <Canvas camera={{ position: [0,0,5], fov:42 }} dpr={[1,1.5]}
            gl={{ antialias: true, alpha: true }} style={{ background:'transparent' }}>
            <Scene isListening={isListening} isProcessing={isProcessing} />
          </Canvas>
        </Suspense>
        <span className={`voice-label voice-label--${k}`}>{LABEL[k]}</span>
      </div>
      {transcript && <span className="voice-transcript">"{transcript}"</span>}
    </div>
  );
};
VoiceIndicator.displayName = 'VoiceIndicator';
