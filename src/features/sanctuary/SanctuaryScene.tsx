import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { cn } from '@/lib/utils'
import { CanvasErrorTrap } from './CanvasErrorTrap'

/**
 * 云鲸圣域:封存在玻璃立方体中的微缩梦幻生态。
 * 一头半透明的「云鲸星灵」在立方体内沿 8 字巡游,
 * 呼吸时整个生态轻微律动。全部实时渲染,可拖拽/缩放。
 */

const CUBE = 9 // 玻璃立方体边长

// ---------- 玻璃立方体 ----------
export function GlassCube() {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE, CUBE, CUBE)), [])
  return (
    <group>
      <mesh>
        <boxGeometry args={[CUBE, CUBE, CUBE]} />
        <meshPhysicalMaterial
          color="#a8c8ee"
          transparent
          opacity={0.07}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          reflectivity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#cfe8ff" transparent opacity={0.55} />
      </lineSegments>
      {/* 立方体底座光晕 */}
      <mesh position={[0, -CUBE / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CUBE * 0.72, 48]} />
        <meshBasicMaterial color="#123055" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// ---------- 云鲸星灵 ----------
function WhaleSpirit() {
  const whale = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const t = useRef(Math.PI * 0.6)

  useFrame((_, dt) => {
    t.current += dt
    const time = t.current
    // 8 字巡游路径(参数化),头部朝运动方向
    const p = (u: number) => {
      const x = 2.6 * Math.sin(u * 0.35)
      const z = 2.1 * Math.sin(u * 0.35) * Math.cos(u * 0.35) * 1.8
      const y = 1.35 + 0.55 * Math.sin(u * 0.22)
      return new THREE.Vector3(x, y, z)
    }
    if (whale.current) {
      const pos = p(time)
      const next = p(time + 0.02)
      whale.current.position.copy(pos)
      whale.current.lookAt(next)
      whale.current.rotation.z += Math.sin(time * 0.9) * 0.06
    }
    if (tail.current) {
      tail.current.rotation.x = Math.sin(time * 2.1) * 0.24
    }
    if (core.current) {
      const s = 1 + 0.28 * Math.sin(time * 1.4)
      core.current.scale.setScalar(s)
    }
  })

  const bodyMat = (
    <meshPhysicalMaterial
      color="#e3ecff"
      transmission={0.45}
      thickness={1}
      roughness={0.4}
      ior={1.25}
      emissive="#8fd8ff"
      emissiveIntensity={0.2}
    />
  )

  return (
    <group ref={whale} scale={0.72}>
        {/* 身体:沿 +Z 前进,头部在前 */}
        <mesh scale={[0.9, 0.85, 2.1]}>
          <sphereGeometry args={[0.62, 32, 32]} />
          {bodyMat}
        </mesh>
        {/* 头部轮廓 */}
        <mesh position={[0, 0.06, 1.05]} scale={[0.72, 0.6, 0.85]}>
          <sphereGeometry args={[0.5, 24, 24]} />
          {bodyMat}
        </mesh>
        {/* 云雾般的头冠 */}
        <mesh position={[0, 0.42, 0.72]} scale={[0.55, 0.34, 0.6]}>
          <sphereGeometry args={[0.5, 20, 20]} />
          <meshStandardMaterial color="#e6efff" transparent opacity={0.55} roughness={0.9} />
        </mesh>
        {/* 发光心核 */}
        <mesh ref={core} position={[0, -0.02, 0.35]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshBasicMaterial color="#bff7ff" transparent opacity={0.95} />
        </mesh>
        {/* 双鳍 */}
        <mesh position={[0.5, -0.18, 0.55]} rotation={[0.4, 0, -0.7]} scale={[0.14, 0.5, 0.28]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          {bodyMat}
        </mesh>
        <mesh position={[-0.5, -0.18, 0.55]} rotation={[0.4, 0, 0.7]} scale={[0.14, 0.5, 0.28]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          {bodyMat}
        </mesh>
        {/* 尾部(上下摆动) */}
        <group ref={tail} position={[0, 0.02, -1.5]}>
          <mesh position={[0, 0, -0.25]} scale={[0.3, 0.26, 0.9]}>
            <sphereGeometry args={[0.5, 20, 20]} />
            {bodyMat}
          </mesh>
          <mesh position={[0, 0.05, -0.95]} rotation={[0, 0, 0.5]} scale={[0.1, 0.55, 0.4]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            {bodyMat}
          </mesh>
          <mesh position={[0, -0.05, -0.95]} rotation={[0, 0, -0.5]} scale={[0.1, 0.55, 0.4]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            {bodyMat}
          </mesh>
        </group>
        {/* 星尘环绕 */}
        <Sparkles count={26} scale={[1.8, 1.2, 2.6]} size={2.4} speed={0.3} color="#cfe8ff" />
      </group>
    
  )
}

// ---------- 主岛:雪山 + 草地 + 森林 + 发光河流 + 湖泊 + 瀑布 ----------
function MainIsland() {
  const lake = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    if (lake.current) {
      const s = 1 + 0.014 * Math.sin(t.current * 1.3)
      lake.current.scale.set(s, s, 1)
    }
  })

  const riverCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.6, 0.72, -1.2),
        new THREE.Vector3(0.3, 0.7, -0.4),
        new THREE.Vector3(0.9, 0.68, 0.5),
        new THREE.Vector3(1.15, 0.66, 1.35),
      ]),
    [],
  )

  const trees = useMemo(
    () =>
      [
        [-2.1, 0, -1.0],
        [-1.5, 0, -1.7],
        [-2.4, 0, -0.1],
        [2.0, 0, -0.6],
        [1.7, 0, -1.5],
        [-0.9, 0, 1.9],
      ].map(([x, , z], i) => ({ x, z, s: 0.5 + ((i * 37) % 10) / 18 })),
    [],
  )

  return (
    <group position={[0, -2.2, 0]}>
      {/* 草地台地 */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[3.15, 2.1, 0.85, 40]} />
        <meshStandardMaterial color="#3f7f6d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[3.15, 3.15, 0.16, 40]} />
        <meshStandardMaterial color="#57a184" roughness={0.9} />
      </mesh>
      {/* 雪山(后侧主峰 + 副峰) */}
      <mesh position={[-1.2, 1.5, -1.3]}>
        <coneGeometry args={[1.05, 2.6, 7]} />
        <meshStandardMaterial color="#e8efff" roughness={0.6} />
      </mesh>
      <mesh position={[-0.2, 1.05, -1.8]}>
        <coneGeometry args={[0.7, 1.7, 7]} />
        <meshStandardMaterial color="#dfe9ff" roughness={0.6} />
      </mesh>
      {/* 柔和丘陵 */}
      <mesh position={[2.0, 0.1, -1.4]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.85, 20, 20]} />
        <meshStandardMaterial color="#4f9078" roughness={0.95} />
      </mesh>
      {/* 森林 */}
      {trees.map(({ x, z, s }, i) => (
        <group key={i} position={[x, 0.14, z]} scale={s}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.2, 8]} />
            <meshStandardMaterial color="#6b4f3a" roughness={1} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <coneGeometry args={[0.26, 0.62, 8]} />
            <meshStandardMaterial color={i % 2 ? '#3fa87c' : '#358f6c'} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <coneGeometry args={[0.16, 0.3, 8]} />
            <meshStandardMaterial color="#e8f4ff" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* 发光河流:雪山 → 湖泊 */}
      <mesh>
        <tubeGeometry args={[riverCurve, 40, 0.075, 10, false]} />
        <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.5} transparent opacity={0.9} />
      </mesh>
      {/* 湖泊(呼吸微涟漪) */}
      <mesh ref={lake} position={[1.35, 0.16, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 36]} />
        <meshStandardMaterial color="#7fd8e8" emissive="#2dd4e8" emissiveIntensity={0.55} transparent opacity={0.8} roughness={0.15} />
      </mesh>
      {/* 液态星光小瀑布:从台地边缘落下 */}
      <mesh position={[1.55, -0.55, 1.9]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[0.16, 1.5]} />
        <meshStandardMaterial color="#9ff0ff" emissive="#22d3ee" emissiveIntensity={1.1} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <Sparkles count={14} position={[1.6, -1.1, 2.0]} scale={[0.5, 0.7, 0.5]} size={2} speed={0.5} color="#aef4ff" />
      {/* 微型生灵:两只游荡的光灵 */}
      <SpiritOrb radius={1.6} speed={0.5} offset={0} />
      <SpiritOrb radius={2.3} speed={-0.35} offset={2.4} />
    </group>
  )
}

