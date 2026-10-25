/** WebAudio 合成的专注白噪音(Forest 氛围)——零音频资源,离线可用 */

export type NoiseKind = 'rain' | 'brown'

export class NoisePlayer {
  private ctx: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private kind: NoiseKind = 'rain'
  private volume = 0.4

  private makeBuffer(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
    const seconds = 3
    const sampleRate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, sampleRate * seconds, sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      if (kind === 'brown') {
        // 棕噪音:积分白噪音,低频厚重
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.2
      } else {
        // 雨声:白噪音做包络起伏,模拟细雨沙沙
        const gust = 0.72 + 0.28 * Math.sin((i / sampleRate) * 2.4) * Math.sin((i / sampleRate) * 0.7)
        data[i] = white * 0.55 * gust
      }
    }
    return buffer
  }

  get playing(): boolean {
    return this.source !== null
  }

  start(kind?: NoiseKind): void {
    if (kind) this.kind = kind
    this.stop()
    try {
      this.ctx = this.ctx ?? new AudioContext()
      void this.ctx.resume()
      const buffer = this.makeBuffer(this.ctx, this.kind)
      this.source = this.ctx.createBufferSource()
      this.source.buffer = buffer
      this.source.loop = true
      this.gain = this.ctx.createGain()
      this.gain.gain.value = this.volume
      this.source.connect(this.gain).connect(this.ctx.destination)
      this.source.start()
    } catch {
      // 浏览器不支持/被策略拦截时静默失败
    }
  }

  stop(): void {
    try {
      this.source?.stop()
    } catch {
      // ignore
    }
    this.source = null
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.gain) this.gain.gain.value = this.volume
  }

  setKind(kind: NoiseKind): void {
    if (kind === this.kind && this.playing) return
    this.kind = kind
    if (this.playing) this.start(kind)
  }
}
