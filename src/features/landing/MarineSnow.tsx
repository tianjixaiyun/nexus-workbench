import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * 深海粒子(技法移植自 ThreeUI Community 的 Fathomless 深海分区,MIT):
 * - MarineSnow 海洋雪:细碎悬浮物缓缓下沉 + 轻微横摆,暮光层/深水层氛围
 * - BioMotes 生物发光微粒:随机相位呼吸的霓虹光点(加色混合),深海记忆点
 * 海洋首页在 prefers-reduced-motion 下整体走静态降级,本组件不会挂载。
 */

function makeDotTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** 确定性伪随机(与场景内其他粒子同一套手法,保证每次挂载分布稳定) */
function rand(seed: number): number {
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1
}

const SNOW_BAND = { x: 24, yTop: -14, yBottom: -37, zNear: 10, zFar: -18 }

/** 海洋雪:单次 draw call 的 Points,逐点下沉 + 横摆 */
export function MarineSnow({ count = 240 }: { count?: number }) {
  const points = useRef<THREE.Points>(null)
  const tex = useMemo(() => makeDotTexture(), [])

  const { geometry, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seeds = Array.from({ length: count }, (_, i) => ({
      x: rand(i + 1) * 2 * SNOW_BAND.x - SNOW_BAND.x,
      y: SNOW_BAND.yBottom + rand(i + 41) * (SNOW_BAND.yTop - SNOW_BAND.yBottom),
      z: SNOW_BAND.zFar + rand(i + 83) * (SNOW_BAND.zNear - SNOW_BAND.zFar),
      v: 0.32 + Math.abs(rand(i + 127)) * 0.45, // 下沉速度
      amp: 0.35 + Math.abs(rand(i + 191)) * 0.5, // 横摆幅度
      freq: 0.4 + Math.abs(rand(i + 257)) * 0.5,
      phase: rand(i + 331) * Math.PI * 2,
    }))
    seeds.forEach((s, i) => {
      pos[i * 3] = s.x
      pos[i * 3 + 1] = s.y
      pos[i * 3 + 2] = s.z
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geometry, seeds }
  }, [count])

  const elapsed = useRef(0)
  useFrame((_, dt) => {
    elapsed.current += Math.min(dt, 0.05)
    const t = elapsed.current
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const span = SNOW_BAND.yTop - SNOW_BAND.yBottom
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]
      let y = s.y - t * s.v
      y = SNOW_BAND.yBottom + ((((y - SNOW_BAND.yBottom) % span) + span) % span) // 循环带内
      arr[i * 3] = s.x + Math.sin(t * s.freq + s.phase) * s.amp
      arr[i * 3 + 1] = y
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={tex}
        color="#dff3ff"
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  )
}

const MOTE_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aPhase;
  varying float vPhase;
  void main() {
    vPhase = aPhase;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (130.0 / -mv.z) * (0.55 + 0.45 * sin(uTime * 0.7 + aPhase));
    gl_Position = projectionMatrix * mv;
  }
`

const MOTE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPhase;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float falloff = smoothstep(0.5, 0.04, d);
    float pulse = 0.22 + 0.78 * (0.5 + 0.5 * sin(uTime * 1.1 + vPhase * 3.0));
    gl_FragColor = vec4(uColor, falloff * pulse * uOpacity);
  }
`

/**
 * 生物发光微粒:随机相位呼吸的霓虹光点。
 * 色相用法:#67e8f9(青)放最深带,#a78bfa(紫)放中深带,呼应发光珊瑚配色。
 */
export function BioMotes({
  count = 90,
  color = '#67e8f9',
  yTop = -22,
  yBottom = -40,
  spread = 22,
  opacity = 0.85,
}: {
  count?: number
  color?: string
  yTop?: number
  yBottom?: number
  spread?: number
  opacity?: number
}) {
  const uTime = useRef({ value: 0 })

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(i + 501) * 2 * spread - spread
      pos[i * 3 + 1] = yBottom + rand(i + 613) * (yTop - yBottom)
      pos[i * 3 + 2] = rand(i + 727) * 26 - 20
      phase[i] = rand(i + 839) * Math.PI * 2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    return geometry
  }, [count, yTop, yBottom, spread])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: MOTE_VERT,
        fragmentShader: MOTE_FRAG,
        uniforms: {
          uTime: uTime.current,
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [geometry, color, opacity],
  )

  useFrame((_, dt) => {
    uTime.current.value += Math.min(dt, 0.05)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
