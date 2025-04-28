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
const startPromptElement = document.getElementById('start-prompt'); // Yeni başlangıç mesajı elementi

const REWARD_EMAIL = "tiktakkac@kyrosil.eu";
const PLAYER_CAR_SRC = './indir (1).png';
const BONUS_SRC = './indir.png';

let canvasWidth, canvasHeight;

// === Oyun Ayarları ===
const laneCount = 3;
let laneWidth;
const playerCarWidthRatio = 0.17;
const playerCarHeightRatio = 0.09;
const obstacleWidthRatio = 0.16;
const obstacleHeightRatio = 0.09;
const bonusWidthRatio = 0.11;
const bonusHeightRatio = 0.07;

let playerCar = { /* ... öncekiyle aynı ... */
    x: 0, y: 0, width: 45, height: 70, speed: 9, lane: 1,
    image: new Image(), loaded: false
};
try { playerCar.image.src = encodeURI(PLAYER_CAR_SRC); } catch(e) { console.error("Araba URL hatası:", e); }
playerCar.image.onload = () => { playerCar.loaded = true; console.log("Araba resmi yüklendi."); };
playerCar.image.onerror = () => { console.error("Araba resmi yüklenemedi! Yol:", PLAYER_CAR_SRC); playerCar.loaded = false; };

let bonusImage = new Image(); /* ... öncekiyle aynı ... */
let bonusImageLoaded = false;
try { bonusImage.src = encodeURI(BONUS_SRC); } catch(e) { console.error("Bonus URL hatası:", e); }
bonusImage.onload = () => { bonusImageLoaded = true; console.log("Bonus resmi yüklendi."); };
bonusImage.onerror = () => { console.error("Bonus resmi yüklenemedi! Yol:", BONUS_SRC); bonusImageLoaded = false; };

const obstacleEmojis = ['🚗', '🚙', '🚕', '🚚', '🚌'];
let obstacles = [];
let bonuses = [];
let score = 0;
let lives = 3;
// ZORLUK ARTIRILDI
let baseSpeed = 6.5; // Daha hızlı başlangıç
let gameSpeed = baseSpeed;
let baseSpawnRate = 80; // Daha sık başlangıç
let obstacleSpawnRate = baseSpawnRate;
let bonusSpawnRate = 600;
let frameCount = 0;
let gameOver = true; // Başlangıçta oyun bitik
let gameRunning = false;
let animationFrameId;

// Zorluk Ayarları (DAHA SERT)
let difficultyIncreaseInterval = 300; // Daha sık zorluk artışı
let speedIncrement = 0.45; // Hız daha da fazla artsın
let spawnRateDecrement = 5.5; // Spawn azalması daha da fazla
let minSpawnRate = 15; // Minimum spawn rate (ÇOK ÇOK ZOR)

// Günlük Limit (Aynı kaldı)
const DAILY_LIMIT_KEY = 'kyrosilTiktakDailyPlays_v2';
const MAX_PLAYS_PER_DAY = 3;
function checkDailyLimit() { /* ... öncekiyle aynı ... */
    const today = new Date().toLocaleDateString();
    let playData = localStorage.getItem(DAILY_LIMIT_KEY); let playCount = 0;
    if (playData) { try { playData = JSON.parse(playData); if (playData.date === today) { playCount = playData.count; } else { updateDailyLimit(0); } } catch (e) { localStorage.removeItem(DAILY_LIMIT_KEY); } }
    if (playCount >= MAX_PLAYS_PER_DAY) { messageArea.textContent = `Bugünlük ${MAX_PLAYS_PER_DAY} oyun hakkınızı kullandınız. Yarın tekrar gelin!`; messageArea.style.display = 'block'; return false; }
    messageArea.textContent = ""; messageArea.style.display = 'none'; return true;
}
function updateDailyLimit(count) { /* ... öncekiyle aynı ... */
    const today = new Date().toLocaleDateString(); try { localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ date: today, count: count })); } catch (e) { console.error("LS'a yazılamadı."); }
}
function incrementPlayCount() { /* ... öncekiyle aynı ... */
     const today = new Date().toLocaleDateString(); let playData = localStorage.getItem(DAILY_LIMIT_KEY); let playCount = 0; if (playData) { try { playData = JSON.parse(playData); if (playData.date === today) { playCount = playData.count; } } catch(e) {} } updateDailyLimit(playCount + 1);
}

