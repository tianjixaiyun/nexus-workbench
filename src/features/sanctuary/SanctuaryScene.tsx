import { memo, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { CanvasErrorTrap } from './CanvasErrorTrap'
import { ScrambleText, Magnetic } from '@/components/fx/micro'
import { liquidNavigate } from '@/components/fx/overlays'
import { burst } from '@/components/fx/Burst'
import { whaleCall } from '@/lib/whaleCall'

/**
 * 云鲸圣域 · 电影感展厅
 * 封存在玻璃立方体中的微缩生态:云鲸星灵沿 8 字巡游,呼吸律动,
 * 一道带粒子拖尾的发光轨道环环绕立方体(致敬 Aether 式产品页)。
 * 页面滚动驱动镜头分镜:推近星灵 → 俯冲生态 → 仰瞰光环 → 拉远收官。
 */

const CUBE = 9 // 玻璃立方体边长
/** 主区域可用高度:视口 - 顶栏 3.5rem */
const VIEW_H = 'calc(100dvh - 3.5rem)'

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
  const ring = useRef<THREE.Mesh>(null)
  const clickAt = useRef(-1)

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
    // 点击后的声波环,从鲸的位置荡开
    if (ring.current && whale.current) {
      if (clickAt.current >= 0) {
        const dt = time - clickAt.current
        if (dt < 1.1) {
          ring.current.visible = true
          ring.current.position.copy(whale.current.position)
          const sc = 1.2 + dt * 6
          ring.current.scale.set(sc, sc, sc)
          ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - dt / 1.1)
        } else {
          ring.current.visible = false
          clickAt.current = -1
        }
      }
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
    <>
    <mesh ref={ring} visible={false}>
      <ringGeometry args={[0.9, 1.05, 48]} />
      <meshBasicMaterial color="#9fe8ff" transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <group
      ref={whale}
      scale={0.72}
      onPointerDown={(e) => {
        e.stopPropagation()
        whaleCall()
        clickAt.current = t.current
        const ne = e.nativeEvent as PointerEvent
        burst(ne.clientX, ne.clientY, { count: 16, colors: ['#9ff0ff', '#e0f7ff', '#ffffff'], spread: 2.6, up: 2.4, gravity: 0.1, size: 2.8, bubbles: 12 })
      }}
    >
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
    </>
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

// ---------- 发光轨道环(致敬 Aether 式产品页的粒子拖尾光弧) ----------
function makeGlowTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.22)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** 一条环绕立方体的光弧:环体 + 头部亮星 + 渐隐拖尾,整体绕 Y 巡航 */
function OrbitalArc({ radius, arcLen, tilt, phaseY, color, speed }: {
  radius: number
  arcLen: number
  tilt: number
  phaseY: number
  color: string
  speed: number
}) {
  const spinner = useRef<THREE.Group>(null)
  const tex = useMemo(() => makeGlowTexture(), [])
  // 拖尾亮星:沿弧线排在头部之后,逐个渐隐(角度位置固定,由外层旋转带动巡航)
  const trail = useMemo(() => {
    const items: { pos: THREE.Vector3; scale: number; opacity: number }[] = []
    for (let i = 0; i < 12; i++) {
      const theta = arcLen - (i + 1) * 0.1
      items.push({
        pos: new THREE.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta)),
        scale: 0.34 * (1 - i / 14),
        opacity: 0.55 * (1 - i / 12) ** 1.6,
      })
    }
    return items
  }, [radius, arcLen])
  // 头部亮星(弧的前端)
  const head = useMemo(
    () => new THREE.Vector3(radius * Math.cos(arcLen), 0, radius * Math.sin(arcLen)),
    [radius, arcLen],
  )

  useFrame((_, dt) => {
    if (spinner.current) spinner.current.rotation.y += dt * speed
  })

  return (
    <group rotation={[tilt, phaseY, 0]}>
      <group ref={spinner}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.018, 8, 120, arcLen]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <sprite position={head} scale={[0.6, 0.6, 1]}>
          <spriteMaterial map={tex} color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
        {trail.map(({ pos, scale, opacity }, i) => (
          <sprite key={i} position={pos} scale={[scale, scale, 1]}>
            <spriteMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
    </group>
  )
}

/** 主青色光弧 + 副紫色光弧 + 两道极淡的完整导轨环 */
function OrbitalRings() {
  return (
    <group>
      <OrbitalArc radius={6.6} arcLen={2.3} tilt={0.3} phaseY={0} color="#67e8f9" speed={0.42} />
      <OrbitalArc radius={7.5} arcLen={1.5} tilt={-0.16} phaseY={2.1} color="#a78bfa" speed={-0.26} />
      {/* 极淡的完整导轨,交代光弧的轨道所在 */}
      <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]}>
        <torusGeometry args={[6.6, 0.006, 6, 140]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.16, 0.4, 0]}>
        <torusGeometry args={[7.5, 0.006, 6, 140]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ---------- 呼吸律动(整个生态随云鲸呼吸轻微起伏) ----------
function BreathRhythm({ children, muted }: { children: ReactNode; muted: boolean }) {
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

// ---------- 滚动运镜:关键帧之间平滑插值 ----------
const KEYFRAMES: { t: number; pos: [number, number, number]; tgt: [number, number, number] }[] = [
  { t: 0.0, pos: [11.8, 5.4, 13.2], tgt: [0, 0.6, 0] }, // 定场:立方体与光环
  { t: 0.26, pos: [5.6, 2.4, 7.4], tgt: [0, 1.3, 0] }, // 推近云鲸
  { t: 0.52, pos: [-7.4, -0.6, 6.2], tgt: [0, -1.5, 0] }, // 俯冲生态
  { t: 0.78, pos: [1.2, 9.2, 10.2], tgt: [0, 0.2, 0] }, // 仰瞰光环
  { t: 1.0, pos: [16, 7.6, 17], tgt: [0, 0.6, 0] }, // 收官拉远
]

function sampleKeyframes(p: number, outPos: THREE.Vector3, outTgt: THREE.Vector3) {
  const t = THREE.MathUtils.clamp(p, 0, 1)
  let i = 0
  while (i < KEYFRAMES.length - 2 && t > KEYFRAMES[i + 1].t) i++
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[i + 1]
  const u = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1)
  const s = u * u * (3 - 2 * u) // smoothstep:分镜切换带缓入缓出
  outPos.set(
    THREE.MathUtils.lerp(a.pos[0], b.pos[0], s),
    THREE.MathUtils.lerp(a.pos[1], b.pos[1], s),
    THREE.MathUtils.lerp(a.pos[2], b.pos[2], s),
  )
  outTgt.set(
    THREE.MathUtils.lerp(a.tgt[0], b.tgt[0], s),
    THREE.MathUtils.lerp(a.tgt[1], b.tgt[1], s),
    THREE.MathUtils.lerp(a.tgt[2], b.tgt[2], s),
  )
}

function CameraRig({ scrollRef, freeLook, lookRef }: {
  scrollRef: RefObject<number>
  freeLook: boolean
  lookRef: RefObject<THREE.Vector3>
}) {
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    if (freeLook) return // 自由视角时交给 OrbitControls
    sampleKeyframes(scrollRef.current ?? 0, tmpPos, tmpTgt)
    const l = 2.6
    camera.position.set(
      THREE.MathUtils.damp(camera.position.x, tmpPos.x, l, dt),
      THREE.MathUtils.damp(camera.position.y, tmpPos.y, l, dt),
      THREE.MathUtils.damp(camera.position.z, tmpPos.z, l, dt),
    )
    const look = lookRef.current
    look.set(
      THREE.MathUtils.damp(look.x, tmpTgt.x, l, dt),
      THREE.MathUtils.damp(look.y, tmpTgt.y, l, dt),
      THREE.MathUtils.damp(look.z, tmpTgt.z, l, dt),
    )
    camera.lookAt(look)
  })
  return null
}

