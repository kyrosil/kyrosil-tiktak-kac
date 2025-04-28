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
const rewardListElement = document.getElementById('rewardList'); // Ödül listesi için

const REWARD_EMAIL = "tiktakkac@kyrosil.eu";
const PLAYER_CAR_SRC = './indir (1).png'; // Boşluk ve parantezli isim
const BONUS_SRC = './indir.png';

let canvasWidth, canvasHeight;

// === Oyun Ayarları ===
const laneCount = 3;
let laneWidth;
const playerCarWidthRatio = 0.17; // Biraz daha dar olabilir
const playerCarHeightRatio = 0.09;
const obstacleWidthRatio = 0.15;
const obstacleHeightRatio = 0.08;
const bonusWidthRatio = 0.11;
const bonusHeightRatio = 0.07;

let playerCar = {
    x: 0, y: 0, width: 45, height: 70, speed: 9, lane: 1, // Hız hafif arttı
    image: new Image(), loaded: false
};
try {
    playerCar.image.src = encodeURI(PLAYER_CAR_SRC); // Encode URI
} catch(e) { console.error("Araba resmi URL hatası:", e); }
playerCar.image.onload = () => { playerCar.loaded = true; };
playerCar.image.onerror = () => { console.error("Araba resmi yüklenemedi! Yol:", PLAYER_CAR_SRC); playerCar.loaded = false; };

let bonusImage = new Image();
let bonusImageLoaded = false;
try {
    bonusImage.src = encodeURI(BONUS_SRC); // Encode URI
} catch(e) { console.error("Bonus resmi URL hatası:", e); }
bonusImage.onload = () => { bonusImageLoaded = true; };
bonusImage.onerror = () => { console.error("Bonus resmi yüklenemedi! Yol:", BONUS_SRC); bonusImageLoaded = false; };

const obstacleEmojis = ['🚗', '🚙', '🚕', '🚚', '🚌']; // Engeller
let obstacles = [];
let bonuses = [];
let score = 0;
let lives = 3;
let baseSpeed = 4.5; // BAŞLANGIÇ HIZI ARTIRILDI
let gameSpeed = baseSpeed;
let baseSpawnRate = 100; // SPAWN SIKLIĞI ARTIRILDI (düşük = daha sık)
let obstacleSpawnRate = baseSpawnRate;
let bonusSpawnRate = 700; // Bonus nadirliği
let frameCount = 0;
let gameOver = true; // Başlangıçta oyun bitti ekranı/başlangıç ekranı
let gameRunning = false;
let animationFrameId;

// Zorluk Ayarları (Daha Sert)
let difficultyIncreaseInterval = 400; // Daha sık zorluk kontrolü
let speedIncrement = 0.25; // Hız artışı daha fazla
let spawnRateDecrement = 3.5; // Spawn azalması daha fazla (min 25)
let minSpawnRate = 25; // Minimum spawn rate (daha zor)

// Mobil kontrol
let moveLeftActive = false;
let moveRightActive = false;

// Günlük Limit
const DAILY_LIMIT_KEY = 'kyrosilTiktakDailyPlays'; // Yeni unique key
const MAX_PLAYS_PER_DAY = 3;

// Ödül Kademeleri (Aynı kaldı, sadece JS tarafında kullanılıyor)
const rewardTiers = [
    { score: 500, message: "🏆 EPİK! 5 Günlük Ücretsiz Kiralama + 500 KM (Easy Grup) Kazandınız!" },
    { score: 400, message: "🎉 2 Günlük Ücretsiz Kiralama + 200KM (Easy Grup) Kazandınız!" },
    { score: 300, message: "🎉 1 Günlük Ücretsiz Kiralama + 100KM (Easy Grup) Kazandınız!" },
    { score: 200, message: "💰 500 TL İndirim Kazandınız!" },
    { score: 100, message: "💰 200 TL İndirim Kazandınız!" },
    { score: 50, message: "💰 100 TL İndirim Kazandınız!" }
];

