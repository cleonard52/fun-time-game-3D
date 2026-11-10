// ==========================================
// DOM ELEMENTS & SHOP LOGIC
// ==========================================
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const startBtn = document.getElementById('start-btn');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const hudTokensEl = document.getElementById('hud-tokens');
const menuTokensEl = document.getElementById('menu-tokens');
const driftEl = document.getElementById('drift');

const UPGRADE_COSTS =;
const SKIN_PRICES = { default: 0, sodium: 50, rust: 100, void: 175 };

function updateShopUI() {
  highScoreEl.textContent = `${String(Math.floor(saveData.highScore)).padStart(4, '0')} m`;
  hudTokensEl.textContent = String(saveData.tokens).padStart(3, '0');
  menuTokensEl.textContent = saveData.tokens;

  // Update Upgrade Buttons
  ['strafe', 'jump', 'magnet'].forEach(key => {
    const lvl = saveData.upgrades[key];
    document.getElementById(`lvl-${key}`).textContent = `LVL ${lvl} / 5`;
    const btn = document.getElementById(`buy-${key}`);
    if (lvl >= 5) {
      btn.textContent = 'MAXED';
      btn.disabled = true;
    } else {
      const cost = UPGRADE_COSTS[lvl];
      btn.textContent = `${cost} TKN`;
      btn.disabled = saveData.tokens < cost;
    }
  });

  // Update Skin Buttons
  document.querySelectorAll('.skin-btn').forEach(btn => {
    const skinId = btn.dataset.skin;
    const isUnlocked = saveData.unlockedSkins.includes(skinId);
    const isEquipped = saveData.equippedSkin === skinId;

    if (isEquipped) {
      btn.textContent = 'EQUIPPED';
      btn.disabled = true;
    } else if (isUnlocked) {
      btn.textContent = 'EQUIP';
      btn.disabled = false;
    } else {
      const price = SKIN_PRICES[skinId];
      btn.textContent = `${price} TKN`;
      btn.disabled = saveData.tokens < price;
    }
  });
}

// Upgrade click handlers
['strafe', 'jump', 'magnet'].forEach(key => {
  document.getElementById(`buy-${key}`).addEventListener('click', () => {
    const lvl = saveData.upgrades[key];
    if (lvl >= 5) return;
    const cost = UPGRADE_COSTS[lvl];
    if (saveData.tokens >= cost) {
      saveData.tokens -= cost;
      saveData.upgrades[key]++;
      writeSave();
      updateShopUI();
      playCoinSound();
    }
  });
});

// Skin click handlers
document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const skinId = btn.dataset.skin;
    if (saveData.unlockedSkins.includes(skinId)) {
      saveData.equippedSkin = skinId;
      applySkin(skinId);
      writeSave();
      updateShopUI();
    } else {
      const price = SKIN_PRICES[skinId];
      if (saveData.tokens >= price) {
        saveData.tokens -= price;
        saveData.unlockedSkins.push(skinId);
        saveData.equippedSkin = skinId;
        applySkin(skinId);
        writeSave();
        updateShopUI();
        playCoinSound();
      }
    }
  });
});

// Shop Tabs
document.querySelectorAll('.tab-btn').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('tab-upgrades').classList.toggle('hidden', target !== 'upgrades');
    document.getElementById('tab-skins').classList.toggle('hidden', target !== 'skins');
  });
});
