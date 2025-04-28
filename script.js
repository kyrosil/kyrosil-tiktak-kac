// === Oyun Alanı ve Değişkenler ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const rewardMessageElement = document.getElementById('rewardMessage');
const emailInstructionElement = document.getElementById('emailInstruction');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const mobileControls = document.getElementById('mobile-controls');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const confettiContainer = document.getElementById('confetti-container');
const messageArea = document.getElementById('message-area');
const rewardListElement = document.getElementById('rewardList');

const REWARD_EMAIL = "tiktakkac@kyrosil.eu";
const PLAYER_CAR_SRC = './indir (1).png';
const BONUS_SRC = './indir.png';

let canvasWidth, canvasHeight;

// === Oyun Ayarları ===
const laneCount = 3;
let laneWidth;
const playerCarWidthRatio = 0.17;
const playerCarHeightRatio = 0.09;
const obstacleWidthRatio = 0.16; // Engeller biraz daha büyük
const obstacleHeightRatio = 0.09;
const bonusWidthRatio = 0.11;
const bonusHeightRatio = 0.07;

let playerCar = {
    x: 0, y: 0, width: 45, height: 70, speed: 9, lane: 1,
    image: new Image(), loaded: false
};
// Dosya adı sorun çıkarırsa diye try-catch ve encodeURI
try {
    playerCar.image.src = encodeURI(PLAYER_CAR_SRC);
} catch(e) { console.error("Araba resmi URL hatası:", e); }
playerCar.image.onload = () => { playerCar.loaded = true; console.log("Araba resmi yüklendi."); };
playerCar.image.onerror = () => { console.error("Araba resmi yüklenemedi! Yol:", PLAYER_CAR_SRC); playerCar.loaded = false; };

let bonusImage = new Image();
let bonusImageLoaded = false;
try {
    bonusImage.src = encodeURI(BONUS_SRC);
} catch(e) { console.error("Bonus resmi URL hatası:", e); }
bonusImage.onload = () => { bonusImageLoaded = true; console.log("Bonus resmi yüklendi."); };
bonusImage.onerror = () => { console.error("Bonus resmi yüklenemedi! Yol:", BONUS_SRC); bonusImageLoaded = false; };

const obstacleEmojis = ['🚗', '🚙', '🚕', '🚚', '🚌'];
let obstacles = [];
let bonuses = [];
let score = 0;
let lives = 3;
let baseSpeed = 5; // HIZ ARTIRILDI
let gameSpeed = baseSpeed;
let baseSpawnRate = 95; // SPAWN SIKLIĞI ARTIRILDI
let obstacleSpawnRate = baseSpawnRate;
let bonusSpawnRate = 650; // Bonus biraz daha sık başlasın
let frameCount = 0;
let gameOver = true; // Başlangıçta oyun bitik (Start screen gösterilir)
let gameRunning = false;
let animationFrameId;

// Zorluk Ayarları (Daha Sert)
let difficultyIncreaseInterval = 350; // Daha da sık kontrol
let speedIncrement = 0.3; // Hız artışı daha fazla
let spawnRateDecrement = 4; // Spawn azalması daha fazla
let minSpawnRate = 20; // Minimum spawn rate (ÇOK ZOR)

// Mobil kontrol
// (State'ler artık start/end içinde yönetiliyor)

// Günlük Limit
const DAILY_LIMIT_KEY = 'kyrosilTiktakDailyPlays_v2'; // Key'i değiştirelim (test için)
const MAX_PLAYS_PER_DAY = 3;

// Ödül Kademeleri
const rewardTiers = [
    { score: 500, message: "🏆 EPİK! 5 Günlük Ücretsiz Kiralama + 500 KM (Easy Grup) Kazandınız!" },
    { score: 400, message: "🎉 2 Günlük Ücretsiz Kiralama + 200KM (Easy Grup) Kazandınız!" },
    { score: 300, message: "🎉 1 Günlük Ücretsiz Kiralama + 100KM (Easy Grup) Kazandınız!" },
    { score: 200, message: "💰 500 TL İndirim Kazandınız!" },
    { score: 100, message: "💰 200 TL İndirim Kazandınız!" },
    { score: 50, message: "💰 100 TL İndirim Kazandınız!" }
];

