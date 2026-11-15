// src/modules/CinematicIntro/audioService.ts
// Synthesizes futuristic ambient sci-fi sound effects using Web Audio API

class CinematicAudioEngine {
  private ctx: AudioContext | null = null
  private ambientGain: GainNode | null = null
  private isMuted: boolean = true

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
    if (!muted) {
      this.initCtx()
      this.startAmbientHum()
    } else {
      this.stopAmbientHum()
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  public startAmbientHum() {
    if (this.isMuted || !this.ctx) return
    if (this.ambientGain) return

    try {
      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      this.ambientGain = this.ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(65, this.ctx.currentTime) // Low C

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(130.81, this.ctx.currentTime) // C3 subtle harmonic

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(260, this.ctx.currentTime)

      this.ambientGain.gain.setValueAtTime(0.001, this.ctx.currentTime)
      this.ambientGain.gain.exponentialRampToValueAtTime(0.04, this.ctx.currentTime + 3)

      osc1.connect(filter)
      osc2.connect(filter)
      filter.connect(this.ambientGain)
      this.ambientGain.connect(this.ctx.destination)

      osc1.start()
      osc2.start()
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public stopAmbientHum() {
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5)
        setTimeout(() => {
          this.ambientGain?.disconnect()
          this.ambientGain = null
        }, 500)
      } catch {
        this.ambientGain = null
      }
    }
  }

  public playPulseChime() {
    if (this.isMuted || !this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3) // A5

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.8)
    } catch {
      // ignore
    }
  }

  public playHologramSwoosh() {
    if (this.isMuted || !this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain = this.ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.4)

      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(600, this.ctx.currentTime)
      filter.Q.setValueAtTime(4, this.ctx.currentTime)

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.5)
    } catch {
      // ignore
    }
  }

  public playPanelClick() {
    if (this.isMuted || !this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime) // C6
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.12)
    } catch {
      // ignore
    }
  }
}

export const cinematicAudio = new CinematicAudioEngine()
