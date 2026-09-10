/**
 * CYBER STRIKE Engine
 * Synthesizer, Entity Pooling, Parallax FX, Touch Input, DOM Syncing
 */

// ==========================================
// 1. PROCEDURAL SOUND SYNTHESIZER
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playExplosion() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playPowerup() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = this.ctx.currentTime + i * 0.04;
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.07);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.07);
    });
  }

  playDamage() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playGameOver() {
    if (!this.ctx) return;
    const notes = [400, 320, 240, 160];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }
}

const audio = new SoundEngine();

// ==========================================
// 2. CONSTANTS & GAME STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

let gameState = 'START';
let score = 0;
let highScore = parseInt(localStorage.getItem('cyberstrike_highscore') || '0', 10);
let health = 100;
let level = 1;
let spawnTimer = 0;

const keys = { left: false, right: false, shoot: false };

// UI Elements
const scoreValEl = document.getElementById('score-val');
const highScoreValEl = document.getElementById('high-score-val');
const levelValEl = document.getElementById('level-val');
const healthFillEl = document.getElementById('health-fill');
const powerupStatusEl = document.getElementById('powerup-status');

const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');

const finalScoreEl = document.getElementById('final-score');
const finalHighscoreEl = document.getElementById('final-highscore');

highScoreValEl.textContent = highScore;

// ==========================================
// 3. OBJECT CLASSES & ENGINE ENTITIES
// ==========================================

class Star {
  constructor() {
    this.reset();
    this.y = Math.random() * CANVAS_HEIGHT;
  }

  reset() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = 0;
    this.size = Math.random() * 2 + 0.5;
    this.speed = Math.random() * 2 + 0.5;
    this.alpha = Math.random() * 0.7 + 0.3;
  }

  update() {
    this.y += this.speed;
    if (this.y > CANVAS_HEIGHT) this.reset();
  }

  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.015;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Player {
  constructor() {
    this.width = 40;
    this.height = 40;
    this.x = CANVAS_WIDTH / 2 - this.width / 2;
    this.y = CANVAS_HEIGHT - 70;
    this.speed = 7;
    this.cooldown = 0;

    this.rapidFireTimer = 0;
    this.shieldTimer = 0;
    this.doubleScoreTimer = 0;
  }

  update() {
    if (keys.left && this.x > 0) this.x -= this.speed;
    if (keys.right && this.x < CANVAS_WIDTH - this.width) this.x += this.speed;

    if (this.cooldown > 0) this.cooldown--;

    if (keys.shoot && this.cooldown === 0) {
      this.shoot();
      this.cooldown = this.rapidFireTimer > 0 ? 6 : 15;
    }

    if (this.rapidFireTimer > 0) this.rapidFireTimer--;
    if (this.shieldTimer > 0) this.shieldTimer--;
    if (this.doubleScoreTimer > 0) this.doubleScoreTimer--;

    // Cap particle array generation
    if (particles.length < 200) {
      particles.push(new Particle(this.x + this.width / 2, this.y + this.height, '#05d9e8'));
    }
  }

  shoot() {
    audio.playShoot();
    if (this.rapidFireTimer > 0) {
      bullets.push(new Bullet(this.x + 8, this.y, -12, '#ff2a6d'));
      bullets.push(new Bullet(this.x + this.width - 8, this.y, -12, '#ff2a6d'));
    } else {
      bullets.push(new Bullet(this.x + this.width / 2, this.y, -12, '#05d9e8'));
    }
  }

  draw() {
    ctx.save();

    if (this.shieldTimer > 0) {
      ctx.strokeStyle = '#05d9e8';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#05d9e8';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#05d9e8';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#05d9e8';

    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height - 8);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff2a6d';
    ctx.fillRect(this.x + this.width / 2 - 3, this.y + 12, 6, 10);

    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, vy, color) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.color = color;
    this.width = 4;
    this.height = 14;
    this.active = true;
  }

  update() {
    this.y += this.vy;
    if (this.y < -20 || this.y > CANVAS_HEIGHT + 20) this.active = false;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.restore();
  }
}