/** 台地上游荡的小光灵(微型动物意象) */
function SpiritOrb({ radius, speed, offset }: { radius: number; speed: number; offset: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(offset)
  useFrame((_, dt) => {
    t.current += dt * speed
    if (!ref.current) return
    ref.current.position.set(Math.sin(t.current) * radius, 0.3 + 0.12 * Math.sin(t.current * 3), Math.cos(t.current) * radius)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 12, 12]} />
      <meshBasicMaterial color="#d8b4fe" transparent opacity={0.9} />
    </mesh>
  )
}

// ---------- 环绕的漂浮小岛 ----------
function FloatingIsles() {
  const g1 = useRef<THREE.Group>(null)
  const g2 = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (g1.current) g1.current.rotation.y += dt * 0.06
    if (g2.current) g2.current.rotation.y -= dt * 0.045
  })
  return (
    <>
      <group ref={g1}>
        <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.55}>
          <group position={[3.1, 1.6, -2.2]} scale={0.55}>
            <mesh>
              <coneGeometry args={[0.85, 1.5, 7]} />
              <meshStandardMaterial color="#4a6b8f" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <cylinderGeometry args={[0.86, 0.86, 0.2, 7]} />
              <meshStandardMaterial color="#57a184" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <coneGeometry args={[0.3, 0.75, 7]} />
              <meshStandardMaterial color="#3fa87c" roughness={0.85} />
            </mesh>
            <mesh position={[0.3, 0.78, 0.15]}>
              <sphereGeometry args={[0.14, 14, 14]} />
              <meshStandardMaterial color="#e8f4ff" roughness={0.85} />
            </mesh>
          </group>
        </Float>
      </group>
      <group ref={g2}>
        <Float speed={0.9} rotationIntensity={0.1} floatIntensity={0.6}>
          <group position={[-3.2, 0.9, 1.9]} scale={0.42}>
            <mesh>
              <coneGeometry args={[0.95, 1.7, 6]} />
              <meshStandardMaterial color="#4a6b8f" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.96, 0.96, 0.2, 6]} />
              <meshStandardMaterial color="#57a184" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.35, 0]}>
              <coneGeometry args={[0.34, 0.85, 6]} />
              <meshStandardMaterial color="#e8efff" roughness={0.6} />
            </mesh>
          </group>
        </Float>
      </group>
    </>
  )
}

