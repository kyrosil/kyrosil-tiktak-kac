// === Oyun Alanı ve Değişkenler ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
// const startScreen = document.getElementById('startScreen'); // KALDIRILDI
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const rewardMessageElement = document.getElementById('rewardMessage');
const emailInstructionElement = document.getElementById('emailInstruction');
// const startBtn = document.getElementById('start-btn'); // KALDIRILDI
const restartBtn = document.getElementById('restart-btn');
const mobileControls = document.getElementById('mobile-controls');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const confettiContainer = document.getElementById('confetti-container');
const messageArea = document.getElementById('message-area');
// const rewardListElement = document.getElementById('rewardList'); // KALDIRILDI
const startPromptElement = document.getElementById('start-prompt');

const REWARD_EMAIL = "tiktakkac@kyrosil.eu";
const PLAYER_CAR_SRC = './indir (1).png';
const BONUS_SRC = './indir.png';

let canvasWidth, canvasHeight;
let userPhoneNumber = ''; // Telefon numarasını saklamak için (Local Storage'dan okunacak)

// === Ses Dosyaları ===
let audioInitialized = false;
const sounds = { move: new Audio(encodeURI('./correct-choice-43861.mp3')), collision: new Audio(encodeURI('./car-horn-6408.mp3')), bonus: new Audio(encodeURI('./wow-171498.mp3')), gameOver: new Audio(encodeURI('./game-over-arcade-6435 (1).mp3')), reward: new Audio(encodeURI('./fireworkblast-106275.mp3')), backgroundMusic: new Audio(encodeURI('./Arabanın Kolayı, TikTakta!.mp3')) };
sounds.backgroundMusic.loop = true; sounds.backgroundMusic.volume = 0.3; sounds.collision.volume = 0.7; sounds.bonus.volume = 0.8;

// === Oyun Ayarları ===
const laneCount = 3; let laneWidth;
const playerCarWidthRatio = 0.17; const playerCarHeightRatio = 0.09;
const obstacleWidthRatio = 0.16; const obstacleHeightRatio = 0.09;
const bonusWidthRatio = 0.11; const bonusHeightRatio = 0.07;
let playerCar = { x: 0, y: 0, width: 45, height: 70, speed: 9, lane: 1, image: new Image(), loaded: false };
try { playerCar.image.src = encodeURI(PLAYER_CAR_SRC); } catch(e) { console.error("Araba URL hatası:", e); }
playerCar.image.onload = () => { playerCar.loaded = true; }; playerCar.image.onerror = () => { console.error("Araba resmi yüklenemedi! Yol:", PLAYER_CAR_SRC); playerCar.loaded = false; };
let bonusImage = new Image(); let bonusImageLoaded = false;
try { bonusImage.src = encodeURI(BONUS_SRC); } catch(e) { console.error("Bonus URL hatası:", e); }
bonusImage.onload = () => { bonusImageLoaded = true; }; bonusImage.onerror = () => { console.error("Bonus resmi yüklenemedi! Yol:", BONUS_SRC); bonusImageLoaded = false; };
const obstacleEmojis = ['🚗', '🚙', '🚕', '🚚', '🚌']; let obstacles = []; let bonuses = []; let score = 0; let lives = 3;
// ZORLUK AYARLARI (Agresif)
let baseSpeed = 8; let gameSpeed = baseSpeed;
let baseSpawnRate = 65; let obstacleSpawnRate = baseSpawnRate;
let bonusSpawnRate = 700; let frameCount = 0;
let gameOver = true; let gameRunning = false; let animationFrameId;
let difficultyIncreaseInterval = 250; let speedIncrement = 0.6;
let spawnRateDecrement = 7; let minSpawnRate = 12;

