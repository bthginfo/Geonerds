import { useSettings } from "@/store/settings";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freqs: number[], duration = 0.12, type: OscillatorType = "sine", gain = 0.06) {
  if (!useSettings.getState().sound) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const start = ac.currentTime + i * 0.07;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}

export const sound = {
  correct: () => tone([660, 880], 0.13, "sine"),
  wrong: () => tone([180, 120], 0.18, "sawtooth", 0.05),
  finish: () => tone([523, 659, 784, 1047], 0.15, "triangle"),
  tick: () => tone([440], 0.05, "square", 0.03),
};