// ---------- 自制雾气:径向渐变精灵,缓慢漂移(drei Cloud 的替代品) ----------
function makePuffTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.32)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

function MistPuff({ position, scale, speed, offset, opacity = 0.13 }: {
  position: [number, number, number]
  scale: number
  speed: number
  offset: number
  opacity?: number
}) {
  const ref = useRef<THREE.Sprite>(null)
  const t = useRef(offset)
  const tex = useMemo(() => makePuffTexture(), [])
  useFrame((_, dt) => {
    t.current += dt * speed
    if (!ref.current) return
    ref.current.position.x = position[0] + Math.sin(t.current) * 0.7
    ref.current.position.y = position[1] + Math.sin(t.current * 0.8) * 0.18
    ref.current.position.z = position[2] + Math.cos(t.current * 0.7) * 0.5
  })
  return (
    <sprite ref={ref} position={position} scale={[scale, scale * 0.62, 1]}>
      <spriteMaterial map={tex} color="#b9c8ff" transparent opacity={opacity * 0.8} depthWrite={false} />
    </sprite>
  )
}

function MistBand() {
  return (
    <>
      <MistPuff position={[-2.3, 2.4, 1.2]} scale={2.6} speed={0.14} offset={0} />
      <MistPuff position={[2.1, 2.7, -1.1]} scale={2.2} speed={0.11} offset={2} />
      <MistPuff position={[0, -2.55, 0.4]} scale={4.6} speed={0.07} offset={4} opacity={0.1} />
      <MistPuff position={[1.4, -1.35, 1.9]} scale={1.4} speed={0.2} offset={1.2} opacity={0.16} />
      <MistPuff position={[-1.7, -2.5, -1.2]} scale={3.4} speed={0.09} offset={5} opacity={0.09} />
    </>
  )
}