// === Günlük Limit Fonksiyonları ===
const DAILY_LIMIT_KEY = 'kyrosilTiktakDailyPlays_v2'; const MAX_PLAYS_PER_DAY = 3; function checkDailyLimit() { const today = new Date().toLocaleDateString(); let playData = localStorage.getItem(DAILY_LIMIT_KEY); let playCount = 0; if (playData) { try { playData = JSON.parse(playData); if (playData.date === today) { playCount = playData.count; } else { updateDailyLimit(0); } } catch (e) { localStorage.removeItem(DAILY_LIMIT_KEY); } } if (playCount >= MAX_PLAYS_PER_DAY) { messageArea.textContent = `Bugünlük ${MAX_PLAYS_PER_DAY} oyun hakkınızı kullandınız. Yarın tekrar gelin!`; messageArea.style.display = 'block'; return false; } messageArea.textContent = ""; messageArea.style.display = 'none'; return true; } function updateDailyLimit(count) { const today = new Date().toLocaleDateString(); try { localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ date: today, count: count })); } catch (e) { console.error("LS'a yazılamadı."); } } function incrementPlayCount() { const today = new Date().toLocaleDateString(); let playData = localStorage.getItem(DAILY_LIMIT_KEY); let playCount = 0; if (playData) { try { playData = JSON.parse(playData); if (playData.date === today) { playCount = playData.count; } } catch(e) {} } updateDailyLimit(playCount + 1); }

// === Ödül Kademeleri ===
const rewardTiers = [ { score: 500, message: "🏆 EPİK! 5 Günlük Ücretsiz Kiralama + 500 KM (Easy Grup) Kazandınız!" }, { score: 400, message: "🎉 2 Günlük Ücretsiz Kiralama + 200KM (Easy Grup) Kazandınız!" }, { score: 300, message: "🎉 1 Günlük Ücretsiz Kiralama + 100KM (Easy Grup) Kazandınız!" }, { score: 200, message: "💰 500 TL İndirim Kazandınız!" }, { score: 100, message: "💰 200 TL İndirim Kazandınız!" }, { score: 50, message: "💰 100 TL İndirim Kazandınız!" } ];

// === Ses Fonksiyonları ===
function initAudio() { if (audioInitialized) return; console.log("Sesler hazırlanıyor (ilk etkileşim)..."); let promises = []; Object.values(sounds).forEach(sound => { if(sound && sound.play) { sound.volume = 0; let promise = sound.play(); if (promise !== undefined) { promises.push(promise.then(() => { sound.pause(); sound.currentTime = 0; if (sound === sounds.backgroundMusic) sound.volume = 0.3; else if (sound === sounds.collision) sound.volume = 0.7; else if (sound === sounds.bonus) sound.volume = 0.8; else sound.volume = 1.0; }).catch(error => {})); } } }); Promise.all(promises).then(() => { audioInitialized = true; console.log("Sesler hazır."); playSound('backgroundMusic'); }).catch(e => { console.warn("Sesler başlatılamadı.", e); audioInitialized = true; setTimeout(() => playSound('backgroundMusic'), 100); }); }
function playSound(soundName) { if (!audioInitialized) return; const sound = sounds[soundName]; if (sound && sound.play) { sound.currentTime = 0; sound.play().catch(e => console.error(`Ses (${soundName}) çalınırken hata:`, e)); } else { console.warn(`Ses bulunamadı: ${soundName}`); } }
function stopSound(soundName) { const sound = sounds[soundName]; if (sound && sound.pause) { sound.pause(); sound.currentTime = 0; } }