// Ödül Kademeleri (Aynı kaldı)
const rewardTiers = [ /* ... öncekiyle aynı ... */
    { score: 500, message: "🏆 EPİK! 5 Günlük Ücretsiz Kiralama + 500 KM (Easy Grup) Kazandınız!" }, { score: 400, message: "🎉 2 Günlük Ücretsiz Kiralama + 200KM (Easy Grup) Kazandınız!" }, { score: 300, message: "🎉 1 Günlük Ücretsiz Kiralama + 100KM (Easy Grup) Kazandınız!" }, { score: 200, message: "💰 500 TL İndirim Kazandınız!" }, { score: 100, message: "💰 200 TL İndirim Kazandınız!" }, { score: 50, message: "💰 100 TL İndirim Kazandınız!" }
];

// === Oyun Kurulumu ve Boyutlandırma ===
function resizeCanvas() { /* ... öncekiyle büyük ölçüde aynı, sadece sondaki UI gizleme/gösterme farklı ... */
    const container = document.getElementById('game-container');
    const containerPadding = parseFloat(window.getComputedStyle(container).paddingLeft) || 0;
    const containerWidth = container.clientWidth - (containerPadding * 2);
    canvasWidth = Math.min(containerWidth, 550);
    canvasHeight = canvasWidth * 1.6;
    const maxCanvasHeight = window.innerHeight * 0.7;
    if (canvasHeight > maxCanvasHeight) { canvasHeight = maxCanvasHeight; canvasWidth = canvasHeight / 1.6; }
    canvas.width = Math.floor(canvasWidth); canvas.height = Math.floor(canvasHeight); laneWidth = canvas.width / laneCount;
    playerCar.width = canvas.width * playerCarWidthRatio; playerCar.height = canvas.width * playerCarHeightRatio;

    // Başlangıçta veya oyun bittiğinde canvas/UI gizli, prompt görünür olabilir
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    if (gameOver && !gameRunning) { // Oyun başlamadıysa veya bittiyse
         canvas.style.display = 'block'; // Canvas görünsün ama içeriği boş/statik
         document.getElementById('ui-container').style.display = 'flex'; // UI görünsün (ilk skor/can)
         mobileControls.style.display = isMobile ? 'flex' : 'none'; // Mobil butonlar görünsün (başlatmak için)
         startPromptElement.style.display = 'block'; // "Başla" mesajı görünsün
         gameOverScreen.style.display = gameOverScreen.classList.contains('visible') ? 'flex' : 'none'; // Oyun bitti ekranı durumu korusun
    } else if (gameRunning) { // Oyun çalışıyorsa
         canvas.style.display = 'block';
         document.getElementById('ui-container').style.display = 'flex';
         mobileControls.style.display = isMobile ? 'flex' : 'none';
         startPromptElement.style.display = 'none'; // "Başla" mesajını gizle
         gameOverScreen.style.display = 'none';
         gameOverScreen.classList.remove('visible');
    }
}

// === Çizim Fonksiyonları ===
function drawPlayer() { /* ... öncekiyle aynı ... */
     if (!gameRunning && gameOver) { // Oyun başlamadıysa başlangıç pozisyonunda çiz
         if (playerCar.loaded) ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height);
         else { ctx.fillStyle = '#007bff'; ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); }
         return; // Başka bir şey çizme/güncelleme
     }
     if (!gameRunning || gameOver) return; // Çalışmıyorsa çizme (double check)
     if (playerCar.loaded) ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height);
     else { ctx.fillStyle = '#007bff'; ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); }
 }
