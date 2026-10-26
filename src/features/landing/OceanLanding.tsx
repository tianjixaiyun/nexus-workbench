import { useEffect, memo, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { useNavigate } from 'react-router'
import { CanvasErrorTrap } from '@/features/sanctuary/CanvasErrorTrap'
import { ScrambleText, Magnetic } from '@/components/fx/micro'
import { BlurText, Marquee } from '@/components/fx/bits'
import { ParticleField } from '@/components/fx/ParticleField'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { RotatingBadge } from '@/components/fx/RotatingBadge'
import { CountUp } from '@/components/fx/micro'
import { useTaskStore } from '@/stores/taskStore'
import { useMemoStore } from '@/stores/memoStore'
import { useHabitStore } from '@/stores/habitStore'
import { recentSessions } from '@/lib/pomodoro'
import { liquidNavigate } from '@/components/fx/overlays'
import { burst } from '@/components/fx/Burst'
import { whaleCall } from '@/lib/whaleCall'

/**
 * NEXUS · 个人数字海洋首页
 * 致敬「Daily Design」海洋滚动叙事站:首屏是海面上的阳光与小船,
 * 向下滚动即一路下潜——透光层的鱼群、暮光层的静谧、路过的鲸,
 * 直到深海尽头发光的珊瑚与 NEXUS 核心。水体颜色随深度渐变。
 */

// ---------- 通用纹理 ----------
function makeRadialTexture(stops: [number, string][]): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [pos, color] of stops) grad.addColorStop(pos, color)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function makeLinearTexture(top: string, bottom: string): THREE.Texture {
  const w = 16
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

// ---------- 海面:顶点波浪 + 小船剪影 + 太阳光晕 ----------
function SeaSurface({ night }: { night: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const base = useRef<Float32Array | null>(null)

  const geometry = useMemo(() => new THREE.PlaneGeometry(220, 220, 72, 72), [])

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    const pos = m.geometry.attributes.position as THREE.BufferAttribute
    if (!base.current) base.current = Float32Array.from(pos.array as Float32Array)
    const b = base.current
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3]
      const y = b[i * 3 + 1]
      pos.array[i * 3 + 2] = Math.sin(x * 0.14 + t * 0.9) * 0.5 + Math.cos(y * 0.11 + t * 0.7) * 0.42
    }
    pos.needsUpdate = true
  })

  const sunTex = useMemo(
    () =>
      makeRadialTexture([
        [0, 'rgba(255,244,214,1)'],
        [0.2, 'rgba(255,236,190,0.9)'],
        [0.5, 'rgba(255,225,160,0.35)'],
        [1, 'rgba(255,220,150,0)'],
      ]),
    [],
  )

  return (
    <group>
      <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#1e7fae"
          transparent
          opacity={0.88}
          roughness={0.28}
          metalness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 太阳:水面上方的大光晕 + 亮核 */}
      <sprite position={[night ? -26 : 30, 26, -110]} scale={night ? [26, 26, 1] : [46, 46, 1]}>
        <spriteMaterial map={sunTex} color={night ? '#dfe9ff' : '#ffffff'} transparent opacity={0.9} depthWrite={false} />
      </sprite>
      <sprite position={[night ? -26 : 30, 26, -112]} scale={night ? [8, 8, 1] : [13, 13, 1]}>
        <spriteMaterial map={sunTex} color={night ? '#f2f7ff' : '#ffffff'} transparent opacity={0.95} depthWrite={false} />
      </sprite>
      <Boat position={[-11, 0.55, -32]} />
    </group>
  )
}

/** 海面上的小船剪影 */
function Boat({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime
      ref.current.rotation.z = Math.sin(t * 0.7) * 0.05
      ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.18
    }
  })
  const mat = <meshBasicMaterial color="#12304a" />
  return (
    <group ref={ref} position={position} scale={2.6}>
      <mesh scale={[1, 0.5, 2.6]}>{mat}</mesh> {/* 船身 */}
      <mesh position={[0, 0.15, 0]} scale={[0.7, 0.5, 2.2]}>{mat}</mesh>
      <mesh position={[0, 1.1, 0.2]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.85, 2.1, 3]} />
        <meshBasicMaterial color="#e8f2f8" transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------- 光柱:从海面斜射进水里的丁达尔光 ----------