// === Oyun Kurulumu ve Boyutlandırma ===
function resizeCanvas() { const container = document.getElementById('game-container'); const containerPadding = parseFloat(window.getComputedStyle(container).paddingLeft) || 0; const containerWidth = container.clientWidth - (containerPadding * 2); canvasWidth = Math.min(containerWidth, 550); canvasHeight = canvasWidth * 1.6; const maxCanvasHeight = window.innerHeight * 0.7; if (canvasHeight > maxCanvasHeight) { canvasHeight = maxCanvasHeight; canvasWidth = canvasHeight / 1.6; } canvas.width = Math.floor(canvasWidth); canvas.height = Math.floor(canvasHeight); laneWidth = canvas.width / laneCount; playerCar.width = canvas.width * playerCarWidthRatio; playerCar.height = canvas.width * playerCarHeightRatio; const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window); const showGameElements = gameRunning && !gameOver; const showStartUI = !gameRunning && gameOver && !gameOverScreen.classList.contains('visible'); canvas.style.display = 'block'; document.getElementById('ui-container').style.display = showGameElements || showStartUI ? 'flex' : 'none'; mobileControls.style.display = isMobile && (showGameElements || showStartUI) ? 'flex' : 'none'; startPromptElement.style.display = showStartUI ? 'block' : 'none'; gameOverScreen.style.display = gameOverScreen.classList.contains('visible') ? 'flex' : 'none'; if (showStartUI) { playerCar.lane = 1; playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2); playerCar.y = canvas.height - playerCar.height - 15; } }

