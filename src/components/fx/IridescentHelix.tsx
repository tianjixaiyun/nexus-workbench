import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * 虹彩螺旋(技法移植自 ThreeUI Community 的 iridescent helix,MIT):
 * 沿螺旋管长做青→紫→粉的色相流动(与全站 FluidTrail 同一色族),
 * 叠加微脉冲亮度,加色混合出霓虹辉光。
 * muted(reduced motion)时冻结流动与旋转,保留静态彩虹色。
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    // 沿管长的色相流动:0.51(青 185°)→ 0.92(粉 330°),覆盖全站色族
    float t = fract(vUv.x * 1.35 - uTime * 0.045);
    float hue = 0.51 + 0.41 * t;
    vec3 rgb = hsl2rgb(vec3(hue, 0.95, 0.62));
    float pulse = 0.82 + 0.18 * sin(uTime * 1.2 + vUv.x * 20.0);
    gl_FragColor = vec4(rgb * pulse * uIntensity, 1.0);
  }
`

export function IridescentHelix({
  radius = 2,
  height = 4,
  turns = 2,
  tubeRadius = 0.05,
  speed = 0.18,
  intensity = 0.85,
  tilt = 0,
  muted = false,
}: {
  /** 螺旋半径 */
  radius?: number
  /** 螺旋总高(沿 y 居中) */
  height?: number
  /** 圈数 */
  turns?: number
  /** 管径 */
  tubeRadius?: number
  /** 自转速度(rad/s),0 = 不自转 */
  speed?: number
  /** 亮度(加色混合下的霓虹强度) */
  intensity?: number
  /** 整体倾斜(rad) */
  tilt?: number
  /** 减少动态效果:冻结流动与自转 */
  muted?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const uTime = useRef({ value: 0 })

  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segs = Math.max(96, Math.round(turns * 56))
    for (let i = 0; i <= segs; i++) {
      const u = i / segs
      const a = u * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, height / 2 - u * height, Math.sin(a) * radius))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    return new THREE.TubeGeometry(curve, segs, tubeRadius, 10, false)
  }, [radius, height, turns, tubeRadius])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTime: uTime.current, uIntensity: { value: intensity } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [geometry, intensity],
  )

  useFrame((_, dt) => {
    if (!muted) {
      uTime.current.value += Math.min(dt, 0.05)
      if (speed && group.current) group.current.rotation.y += Math.min(dt, 0.05) * speed
    }
  })

  return (
    <group ref={group} rotation={[tilt, 0, 0]}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
