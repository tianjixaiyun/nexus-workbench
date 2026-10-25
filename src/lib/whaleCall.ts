/**
 * 鲸鸣:WebAudio 即时合成的低频鲸叫(无音频文件依赖)。
 * 双振荡器下滑音 + 颤吟 + 低通 + 混响式衰减,像深海传来的问候。
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function whaleCall() {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime

  const master = ac.createGain()
  master.gain.setValueAtTime(0, t0)
  master.gain.linearRampToValueAtTime(0.32, t0 + 0.28)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4)

  const lowpass = ac.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(900, t0)
  lowpass.frequency.exponentialRampToValueAtTime(320, t0 + 2.2)

  // 主体:180 → 70Hz 的鲸鸣下滑
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(185, t0)
  osc.frequency.exponentialRampToValueAtTime(72, t0 + 1.6)

  // 颤吟(歌唱感)
  const lfo = ac.createOscillator()
  lfo.frequency.value = 5.2
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 6
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)

  // 低八度衬底,更有体积感
  const sub = ac.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(92, t0)
  sub.frequency.exponentialRampToValueAtTime(38, t0 + 1.8)
  const subGain = ac.createGain()
  subGain.gain.value = 0.5

  osc.connect(lowpass)
  sub.connect(subpass_gain(subGain, lowpass))
  lowpass.connect(master)
  master.connect(ac.destination)

  osc.start(t0)
  sub.start(t0)
  lfo.start(t0)
  osc.stop(t0 + 2.5)
  sub.stop(t0 + 2.5)
  lfo.stop(t0 + 2.5)
}

function subpass_gain(g: GainNode, dest: AudioNode): AudioNode {
  g.connect(dest)
  return g
}