// === Günlük Limit Fonksiyonları ===
function checkDailyLimit() {
    const today = new Date().toLocaleDateString();
    let playData = localStorage.getItem(DAILY_LIMIT_KEY);
    let playCount = 0;
    if (playData) {
        try {
            playData = JSON.parse(playData);
            if (playData.date === today) { playCount = playData.count; }
            else { updateDailyLimit(0); } // Farklı gün, sıfırla
        } catch (e) { localStorage.removeItem(DAILY_LIMIT_KEY); }
    }
    if (playCount >= MAX_PLAYS_PER_DAY) {
        messageArea.textContent = `Bugünlük ${MAX_PLAYS_PER_DAY} oyun hakkınızı kullandınız. Yarın tekrar gelin!`;
        messageArea.style.display = 'block'; // Mesajı göster
        return false;
    }
    messageArea.textContent = "";
    messageArea.style.display = 'none'; // Mesajı gizle
    return true;
}
function updateDailyLimit(count) {
    const today = new Date().toLocaleDateString();
    try { localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ date: today, count: count })); }
    catch (e) { console.error("Local Storage'a yazılamadı."); }
}
function incrementPlayCount() {
    const today = new Date().toLocaleDateString();
    let playData = localStorage.getItem(DAILY_LIMIT_KEY);
    let playCount = 0;
    if (playData) {
         try { playData = JSON.parse(playData); if (playData.date === today) { playCount = playData.count; } }
         catch(e) {/* Hata varsa 0 kalır */}
    }
    updateDailyLimit(playCount + 1);
}

// === Oyun Kurulumu ve Boyutlandırma ===
function resizeCanvas() {
    const container = document.getElementById('game-container');
    // Style'dan padding'i al (örn: "20px" -> 20)
    const containerPadding = parseFloat(window.getComputedStyle(container).paddingLeft) || 0;
    const containerWidth = container.clientWidth - (containerPadding * 2);

    canvasWidth = Math.min(containerWidth, 550); // max-width'ı CSS'den alır gibi

    // Yüksekliği genişliğe göre ayarla
    canvasHeight = canvasWidth * 1.6;
    const maxCanvasHeight = window.innerHeight * 0.7; // Ekranın %70'ini geçmesin
    if (canvasHeight > maxCanvasHeight) {
        canvasHeight = maxCanvasHeight;
        canvasWidth = canvasHeight / 1.6;
    }

    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);
    laneWidth = canvas.width / laneCount;

    playerCar.width = canvas.width * playerCarWidthRatio;
    playerCar.height = canvas.width * playerCarHeightRatio;
    // Oyuncu pozisyonunu burada GÜNCELLEME, startGame içinde yapılıyor
    // playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    // playerCar.y = canvas.height - playerCar.height - 15;

    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none';

    // Başlangıç/Bitiş ekranı görünürse oyun alanını gizle/göster (opsiyonel)
    canvas.style.display = (startScreen.classList.contains('visible') || gameOverScreen.style.display === 'flex') ? 'none' : 'block';
    // UI'ı da gizleyebiliriz
     document.getElementById('ui-container').style.display = canvas.style.display === 'block' ? 'flex' : 'none';
     mobileControls.style.display = (isMobile && canvas.style.display === 'block') ? 'flex' : 'none';
}