function LightShafts({ scrollRef }: { scrollRef: RefObject<number> }) {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(
    () => makeLinearTexture('rgba(214,240,255,0.55)', 'rgba(214,240,255,0)'),
    [],
  )
  const shafts = useMemo(
    () =>
      [
        [-12, -4, -0.14, 5.5, 0.16],
        [-4, -7, -0.1, 7, 0.2],
        [3, -5, -0.2, 6, 0.18],
        [10, -8, -0.12, 8, 0.14],
        [17, -6, -0.18, 5, 0.12],
      ] as const,
    [],
  )
  useFrame(() => {
    if (!group.current) return
    // 入水后光柱最亮,随深度加深淡出(相机下潜由滚动驱动)
    const p = scrollRef.current ?? 0
    const vis = p < 0.06 ? p / 0.06 : Math.max(0, 1 - (p - 0.06) / 0.4)
    group.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      if (mat) mat.opacity = shafts[i][4] * vis
    })
  })
  return (
    <group ref={group}>
      {shafts.map(([x, z, tilt, len, opacity], i) => (
        <mesh key={i} position={[x, -len / 2 + 0.5, z]} rotation={[0, 0.35 + i * 0.1, tilt]}>
          <planeGeometry args={[2.4, len * 2]} />
          <meshBasicMaterial
            map={tex}
            color="#bfe6ff"
            transparent
            opacity={opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ---------- 气泡:缓慢上升的精灵 ----------
function Bubbles({ count = 80 }: { count?: number }) {
  const tex = useMemo(
    () =>
      makeRadialTexture([
        [0, 'rgba(255,255,255,0.85)'],
        [0.4, 'rgba(220,240,255,0.4)'],
        [0.75, 'rgba(200,230,255,0.12)'],
        [1, 'rgba(200,230,255,0)'],
      ]),
    [],
  )
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
        z: (Math.sin(i * 78.233) * 12543.264) % 1,
        y: (Math.sin(i * 3.717) * 23421.631) % 1,
        s: 0.1 + ((i * 53) % 7) / 7 * 0.22,
        v: 0.5 + ((i * 29) % 5) / 5 * 0.9,
      })).map((b) => ({
        x: b.x * 44 - 22,
        z: b.z * 44 - 22,
        y: b.y * 46 - 44,
        s: b.s,
        v: b.v,
      })),
    [count],
  )
  const group = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      const b = items[i]
      let y = b.y + t.current * b.v
      y = ((y + 44) % 48) - 44
      child.position.set(b.x + Math.sin(t.current * 0.8 + i) * 0.6, y, b.z)
    })
  })
  return (
    <group ref={group}>
      {items.map((b, i) => (
        <sprite key={i} scale={[b.s, b.s, 1]}>
          <spriteMaterial map={tex} color="#d9efff" transparent opacity={0.32} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

// ---------- 鱼群:沿圆环巡游的剪影 ----------
function FishSchool({ center, radius, speed, y }: { center: [number, number, number]; radius: number; speed: number; y: number }) {
  const group = useRef<THREE.Group>(null)
  const fishes = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2
        const r = radius + ((i * 37) % 10) / 10 * 2.2
        return { a, r, y: ((i * 53) % 10) / 10 * 1.6 - 0.8, s: 0.8 + ((i * 71) % 10) / 10 * 0.6 }
      }),
    [radius],
  )
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * speed
  })
  return (
    <group ref={group} position={center}>
      {fishes.map((f, i) => (
        <group key={i} position={[Math.cos(f.a) * f.r, y + f.y, Math.sin(f.a) * f.r]} rotation={[0, -f.a, 0]} scale={f.s}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.09, 0.42, 6]} />
            <meshBasicMaterial color="#0a2438" transparent opacity={0.92} />
          </mesh>
          <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.07, 0.2, 4]} />
            <meshBasicMaterial color="#0a2438" transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- 路过的鲸:深水层缓慢横穿的剪影 ----------