// ---------- 呼吸律动(整个生态随云鲸呼吸轻微起伏) ----------
function BreathRhythm({ children, muted }: { children: React.ReactNode; muted: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.scale.setScalar(1 + (muted ? 0 : 0.012 * Math.sin(t * 0.55)))
  })
  return <group ref={ref}>{children}</group>
}

// ---------- 环境光呼吸 ----------
function BreathLights({ muted }: { muted: boolean }) {
  const cyan = useRef<THREE.PointLight>(null)
  const lavender = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const base = muted ? 0.7 : 0.7 + 0.22 * Math.sin(t * 0.55)
    if (cyan.current) cyan.current.intensity = base
    if (lavender.current) lavender.current.intensity = base * 0.75
  })
  return (
    <>
      <ambientLight intensity={0.32} color="#8ea0c0" />
      <hemisphereLight intensity={0.4} color="#9db4d6" groundColor="#16233c" />
      <directionalLight position={[-6, 9, -5]} intensity={0.75} color="#b9c8ff" />
      <pointLight ref={cyan} position={[0, 0.6, 0]} intensity={0.7} distance={14} color="#67e8f9" />
      <pointLight ref={lavender} position={[-4, -2, 3]} intensity={0.5} distance={13} color="#a78bfa" />
    </>
  )
}

// ---------- 场景主体 ----------
function Scene({ breathing, autoRotate }: { breathing: boolean; autoRotate: boolean }) {
  return (
    <>
      <color attach="background" args={['#060a16']} />
      <fog attach="fog" args={['#060a16', 22, 46]} />
      <BreathLights muted={!breathing} />
      <Stars radius={80} depth={35} count={2600} factor={3.2} saturation={0} fade speed={0.4} />

      <BreathRhythm muted={!breathing}>
        <GlassCube />
        <MainIsland />
        <FloatingIsles />
        <WhaleSpirit />
        {/* 立方体内星尘 */}
        {false && <Sparkles count={130} scale={[8.4, 8.4, 8.4]} size={2.1} speed={0.22} color="#cfe8ff" opacity={0.65} />}
        {/* 内部云雾(自制精灵,drei Cloud 会炸渲染) */}
        <MistBand />
      </BreathRhythm>

      {/* 远景星云薄雾 */}
      <mesh position={[-14, 6, -30]} scale={26}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1b2a55" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[16, -4, -34]} scale={30}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#2b2153" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={6.5}
        maxDistance={26}
        maxPolarAngle={Math.PI * 0.62}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.06}
      />
    </>
  )
}

// ---------- 页面组件 ----------
export default function SanctuaryScene() {
  const [breathing, setBreathing] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)

  return (
    <div className="relative h-[calc(100dvh-13.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-line-2">
      <Canvas
        camera={{ position: [9.5, 5.2, 11.5], fov: 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <CanvasErrorTrap>
          <Scene breathing={breathing} autoRotate={autoRotate} />
        </CanvasErrorTrap>
      </Canvas>

      {/* 覆盖 UI */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <div>
          <p className="neon-gradient-text text-xl font-bold tracking-widest">云鲸圣域</p>
          <p className="mt-1 text-[11px] leading-relaxed text-txt-muted">
            封存在玻璃中的一座微缩生态 · 云鲸星灵正沿梦境巡游
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => setBreathing((v) => !v)}
            className={cn(
              'cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] transition-colors',
              breathing ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-surface-1 text-txt-muted hover:text-txt-secondary',
            )}
          >
            {breathing ? '呼吸律动中' : '呼吸已静默'}
          </button>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className={cn(
              'cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] transition-colors',
              autoRotate ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-surface-1 text-txt-muted hover:text-txt-secondary',
            )}
          >
            {autoRotate ? '自动旋转' : '旋转已停'}
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <p className="rounded-xl border border-line-2 bg-ink-900/60 px-3 py-1.5 text-[11px] text-txt-muted backdrop-blur">
          🖱️ 拖拽旋转 · 滚轮缩放 · 它在玻璃里等你很久了
        </p>
      </div>
    </div>
  )
}