// === Çizim Fonksiyonları ===
function drawPlayer() {
    if (!gameRunning) return; // Oyun çalışmıyorsa çizme
    if (playerCar.loaded) {
        ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    } else {
        ctx.fillStyle = '#007bff';
        ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
        ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    }
}
function drawObstacles() {
    if (!gameRunning) return;
    const emojiSize = Math.min(canvasWidth * obstacleHeightRatio * 0.8, 30);
    ctx.font = `${emojiSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    obstacles.forEach(obstacle => {
        ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    });
}
function drawBonuses() {
    if (!gameRunning) return;
    bonuses.forEach(bonus => {
        if (bonusImageLoaded) {
            ctx.drawImage(bonusImage, bonus.x, bonus.y, bonus.width, bonus.height);
        } else {
            ctx.fillStyle = 'gold'; ctx.strokeStyle = '#e6b800'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2, bonus.width / 2.2, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }
    });
}

// Hareket eden yol çizgileri
let roadLineOffset = 0;
const roadLineBaseHeight = 25; // Sabit boyut daha iyi olabilir
const roadLineBaseGap = 35;
function drawRoadLines() {
    if (!gameRunning) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Daha görünür beyaz
    ctx.lineWidth = Math.max(2, canvasWidth * 0.012); // Biraz daha kalın
    ctx.setLineDash([roadLineBaseHeight, roadLineBaseGap]);

    // Hız arttıkça çizgiler daha hızlı aksın
    roadLineOffset += gameSpeed * 0.8;
    if (roadLineOffset > (roadLineBaseHeight + roadLineBaseGap)) {
        roadLineOffset = 0;
    }

    ctx.beginPath();
    // Ortadaki şeritin çizgileri
    const lineX1 = laneWidth;
    const lineX2 = laneWidth * 2;
    // 1. Çizgi
    ctx.moveTo(lineX1, -roadLineBaseGap + roadLineOffset);
    ctx.lineTo(lineX1, canvasHeight + roadLineBaseHeight);
    // 2. Çizgi
    ctx.moveTo(lineX2, -roadLineBaseGap + roadLineOffset);
    ctx.lineTo(lineX2, canvasHeight + roadLineBaseHeight);
    ctx.stroke();

    ctx.restore();
}

// === Hareket ve Kontrol ===
function movePlayer(direction) {
    if (gameOver || !gameRunning) return;
    let targetLane = playerCar.lane;
    if (direction === 'left' && playerCar.lane > 0) { targetLane--; }
    else if (direction === 'right' && playerCar.lane < laneCount - 1) { targetLane++; }

    if (targetLane !== playerCar.lane) {
        playerCar.lane = targetLane;
        playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
        // playSound('move');
    }
}
document.addEventListener('keydown', (e) => {
    if (gameOver && !gameRunning && startScreen.classList.contains('visible')) {
        // Başlangıç ekranında ilk tuşa basışta oyunu başlat
         if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key === 'Enter' || e.key === ' ') {
             if (checkDailyLimit()) {
                 startGame();
             }
         }
    } else if (gameRunning && !gameOver) {
        // Oyun sırasında hareket
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { movePlayer('left'); }
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { movePlayer('right'); }
    }
});
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('left'); }, { passive: false });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('right'); }, { passive: false });
leftBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('left'); });
rightBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('right'); });

// === Nesne Oluşturma ===
function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    const width = canvasWidth * obstacleWidthRatio;
    const height = canvasWidth * obstacleHeightRatio;
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    const y = -height * (1 + Math.random() * 0.5); // Biraz farklı yüksekliklerden
    const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];

    const lastObstacleInLane = obstacles.filter(o => o.lane === lane).sort((a,b) => b.y - a.y)[0];
    // Engeller arası minimum mesafeyi hızla ilişkilendir (hız arttıkça mesafe açılsın)
    const minDistance = Math.max(height * 2.5, gameSpeed * 15);
    if(!lastObstacleInLane || lastObstacleInLane.y > minDistance) {
        obstacles.push({ x, y, width, height, emoji, lane });
    }
}
function spawnBonus() {
    const lane = Math.floor(Math.random() * laneCount);
    const width = canvasWidth * bonusWidthRatio;
    const height = canvasWidth * bonusHeightRatio;
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    let y = -height * 4;

    // Zor Konumlandırma
    if (score > 100 && Math.random() < 0.4) { // 100 puandan sonra %40 ihtimalle
        const potentialObstacles = obstacles.filter(o => o.lane === lane && o.y < canvasHeight / 3 && o.y > height * 2); // Yakındaki engeller
        if (potentialObstacles.length > 0) {
            const targetObstacle = potentialObstacles[0]; // En yakındaki
            y = targetObstacle.y - height * (1.8 + Math.random()); // Engelin biraz arkası
            y = Math.max(-height*6, y);
            // console.log("Zor bonus!");
        }
    }
    // Çok yakın bonusları engelle
     const nearbyBonus = bonuses.some(b => Math.abs(b.y - y) < canvasHeight * 0.3);
     if(!nearbyBonus) {
        bonuses.push({ x, y, width, height, lane });
     }
}

// === Güncelleme ve Çarpışma ===
function updateObstacles() { /* Öncekiyle aynı */
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += gameSpeed;
        if (obstacles[i].y > canvasHeight) {
            obstacles.splice(i, 1);
            if (!gameOver) { score++; scoreElement.textContent = `Skor: ${score}`; }
        }
    }
}
function updateBonuses() { /* Öncekiyle aynı */
    for (let i = bonuses.length - 1; i >= 0; i--) {
        bonuses[i].y += gameSpeed * 0.9;
        if (bonuses[i].y > canvasHeight) { bonuses.splice(i, 1); }
    }
}
function checkCollisions() { /* Öncekiyle aynı (efektler eklendi) */
    const carHitbox = { x: playerCar.x + playerCar.width * 0.1, y: playerCar.y + playerCar.height * 0.1, width: playerCar.width * 0.8, height: playerCar.height * 0.8 };
    obstacles.forEach((obstacle, index) => {
        const obsHitbox = { x: obstacle.x + obstacle.width * 0.1, y: obstacle.y + obstacle.height * 0.1, width: obstacle.width * 0.8, height: obstacle.height * 0.8 };
        if (carHitbox.x < obsHitbox.x + obsHitbox.width && carHitbox.x + carHitbox.width > obsHitbox.x && carHitbox.y < obsHitbox.y + obsHitbox.height && carHitbox.y + carHitbox.height > obsHitbox.y) {
            obstacles.splice(index, 1); lives--; updateLivesDisplay();
            // playSound('collision');
            canvas.style.boxShadow = 'inset 0 0 15px 5px rgba(255, 0, 0, 0.5)'; setTimeout(() => { canvas.style.boxShadow = 'none'; }, 150);
            if (lives <= 0) { endGame(); }
        }
    });
    bonuses.forEach((bonus, index) => {
         if (carHitbox.x < bonus.x + bonus.width && carHitbox.x + carHitbox.width > bonus.x && carHitbox.y < bonus.y + bonus.height && carHitbox.y + carHitbox.height > bonus.y) {
            bonuses.splice(index, 1); score += 5; scoreElement.textContent = `Skor: ${score}`;
            // playSound('bonus');
            showScoreFeedback('+5', playerCar.x + playerCar.width / 2, playerCar.y);
         }
    });
}
let scoreFeedbacks = []; // Başa taşındı
function showScoreFeedback(text, x, y) { /* Öncekiyle aynı */
    scoreFeedbacks.push({ text, x, y, alpha: 1, timer: 60 });
}
function updateAndDrawScoreFeedbacks() { /* Öncekiyle aynı */
    ctx.save(); ctx.font = 'bold 18px Poppins, sans-serif'; ctx.textAlign = 'center';
    for (let i = scoreFeedbacks.length - 1; i >= 0; i--) {
        let fb = scoreFeedbacks[i]; fb.y -= 0.5; fb.alpha -= 0.016; fb.timer--;
        ctx.fillStyle = `rgba(255, 215, 0, ${fb.alpha})`;
        ctx.fillText(fb.text, fb.x, fb.y);
        if (fb.timer <= 0 || fb.alpha <= 0) { scoreFeedbacks.splice(i, 1); }
    }
    ctx.restore();
}
function updateLivesDisplay() { /* Öncekiyle aynı */
    livesElement.textContent = `Can: ${'❤️'.repeat(Math.max(0, lives))}`;
}

// === Zorluk Ayarlama (İyileştirilmiş) ===
function updateDifficulty() {
    if (score < 50) { // İlk 50 puan (Başlangıç daha zor)
        gameSpeed = baseSpeed + (score * 0.05); // Hız artışı daha keskin
        obstacleSpawnRate = Math.max(minSpawnRate + 20, baseSpawnRate - score * 1.5); // Sıklaşma daha keskin
    } else { // 50 puan sonrası (Çok sert artış)
        if (frameCount % difficultyIncreaseInterval === 0) {
            gameSpeed += speedIncrement + (score / 600); // Hız daha da artsın
            obstacleSpawnRate = Math.max(minSpawnRate, obstacleSpawnRate - (spawnRateDecrement + Math.floor(score / 120))); // Daha hızlı sıklaşsın
            // console.log(`Zorluk Arttı! Skor: ${score}, Hız: ${gameSpeed.toFixed(2)}, Spawn Rate: ${obstacleSpawnRate.toFixed(0)}`);
        }
        if (score > 150 && score < 350) bonusSpawnRate = 800; // Orta zorlukta bonus azalsın
        else if (score >= 350) bonusSpawnRate = 950;      // Çok zorken daha da azalsın
        else bonusSpawnRate = 650; // Başta sık kalsın
    }
}

// === Ödül Kontrolü (Aynı kaldı) ===
function checkRewards(finalScore) { /* ... */
    for (const tier of rewardTiers) { if (finalScore >= tier.score) { return tier.message; } }
    return "Bu seferlik ödül kazanamadınız. Tekrar deneyin!";
 }

// === Oyun Döngüsü ===
function gameLoop() {
    if (gameOver) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawRoadLines();
    drawObstacles();
    drawBonuses();
    drawPlayer();
    updateAndDrawScoreFeedbacks();
    updateObstacles();
    updateBonuses();
    checkCollisions();
    if (!gameOver) { updateDifficulty(); }
    frameCount++;
    if (frameCount % Math.max(1, Math.floor(obstacleSpawnRate)) === 0) { spawnObstacle(); }
    if (frameCount % Math.max(1, Math.floor(bonusSpawnRate)) === 0) { if (Math.random() < 0.4) { spawnBonus(); } }
    animationFrameId = requestAnimationFrame(gameLoop);
}

// === Oyun Durumu Yönetimi ===
function startGame() {
    if (gameRunning) return;
    if (!checkDailyLimit()) { return; }
    // Sıfırlama
    score = 0; lives = 3; gameSpeed = baseSpeed; obstacleSpawnRate = baseSpawnRate;
    bonusSpawnRate = 650; obstacles = []; bonuses = []; scoreFeedbacks = [];
    frameCount = 0; gameOver = false; gameRunning = true;
    scoreElement.textContent = `Skor: ${score}`; updateLivesDisplay();

    // Ekranları Yönet
    startScreen.classList.remove('visible');
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameOverScreen.classList.remove('visible');
    messageArea.style.display = 'none';
    stopConfetti();
    canvas.style.display = 'block'; // Canvas'ı göster
    document.getElementById('ui-container').style.display = 'flex'; // UI göster
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none'; // Mobil butonları göster

    resizeCanvas(); // Canvas boyutunu tekrar ayarla
    playerCar.lane = 1;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvas.height - playerCar.height - 15; // Y pozisyonunu ayarla

    // initAudio(); // Sesleri başlatmayı dene (Yorumlu)
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    gameLoop();
}

function endGame() {
    if (gameOver) return;
    gameOver = true; gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    incrementPlayCount();
    // playSound('gameOver');

    finalScoreElement.textContent = `Skorun: ${score}`;
    const reward = checkRewards(score);
    rewardMessageElement.textContent = reward;

    if (reward.includes("Kazandınız")) {
        emailInstructionElement.innerHTML = `Ödülünü almak için bu ekranın görüntüsünü <a href="mailto:${REWARD_EMAIL}?subject=Kyrosil Tiktak Oyun Ödülü - Skor: ${score}" target="_blank" style="color: #0056b3; font-weight:bold;">${REWARD_EMAIL}</a> adresine gönder.<br>Ödülün genellikle 20 dakika içerisinde iletilir!`;
        startConfetti();
    } else {
        emailInstructionElement.textContent = "Daha yüksek skorla tekrar dene!";
        stopConfetti();
    }

    // Oyun bitti ekranını gösterirken diğerlerini gizle
    canvas.style.display = 'none';
    document.getElementById('ui-container').style.display = 'none';
    mobileControls.style.display = 'none';
    messageArea.style.display = 'none';

    gameOverScreen.style.display = 'flex';
    gameOverScreen.classList.add('visible');
}

// === Başlangıç Ekranı Kurulumu ===
function populateRewardList() {
    rewardListElement.innerHTML = '';
    rewardTiers.forEach(tier => {
        const li = document.createElement('li');
        li.innerHTML = `<strong style="color:#e63946;">${tier.score} Puan:</strong> ${tier.message.split('Kazandınız!')[0].replace('EPİK!','').replace('🎉','').replace('💰','').trim().replace('(Easy Grup)','(Easy Grp)')}`; // Biraz kısaltma
        rewardListElement.appendChild(li);
    });
}

// === Event Listener'lar ===
startBtn.addEventListener('click', () => {
    if (checkDailyLimit()) {
        startGame();
    }
});
restartBtn.addEventListener('click', () => {
    if (checkDailyLimit()) {
        gameOverScreen.classList.remove('visible');
        setTimeout(startGame, 100); // Küçük gecikme
    }
});

// === Başlangıç ===
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    populateRewardList();
    resizeCanvas(); // Başlangıçta boyutlandır
    // Başlangıç ekranını göster
    startScreen.style.display = 'flex';
    startScreen.classList.add('visible');
    gameOverScreen.style.display = 'none';
    gameOverScreen.classList.remove('visible');
    // Canvas ve oyun UI başlangıçta gizli
    canvas.style.display = 'none';
    document.getElementById('ui-container').style.display = 'none';
    mobileControls.style.display = 'none';

    gameOver = true; // Oyun henüz başlamadı
    gameRunning = false;
});

// === Konfeti Fonksiyonları ===
let confettiInterval;
function createConfettiPiece() { /* ... önceki kod ... */
    const piece = document.createElement('div'); piece.classList.add('confetti');
    piece.style.left = `${Math.random() * 100}%`; piece.style.top = `${-10 - Math.random() * 20}px`;
    const colors = ['#e63946', '#fca311', '#2a9d8f', '#ffffff', '#007bff', '#ffc107'];
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    const rotation = Math.random() * 720 - 360; piece.style.transform = `rotate(${rotation}deg)`;
    piece.style.width = `${6 + Math.random() * 6}px`; piece.style.height = `${10 + Math.random() * 10}px`;
    piece.style.opacity = `${0.7 + Math.random() * 0.3}`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`; piece.style.animationDuration = `${2.5 + Math.random() * 2}s`;
    confettiContainer.appendChild(piece); setTimeout(() => { piece.remove(); }, 4500);
 }
function startConfetti() { /* ... önceki kod ... */
    stopConfetti(); confettiContainer.innerHTML = ''; let confettiCount = 0;
    confettiInterval = setInterval(() => { if (confettiCount < 150) { createConfettiPiece(); confettiCount++; } else { stopConfetti(); } }, 30);
 }
function stopConfetti() { /* ... önceki kod ... */
    clearInterval(confettiInterval);
 }