function PassingWhale() {
  const whale = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const clickAt = useRef(-1)
  const nowT = useRef(0)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (whale.current) {
      const x = ((t * 1.9) % 110) - 55
      whale.current.position.set(x, -26.5 + Math.sin(t * 0.4) * 1.2, -7)
      whale.current.rotation.z = Math.sin(t * 0.4) * 0.06
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 1.1) * 0.3
    // 点击后的声波环
    if (ring.current && whale.current) {
      if (clickAt.current >= 0) {
        const dt = t - clickAt.current
        if (dt < 1.1) {
          ring.current.visible = true
          ring.current.position.copy(whale.current.position)
          const sc = 1.5 + dt * 11
          ring.current.scale.set(sc, sc, sc)
          ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - dt / 1.1)
        } else {
          ring.current.visible = false
          clickAt.current = -1
        }
      }
    }
  })
  const mat = <meshStandardMaterial color="#0d2c48" roughness={0.85} transparent opacity={0.97} />
  return (
    <>
    <mesh ref={ring} visible={false}>
      <ringGeometry args={[1.1, 1.28, 48]} />
      <meshBasicMaterial color="#8fe8ff" transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <group
      ref={whale}
      rotation={[0, Math.PI / 2, 0]}
      scale={3.1}
      onPointerDown={(e) => {
        e.stopPropagation()
        whaleCall()
        clickAt.current = nowT.current
        const ne = e.nativeEvent as PointerEvent
        burst(ne.clientX, ne.clientY, { count: 16, colors: ['#9ff0ff', '#e0f7ff', '#ffffff'], spread: 2.6, up: 2.4, gravity: 0.1, size: 2.8, bubbles: 12 })
      }}
    >
      <mesh scale={[1.05, 0.95, 2.6]}>
        <sphereGeometry args={[0.8, 26, 26]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.12, 1.9]} scale={[0.7, 0.55, 0.8]}>
        <sphereGeometry args={[0.6, 20, 20]} />
        {mat}
      </mesh>
      <group ref={tail} position={[0, 0, -2.1]}>
        <mesh position={[0, 0, -0.5]} scale={[0.42, 0.36, 1.1]}>
          <sphereGeometry args={[0.6, 18, 18]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.5, -1.3]} rotation={[0, 0, 0.6]} scale={[0.08, 0.8, 0.5]}>
          <sphereGeometry args={[0.5, 14, 14]} />
          {mat}
        </mesh>
        <mesh position={[0, -0.5, -1.3]} rotation={[0, 0, -0.6]} scale={[0.08, 0.8, 0.5]}>
          <sphereGeometry args={[0.5, 14, 14]} />
          {mat}
        </mesh>
      </group>
      {/* 鲸背微光 */}
      <Sparkles count={12} scale={[1.6, 0.9, 3.4]} size={2} speed={0.25} color="#9fd8ff" opacity={0.5} />
    </group>
    </>
  )
}

// ---------- 深海海底:地形 + 发光珊瑚 + NEXUS 核心 ----------
function GlowSprite({ position, scale, color, opacity = 0.4 }: {
  position: [number, number, number]
  scale: number
  color: string
  opacity?: number
}) {
  const tex = useMemo(
    () =>
      makeRadialTexture([
        [0, 'rgba(255,255,255,0.95)'],
        [0.35, 'rgba(255,255,255,0.4)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    [],
  )
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  )
}

function CoralCluster({ position, color, height = 1.2 }: {
  position: [number, number, number]
  color: string
  height?: number
}) {
  const branches = useMemo(
    () =>
      [
        [0.28, 0.9, 0],
        [-0.22, 1.05, 0.15],
        [0.05, 0.75, -0.28],
        [0.42, 0.6, 0.22],
      ] as const,
    [],
  )
  return (
    <group position={position}>
      {branches.map(([bx, bh, bz], i) => (
        <group key={i} position={[bx, 0, bz]} rotation={[bz * 0.5, 0, -bx * 0.6]}>
          <mesh position={[0, bh / 2, 0]}>
            <cylinderGeometry args={[0.035, 0.06, bh, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, bh + 0.07, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
      <GlowSprite position={[0, height * 0.4, 0]} scale={height * 1.8} color={color} opacity={0.3} />
    </group>
  )
}

function SeaFloor() {
  const core = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (core.current) {
      core.current.rotation.y = t * 0.25
      core.current.position.y = -43.4 + Math.sin(t * 0.6) * 0.14
    }
  })
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.7, 1.7)), [])
  return (
    <group>
      {/* 海床起伏 */}
      {[
        [-14, -48.4, -8, 9, 3.4, '#0a1c31'],
        [10, -48.6, -10, 11, 4.2, '#0c2138'],
        [0, -49, -16, 14, 3, '#0a1a2e'],
        [19, -48.2, 4, 7, 2.6, '#0b1f34'],
        [-21, -48, 6, 8, 2.2, '#0b1f34'],
      ].map(([x, y, z, r, h, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <coneGeometry args={[r as number, h as number, 7]} />
          <meshStandardMaterial color={c as string} roughness={1} flatShading />
        </mesh>
      ))}
      {/* 发光珊瑚 */}
      <CoralCluster position={[-7.5, -46.4, 2]} color="#67e8f9" height={1.5} />
      <CoralCluster position={[-4.6, -46.2, 4.2]} color="#f0a6d8" height={1.1} />
      <CoralCluster position={[4.8, -46.3, 3]} color="#a78bfa" height={1.4} />
      <CoralCluster position={[8.2, -46.5, 0.6]} color="#67e8f9" height={1.2} />
      <CoralCluster position={[1.8, -46.6, 6.5]} color="#f0a6d8" height={0.9} />
      <CoralCluster position={[-10.8, -46.6, -1.5]} color="#a78bfa" height={1} />
      {/* 浮游生物微光 */}
      <Sparkles count={170} scale={[34, 7, 22]} position={[0, -44.5, 0]} size={2.2} speed={0.3} color="#8fe8ff" opacity={0.55} />
      {/* NEXUS 核心:深海尽头发光的玻璃小立方 */}
      <group ref={core}>
        <mesh>
          <boxGeometry args={[1.7, 1.7, 1.7]} />
          <meshPhysicalMaterial
            color="#a8defc"
            transparent
            opacity={0.14}
            roughness={0.05}
            clearcoat={1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#7fe4ff" transparent opacity={0.85} />
        </lineSegments>
        <GlowSprite position={[0, -0.4, 0]} scale={5.2} color="#5fdcff" opacity={0.5} />
        <pointLight color="#67e8f9" intensity={2.4} distance={13} />
      </group>
    </group>
  )
}

// ---------- 深度大气:背景色/雾随下潜渐变 ----------
const COLOR_STOPS: { t: number; color: string }[] = [
  { t: 0.0, color: '#9fd3ef' }, // 水面上:朦胧天光
  { t: 0.16, color: '#5fb6d9' }, // 刚入水
  { t: 0.4, color: '#2a7fae' }, // 透光层
  { t: 0.68, color: '#0d3a63' }, // 暮光层
  { t: 1.0, color: '#04101f' }, // 深海午夜
]

const NIGHT_STOPS: { t: number; color: string }[] = [
  { t: 0.0, color: '#0d1c31' }, // 夜空与月光海面
  { t: 0.16, color: '#0a2138' },
  { t: 0.4, color: '#071c33' },
  { t: 0.68, color: '#04122a' },
  { t: 1.0, color: '#010813' },
]

function sampleColor(p: number, stops: { t: number; color: string }[], out: THREE.Color) {
  const t = THREE.MathUtils.clamp(p, 0, 1)
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1].t) i++
  const a = stops[i]
  const b = stops[i + 1]
  const u = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1)
  out.set(a.color).lerp(new THREE.Color(b.color), u)
}

function DepthAtmosphere({ scrollRef, night }: { scrollRef: RefObject<number>; night: boolean }) {
  const { scene } = useThree()
  const c = useMemo(() => new THREE.Color('#9fd3ef'), [])
  useFrame(() => {
    const p = scrollRef.current ?? 0
    sampleColor(p, night ? NIGHT_STOPS : COLOR_STOPS, c)
    const bg = scene.background as THREE.Color | null
    if (bg) bg.copy(c)
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      fog.color.copy(c)
      // 水面上视野远,水下雾越深越浓
      fog.near = THREE.MathUtils.lerp(46, 7, p)
      fog.far = THREE.MathUtils.lerp(170, 52, p)
    }
  })
  return null
}