// === Günlük Limit Fonksiyonları (Aynı kaldı) ===
function checkDailyLimit() {
    const today = new Date().toLocaleDateString();
    let playData = localStorage.getItem(DAILY_LIMIT_KEY);
    let playCount = 0;
    if (playData) {
        try {
            playData = JSON.parse(playData);
            if (playData.date === today) { playCount = playData.count; }
            else { updateDailyLimit(0); }
        } catch (e) { localStorage.removeItem(DAILY_LIMIT_KEY); }
    }
    if (playCount >= MAX_PLAYS_PER_DAY) {
        messageArea.textContent = `Bugünlük ${MAX_PLAYS_PER_DAY} oyun hakkınızı kullandınız. Yarın tekrar gelin!`;
        messageArea.style.display = 'block';
        return false;
    }
    messageArea.textContent = "";
    messageArea.style.display = 'none';
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

// === Oyun Kurulumu ve Boyutlandırma (Aynı kaldı) ===
function resizeCanvas() {
    const containerWidth = document.getElementById('game-container').clientWidth - 40; // İç padding'i (20+20) çıkar
    canvasWidth = Math.min(containerWidth, 510); // Max genişlik (550 - 40 padding)

    canvasHeight = canvasWidth * 1.6; // Oranı ayarla (daha dikey)
    if (window.innerHeight < canvasHeight + 250) { // Ekran yüksekliğine sığdır (header+ui+butonlar payı)
         canvasHeight = Math.max(300, window.innerHeight - 250); // Minimum yükseklik 300px
         canvasWidth = canvasHeight / 1.6; // Genişliği yüksekliğe göre ayarla
    }
    // Canvas boyutlarını tam sayı yapalım
    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);

    laneWidth = canvas.width / laneCount;

    playerCar.width = canvas.width * playerCarWidthRatio;
    playerCar.height = canvas.width * playerCarHeightRatio;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvas.height - playerCar.height - 15;

    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none';
}

// === Çizim Fonksiyonları ===
function drawPlayer() {
    // Oyuncuyu çizmeden önce canvas durumunu kaydet
    // ctx.save();
    // // İsteğe bağlı: Hafif eğim veya animasyon eklenebilir
    // ctx.translate(playerCar.x + playerCar.width / 2, playerCar.y + playerCar.height / 2);
    // // ctx.rotate(tiltAngle * Math.PI / 180); // Dönüş için
    // ctx.translate(-(playerCar.x + playerCar.width / 2), -(playerCar.y + playerCar.height / 2));

    if (playerCar.loaded) {
        ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    } else {
        ctx.fillStyle = '#007bff'; // Mavi fallback
        ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
        ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height); // Kenarlık
    }
    // Canvas durumunu geri yükle
    // ctx.restore();
}

