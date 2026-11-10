// ==========================================
// 1. PERSISTENT SAVE DATA (LOCALSTORAGE)
// ==========================================
const SAVE_KEY = 'babbdi_concourse_save_v1';

const defaultSave = {
  highScore: 0,
  tokens: 0,
  upgrades: {
    strafe: 1,
    jump: 1,
    magnet: 1
  },
  unlockedSkins: ['default'],
  equippedSkin: 'default'
};

let saveData = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultSave));
    const parsed = JSON.parse(raw);
    return {
      ...defaultSave,
      ...parsed,
      upgrades: { ...defaultSave.upgrades, ...(parsed.upgrades || {}) }
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultSave));
  }
}

function writeSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

// ==========================================
// 2. WEB AUDIO SYNTHESIS (DRONE, COINS, SFX)
// ==========================================
let audioCtx, droneOsc;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  droneOsc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  droneOsc.type = 'sawtooth';
  droneOsc.frequency.value = 42;
  filter.type = 'lowpass';
  filter.frequency.value = 100;
  gain.gain.value = 0.15;

  droneOsc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  droneOsc.start();
}

function playCoinSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, audioCtx.currentTime);
  osc.frequency.setValueAtTime(780, audioCtx.currentTime + 0.06);
  g.gain.setValueAtTime(0.16, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.22);
}

function playJumpSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(110, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(215, audioCtx.currentTime + 0.16);
  g.gain.setValueAtTime(0.14, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.16);
}

function playCrashSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(85, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(18, audioCtx.currentTime + 0.45);
  g.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.45);
}