// ---------- 滚动运镜 ----------
const KEYFRAMES: { t: number; pos: [number, number, number]; tgt: [number, number, number] }[] = [
  { t: 0.0, pos: [0, 12.5, 30], tgt: [2, 1.5, -60] }, // 海面上:阳光、波浪、小船
  { t: 0.14, pos: [1, 4.5, 23], tgt: [0, -1.5, -13] }, // 三步玩转:贴着水面缓降
  { t: 0.28, pos: [1.5, 1.2, 21], tgt: [0, -3.5, -14] }, // 掠过浪尖,即将入水
  { t: 0.42, pos: [-5, -8.5, 15], tgt: [0, -11, -8] }, // 透光层:鱼群与光柱
  { t: 0.56, pos: [5.5, -17, 12], tgt: [0, -20, -7] }, // 越潜越深,蓝色渐浓
  { t: 0.72, pos: [0, -27.5, 13], tgt: [0, -27.5, -6] }, // 鲸正从此处路过
  { t: 0.87, pos: [0, -33, 14.5], tgt: [0, -35, -4] }, // 数字年报:临近海底的静默
  { t: 1.0, pos: [0, -36.5, 16], tgt: [0, -43.5, 0] }, // 深海尽头:珊瑚与核心
]

function CameraRig({ scrollRef }: { scrollRef: RefObject<number> }) {
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])
  const look = useRef(new THREE.Vector3(2, 1.5, -60))
  useFrame(({ camera }, dt) => {
    const t = THREE.MathUtils.clamp(scrollRef.current ?? 0, 0, 1)
    let i = 0
    while (i < KEYFRAMES.length - 2 && t > KEYFRAMES[i + 1].t) i++
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    const u = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1)
    const s = u * u * (3 - 2 * u)
    tmpPos.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], s),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], s),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], s),
    )
    tmpTgt.set(
      THREE.MathUtils.lerp(a.tgt[0], b.tgt[0], s),
      THREE.MathUtils.lerp(a.tgt[1], b.tgt[1], s),
      THREE.MathUtils.lerp(a.tgt[2], b.tgt[2], s),
    )
    const l = 2.6
    camera.position.set(
      THREE.MathUtils.damp(camera.position.x, tmpPos.x, l, dt),
      THREE.MathUtils.damp(camera.position.y, tmpPos.y, l, dt),
      THREE.MathUtils.damp(camera.position.z, tmpPos.z, l, dt),
    )
    look.current.set(
      THREE.MathUtils.damp(look.current.x, tmpTgt.x, l, dt),
      THREE.MathUtils.damp(look.current.y, tmpTgt.y, l, dt),
      THREE.MathUtils.damp(look.current.z, tmpTgt.z, l, dt),
    )
    camera.lookAt(look.current)
  })
  return null
}

