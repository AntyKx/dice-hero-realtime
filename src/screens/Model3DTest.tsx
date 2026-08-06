import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations, Environment, Html } from '@react-three/drei'
import type { Group } from 'three'

const MODEL_PATH = '/assets/models/test.glb'

// ── Loaded GLB model with animation playback ──────────────────────────────
function Model({ autoRotate }: { autoRotate: boolean }) {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(MODEL_PATH)
  const { actions, names } = useAnimations(animations, group)
  const [animList, setAnimList] = useState<string[]>([])

  useEffect(() => {
    setAnimList(names)
    // play first animation if present
    if (names.length > 0) actions[names[0]]?.reset().fadeIn(0.3).play()
  }, [names, actions])

  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.6
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={1.5} />
      {animList.length > 0 && (
        <Html position={[0, -1.6, 0]} center>
          <div style={{ color: '#8fb8e8', fontSize: 11, whiteSpace: 'nowrap' }}>
            動畫：{animList.join(' / ')}
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Fallback placeholder (rotating crystal) when no model is present ───────
function Placeholder() {
  const mesh = useRef<Group>(null)
  useFrame((_, delta) => { if (mesh.current) mesh.current.rotation.y += delta })
  return (
    <group ref={mesh}>
      <mesh>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6db8ff" roughness={0.2} metalness={0.6} />
      </mesh>
      <Html position={[0, -1.8, 0]} center>
        <div style={{ color: '#ffb060', fontSize: 12, whiteSpace: 'nowrap', textAlign: 'center' }}>
          找不到模型<br />請把 .glb 放到 public/assets/models/test.glb
        </div>
      </Html>
    </group>
  )
}

function ModelOrFallback({ autoRotate }: { autoRotate: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Placeholder />
  return (
    <ErrorBoundary onError={() => setFailed(true)}>
      <Model autoRotate={autoRotate} />
    </ErrorBoundary>
  )
}

// Minimal error boundary to catch GLB load failure
import { Component, type ReactNode } from 'react'
class ErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.hasError ? null : this.props.children }
}

export default function Model3DTest() {
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at 50% 30%, #1a2d58, #0a1020)' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="primary" onClick={() => setAutoRotate(v => !v)} style={{ padding: '6px 14px' }}>
          {autoRotate ? '停止旋轉' : '自動旋轉'}
        </button>
        <span style={{ color: '#8fb8e8', fontSize: 13 }}>拖曳旋轉 · 滾輪縮放</span>
        <a href="#" onClick={() => { window.location.hash = ''; window.location.reload() }}
           style={{ color: '#7ae0ff', fontSize: 13 }}>← 返回遊戲</a>
      </div>

      <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }} shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#88aaff" />
        <Suspense fallback={null}>
          <ModelOrFallback autoRotate={autoRotate} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={2} maxDistance={8} />
      </Canvas>
    </div>
  )
}

useGLTF.preload(MODEL_PATH)