function drawObstacles() { /* ... öncekiyle aynı ... */
    if (!gameRunning) return; const emojiSize = Math.min(canvasWidth * obstacleHeightRatio * 0.8, 30); ctx.font = `${emojiSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; obstacles.forEach(obstacle => { ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2); });
 }
function drawBonuses() { /* ... öncekiyle aynı ... */
    if (!gameRunning) return; bonuses.forEach(bonus => { if (bonusImageLoaded) { ctx.drawImage(bonusImage, bonus.x, bonus.y, bonus.width, bonus.height); } else { ctx.fillStyle = 'gold'; ctx.strokeStyle = '#e6b800'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2, bonus.width / 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } });
 }
let roadLineOffset = 0; const roadLineBaseHeight = 25; const roadLineBaseGap = 35;
function drawRoadLines() { /* ... öncekiyle aynı ... */
    if (!gameRunning && !gameOver) return; // Sadece oyun çalışırken veya başlangıçta çiz
    ctx.save(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = Math.max(2, canvasWidth * 0.012); ctx.setLineDash([roadLineBaseHeight, roadLineBaseGap]);
    if(gameRunning) { // Sadece oyun çalışırken hareket etsin
         roadLineOffset += gameSpeed * 0.8;
         if (roadLineOffset > (roadLineBaseHeight + roadLineBaseGap)) { roadLineOffset = 0; }
    }
    ctx.beginPath(); const lineX1 = laneWidth; const lineX2 = laneWidth * 2;
    ctx.moveTo(lineX1, -roadLineBaseGap + roadLineOffset); ctx.lineTo(lineX1, canvasHeight + roadLineBaseHeight);
    ctx.moveTo(lineX2, -roadLineBaseGap + roadLineOffset); ctx.lineTo(lineX2, canvasHeight + roadLineBaseHeight);
    ctx.stroke(); ctx.restore();
}

// === Hareket ve Kontrol ===
function movePlayer(direction) { /* ... öncekiyle aynı ... */
    if (gameOver || !gameRunning) return; let targetLane = playerCar.lane; if (direction === 'left' && playerCar.lane > 0) { targetLane--; } else if (direction === 'right' && playerCar.lane < laneCount - 1) { targetLane++; } if (targetLane !== playerCar.lane) { playerCar.lane = targetLane; playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2); /* playSound('move'); */ }
}
// Klavye listener (Oyun başlatmayı da içerir)
document.addEventListener('keydown', (e) => {
    if (gameOver && !gameRunning) { // Oyun başlamamışsa
         if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
             if (checkDailyLimit()) { startGame(); }
         }
    } else if (gameRunning && !gameOver) { // Oyun çalışıyorsa
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { movePlayer('left'); }
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { movePlayer('right'); }
    }
});
// Mobil Buton listener'ları (Oyun başlatmayı da içerir)
function handleMobileButtonPress(direction) {
     if (gameOver && !gameRunning) { // Oyun başlamamışsa
         if (checkDailyLimit()) { startGame(); }
     } else if (gameRunning && !gameOver) { // Oyun çalışıyorsa
         movePlayer(direction);
     }
}
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileButtonPress('left'); }, { passive: false });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileButtonPress('right'); }, { passive: false });
leftBtn.addEventListener('mousedown', () => { handleMobileButtonPress('left'); });
rightBtn.addEventListener('mousedown', () => { handleMobileButtonPress('right'); });


// === Nesne Oluşturma ===
function spawnObstacle() { /* ... öncekiyle aynı (zorluk artışı etkileyecek) ... */
    const lane = Math.floor(Math.random() * laneCount); const width = canvasWidth * obstacleWidthRatio; const height = canvasWidth * obstacleHeightRatio; const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2); const y = -height * (1 + Math.random() * 0.5); const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)]; const lastObstacleInLane = obstacles.filter(o => o.lane === lane).sort((a,b) => b.y - a.y)[0]; const minDistance = Math.max(height * 2.5, gameSpeed * 15); if(!lastObstacleInLane || lastObstacleInLane.y > minDistance) { obstacles.push({ x, y, width, height, emoji, lane }); }
}
function spawnBonus() { /* ... öncekiyle aynı (zorluk artışı etkileyecek) ... */
    const lane = Math.floor(Math.random() * laneCount); const width = canvasWidth * bonusWidthRatio; const height = canvasWidth * bonusHeightRatio; const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2); let y = -height * 4; if (score > 100 && Math.random() < 0.4) { const potentialObstacles = obstacles.filter(o => o.lane === lane && o.y < canvasHeight / 3 && o.y > height * 2); if (potentialObstacles.length > 0) { const targetObstacle = potentialObstacles[0]; y = targetObstacle.y - height * (1.8 + Math.random()); y = Math.max(-height*6, y); } } const nearbyBonus = bonuses.some(b => Math.abs(b.y - y) < canvasHeight * 0.3); if(!nearbyBonus) { bonuses.push({ x, y, width, height, lane }); }
}


// === Güncelleme ve Çarpışma ===
function updateObstacles() { /* Öncekiyle aynı */
    for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].y += gameSpeed; if (obstacles[i].y > canvasHeight) { obstacles.splice(i, 1); if (!gameOver) { score++; scoreElement.textContent = `Skor: ${score}`; } } }
 }
function updateBonuses() { /* Öncekiyle aynı */
    for (let i = bonuses.length - 1; i >= 0; i--) { bonuses[i].y += gameSpeed * 0.9; if (bonuses[i].y > canvasHeight) { bonuses.splice(i, 1); } }
 }
function checkCollisions() { /* Öncekiyle aynı */
    const carHitbox = { x: playerCar.x + playerCar.width * 0.1, y: playerCar.y + playerCar.height * 0.1, width: playerCar.width * 0.8, height: playerCar.height * 0.8 }; obstacles.forEach((obstacle, index) => { const obsHitbox = { x: obstacle.x + obstacle.width * 0.1, y: obstacle.y + obstacle.height * 0.1, width: obstacle.width * 0.8, height: obstacle.height * 0.8 }; if (carHitbox.x < obsHitbox.x + obsHitbox.width && carHitbox.x + carHitbox.width > obsHitbox.x && carHitbox.y < obsHitbox.y + obsHitbox.height && carHitbox.y + carHitbox.height > obsHitbox.y) { obstacles.splice(i, 1); lives--; updateLivesDisplay(); /* playSound('collision'); */ canvas.style.boxShadow = 'inset 0 0 15px 5px rgba(255, 0, 0, 0.5)'; setTimeout(() => { canvas.style.boxShadow = 'none'; }, 150); if (lives <= 0) { endGame(); } } }); bonuses.forEach((bonus, index) => { if (carHitbox.x < bonus.x + bonus.width && carHitbox.x + carHitbox.width > bonus.x && carHitbox.y < bonus.y + bonus.height && carHitbox.y + carHitbox.height > bonus.y) { bonuses.splice(i, 1); score += 5; scoreElement.textContent = `Skor: ${score}`; /* playSound('bonus'); */ showScoreFeedback('+5', playerCar.x + playerCar.width / 2, playerCar.y); } });
 }
let scoreFeedbacks = []; function showScoreFeedback(text, x, y) { /* ... */ scoreFeedbacks.push({ text, x, y, alpha: 1, timer: 60 }); }
function updateAndDrawScoreFeedbacks() { /* ... */ ctx.save(); ctx.font = 'bold 18px Poppins, sans-serif'; ctx.textAlign = 'center'; for (let i = scoreFeedbacks.length - 1; i >= 0; i--) { let fb = scoreFeedbacks[i]; fb.y -= 0.5; fb.alpha -= 0.016; fb.timer--; ctx.fillStyle = `rgba(255, 215, 0, ${fb.alpha})`; ctx.fillText(fb.text, fb.x, fb.y); if (fb.timer <= 0 || fb.alpha <= 0) { scoreFeedbacks.splice(i, 1); } } ctx.restore(); }
function updateLivesDisplay() { /* ... */ livesElement.textContent = `Can: ${'❤️'.repeat(Math.max(0, lives))}`; }

// === Zorluk Ayarlama ===
function updateDifficulty() { /* Değerler güncellendi */
    if (score < 50) { gameSpeed = baseSpeed + (score * 0.06); obstacleSpawnRate = Math.max(minSpawnRate + 15, baseSpawnRate - score * 1.8); }
    else { if (frameCount % difficultyIncreaseInterval === 0) { gameSpeed += speedIncrement + (score / 500); obstacleSpawnRate = Math.max(minSpawnRate, obstacleSpawnRate - (spawnRateDecrement + Math.floor(score / 100))); /* console.log(`Zorluk Arttı! Skor: ${score}, Hız: ${gameSpeed.toFixed(2)}, Spawn Rate: ${obstacleSpawnRate.toFixed(0)}`); */ } if (score > 150 && score < 350) bonusSpawnRate = 850; else if (score >= 350) bonusSpawnRate = 1000; else bonusSpawnRate = 600; }
}

// === Ödül Kontrolü ===
function checkRewards(finalScore) { /* ... öncekiyle aynı ... */
     for (const tier of rewardTiers) { if (finalScore >= tier.score) { return tier.message; } } return "Bu seferlik ödül kazanamadınız. Tekrar deneyin!";
}

// === Oyun Döngüsü ===
function gameLoop() { /* ... öncekiyle aynı ... */
    if (gameOver) return; ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawRoadLines(); drawObstacles(); drawBonuses(); drawPlayer(); updateAndDrawScoreFeedbacks();
    updateObstacles(); updateBonuses(); checkCollisions();
    if (!gameOver) { updateDifficulty(); } frameCount++;
    if (frameCount % Math.max(1, Math.floor(obstacleSpawnRate)) === 0) { spawnObstacle(); }
    if (frameCount % Math.max(1, Math.floor(bonusSpawnRate)) === 0) { if (Math.random() < 0.35) { spawnBonus(); } }
    animationFrameId = requestAnimationFrame(gameLoop);
}

// === Oyun Durumu Yönetimi ===
function startGame() {
    if (gameRunning) return;
    if (!checkDailyLimit()) { return; } // Limit kontrolü startGame içinde de yapılsın

    // Sıfırlama
    score = 0; lives = 3; gameSpeed = baseSpeed; obstacleSpawnRate = baseSpawnRate;
    bonusSpawnRate = 600; obstacles = []; bonuses = []; scoreFeedbacks = [];
    frameCount = 0; gameOver = false; gameRunning = true;

    scoreElement.textContent = `Skor: ${score}`; updateLivesDisplay();

    // Ekranları Yönet
    // startScreen.classList.remove('visible'); // KALDIRILDI
    // startScreen.style.display = 'none'; // KALDIRILDI
    gameOverScreen.style.display = 'none';
    gameOverScreen.classList.remove('visible');
    messageArea.style.display = 'none';
    startPromptElement.style.display = 'none'; // "Başla" mesajını GİZLE
    stopConfetti();

    canvas.style.display = 'block'; // Canvas'ı GÖSTER
    document.getElementById('ui-container').style.display = 'flex'; // UI GÖSTER
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none'; // Mobil butonları GÖSTER

    // Canvas boyutunu tekrar ayarla ve oyuncu pozisyonunu sıfırla
    resizeCanvas(); // Canvas görünür olduktan sonra boyutlandırma daha sağlıklı olabilir
    playerCar.lane = 1;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvas.height - playerCar.height - 15;


    // initAudio(); // Sesleri başlatmayı dene (Yorumlu)
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    gameLoop();
}

function endGame() { /* ... öncekiyle aynı, sadece UI gizleme eklendi ... */
    if (gameOver) return; gameOver = true; gameRunning = false;
    cancelAnimationFrame(animationFrameId); incrementPlayCount();
    // playSound('gameOver');
    finalScoreElement.textContent = `Skorun: ${score}`; const reward = checkRewards(score); rewardMessageElement.textContent = reward;
    if (reward.includes("Kazandınız")) { emailInstructionElement.innerHTML = `Ödülünü almak için bu ekranın görüntüsünü <a href="mailto:${REWARD_EMAIL}?subject=Kyrosil Tiktak Oyun Ödülü - Skor: ${score}" target="_blank" style="color: #0056b3; font-weight:bold;">${REWARD_EMAIL}</a> adresine gönder.<br>Ödülün genellikle 20 dakika içerisinde iletilir!`; startConfetti(); }
    else { emailInstructionElement.textContent = "Daha yüksek skorla tekrar dene!"; stopConfetti(); }

    // Oyun UI elemanlarını gizle
    // canvas.style.display = 'none'; // Canvas kalsın ama döngü durdu
    document.getElementById('ui-container').style.display = 'none';
    mobileControls.style.display = 'none';
    messageArea.style.display = 'none';
    startPromptElement.style.display = 'none'; // Başlama mesajı da gizlensin

    gameOverScreen.style.display = 'flex'; gameOverScreen.classList.add('visible');
}

// === Başlangıç Ekranı Kurulumu KALDIRILDI ===
// function populateRewardList() { /* ... KALDIRILDI ... */ }

// === Event Listener'lar ===
// startBtn listener KALDIRILDI
restartBtn.addEventListener('click', () => { /* ... öncekiyle aynı ... */
    if (checkDailyLimit()) { gameOverScreen.classList.remove('visible'); setTimeout(startGame, 100); }
});

// === Başlangıç ===
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    // populateRewardList(); // KALDIRILDI
    resizeCanvas(); // Başlangıçta boyutlandır
    // Başlangıçta oyun bitik durumda ve başlatma mesajı görünür
    gameOver = true;
    gameRunning = false;
    updateLivesDisplay(); // Başlangıç canını göster
    scoreElement.textContent = `Skor: 0`; // Başlangıç skorunu göster
    startPromptElement.style.display = 'block'; // "Başla" mesajını göster
    canvas.style.display = 'block'; // Canvas görünsün
    document.getElementById('ui-container').style.display = 'flex'; // UI görünsün
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none'; // Mobil butonlar görünsün

    // Başlangıçta arabanın çizilmesi için bir ilk çizim yapalım
     setTimeout(drawPlayer, 50); // Resmin yüklenmesi için küçük bir gecikme
     setTimeout(drawRoadLines, 50); // Başlangıçta yol görünsün

});

// === Konfeti Fonksiyonları ===
let confettiInterval;
function createConfettiPiece() { /* ... öncekiyle aynı ... */ const piece = document.createElement('div'); piece.classList.add('confetti'); piece.style.left = `${Math.random() * 100}%`; piece.style.top = `${-10 - Math.random() * 20}px`; const colors = ['#e63946', '#fca311', '#2a9d8f', '#ffffff', '#007bff', '#ffc107']; piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]; const rotation = Math.random() * 720 - 360; piece.style.transform = `rotate(${rotation}deg)`; piece.style.width = `${6 + Math.random() * 6}px`; piece.style.height = `${10 + Math.random() * 10}px`; piece.style.opacity = `${0.7 + Math.random() * 0.3}`; piece.style.animationDelay = `${Math.random() * 0.5}s`; piece.style.animationDuration = `${2.5 + Math.random() * 2}s`; confettiContainer.appendChild(piece); setTimeout(() => { piece.remove(); }, 4500); }
function startConfetti() { /* ... öncekiyle aynı ... */ stopConfetti(); confettiContainer.innerHTML = ''; let confettiCount = 0; confettiInterval = setInterval(() => { if (confettiCount < 150) { createConfettiPiece(); confettiCount++; } else { stopConfetti(); } }, 30); }
function stopConfetti() { /* ... öncekiyle aynı ... */ clearInterval(confettiInterval); }