class Enemy {
  constructor(type) {
    this.type = type; // 'scout', 'fighter', 'destroyer'
    this.active = true;
    this.x = Math.random() * (CANVAS_WIDTH - 60) + 30;
    this.y = -50;

    if (type === 'scout') {
      this.width = 28;
      this.height = 28;
      this.hp = 1;
      this.maxHp = 1;
      this.speed = 3.2 + level * 0.3;
      this.scoreVal = 100;
      this.color = '#ff2a6d';
    } else if (type === 'fighter') {
      this.width = 36;
      this.height = 36;
      this.hp = 3;
      this.maxHp = 3;
      this.speed = 2.0 + level * 0.2;
      this.scoreVal = 250;
      this.color = '#05d9e8';
      this.angle = 0;
    } else { // 'destroyer'
      this.width = 52;
      this.height = 52;
      this.hp = 7 + level;
      this.maxHp = this.hp;
      this.speed = 1.0 + level * 0.1;
      this.scoreVal = 600;
      this.color = '#b000ff';
    }
  }

  update() {
    if (this.type === 'fighter') {
      this.angle += 0.05;
      this.x += Math.sin(this.angle) * 2.5;
    }

    this.y += this.speed;

    if (this.y > CANVAS_HEIGHT) {
      this.active = false;
      if (player.shieldTimer <= 0) {
        health = Math.max(0, health - 15);
        audio.playDamage();
        updateHUD();
        if (health <= 0) triggerGameOver();
      }
    }
  }

  draw() {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    if (this.type === 'scout') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x - this.width / 2, this.y);
      ctx.lineTo(this.x + this.width / 2, this.y);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'fighter') {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height * 0.7);
      ctx.fillStyle = '#ff2a6d';
      ctx.fillRect(this.x - 6, this.y + this.height * 0.7, 12, 10);
    }

    if (this.hp < this.maxHp) {
      const barW = 30;
      const barH = 4;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(this.x - barW / 2, this.y - 10, barW, barH);
      ctx.fillStyle = '#05d9e8';
      ctx.fillRect(this.x - barW / 2, this.y - 10, barW * pct, barH);
    }

    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.active = true;
    this.speed = 1.8;

    const types = ['rapid', 'shield', 'score'];
    this.type = types[Math.floor(Math.random() * types.length)];

    if (this.type === 'rapid') this.color = '#ff2a6d';
    if (this.type === 'shield') this.color = '#05d9e8';
    if (this.type === 'score') this.color = '#ffc800';
  }

  update() {
    this.y += this.speed;
    if (this.y > CANVAS_HEIGHT + 30) this.active = false;
  }

  draw() {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let label = 'R';
    if (this.type === 'shield') label = 'S';
    if (this.type === 'score') label = '2X';
    ctx.fillText(label, this.x, this.y);

    ctx.restore();
  }
}

// ==========================================
// 4. INSTANTIALIZATION & CONTAINERS
// ==========================================
let stars = Array.from({ length: 70 }, () => new Star());
let player = new Player();
let bullets = [];
let enemies = [];
let powerups = [];
let particles = [];

// ==========================================
// 5. ENGINE LOGIC & COLLISIONS (AABB)
// ==========================================

function checkCollisions() {
  // Bullets vs Enemies
  bullets.forEach(b => {
    if (!b.active) return;
    enemies.forEach(e => {
      if (!e.active) return;

      // AABB Box Collision Check
      if (
        b.x > e.x - e.width / 2 &&
        b.x < e.x + e.width / 2 &&
        b.y > e.y &&
        b.y < e.y + e.height
      ) {
        b.active = false;
        e.hp--;

        createExplosion(b.x, b.y, b.color, 4);

        if (e.hp <= 0) {
          e.active = false;
          audio.playExplosion();
          createExplosion(e.x, e.y + e.height / 2, e.color, 16);

          const points = player.doubleScoreTimer > 0 ? e.scoreVal * 2 : e.scoreVal;
          score += points;

          if (score >= level * 1500) {
            level++;
          }

          updateHUD();

          const dropChance = e.type === 'destroyer' ? 0.65 : 0.25;
          if (Math.random() < dropChance) {
            powerups.push(new PowerUp(e.x, e.y + e.height / 2));
          }
        }
      }
    });
  });

  // Player vs Enemies
  enemies.forEach(e => {
    if (!e.active) return;

    const dist = Math.hypot((player.x + player.width / 2) - e.x, (player.y + player.height / 2) - (e.y + e.height / 2));
    if (dist < player.width / 2 + e.width / 2) {
      e.active = false;
      createExplosion(e.x, e.y, e.color, 18);

      if (player.shieldTimer <= 0) {
        health = Math.max(0, health - 25);
        audio.playDamage();
        updateHUD();
        if (health <= 0) triggerGameOver();
      } else {
        audio.playExplosion();
      }
    }
  });

  // Player vs PowerUps
  powerups.forEach(p => {
    if (!p.active) return;

    const dist = Math.hypot((player.x + player.width / 2) - p.x, (player.y + player.height / 2) - p.y);
    if (dist < player.width / 2 + p.size / 2) {
      p.active = false;
      audio.playPowerup();
      createExplosion(p.x, p.y, p.color, 12);

      if (p.type === 'rapid') player.rapidFireTimer = 450;
      if (p.type === 'shield') player.shieldTimer = 450;
      if (p.type === 'score') player.doubleScoreTimer = 450;

      updatePowerupUI();
    }
  });
}

function createExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    if (particles.length < 250) {
      particles.push(new Particle(x, y, color));
    }
  }
}

function spawnWave() {
  spawnTimer++;
  const spawnRate = Math.max(25, 85 - level * 7);

  if (spawnTimer > spawnRate) {
    spawnTimer = 0;
    const rand = Math.random();
    let type = 'scout';
    if (rand > 0.5 && rand < 0.85) type = 'fighter';
    if (rand >= 0.85) type = 'destroyer';

    enemies.push(new Enemy(type));
  }
}

function updateHUD() {
  scoreValEl.textContent = score;
  levelValEl.textContent = level;
  healthFillEl.style.width = `${health}%`;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('cyberstrike_highscore', highScore.toString());
    highScoreValEl.textContent = highScore;
  }
}

function updatePowerupUI() {
  powerupStatusEl.innerHTML = '';

  if (player.rapidFireTimer > 0) {
    const b = document.createElement('div');
    b.className = 'badge badge-rapid';
    b.textContent = 'RAPID FIRE';
    powerupStatusEl.appendChild(b);
  }
  if (player.shieldTimer > 0) {
    const b = document.createElement('div');
    b.className = 'badge badge-shield';
    b.textContent = 'ENERGY SHIELD';
    powerupStatusEl.appendChild(b);
  }
  if (player.doubleScoreTimer > 0) {
    const b = document.createElement('div');
    b.className = 'badge badge-score';
    b.textContent = '2X MULTIPLIER';
    powerupStatusEl.appendChild(b);
  }
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  audio.playGameOver();
  finalScoreEl.textContent = score;
  finalHighscoreEl.textContent = highScore;
  gameoverOverlay.classList.remove('hidden');
}

function resetGame() {
  score = 0;
  health = 100;
  level = 1;
  bullets = [];
  enemies = [];
  powerups = [];
  particles = [];
  player = new Player();
  updateHUD();
  updatePowerupUI();
}

// ==========================================
// 6. MAIN ENGINE LOOP
// ==========================================
function gameLoop() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  stars.forEach(s => {
    s.update();
    s.draw();
  });

  if (gameState === 'PLAYING') {
    spawnWave();
    player.update();

    bullets.forEach(b => b.update());
    enemies.forEach(e => e.update());
    powerups.forEach(p => p.update());
    particles.forEach(pt => pt.update());

    bullets = bullets.filter(b => b.active);
    enemies = enemies.filter(e => e.active);
    powerups = powerups.filter(p => p.active);
    particles = particles.filter(pt => pt.alpha > 0);

    updatePowerupUI();
    checkCollisions();
  }

  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    particles.forEach(pt => pt.draw());
    powerups.forEach(p => p.draw());
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    player.draw();
  }

  requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. INPUT LISTENERS & POINTER EVENTS
// ==========================================

window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.shoot = true;
  if (e.code === 'KeyP') togglePause();
});

window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.shoot = false;
});

// Touch / Pointer Event Listeners
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFire = document.getElementById('btn-fire');

function bindPointer(element, action) {
  const start = e => {
    e.preventDefault();
    audio.init();
    keys[action] = true;
  };
  const stop = e => {
    e.preventDefault();
    keys[action] = false;
  };

  element.addEventListener('pointerdown', start);
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
  element.addEventListener('pointerleave', stop);
}

bindPointer(btnLeft, 'left');
bindPointer(btnRight, 'right');
bindPointer(btnFire, 'shoot');

// Overlay Button Controls
document.getElementById('btn-start').addEventListener('click', () => {
  audio.init();
  startOverlay.classList.add('hidden');
  resetGame();
  gameState = 'PLAYING';
});

document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);

document.getElementById('btn-restart-pause').addEventListener('click', () => {
  pauseOverlay.classList.add('hidden');
  resetGame();
  gameState = 'PLAYING';
});

document.getElementById('btn-restart').addEventListener('click', () => {
  gameoverOverlay.classList.add('hidden');
  resetGame();
  gameState = 'PLAYING';
});

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseOverlay.classList.remove('hidden');
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    pauseOverlay.classList.add('hidden');
  }
}

// Start Engine
requestAnimationFrame(gameLoop);