// ---------- 场景主体 ----------
function Scene({ scrollRef, freeLook, lookRef, controlsRef }: {
  scrollRef: RefObject<number>
  freeLook: boolean
  lookRef: RefObject<THREE.Vector3>
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>
}) {
  return (
    <>
      <color attach="background" args={['#060a16']} />
      <fog attach="fog" args={['#060a16', 24, 58]} />
      <BreathLights muted={false} />
      <Stars radius={80} depth={35} count={2600} factor={3.2} saturation={0} fade speed={0.4} />

      <BreathRhythm muted={false}>
        <GlassCube />
        <MainIsland />
        <FloatingIsles />
        <WhaleSpirit />
        {/* 内部云雾(自制精灵,drei Cloud 会炸渲染) */}
        <MistBand />
      </BreathRhythm>

      {/* 发光轨道环:环绕玻璃立方体巡航 */}
      <OrbitalRings />

      {/* 远景星云薄雾 */}
      <mesh position={[-14, 6, -30]} scale={26}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1b2a55" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[16, -4, -34]} scale={30}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#2b2153" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <CameraRig scrollRef={scrollRef} freeLook={freeLook} lookRef={lookRef} />
      <OrbitControls
        ref={controlsRef}
        enabled={freeLook}
        enablePan={false}
        minDistance={6.5}
        maxDistance={26}
        maxPolarAngle={Math.PI * 0.72}
        enableDamping
        dampingFactor={0.06}
      />
    </>
  )
}

