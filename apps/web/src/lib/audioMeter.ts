/** Tiny RMS meter on top of an AnalyserNode. Create inside a user gesture for iOS. */
export class AudioMeter {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private source: MediaStreamAudioSourceNode;
  constructor(stream: MediaStream) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.buf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }
  resume() { return this.ctx.resume(); }
  /** dBFS of the current window, -100 when silent. */
  level(): number {
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    return rms > 0 ? 20 * Math.log10(rms) : -100;
  }
  close() { try { this.source.disconnect(); this.ctx.close(); } catch {} }
}
