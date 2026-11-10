// ==========================================
// INPUTS, PHYSICS & MAIN GAME LOOP
// ==========================================
let isPlaying = false;
let forwardDist = 0;
let lateralDist = 0;
let runTokens = 0;
let speed = 28;
let strafeVel = 0;

let playerFeetY = 0;
let jumpVel = 0;
const GRAVITY = -36;

const keys = { left: false, right: false };

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' && isPlaying && playerFeetY <= 0.01) {
    jumpVel = 14.2 + (saveData.upgrades.jump - 1) * 1.15;
    playJumpSound();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function startGame() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  forwardDist = 0;
  lateralDist = 0;
  runTokens = 0;
  speed = 28;
  strafeVel = 0;
  playerFeetY = 0;
  jumpVel = 0;

  populateWorld();
  isPlaying = true;
  overlay.style.display = 'none';
}

function triggerGameOver() {
  isPlaying = false;
  playCrashSound();

  const finalDist = Math.floor(forwardDist);
  let recordNote = '';
  if (finalDist > saveData.highScore) {
    saveData.highScore = finalDist;
    recordNote = ' [NEW RECORD!]';
  }
  writeSave();
  updateShopUI();

  titleEl.textContent = 'COLLISION';
  subtitleEl.innerHTML =
    `DISTANCE: ${finalDist}m${recordNote} &nbsp;|&nbsp; TOKENS COLLECTED: +${runTokens}<br>` +
    `SPEND TOKENS BELOW ON UPGRADES OR VISOR SKINS.`;
  startBtn.textContent = 'RE-ENTER';
  overlay.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);

// Initialize saved skin, UI, and background world
applySkin(saveData.equippedSkin);
updateShopUI();
populateWorld();

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (isPlaying) {
    speed += dt * 0.52;
    forwardDist += speed * dt;

    // Lateral Thrusters upgrade boosts max sideways speed & responsiveness
    const inputDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const strafeBonus = (saveData.upgrades.strafe - 1) * 4.2;
    const maxStrafeSpeed = 23 + strafeBonus + speed * 0.22;
    strafeVel += (inputDir * maxStrafeSpeed - strafeVel) * (10 + saveData.upgrades.strafe) * dt;
    lateralDist += strafeVel * dt;

    // Vertical jump arc
    if (playerFeetY > 0 || jumpVel > 0) {
      playerFeetY += jumpVel * dt;
      jumpVel += GRAVITY * dt;
      if (playerFeetY <= 0) {
        playerFeetY = 0;
        jumpVel = 0;
      }
    }

    const headBob = playerFeetY === 0 ? Math.sin(forwardDist * 0.75) * 0.05 : 0;
    camera.position.y = EYE_HEIGHT + playerFeetY + headBob;
    camera.rotation.z = -strafeVel * 0.0042;

    groundTex.offset.y += (speed / 340) * 60 * dt;
    groundTex.offset.x += (strafeVel / 340) * 60 * dt;

    if (droneOsc) {
      droneOsc.frequency.setTargetAtTime(40 + speed * 0.38, audioCtx.currentTime, 0.1);
    }

    // Update & wrap obstacles
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      p.position.z += speed * dt;

      if (p.position.z > 8) {
        p.position.z -= Z_DEPTH;
        p.userData.baseX = (Math.random() - 0.5) * LOOP_WIDTH;
      }

      p.position.x = wrapX(p.userData.baseX - lateralDist);

      if (p.userData.isSolid && Math.abs(p.position.z) < p.userData.halfD + 0.35) {
        if (Math.abs(p.position.x) < p.userData.halfW + 0.35) {
          if (playerFeetY < p.userData.topY - 0.1) {
            triggerGameOver();
            break;
          }
        }
      }
    }

    // Update, magnetize & collect Metro Tokens
    const magnetRadius = 1.4 + (saveData.upgrades.magnet - 1) * 1.65;
    const playerCenterY = playerFeetY + 0.9;

    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      c.position.z += speed * dt;
      c.rotation.y += 3.2 * dt;

      if (c.position.z > 8) {
        c.position.z -= Z_DEPTH;
        c.userData.baseX = (Math.random() - 0.5) * LOOP_WIDTH;
        c.position.y = c.userData.baseY;
        c.visible = true;
        c.userData.active = true;
      }

      if (!c.userData.active) continue;

      let targetX = wrapX(c.userData.baseX - lateralDist);
      const dx = -targetX;
      const dy = playerCenterY - c.position.y;
      const dz = -c.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < magnetRadius * magnetRadius && c.position.z > -18) {
        c.userData.baseX += dx * 8 * dt;
        c.position.y += dy * 8 * dt;
        targetX = wrapX(c.userData.baseX - lateralDist);
      }

      c.position.x = targetX;

      if (distSq < 1.55) {
        c.userData.active = false;
        c.visible = false;
        runTokens++;
        saveData.tokens++;
        hudTokensEl.textContent = String(saveData.tokens).padStart(3, '0');
        playCoinSound();
      }
    }

    // Update overhead monorails
    for (let i = 0; i < monorailTrains.length; i++) {
      const m = monorailTrains[i];
      m.viaduct.position.z += speed * dt;
      if (m.viaduct.position.z > 15) {
        m.viaduct.position.z -= Z_DEPTH;
      }
      m.train.userData.baseX += m.train.userData.velX * dt;
      m.train.position.x = wrapX(m.train.userData.baseX - lateralDist);
    }

    // Update HUD
    const currentMeters = Math.floor(forwardDist);
    scoreEl.textContent = `${String(currentMeters).padStart(4, '0')} m`;
    if (currentMeters > saveData.highScore) {
      highScoreEl.textContent = `${String(currentMeters).padStart(4, '0')} m`;
    }
    const dirTag = lateralDist >= 0 ? 'E' : 'W';
    driftEl.textContent = `${String(Math.floor(Math.abs(lateralDist))).padStart(4, '0')} m ${dirTag}`;

  } else {
    // Idle background drift on menu screen
    lateralDist += 3.5 * dt;
    groundTex.offset.x += (3.5 / 340) * 60 * dt;
    groundTex.offset.y += (6 / 340) * 60 * dt;

    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      p.position.z += 6 * dt;
      if (p.position.z > 8) p.position.z -= Z_DEPTH;
      p.position.x = wrapX(p.userData.baseX - lateralDist);
    }
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      c.position.z += 6 * dt;
      c.rotation.y += 2.5 * dt;
      if (c.position.z > 8) c.position.z -= Z_DEPTH;
      c.position.x = wrapX(c.userData.baseX - lateralDist);
    }
    for (let i = 0; i < monorailTrains.length; i++) {
      const m = monorailTrains[i];
      m.viaduct.position.z += 6 * dt;
      if (m.viaduct.position.z > 15) m.viaduct.position.z -= Z_DEPTH;
      m.train.userData.baseX += m.train.userData.velX * dt;
      m.train.position.x = wrapX(m.train.userData.baseX - lateralDist);
    }
  }

  renderer.render(scene, camera);
}

animate(performance.now());
