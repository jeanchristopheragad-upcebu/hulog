import type { Config } from "../shared/model";
export const soundNames: Record<string, string> = {
  notification: "Standard notification",
  email: "Email notification",
  ringtone: "Incoming ringtone",
  ended: "Call ended",
  vibration: "Phone vibration",
  shutter: "Camera shutter",
  keyboard: "Keyboard typing",
  error: "Error notification",
  overload: "Notification overload",
  fan: "Electric fan humming",
  rattle: "Metallic rattling",
  bang: "Door banging",
  distorted: "Distorted notification",
  silence: "Sudden silence",
};
class AudioEngine {
  context: AudioContext | undefined;
  nodes = new Set<AudioScheduledSourceNode>();
  media = new Set<HTMLAudioElement>();
  enabled = false;
  gains = new Set<GainNode>();
  setVolume(volume: number) {
    for (const g of this.gains)
      g.gain.setTargetAtTime(
        volume * 0.16,
        this.context?.currentTime || 0,
        0.05,
      );
    for (const a of this.media) a.volume = volume;
  }
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    this.enabled = true;
  }
  stop() {
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {}
    }
    this.nodes.clear();
    this.gains.clear();
    for (const a of this.media) {
      a.pause();
      a.currentTime = 0;
    }
    this.media.clear();
    navigator.vibrate?.(0);
  }
  play(key: string, c: Config) {
    if (key === "silence") {
      this.stop();
      return;
    }
    if (!this.enabled || c.settings.muted) return;
    if (c.sounds[key]) {
      const a = new Audio(c.sounds[key]);
      a.volume = c.settings.volume;
      a.loop = key === "ringtone" || key === "fan";
      this.media.add(a);
      a.onended = () => this.media.delete(a);
      void a.play().catch(() => {});
      return;
    }
    const ctx = this.context!;
    const loop = key === "ringtone" || key === "fan";
    const length = loop
      ? 30
      : key === "bang"
        ? 0.7
        : key === "rattle"
          ? 1.2
          : 0.35;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (loop) this.gains.add(gain);
    gain.gain.setValueAtTime(c.settings.volume * 0.16, ctx.currentTime);
    if (!loop)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
    let source: AudioScheduledSourceNode;
    if (["fan", "rattle", "bang", "shutter"].includes(key)) {
      const buffer = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * length),
        ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (key === "fan" ? 0.25 : 1);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.loop = loop;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = key === "fan" ? 180 : 1800;
      node.connect(filter);
      filter.connect(gain);
      source = node;
    } else {
      const node = ctx.createOscillator();
      node.type = ["vibration", "distorted"].includes(key)
        ? "sawtooth"
        : "sine";
      node.frequency.setValueAtTime(
        (
          {
            notification: 880,
            email: 660,
            ringtone: 440,
            ended: 280,
            vibration: 70,
            keyboard: 1500,
            error: 180,
            overload: 960,
            distorted: 310,
          } as Record<string, number>
        )[key] || 650,
        ctx.currentTime,
      );
      if (key === "ringtone") {
        const lfo = ctx.createOscillator();
        const mod = ctx.createGain();
        lfo.frequency.value = 3;
        mod.gain.value = 0.03;
        lfo.connect(mod);
        mod.connect(gain.gain);
        lfo.start();
        if (!loop) lfo.stop(ctx.currentTime + length);
        this.nodes.add(lfo);
        lfo.onended = () => this.nodes.delete(lfo);
      }
      node.connect(gain);
      source = node;
    }
    this.nodes.add(source);
    source.onended = () => {
      this.nodes.delete(source);
      this.gains.delete(gain);
    };
    source.start();
    if (!loop) source.stop(ctx.currentTime + length);
  }
}
export const audio = new AudioEngine();