/** Canvas 子树:props 全部稳定,滚动进度走 ref,避免高频重渲染 3D 树 */
const SceneCanvas = memo(function SceneCanvas({ scrollRef, freeLook, lookRef, controlsRef }: {
  scrollRef: RefObject<number>
  freeLook: boolean
  lookRef: RefObject<THREE.Vector3>
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>
}) {
  return (
    <Canvas
      camera={{ position: [11.8, 5.4, 13.2], fov: 38 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <CanvasErrorTrap>
        <Scene scrollRef={scrollRef} freeLook={freeLook} lookRef={lookRef} controlsRef={controlsRef} />
      </CanvasErrorTrap>
    </Canvas>
  )
})

// ---------- 页面:粘性画布 + 滚动分镜文案 ----------
const SECTIONS = [
  { eyebrow: 'NEXUS SANCTUARY — 01', align: 'left' as const },
  { eyebrow: '第一章 · 星灵', align: 'right' as const },
  { eyebrow: '第二章 · 生态', align: 'left' as const },
  { eyebrow: '终章 · 呼吸', align: 'center' as const },
]

// ---------- HUD 观测框:四角角标/刻度/数据读出/扫描线 ----------
const HUD_ACTS = ['定场 · 光轨', '星灵 · 巡游', '生态 · 起伏', '光环 · 收官']

function HudFrame({ act, progress }: { act: number; progress: number }) {
  const corner = 'pointer-events-none absolute h-7 w-7 border-cyan-300/50'
  const ticks = Array.from({ length: 21 })
  return (
    <div className="nexus-hud pointer-events-none absolute inset-4 z-[6] md:inset-6" aria-hidden>
      <style>{`
        @keyframes nexus-hud-scan { 0% { transform: translateX(-30%); opacity: 0 } 12% { opacity: .8 } 88% { opacity: .8 } 100% { transform: translateX(130%); opacity: 0 } }
        @keyframes nexus-hud-pulse { 0%,100% { opacity: .45 } 50% { opacity: .9 } }
      `}</style>
      {/* 四角 L 形角标 */}
      <span className={`${corner} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${corner} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
      {/* 顶部扫描线 */}
      <div className="absolute inset-x-8 top-0 h-px overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" style={{ animation: 'nexus-hud-scan 6s linear infinite' }} />
      </div>
      {/* 左侧刻度尺 */}
      <div className="absolute top-1/2 left-0 hidden -translate-y-1/2 flex-col gap-1.5 md:flex">
        {ticks.map((_, i) => (
          <span
            key={i}
            className={`h-px bg-cyan-300 ${i % 5 === 0 ? 'w-4 opacity-60' : 'w-2 opacity-30'}`}
          />
        ))}
      </div>
      {/* 右侧刻度尺 */}
      <div className="absolute top-1/2 right-0 hidden -translate-y-1/2 flex-col items-end gap-1.5 md:flex">
        {ticks.map((_, i) => (
          <span
            key={i}
            className={`h-px bg-cyan-300 ${i % 5 === 0 ? 'w-4 opacity-60' : 'w-2 opacity-30'}`}
          />
        ))}
      </div>
      {/* 底部数据读出 */}
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-3 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-cyan-200/80">
        <span className="rounded-sm border border-cyan-300/30 bg-black/30 px-1.5 py-0.5" style={{ animation: 'nexus-hud-pulse 2.4s ease-in-out infinite' }}>
          ◉ SCANNING
        </span>
        <span className="hidden sm:inline">ACT {String(act + 1).padStart(2, '0')}/04 · {HUD_ACTS[act]}</span>
        <span>SEQ {String(Math.round(progress * 100)).padStart(3, '0')}%</span>
      </div>
      {/* 顶部左读出 */}
      <div className="absolute top-1 left-2 hidden font-mono text-[10px] tracking-[0.25em] text-cyan-200/50 md:block">
        NEXUS · SANCTUARY OBSERVER
      </div>
    </div>
  )
}

function CapsuleButton({ children, onClick, primary }: { children: ReactNode; onClick: (e: React.MouseEvent) => void; primary?: boolean }) {
  return (
    <Magnetic>
    <button
      onClick={onClick}
      className={cn(
        'pointer-events-auto cursor-pointer rounded-full px-7 py-3 text-sm font-medium tracking-wide backdrop-blur-md transition-all duration-300',
        primary
          ? 'neon-gradient-bg glow-cyan text-white shadow-lg shadow-cyan-500/25 hover:scale-[1.04]'
          : 'border border-white/20 bg-white/5 text-white/85 hover:border-white/45 hover:bg-white/10',
      )}
    >
      {children}
    </button>
    </Magnetic>
  )
}

export default function SanctuaryScene() {
  const navigate = useNavigate()
  const [freeLook, setFreeLook] = useState(false)
  const [progress, setProgress] = useState(0)
  const scrollRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(new THREE.Vector3(0, 0.6, 0))
  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null)

  // 进入自由视角时,让控制器从当前注视点接管,避免镜头跳切
  useEffect(() => {
    if (freeLook && controlsRef.current && lookRef.current) {
      controlsRef.current.target.copy(lookRef.current)
      controlsRef.current.update()
    }
  }, [freeLook])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const max = Math.max(1, el.scrollHeight - el.clientHeight)
    const p = el.scrollTop / max
    scrollRef.current = p
    // 状态只用于圆点指示器,粗粒度更新即可
    setProgress((prev) => (Math.abs(prev - p) > 0.01 ? p : prev))
  }

  const activeSection = Math.min(SECTIONS.length - 1, Math.round(progress * (SECTIONS.length - 1)))

  const scrollToSection = (i: number) => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' })
  }

  const sectionAlignClass = (align: (typeof SECTIONS)[number]['align']) =>
    align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-left' : 'justify-center text-center'

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative h-full overflow-y-auto overflow-x-hidden bg-ink-950"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* 第 1 层:粘性画布(滚动时保持满屏) */}
      <div className="sticky top-0 w-full" style={{ height: VIEW_H }}>
        <SceneCanvas scrollRef={scrollRef} freeLook={freeLook} lookRef={lookRef} controlsRef={controlsRef} />
        {/* 上下暗角,保证文字可读 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-950/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950/70 to-transparent" />

        {/* 品牌栏 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <span className="neon-gradient-bg glow-cyan flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
              N
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.22em] text-white">NEXUS · 1</p>
              <p className="text-[10px] tracking-[0.3em] text-white/50">SANCTUARY</p>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setFreeLook((v) => !v)}
              className={cn(
                'cursor-pointer rounded-full border px-4 py-2 text-[11px] tracking-wider backdrop-blur-md transition-all',
                freeLook
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-white/20 bg-white/5 text-white/75 hover:border-white/40',
              )}
            >
              {freeLook ? '✓ 自由视角 · 拖拽旋转' : '自由视角'}
            </button>
            <button
              onClick={(e) => liquidNavigate(navigate, '/home', e)}
              className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] tracking-wider text-white/75 backdrop-blur-md transition-all hover:border-white/40"
            >
              进入工作台
            </button>
          </div>
        </div>

        {/* HUD 观测框 */}
        <HudFrame act={activeSection} progress={progress} />

        {/* 右侧分镜圆点导航 */}
        <div className="pointer-events-auto absolute top-1/2 right-4 flex -translate-y-1/2 flex-col items-center gap-3 md:right-7">
          {SECTIONS.map((s, i) => (
            <button
              key={s.eyebrow}
              onClick={() => scrollToSection(i)}
              title={s.eyebrow}
              className={cn(
                'cursor-pointer rounded-full transition-all duration-300',
                i === activeSection
                  ? 'h-6 w-2 bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]'
                  : 'h-2 w-2 bg-white/25 hover:bg-white/60',
              )}
            />
          ))}
        </div>

        {/* 底部滚动提示(离开首屏即淡出) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1.5 transition-opacity duration-500"
          style={{ opacity: Math.max(0, 1 - progress * 6) }}
        >
          <span className="text-[10px] tracking-[0.4em] text-white/60">滚动 · 开始巡礼</span>
          <span className="animate-bounce text-white/70">↓</span>
        </div>
      </div>

      {/* 第 2 层:分镜文案(叠在画布上滚动) */}
      <div className="relative z-10" style={{ marginTop: 'calc(3.5rem - 100dvh)' }}>
        {/* 序章 */}
        <section
          className={cn('flex items-center px-8 md:px-24', sectionAlignClass(SECTIONS[0].align))}
          style={{ minHeight: VIEW_H }}
        >
          <div className="pointer-events-none max-w-2xl">
            <p className="mb-5 inline-block rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1.5 text-[11px] tracking-[0.35em] text-cyan-200/90">
              {SECTIONS[0].eyebrow}
            </p>
            <h1 className="text-5xl leading-[1.12] font-bold tracking-wide text-white md:text-7xl">
              <ScrambleText text="为纯粹专注," delay={300} />
              <br />
              留一座<span className="neon-gradient-text">圣域</span>。
            </h1>
            <p className="mt-3 text-sm tracking-[0.2em] text-white/45 md:text-base">CRAFTED FOR PURE FOCUS.</p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70 md:text-[15px]">
              一头云鲸星灵,一座微缩生态,封存在玻璃立方体中。
              一道光环昼夜巡游,替你记住每一次专注的呼吸。
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <CapsuleButton primary onClick={(e) => liquidNavigate(navigate, '/home', e)}>
                进入工作台 →
              </CapsuleButton>
              <CapsuleButton onClick={(e) => liquidNavigate(navigate, '/focus', e)}>开始专注</CapsuleButton>
            </div>
          </div>
        </section>

        {/* 第一章 · 星灵 */}
        <section
          className={cn('flex items-center px-8 md:px-24', sectionAlignClass(SECTIONS[1].align))}
          style={{ minHeight: VIEW_H }}
        >
          <div className="pointer-events-none max-w-xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-200/80">{SECTIONS[1].eyebrow}</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white md:text-6xl">
              八字巡游的<span className="neon-gradient-text">梦</span>。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/70 md:text-[15px]">
              云鲸星灵沿 8 字轨迹在玻璃中巡游,尾鳍摆动,心核随呼吸明灭。
              它不催促、不打扰,只是安静地陪你,把漫长的专注变成一场巡游。
            </p>
          </div>
        </section>

        {/* 第二章 · 生态 */}
        <section
          className={cn('flex items-center px-8 md:px-24', sectionAlignClass(SECTIONS[2].align))}
          style={{ minHeight: VIEW_H }}
        >
          <div className="pointer-events-none max-w-xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-200/80">{SECTIONS[2].eyebrow}</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white md:text-6xl">
              雪山融水,
              <br />
              星光成<span className="neon-gradient-text">瀑</span>。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/70 md:text-[15px]">
              微缩雪山、发光河流、呼吸的湖泊与坠落的星光瀑布,
              悬浮小岛环绕,自成循环——一座只属于你的生态,在玻璃里生生不息。
            </p>
          </div>
        </section>

        {/* 终章 · 呼吸 */}
        <section
          className={cn('flex items-center px-8 md:px-24', sectionAlignClass(SECTIONS[3].align))}
          style={{ minHeight: VIEW_H }}
        >
          <div className="pointer-events-none max-w-2xl">
            <p className="mb-4 text-[11px] tracking-[0.4em] text-cyan-200/80">{SECTIONS[3].eyebrow}</p>
            <h2 className="text-4xl leading-tight font-bold tracking-wide text-white md:text-6xl">
              它在玻璃里,
              <br />
              等你<span className="neon-gradient-text">很久</span>了。
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-white/70 md:text-[15px]">
              ELEVATE YOUR FOCUS THROUGH TIMELESS RESONANCE.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <CapsuleButton primary onClick={(e) => liquidNavigate(navigate, '/home', e)}>
                回到工作台
              </CapsuleButton>
              <CapsuleButton onClick={() => setFreeLook(true)}>自由视角探索</CapsuleButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