function drawObstacles() {
    // Emoji boyutu daha dinamik
    const emojiSize = Math.min(canvasWidth * obstacleHeightRatio * 0.8, 30); // Max 30px
    ctx.font = `${emojiSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Dikey hizalama için

    obstacles.forEach(obstacle => {
        // // Alternatif: Dikdörtgen çizimi
        // ctx.fillStyle = '#6c757d'; // Gri engel
        // ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        // ctx.strokeStyle = '#343a40';
        // ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        // Emoji çizimi (merkezlenmiş)
        ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    });
}

function drawBonuses() {
    bonuses.forEach(bonus => {
        if (bonusImageLoaded) {
            ctx.drawImage(bonusImage, bonus.x, bonus.y, bonus.width, bonus.height);
        } else {
            // Fallback: Altın rengi daire
            ctx.fillStyle = 'gold';
            ctx.strokeStyle = '#e6b800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2, bonus.width / 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });
}

// Hareket eden yol çizgileri (İyileştirilmiş)
let roadLineOffset = 0;
const roadLineHeight = canvasHeight * 0.05; // Yüksekliğe oranlı
const roadLineGap = canvasHeight * 0.08;
function drawRoadLines() {
    ctx.save(); // Mevcut durumu kaydet
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Beyazımsı, yarı saydam
    ctx.lineWidth = Math.max(2, canvasWidth * 0.01); // Genişliğe oranlı kalınlık
    ctx.setLineDash([roadLineHeight, roadLineGap]);

    roadLineOffset += gameSpeed * 0.8; // Hıza bağlı kaydırma (daha yavaş)
    if (roadLineOffset > (roadLineHeight + roadLineGap)) {
        roadLineOffset = 0;
    }

    // Yolun ortasına çizgi çizmek yerine şeritleri ayıran çizgiler
    for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        // Çizgiyi offset ile kaydır
        ctx.moveTo(i * laneWidth, -roadLineGap + roadLineOffset);
        ctx.lineTo(i * laneWidth, canvasHeight + roadLineHeight); // Ekran dışına taşsın
        ctx.stroke();
    }

    ctx.restore(); // Kaydedilen durumu geri yükle (çizgi stili diğerlerini etkilemesin)
}

// === Hareket ve Kontrol ===
function movePlayer(direction) {
    if (gameOver || !gameRunning) return; // Oyun çalışmıyorsa hareket etme
    let targetLane = playerCar.lane;
    if (direction === 'left' && playerCar.lane > 0) {
        targetLane--;
    } else if (direction === 'right' && playerCar.lane < laneCount - 1) {
        targetLane++;
    }

    if (targetLane !== playerCar.lane) {
        playerCar.lane = targetLane;
        playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
        // playSound('move'); // Placeholder
    }
}

// Klavye Kontrolleri
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gameOver) return;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        movePlayer('left');
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        movePlayer('right');
    }
});

// Mobil Buton Kontrolleri (Dokunulduğunda Şerit Değiştir)
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('left'); }, { passive: false });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('right'); }, { passive: false });
leftBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('left'); });
rightBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('right'); });


// === Nesne Oluşturma (Spawn) ===
function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    const width = canvasWidth * obstacleWidthRatio;
    const height = canvasWidth * obstacleHeightRatio;
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    const y = -height;
    const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];

    // Aynı şeritte çok sık engel çıkmasını önle (basit kontrol)
    const lastObstacleInLane = obstacles.filter(o => o.lane === lane).sort((a,b) => b.y - a.y)[0];
    if(!lastObstacleInLane || lastObstacleInLane.y > height * 2.5) { // En az 2.5 engel boyu fark
        obstacles.push({ x, y, width, height, emoji, lane });
    } else {
        // Çıkmazsa bir sonrakini bekle
    }
}

function spawnBonus() {
    const lane = Math.floor(Math.random() * laneCount);
    const width = canvasWidth * bonusWidthRatio;
    const height = canvasWidth * bonusHeightRatio;
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    let y = -height * 3; // Daha yukarıdan

    // Zor Konumlandırma: Bazen bir engelin hemen arkasına denk getir
    if (Math.random() < 0.3) { // %30 ihtimalle zor konum
        const potentialObstacles = obstacles.filter(o => o.lane === lane && o.y < canvasHeight / 2 && o.y > 0);
        if (potentialObstacles.length > 0) {
            const targetObstacle = potentialObstacles[Math.floor(Math.random() * potentialObstacles.length)];
             // Engelin biraz arkasına yerleştir (ama çok yakına değil)
            y = targetObstacle.y - height * (1.5 + Math.random());
             y = Math.max(-height*5, y); // Çok da yukarı gitmesin
             console.log("Zor bonus konumlandı!");
        }
    }

     // Aynı anda o bölgede başka bonus var mı kontrol et
     const nearbyBonus = bonuses.some(b => Math.abs(b.y - y) < canvasHeight * 0.2);
     if(!nearbyBonus) {
        bonuses.push({ x, y, width, height, lane });
     }
}


// === Güncelleme ve Çarpışma ===
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += gameSpeed;
        if (obstacles[i].y > canvasHeight) {
            obstacles.splice(i, 1);
            if (!gameOver) {
                score++;
                scoreElement.textContent = `Skor: ${score}`;
            }
        }
    }
}
function updateBonuses() {
    for (let i = bonuses.length - 1; i >= 0; i--) {
        bonuses[i].y += gameSpeed * 0.9; // Bonuslar biraz yavaş
        if (bonuses[i].y > canvasHeight) {
            bonuses.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Engellerle Çarpışma (Daha hassas kontrol)
    const carHitbox = {
        x: playerCar.x + playerCar.width * 0.1,
        y: playerCar.y + playerCar.height * 0.1,
        width: playerCar.width * 0.8,
        height: playerCar.height * 0.8
    };

    obstacles.forEach((obstacle, index) => {
        const obsHitbox = {
            x: obstacle.x + obstacle.width * 0.1,
            y: obstacle.y + obstacle.height * 0.1,
            width: obstacle.width * 0.8,
            height: obstacle.height * 0.8
        };
        if (
            carHitbox.x < obsHitbox.x + obsHitbox.width &&
            carHitbox.x + carHitbox.width > obsHitbox.x &&
            carHitbox.y < obsHitbox.y + obsHitbox.height &&
            carHitbox.y + carHitbox.height > obsHitbox.y
        ) {
            obstacles.splice(index, 1);
            lives--;
            updateLivesDisplay();
            // playSound('collision'); // Placeholder
            // Ekranı hafif kırmızı yapma efekti
            canvas.style.boxShadow = 'inset 0 0 15px 5px rgba(255, 0, 0, 0.5)';
            setTimeout(() => { canvas.style.boxShadow = 'none'; }, 150);

            if (lives <= 0) {
                endGame();
            }
        }
    });

    // Bonuslarla Çarpışma
    bonuses.forEach((bonus, index) => {
         if (
            carHitbox.x < bonus.x + bonus.width &&
            carHitbox.x + carHitbox.width > bonus.x &&
            carHitbox.y < bonus.y + bonus.height &&
            carHitbox.y + carHitbox.height > bonus.y
        ) {
            bonuses.splice(index, 1);
            score += 5;
            scoreElement.textContent = `Skor: ${score}`;
            // playSound('bonus'); // Placeholder
            // Bonus toplama efekti (puanın yanında +5 göster?)
            showScoreFeedback('+5', playerCar.x + playerCar.width / 2, playerCar.y);
         }
    });
}

// Anlık Skor Geri Bildirimi (Bonus için)
let scoreFeedbacks = [];
function showScoreFeedback(text, x, y) {
    scoreFeedbacks.push({ text, x, y, alpha: 1, timer: 60 }); // 60 frame (1sn)
}
function updateAndDrawScoreFeedbacks() {
    ctx.save();
    ctx.font = 'bold 18px Poppins, sans-serif';
    ctx.textAlign = 'center';
    for (let i = scoreFeedbacks.length - 1; i >= 0; i--) {
        let fb = scoreFeedbacks[i];
        fb.y -= 0.5; // Yukarı doğru hareket
        fb.alpha -= 0.016; // Yavaşça solma
        fb.timer--;
        ctx.fillStyle = `rgba(255, 215, 0, ${fb.alpha})`; // Altın rengi
        ctx.fillText(fb.text, fb.x, fb.y);
        if (fb.timer <= 0 || fb.alpha <= 0) {
            scoreFeedbacks.splice(i, 1);
        }
    }
    ctx.restore();
}


function updateLivesDisplay() {
    livesElement.textContent = `Can: ${'❤️'.repeat(Math.max(0, lives))}`;
}

// === Zorluk Ayarlama (İyileştirilmiş) ===
function updateDifficulty() {
    // İlk 50 puan için daha kontrollü ama yine de artan zorluk
    if (score < 50) {
        gameSpeed = baseSpeed + (score * 0.04); // Hız artışı biraz daha fazla
        obstacleSpawnRate = Math.max(minSpawnRate + 10, baseSpawnRate - score * 1.2); // Sıklaşma daha belirgin
    }
    // 50 puandan sonra sert artış
    else if (score >= 50) {
        if (frameCount % difficultyIncreaseInterval === 0) { // Sık kontrol
            // Hızı üssel veya daha agresif artır
            gameSpeed += speedIncrement + (score / 800); // Bölüm daha küçük, artış fazla
            // Spawn oranını daha da agresif azalt
            obstacleSpawnRate = Math.max(minSpawnRate, obstacleSpawnRate - (spawnRateDecrement + Math.floor(score / 150)));
            console.log(`Zorluk Arttı! Skor: ${score}, Hız: ${gameSpeed.toFixed(2)}, Spawn Rate: ${obstacleSpawnRate.toFixed(0)}`);
        }
        // Bonus spawn rate'i de zorlukla ayarla (daha nadir çıksın?)
        if (score > 150 && score < 300) bonusSpawnRate = 900;
        else if (score >= 300) bonusSpawnRate = 1000;
        else bonusSpawnRate = 700; // Başlangıçta biraz sık çıksın
    }
}

// === Ödül Kontrolü (Aynı kaldı) ===
function checkRewards(finalScore) {
    for (const tier of rewardTiers) {
        if (finalScore >= tier.score) { return tier.message; }
    }
    return "Bu seferlik ödül kazanamadınız. Tekrar deneyin!";
}

// === Oyun Döngüsü ===
function gameLoop() {
    if (gameOver) return; // Oyun bittiyse veya başlamadıysa döngüden çık

    // Canvas'ı temizle
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // === Çizim Sırası ===
    drawRoadLines();      // Önce yol
    drawObstacles();      // Sonra engeller
    drawBonuses();        // Sonra bonuslar
    drawPlayer();         // En üste oyuncu
    updateAndDrawScoreFeedbacks(); // Skor geri bildirimleri

    // === Güncelleme ve Kontroller ===
    updateObstacles();
    updateBonuses();
    checkCollisions();

    // Oyun bitmediyse zorluğu güncelle
    if (!gameOver) {
      updateDifficulty();
    }

    // === Nesne Spawn ===
    frameCount++;
    // Spawn oranını kontrol et
    if (frameCount % Math.max(1, Math.floor(obstacleSpawnRate)) === 0) { // 0'a bölünmeyi engelle
        spawnObstacle();
    }
     // Bonus spawn etme
    if (frameCount % Math.max(1, Math.floor(bonusSpawnRate)) === 0) {
        if (Math.random() < 0.35) { // Bonus çıkma ihtimali
             spawnBonus();
        }
    }

    // Döngüyü tekrar çağır
    animationFrameId = requestAnimationFrame(gameLoop);
}

// === Oyun Durumu Yönetimi ===
function startGame() {
    if (gameRunning) return; // Zaten çalışıyorsa tekrar başlatma

    if (!checkDailyLimit()) { return; } // Limit kontrolü

    // Sıfırlama
    score = 0;
    lives = 3;
    gameSpeed = baseSpeed;
    obstacleSpawnRate = baseSpawnRate;
    bonusSpawnRate = 700;
    obstacles = [];
    bonuses = [];
    scoreFeedbacks = [];
    frameCount = 0;
    gameOver = false; // Oyun artık bitmedi
    gameRunning = true; // Oyun çalışıyor

    scoreElement.textContent = `Skor: ${score}`;
    updateLivesDisplay();
    startScreen.classList.remove('visible'); // Başlangıç ekranını gizle
    gameOverScreen.style.display = 'none';
    messageArea.style.display = 'none'; // Mesajı gizle
    stopConfetti();

    resizeCanvas(); // Canvas boyutunu tekrar ayarla (emin olmak için)
    playerCar.lane = 1;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvas.height - playerCar.height - 15;

    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    gameLoop(); // Döngüyü başlat
}

function endGame() {
    if (gameOver) return;
    gameOver = true;
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    incrementPlayCount();
    // playSound('gameOver'); // Placeholder

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

    gameOverScreen.style.display = 'flex'; // Oyun bitti ekranını göster
    gameOverScreen.classList.add('visible'); // Görünür yap
}

// === Başlangıç Ekranı Kurulumu ===
function populateRewardList() {
    rewardListElement.innerHTML = ''; // Listeyi temizle
    rewardTiers.forEach(tier => {
        const li = document.createElement('li');
        // Skoru daha belirgin yapalım
        li.innerHTML = `<strong style="color:#e63946;">${tier.score} Puan:</strong> ${tier.message.split('Kazandınız!')[0].replace('EPİK!','').replace('🎉','').replace('💰','').trim()}`;
        rewardListElement.appendChild(li);
    });
}

// === Event Listener'lar ===
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    // Yeniden başlatmadan önce limiti tekrar kontrol et!
    if (checkDailyLimit()) {
         // Oyun bitti ekranını hemen gizleyip başlat
         gameOverScreen.classList.remove('visible');
         // Kısa bir gecikme ile başlatmak daha iyi olabilir
         setTimeout(startGame, 100);
    } else {
       // Limit doluysa başlatma, mesaj zaten gösteriliyor olmalı
    }
});

// === Başlangıç ===
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    populateRewardList(); // Ödül listesini doldur
    resizeCanvas();
    // Başlangıçta başlangıç ekranını göster
    startScreen.style.display = 'flex';
    startScreen.classList.add('visible');
    gameOverScreen.style.display = 'none'; // Oyun bitti ekranı gizli
    gameOver = true; // Oyun henüz başlamadı
    gameRunning = false;
});

// === Ses Placeholder ===
/*
// Sesleri yönetmek için basit bir obje
const sounds = {
    // collision: new Audio('path/to/collision.wav'),
    // bonus: new Audio('path/to/bonus.wav'),
    // move: new Audio('path/to/move.wav'),
    // gameOver: new Audio('path/to/gameover.wav'),
    // backgroundMusic: new Audio('path/to/music.mp3')
};

// Kullanıcı etkileşimi olmadan ses çalmak genellikle engellenir.
// İlk kullanıcı etkileşiminde (örn: start butonuna tıklama) sesleri başlatmak gerekebilir.
let audioContextStarted = false;
function initAudio() {
    if (audioContextStarted) return;
    // Tüm sesleri bir kere 'play().catch()' ile başlatmayı dene (iOS uyumluluğu için)
    Object.values(sounds).forEach(sound => {
        if(sound && sound.load) { // Kontrol ekle
             sound.load(); // Yüklemeyi tetikle
             sound.play().then(() => sound.pause()).catch(e => {}); // Oynatıp durdurmayı dene
        }
    });
    audioContextStarted = true;
    console.log("Sesler hazırlandı.");
    // Arka plan müziğini başlatmak istersen:
    // if (sounds.backgroundMusic) {
    //     sounds.backgroundMusic.loop = true;
    //     sounds.backgroundMusic.volume = 0.3; // Ses ayarı
    //     sounds.backgroundMusic.play().catch(e => console.error("Müzik çalınamadı:", e));
    // }
}

function playSound(soundName) {
    if (!audioContextStarted) {
        console.warn("Sesler henüz başlatılmadı (kullanıcı etkileşimi bekleniyor).");
        return;
    }
    if (sounds[soundName] && sounds[soundName].play) {
        sounds[soundName].currentTime = 0; // Sesi başa sar
        sounds[soundName].play().catch(e => console.error(`Ses çalınamadı (${soundName}):`, e));
    }
}

// Start butonuna tıklanınca sesleri hazırla:
// startBtn.addEventListener('click', () => {
//     initAudio();
//     startGame(); // startGame'i yine çağır ama initAudio önce çalışsın
// });
// VEYA startGame içinde çağır:
// function startGame() {
//    initAudio(); // Sesleri başlat/hazırla
//    ... (geri kalan kod)
//}

*/


// === Konfeti Fonksiyonları (Aynı kaldı) ===
let confettiInterval;
function createConfettiPiece() { /* ... önceki kod ... */ }
function startConfetti() { /* ... önceki kod ... */ }
function stopConfetti() { /* ... önceki kod ... */ }
// createConfettiPiece içindeki kod:
function createConfettiPiece() {
    const piece = document.createElement('div');
    piece.classList.add('confetti');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-10 - Math.random() * 20}px`; // Yukarıdan başla
    const colors = ['#e63946', '#fca311', '#2a9d8f', '#ffffff', '#007bff', '#ffc107']; // Tiktak ve diğer renkler
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    const rotation = Math.random() * 720 - 360; // Daha fazla dönüş
    piece.style.transform = `rotate(${rotation}deg)`;
    piece.style.width = `${6 + Math.random() * 6}px`; // Farklı boyutlar
    piece.style.height = `${10 + Math.random() * 10}px`;
    piece.style.opacity = `${0.7 + Math.random() * 0.3}`; // Farklı opaklık
    piece.style.animationDelay = `${Math.random() * 0.5}s`; // Daha hızlı başlama
    piece.style.animationDuration = `${2.5 + Math.random() * 2}s`; // Farklı hızlar
    confettiContainer.appendChild(piece);
    setTimeout(() => { piece.remove(); }, 4500); // 4.5sn sonra temizle
}
function startConfetti() {
    stopConfetti();
    confettiContainer.innerHTML = '';
    // Daha yoğun konfeti
    let confettiCount = 0;
    confettiInterval = setInterval(() => {
        if (confettiCount < 150) { // Toplam 150 parça
             createConfettiPiece();
             confettiCount++;
        } else {
            stopConfetti(); // Yeterince çıkınca durdur
        }
    }, 30); // Daha sık
}
function stopConfetti() {
    clearInterval(confettiInterval);
    // Kalanlar animasyonla kaybolur
}