// ---------- 场景主体 ----------
function Scene({ scrollRef, night }: { scrollRef: RefObject<number>; night: boolean }) {
  return (
    <>
      <color attach="background" args={[night ? '#0d1c31' : '#9fd3ef']} />
      <fog attach="fog" args={[night ? '#0d1c31' : '#9fd3ef', night ? 30 : 46, night ? 120 : 170]} />
      <ambientLight intensity={night ? 0.38 : 0.55} color={night ? '#7d95c4' : '#9cc4e0'} />
      <directionalLight position={night ? [-16, 24, -30] : [14, 22, -30]} intensity={night ? 0.6 : 1.15} color={night ? '#c9d9ff' : '#ffe9c4'} />
      <pointLight position={[0, -30, 0]} intensity={0.5} distance={40} color="#1c4e78" />

      <SeaSurface night={night} />
      <LightShafts scrollRef={scrollRef} />
      <Bubbles />
      <FishSchool center={[0, -9.5, -4]} radius={5.5} speed={0.5} y={0} />
      <FishSchool center={[3, -18.5, -6]} radius={4} speed={-0.38} y={0} />
      <PassingWhale />
      <SeaFloor />

      <DepthAtmosphere scrollRef={scrollRef} night={night} />
      <CameraRig scrollRef={scrollRef} />
    </>
  )
}

const SceneCanvas = memo(function SceneCanvas({ scrollRef, night }: { scrollRef: RefObject<number>; night: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 12.5, 30], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <CanvasErrorTrap>
        <Scene scrollRef={scrollRef} night={night} />
      </CanvasErrorTrap>
    </Canvas>
  )
})

// ---------- 页面:粘性画布 + 下潜分幕文案 ----------
function CapsuleButton({ children, onClick, primary }: { children: ReactNode; onClick: (e: React.MouseEvent) => void; primary?: boolean }) {
  return (
    <Magnetic>
    <button
      onClick={onClick}
      className={
        primary
          ? 'pointer-events-auto cursor-pointer rounded-full bg-gradient-to-r from-sky-300 to-cyan-200 px-7 py-3 text-sm font-semibold tracking-wide text-sky-950 shadow-[0_8px_30px_rgba(125,211,252,0.35)] transition-all duration-300 hover:scale-[1.04]'
          : 'pointer-events-auto cursor-pointer rounded-full border border-white/35 bg-white/10 px-7 py-3 text-sm font-medium tracking-wide text-white/90 backdrop-blur-md transition-all duration-300 hover:border-white/60 hover:bg-white/20'
      }
    >
      {children}
    </button>
    </Magnetic>
  )
}