// === Çizim Fonksiyonları ===
function drawPlayer() { if ((!gameRunning && gameOver && !gameOverScreen.classList.contains('visible')) || gameRunning) { if (playerCar.loaded) ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height); else { ctx.fillStyle = '#007bff'; ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); } } }
function drawObstacles() { if (!gameRunning) return; const emojiSize = Math.min(canvasWidth * obstacleHeightRatio * 0.8, 30); ctx.font = `${emojiSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; obstacles.forEach(obstacle => { ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2); }); }
function drawBonuses() { if (!gameRunning) return; bonuses.forEach(bonus => { if (bonusImageLoaded) { ctx.drawImage(bonusImage, bonus.x, bonus.y, bonus.width, bonus.height); } else { ctx.fillStyle = 'gold'; ctx.strokeStyle = '#e6b800'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2, bonus.width / 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } }); }
let roadLineOffset = 0; const roadLineBaseHeight = 25; const roadLineBaseGap = 35; function drawRoadLines() { ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = Math.max(2, canvasWidth * 0.012); ctx.setLineDash([roadLineBaseHeight, roadLineBaseGap]); if(gameRunning) { roadLineOffset += gameSpeed * 0.8; if (roadLineOffset > (roadLineBaseHeight + roadLineBaseGap)) { roadLineOffset = 0; } } ctx.beginPath(); const lineX1 = laneWidth; const lineX2 = laneWidth * 2; ctx.moveTo(lineX1, -roadLineBaseGap + roadLineOffset); ctx.lineTo(lineX1, canvasHeight + roadLineBaseHeight); ctx.moveTo(lineX2, -roadLineBaseGap + roadLineOffset); ctx.lineTo(lineX2, canvasHeight + roadLineBaseHeight); ctx.stroke(); ctx.restore(); }

// === Hareket ve Kontrol ===
function movePlayer(direction) { if (gameOver || !gameRunning) return; let targetLane = playerCar.lane; if (direction === 'left' && playerCar.lane > 0) { targetLane--; } else if (direction === 'right' && playerCar.lane < laneCount - 1) { targetLane++; } if (targetLane !== playerCar.lane) { playerCar.lane = targetLane; playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2); playSound('move'); } }
document.addEventListener('keydown', (e) => { if (gameOver && !gameRunning) { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { if (checkDailyLimit()) { startGame(); } } } else if (gameRunning && !gameOver) { if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { movePlayer('left'); } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { movePlayer('right'); } } });
function handleMobileButtonPress(direction) { if (gameOver && !gameRunning) { if (checkDailyLimit()) { startGame(); } } else if (gameRunning && !gameOver) { movePlayer(direction); } }
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileButtonPress('left'); }, { passive: false }); rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileButtonPress('right'); }, { passive: false }); leftBtn.addEventListener('mousedown', () => { handleMobileButtonPress('left'); }); rightBtn.addEventListener('mousedown', () => { handleMobileButtonPress('right'); });

// === Nesne Oluşturma ===
function spawnObstacle() { const lane = Math.floor(Math.random() * laneCount); const width = canvasWidth * obstacleWidthRatio; const height = canvasWidth * obstacleHeightRatio; const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2); const y = -height * (1 + Math.random() * 0.5); const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)]; const lastObstacleInLane = obstacles.filter(o => o.lane === lane).sort((a,b) => b.y - a.y)[0]; const minDistance = Math.max(height * 2.5, gameSpeed * 10); if(!lastObstacleInLane || lastObstacleInLane.y > minDistance) { obstacles.push({ x, y, width, height, emoji, lane }); } }
function spawnBonus() { const lane = Math.floor(Math.random() * laneCount); const width = canvasWidth * bonusWidthRatio; const height = canvasWidth * bonusHeightRatio; const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2); let y = -height * 4; if (score > 80 && Math.random() < 0.45) { const potentialObstacles = obstacles.filter(o => o.lane === lane && o.y < canvasHeight / 3 && o.y > height * 2); if (potentialObstacles.length > 0) { const targetObstacle = potentialObstacles[0]; y = targetObstacle.y - height * (1.8 + Math.random()); y = Math.max(-height*6, y); } } const nearbyBonus = bonuses.some(b => Math.abs(b.y - y) < canvasHeight * 0.3); if(!nearbyBonus) { bonuses.push({ x, y, width, height, lane }); } }

// === Güncelleme ===
function updateObstacles() { for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].y += gameSpeed; if (obstacles[i].y > canvasHeight) { obstacles.splice(i, 1); if (!gameOver) { score++; scoreElement.textContent = `Skor: ${score}`; } } } }
function updateBonuses() { for (let i = bonuses.length - 1; i >= 0; i--) { bonuses[i].y += gameSpeed * 0.9; if (bonuses[i].y > canvasHeight) { bonuses.splice(i, 1); } } }
let scoreFeedbacks = []; function showScoreFeedback(text, x, y) { scoreFeedbacks.push({ text, x, y, alpha: 1, timer: 60 }); } function updateAndDrawScoreFeedbacks() { ctx.save(); ctx.font = 'bold 18px Poppins, sans-serif'; ctx.textAlign = 'center'; for (let i = scoreFeedbacks.length - 1; i >= 0; i--) { let fb = scoreFeedbacks[i]; fb.y -= 0.5; fb.alpha -= 0.016; fb.timer--; ctx.fillStyle = `rgba(255, 215, 0, ${fb.alpha})`; ctx.fillText(fb.text, fb.x, fb.y); if (fb.timer <= 0 || fb.alpha <= 0) { scoreFeedbacks.splice(i, 1); } } ctx.restore(); }
function updateLivesDisplay() { livesElement.textContent = `Can: ${'❤️'.repeat(Math.max(0, lives))}`; }

// === Çarpışma Kontrolü (GÜVENLİ + SESLİ) ===
function checkCollisions() { const carHitbox = { x: playerCar.x + playerCar.width * 0.1, y: playerCar.y + playerCar.height * 0.1, width: playerCar.width * 0.8, height: playerCar.height * 0.8 }; for (let index = obstacles.length - 1; index >= 0; index--) { if (!obstacles[index]) continue; const obstacle = obstacles[index]; const obsHitbox = { x: obstacle.x + obstacle.width * 0.1, y: obstacle.y + obstacle.height * 0.1, width: obstacle.width * 0.8, height: obstacle.height * 0.8 }; if (carHitbox.x < obsHitbox.x + obsHitbox.width && carHitbox.x + carHitbox.width > obsHitbox.x && carHitbox.y < obsHitbox.y + obsHitbox.height && carHitbox.y + carHitbox.height > obsHitbox.y) { obstacles.splice(index, 1); lives--; updateLivesDisplay(); playSound('collision'); canvas.style.boxShadow = 'inset 0 0 15px 5px rgba(255, 0, 0, 0.5)'; setTimeout(() => { canvas.style.boxShadow = 'none'; }, 150); if (lives <= 0) { endGame(); return; } } } for (let index = bonuses.length - 1; index >= 0; index--) { if (!bonuses[index]) continue; const bonus = bonuses[index]; if (carHitbox.x < bonus.x + bonus.width && carHitbox.x + carHitbox.width > bonus.x && carHitbox.y < bonus.y + bonus.height && carHitbox.y + carHitbox.height > bonus.y) { bonuses.splice(index, 1); score += 5; scoreElement.textContent = `Skor: ${score}`; playSound('bonus'); showScoreFeedback('+5', playerCar.x + playerCar.width / 2, playerCar.y); } } }

// === Zorluk Ayarlama (ARTIRILMIŞ) ===
function updateDifficulty() { if (score < 50) { gameSpeed = baseSpeed + (score * 0.11); obstacleSpawnRate = Math.max(minSpawnRate + 10, baseSpawnRate - score * 2.8); } else { if (frameCount % difficultyIncreaseInterval === 0) { gameSpeed += speedIncrement + (score / 300); obstacleSpawnRate = Math.max(minSpawnRate, obstacleSpawnRate - (spawnRateDecrement + Math.floor(score / 60))); } if (score > 150 && score < 350) bonusSpawnRate = 950; else if (score >= 350) bonusSpawnRate = 1200; else bonusSpawnRate = 750; } }

// === Ödül Kontrolü ===
function checkRewards(finalScore) { /* ... */ for (const tier of rewardTiers) { if (finalScore >= tier.score) { return tier.message; } } return "Bu seferlik ödül kazanamadınız. Tekrar deneyin!"; }

// === Oyun Döngüsü ===
function gameLoop() { if (gameOver) return; ctx.clearRect(0, 0, canvasWidth, canvasHeight); drawRoadLines(); drawObstacles(); drawBonuses(); drawPlayer(); updateAndDrawScoreFeedbacks(); updateObstacles(); updateBonuses(); checkCollisions(); if (!gameOver) { updateDifficulty(); } frameCount++; if (frameCount % Math.max(1, Math.floor(obstacleSpawnRate)) === 0) { spawnObstacle(); } if (frameCount % Math.max(1, Math.floor(bonusSpawnRate)) === 0) { if (Math.random() < 0.3) { spawnBonus(); } } animationFrameId = requestAnimationFrame(gameLoop); }

// === Oyun Durumu Yönetimi ===
function startGame() {
    if (gameRunning) return;
    // Telefon numarasını Local Storage'dan oku
    userPhoneNumber = localStorage.getItem('userPhoneNumberForGame') || '';
    console.log("Oyuna başlarken okunan Tel No:", userPhoneNumber); // Test için

    if (!checkDailyLimit()) { return; } // Limit kontrolü önemli
    initAudio(); // Sesleri HAZIRLA/BAŞLAT

    score = 0; lives = 3; gameSpeed = baseSpeed; obstacleSpawnRate = baseSpawnRate;
    bonusSpawnRate = 700; obstacles = []; bonuses = []; scoreFeedbacks = [];
    frameCount = 0; gameOver = false; gameRunning = true;
    scoreElement.textContent = `Skor: ${score}`; updateLivesDisplay();

    // Ekranları Yönet
    gameOverScreen.style.display = 'none'; gameOverScreen.classList.remove('visible');
    messageArea.style.display = 'none';
    startPromptElement.style.display = 'none'; // "Başla" mesajını GİZLE
    stopConfetti();
    canvas.style.display = 'block'; document.getElementById('ui-container').style.display = 'flex';
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none';

    resizeCanvas();
    playerCar.lane = 1;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvas.height - playerCar.height - 15;

    playSound('backgroundMusic');

    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    gameLoop();
}

function endGame() {
    if (gameOver) return; gameOver = true; gameRunning = false;
    cancelAnimationFrame(animationFrameId); incrementPlayCount();
    stopSound('backgroundMusic'); playSound('gameOver');

    finalScoreElement.textContent = `Skorun: ${score}`;
    const reward = checkRewards(score);
    rewardMessageElement.textContent = reward;

    // Telefon numarasını Local Storage'dan tekrar oku (güvenlik için)
    userPhoneNumber = localStorage.getItem('userPhoneNumberForGame') || 'Numara Yok';

    if (reward.includes("Kazandınız")) {
        // Mailto linkine telefon numarasını ekle
        const subject = encodeURIComponent(`Kyrosil Tiktak Oyun Ödülü - Skor: ${score} - TelNo: ${userPhoneNumber}`);
        const body = encodeURIComponent(`Merhaba,\n\n${score} puan yaparak "${reward.split('Kazandınız!')[0].trim()}" ödülünü kazandım.\n\nTelefon Numaram: ${userPhoneNumber}\n\n(Lütfen bu oyun sonu ekranının görüntüsünü de ekleyiniz.)`);
        emailInstructionElement.innerHTML = `Ödülünü almak için bu ekranın görüntüsünü <a href="mailto:${REWARD_EMAIL}?subject=${subject}&body=${body}" target="_blank" style="color: #0056b3; font-weight:bold;">${REWARD_EMAIL}</a> adresine gönder.<br>Ödülün genellikle 20 dakika içerisinde iletilir!`;
        startConfetti();
        setTimeout(() => playSound('reward'), 300);
    } else {
        emailInstructionElement.textContent = "Daha yüksek skorla tekrar dene!";
        stopConfetti();
    }

    document.getElementById('ui-container').style.display = 'none';
    mobileControls.style.display = 'none';
    messageArea.style.display = 'none';
    startPromptElement.style.display = 'none'; // Bunu da gizle
    gameOverScreen.style.display = 'flex';
    gameOverScreen.classList.add('visible');
}

// === Başlangıç ===
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    // Telefon numarasını oyun başladığında okuyacağız, burada değil.
    // userPhoneNumber = localStorage.getItem('userPhoneNumberForGame') || '';

    resizeCanvas();
    gameOver = true; gameRunning = false; // Başlangıç durumu
    updateLivesDisplay(); scoreElement.textContent = `Skor: 0`;
    startPromptElement.style.display = 'block'; // "Başla" mesajını göster
    canvas.style.display = 'block'; document.getElementById('ui-container').style.display = 'flex';
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none';
    // Başlangıçta araba ve yolu çiz
     setTimeout(() => {
         if(gameOver && !gameRunning && !gameOverScreen.classList.contains('visible')) { // Oyun bitti ekranı da yoksa
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            drawRoadLines();
            // Oyuncu başlangıç pozisyonunu resizeCanvas içinde ayarladık
            drawPlayer();
         }
     }, 100);
});

// Restart butonu listener
restartBtn.addEventListener('click', () => { if (checkDailyLimit()) { gameOverScreen.classList.remove('visible'); setTimeout(() => { /* Sesler zaten hazır */ startGame(); }, 50); } });

// === Konfeti Fonksiyonları ===
let confettiInterval; function createConfettiPiece() { const piece = document.createElement('div'); piece.classList.add('confetti'); piece.style.left = `${Math.random() * 100}%`; piece.style.top = `${-10 - Math.random() * 20}px`; const colors = ['#e63946', '#fca311', '#2a9d8f', '#ffffff', '#007bff', '#ffc107']; piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]; const rotation = Math.random() * 720 - 360; piece.style.transform = `rotate(${rotation}deg)`; piece.style.width = `${6 + Math.random() * 6}px`; piece.style.height = `${10 + Math.random() * 10}px`; piece.style.opacity = `${0.7 + Math.random() * 0.3}`; piece.style.animationDelay = `${Math.random() * 0.5}s`; piece.style.animationDuration = `${2.5 + Math.random() * 2}s`; confettiContainer.appendChild(piece); setTimeout(() => { piece.remove(); }, 4500); } function startConfetti() { stopConfetti(); confettiContainer.innerHTML = ''; let confettiCount = 0; confettiInterval = setInterval(() => { if (confettiCount < 150) { createConfettiPiece(); confettiCount++; } else { stopConfetti(); } }, 30); } function stopConfetti() { clearInterval(confettiInterval); }