export default function OceanLanding() {
  const navigate = useNavigate()
  // 系统开启「减少动态效果」:静态海面替代 3D 场景与粒子,文字内容不变
  const reduced = useReducedMotion()
  // 数字年报:真实数据讲这片海的故事
  const tasks = useTaskStore((st) => st.tasks)
  const memos = useMemoStore((st) => st.memos)
  const habits = useHabitStore((st) => st.habits)
  const doneTasks = tasks.filter((t) => t.status === 'done' && !t.deletedAt).length
  const focusTotal = recentSessions(90).reduce((sum, x) => sum + x.count, 0)
  const maxStreak = habits.reduce((m, h) => {
    const set = new Set(h.dates ?? [])
    let streak = 0
    const day = 86_400_000
    const fmt = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let t0 = today.getTime()
    if (!set.has(fmt(t0))) { t0 -= day; if (!set.has(fmt(t0))) return m }
    while (set.has(fmt(t0))) { streak++; t0 -= day }
    return Math.max(m, streak)
  }, 0)
  // 深夜 23:00-5:00:月光海洋
  const night = useMemo(() => {
    const h = new Date().getHours()
    return h >= 23 || h < 5
  }, [])
  const [progress, setProgress] = useState(0)
  const scrollRef = useRef(0)

  // 独立页面:自己拉取数据(store 数据在本地,瞬读)
  useEffect(() => {
    const t = useTaskStore.getState()
    if (!t.loaded) void t.fetch()
    const m = useMemoStore.getState()
    if (!m.loaded) void m.fetch()
    const h = useHabitStore.getState()
    if (!h.loaded) void h.fetch()
  }, [])
  const containerRef = useRef<HTMLDivElement>(null)
  const skewRef = useRef<HTMLDivElement>(null)
  const skewState = useRef({ lastTop: 0, skew: 0, target: 0 })

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const max = Math.max(1, el.scrollHeight - el.clientHeight)
    const p = el.scrollTop / max
    scrollRef.current = p
    // 滚动速度 → 歪斜(与 GlobalSkew 同一套手感,容器内自算)
    const sk = skewState.current
    const vel = el.scrollTop - sk.lastTop
    sk.lastTop = el.scrollTop
    sk.target = Math.max(-3, Math.min(3, Math.max(-16, Math.min(16, vel)) * 0.26))
    setProgress((prev) => (Math.abs(prev - p) > 0.01 ? p : prev))
  }

  const scrollTo = (top: number) => {
    containerRef.current?.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }

  // 歪斜惯性:每帧向目标推进、目标自身衰减,停手回正(减少动态效果时静止)
  useEffect(() => {
    if (reduced) {
      if (skewRef.current) skewRef.current.style.transform = 'skewY(0deg)'
      return
    }
    const timer = window.setInterval(() => {
      const sk = skewState.current
      sk.skew += (sk.target - sk.skew) * 0.14
      sk.target *= 0.86
      if (skewRef.current) skewRef.current.style.transform = `skewY(${sk.skew.toFixed(3)}deg)`
    }, 16)
    return () => clearInterval(timer)
  }, [reduced])

  const depth = Math.round(progress * 40)

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative h-dvh overflow-y-auto overflow-x-hidden"
      style={{ scrollbarWidth: 'none', background: night ? '#0d1c31' : '#9fd3ef' }}
    >
      {/* 粘性画布:减少动态效果时用静态渐变海面替代 three.js 场景 */}
      <div className="sticky top-0 h-dvh w-full">
        {reduced ? (
          <div
            className="absolute inset-0"
            style={{
              background: night
                ? 'linear-gradient(180deg, #0a1220 0%, #0d1c31 45%, #060b14 100%)'
                : 'linear-gradient(180deg, #9fd3ef 0%, #5f9fd0 55%, #123a5e 100%)',
            }}
          />
        ) : (
          <SceneCanvas scrollRef={scrollRef} night={night} />
        )}
        {/* 上下暗角保证文字可读 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent" />

        {/* 粒子英雄字:星尘汇聚成 NEXUS,鼠标可推开,随下潜淡出(减少动态效果时停用) */}
        {!reduced && (
          <div
            className="pointer-events-none absolute inset-x-0 top-[8%] z-[2] h-[40%]"
            style={{ opacity: Math.max(0, 1 - progress * 4.5) }}
          >
            <ParticleField
              text="NEXUS"
              className="h-full w-full"
              density={typeof window !== 'undefined' && window.innerWidth < 768 ? 0.55 : 1}
              opacity={night ? 0.95 : 0.8}
            />
          </div>
        )}

        {/* 顶部导航 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/30">
              N
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.22em] text-white drop-shadow">NEXUS</p>
              <p className="text-[10px] tracking-[0.3em] text-white/70">PERSONAL · OCEAN</p>
            </div>
          </div>
          <nav className="pointer-events-auto hidden items-center gap-7 text-[13px] text-white/85 md:flex">
            <button onClick={() => navigate('/home')} className="cursor-pointer transition-colors hover:text-white">工作台</button>
            <button onClick={(e) => liquidNavigate(navigate, '/about', e)} className="cursor-pointer transition-colors hover:text-white">关于我</button>
            <button onClick={(e) => liquidNavigate(navigate, '/portfolio', e)} className="cursor-pointer transition-colors hover:text-white">作品集</button>
            <button onClick={(e) => liquidNavigate(navigate, '/focus', e)} className="cursor-pointer transition-colors hover:text-white">专注</button>
            <button onClick={(e) => liquidNavigate(navigate, '/sanctuary', e)} className="cursor-pointer transition-colors hover:text-white">云鲸圣域</button>
            <CapsuleButton primary onClick={(e) => liquidNavigate(navigate, '/home', e)}>开始使用 →</CapsuleButton>
          </nav>
          <div className="pointer-events-auto md:hidden">
            <CapsuleButton primary onClick={(e) => liquidNavigate(navigate, '/home', e)}>开始使用</CapsuleButton>
          </div>
        </div>

        {/* 右侧深度计 */}
        <div className="pointer-events-none absolute top-1/2 right-5 flex -translate-y-1/2 flex-col items-center gap-2 md:right-8">
          <span className="font-mono text-[10px] text-white/60">0m</span>
          <div className="relative h-44 w-px bg-white/25">
            <div
              className="absolute -left-[3px] h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(147,233,255,0.9)] transition-[top] duration-200"
              style={{ top: `${progress * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-white/60">-40m</span>
          <span className="mt-1 rounded-full border border-white/20 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-cyan-100 backdrop-blur">
            {depth}m
          </span>
        </div>

        {/* 底部滚动提示 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-7 flex flex-col items-center gap-1.5 transition-opacity duration-500"
          style={{ opacity: Math.max(0, 1 - progress * 7) }}
        >
          <div className="mb-3 w-[72%] max-w-xl">
                <Marquee
                  speed={30}
                  className="[mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
                  items={['任务中心', '目标', '习惯打卡', '专注番茄', '笔记便签', '数据看板', '工具箱', '成就', '作品集', '手帐'].map((m) => (
                    <span key={m} className="text-[10px] tracking-[0.3em] text-white/60">✦ {m}</span>
                  ))}
                />
              </div>
          <RotatingBadge
            size={104}
            duration={15}
            tone="rgba(255,255,255,0.9)"
            className="mt-1"
            onClick={() => scrollTo(containerRef.current?.clientHeight ?? 800)}
          />
          <span className="text-[10px] tracking-[0.45em] text-white/75">SCROLL TO DIVE</span>
        </div>
      </div>

      {/* 下潜分幕(整层随滚动速度轻微歪斜) */}
      <div ref={skewRef} className="relative z-10 will-change-transform" style={{ marginTop: 'calc(-100dvh)' }}>
        {/* 第一幕:海面之上 */}
        <section className="flex h-dvh items-center justify-center px-8 text-center">
          <div className="pointer-events-none max-w-3xl">
            <p className="mb-6 inline-block rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-[11px] tracking-[0.35em] text-white/90 backdrop-blur">
              NEXUS · 个人数字海洋
            </p>
            <h1 className="text-5xl leading-[1.15] font-bold tracking-wide text-white drop-shadow-lg md:text-7xl">
              <ScrambleText text="把喧嚣留在水面上," delay={400} />
              <br />
              <ScrambleText text="向深处去。" delay={1150} />
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-white/85 drop-shadow md:text-base">
              <BlurText text={(() => {
                try {
                  const p = JSON.parse(localStorage.getItem('nexus-profile-v1') ?? 'null')
                  if (p?.name) return `${p.name}的数字海洋:任务、目标、习惯与笔记,随深度一起生长。`
                } catch { /* 无档案用默认 */ }
                return '这不只是工作台——是我的个人网站、任务、目标、习惯与笔记,一座随深度生长的数字海洋。'
              })()} delay={1900} />
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <CapsuleButton primary onClick={() => scrollTo(containerRef.current?.clientHeight ?? 800)}>潜入 ↓</CapsuleButton>
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/home', e)}>直接进入工作台</CapsuleButton>
            </div>
          </div>
        </section>

        {/* 第 1.5 幕:三步玩转 */}
        <section className="flex h-dvh flex-col items-center justify-center gap-10 px-8 text-center md:px-16">
          <div className="pointer-events-none max-w-3xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-2M · 起步</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              三步,玩转这片海。
            </h2>
          </div>
          <div className="pointer-events-none grid w-full max-w-4xl gap-4 md:grid-cols-3">
            {[
              { n: '01', t: '下潜 · 探索', d: '继续往下滚,光线渐暗,途经鱼群与鲸,直达 -40m 发光珊瑚海底。', e: '🌊' },
              { n: '02', t: '上岸 · 工作台', d: '点「进入工作台」:任务、目标、习惯、番茄、笔记、记账一应俱全。', e: '🧭' },
              { n: '03', t: '记录 · 收藏', d: '碎碎念随手记,成就徽章慢慢攒——这里会长成你的数字年轮。', e: '✨' },
            ].map((c, i) => (
              <div
                key={c.n}
                className="nexus-howto-card rounded-3xl border border-white/20 bg-white/10 p-6 text-left backdrop-blur-md"
                style={{ animationDelay: `${200 + i * 160}ms`, transform: `rotate(${(i - 1) * 1.2}deg)` }}
              >
                <style>{`
                  .nexus-howto-card { opacity: 0; animation: nexus-howto-in 640ms cubic-bezier(.2,.7,.3,1) forwards }
                  @keyframes nexus-howto-in { from { opacity: 0; transform: translateY(28px) rotate(0deg) } }
                `}</style>
                <p className="font-mono text-3xl font-bold text-cyan-200/45" style={{ fontFamily: 'Georgia, serif' }}>{c.n}</p>
                <p className="mt-3 text-base font-bold text-white">{c.e} {c.t}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/70">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 第二幕:透光层 */}
        <section className="flex h-dvh items-center justify-start px-10 md:px-28">
          <div className="pointer-events-none max-w-xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-6M · 透光层</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              阳光还有很多。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/85 md:text-[15px]">
              浅水层收纳我的一切日常:任务、目标、习惯打卡、闪念便签。
              光柱穿过水面,一切清晰可见、随手可及。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/80">
              {['任务中心', '目标追踪', '习惯打卡', '笔记便签', '倒数日', '天气'].map((s) => (
                <span key={s} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 backdrop-blur">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* 第三幕:暮光层 */}
        <section className="flex h-dvh items-center justify-end px-10 text-left md:px-28">
          <div className="pointer-events-none max-w-xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-18M · 暮光层</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              深度,是专注的形状。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/85 md:text-[15px]">
              越往下,光线越少,杂音也越少。番茄钟、白噪音与数据看板,
              在这里陪我把一段段时间,沉成安静的力量。
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/focus', e)}>开始一次专注 →</CapsuleButton>
            </div>
          </div>
        </section>

        {/* 第四幕:鲸 */}
        <section className="flex h-dvh items-center justify-start px-10 md:px-28">
          <div className="pointer-events-none max-w-xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-27M · 深水层</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              偶尔,会有鲸经过。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/85 md:text-[15px]">
              在数字海洋的最深处,住着一头云鲸星灵——
              它守着我的圣域,也记得我每一次专注的呼吸。
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/sanctuary', e)}>去云鲸圣域看看 →</CapsuleButton>
            </div>
          </div>
        </section>

        {/* 第 4.5 幕:数字年报 */}
        <section className="flex h-dvh flex-col items-center justify-center gap-12 px-8 text-center">
          <div className="pointer-events-none max-w-2xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-36M · 年轮</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              这片海,已经陪你走了多远。
            </h2>
          </div>
          <div className="pointer-events-none grid w-full max-w-4xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
            {[
              { n: doneTasks, label: 'DONE · 完成的任务', suffix: '件' },
              { n: focusTotal, label: 'FOCUS · 专注番茄', suffix: '个' },
              { n: maxStreak, label: 'STREAK · 最长连续打卡', suffix: '天' },
              { n: memos.length, label: 'MEMOS · 碎碎念', suffix: '条' },
            ].map((item, i) => (
              <div key={item.label} style={{ animationDelay: `${180 + i * 150}ms` }} className="nexus-stat-block">
                <style>{`
                  .nexus-stat-block { opacity: 0; transform: translateY(22px); animation: nexus-empty-in 620ms cubic-bezier(.2,.7,.3,1) forwards }
                  @keyframes nexus-empty-in { to { opacity: 1; transform: none } }
                `}</style>
                <p className="font-mono text-5xl font-bold text-white tabular-nums drop-shadow md:text-7xl" style={{ fontFamily: 'Georgia, serif' }}>
                  <CountUp value={item.n} duration={1400} />
                </p>
                <p className="mt-2.5 text-[10px] tracking-[0.28em] text-white/55">
                  {item.label} <span className="text-white/35">{item.suffix}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 第五幕:深海尽头 */}
        <section className="flex h-dvh flex-col items-center justify-center px-8 text-center">
          <div className="pointer-events-none max-w-2xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-100/80">-40M · 深海尽头</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white drop-shadow md:text-6xl">
              这是我的深海。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/85 md:text-[15px]">
              发光的珊瑚,浮游的微光,和一颗安静的 NEXUS 核心。
              潜到这里,欢迎来到我的世界。
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <CapsuleButton primary onClick={(e) => liquidNavigate(navigate, '/home', e)}>进入工作台 →</CapsuleButton>
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/portfolio', e)}>看看作品集</CapsuleButton>
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/scrapbook', e)}>浮上海面翻手帐 ☀️</CapsuleButton>
              <CapsuleButton onClick={() => scrollTo(0)}>回到水面 ↑</CapsuleButton>
            </div>
            <p className="mt-14 text-[10px] tracking-[0.3em] text-white/50">NEXUS · PERSONAL DIGITAL OCEAN · 2026</p>
          </div>
        </section>
      </div>
    </div>
  )
}
