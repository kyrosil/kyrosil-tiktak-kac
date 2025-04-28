// Oyun Alanı ve Değişkenler
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const rewardMessageElement = document.getElementById('rewardMessage');
const emailInstructionElement = document.getElementById('emailInstruction');
const restartBtn = document.getElementById('restart-btn');
const mobileControls = document.getElementById('mobile-controls');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const confettiContainer = document.getElementById('confetti-container');
const messageArea = document.getElementById('message-area');

const REWARD_EMAIL = "tiktakkac@kyrosil.eu"; // Ödül için e-posta adresi

let canvasWidth, canvasHeight;

// Oyun Ayarları
const laneCount = 3; // 3 Şeritli yol
let laneWidth;
const playerCarWidthRatio = 0.18; // Canvas genişliğine oranla araba genişliği
const playerCarHeightRatio = 0.1; // Araba yüksekliği
const obstacleWidthRatio = 0.15; // Engel genişliği
const obstacleHeightRatio = 0.08; // Engel yüksekliği
const bonusWidthRatio = 0.12; // Bonus genişliği
const bonusHeightRatio = 0.06; // Bonus yüksekliği

let playerCar = {
    x: 0,
    y: 0,
    width: 50,
    height: 80,
    speed: 8,
    lane: 1, // 0=sol, 1=orta, 2=sağ
    image: new Image(),
    loaded: false
};
// Parantez ve boşluk sorun yaratırsa diye encodeURI kullanıyoruz
playerCar.image.src = encodeURI('./indir (1).png');
playerCar.image.onload = () => { playerCar.loaded = true; };
playerCar.image.onerror = () => { console.error("Araba resmi yüklenemedi!"); playerCar.loaded = false; }; // Hata durumunda

let bonusImage = new Image();
bonusImage.src = './indir.png';
let bonusImageLoaded = false;
bonusImage.onload = () => { bonusImageLoaded = true; };
bonusImage.onerror = () => { console.error("Bonus resmi yüklenemedi!"); bonusImageLoaded = false; };

const obstacleEmojis = ['🚗', '🚙', '🚕', '🚚', '🚌']; // Engel olarak kullanılacak emojiler
let obstacles = [];
let bonuses = [];
let score = 0;
let lives = 3;
let gameSpeed = 3; // Başlangıç hızı
let obstacleSpawnRate = 120; // Kaç frame'de bir engel spawn olacak (düşük = daha sık)
let bonusSpawnRate = 800; // Bonus spawn rate (daha nadir)
let frameCount = 0;
let gameOver = false;
let gameRunning = false; // Oyunun aktif olup olmadığını kontrol eder
let animationFrameId;

// Zorluk Ayarları
let difficultyIncreaseInterval = 500; // Kaç frame'de bir zorluk kontrolü
let speedIncrement = 0.15; // Her zorluk artışında hız ne kadar artacak
let spawnRateDecrement = 2; // Her zorluk artışında spawn süresi ne kadar azalacak (min 30)
let baseSpeed = 3;
let baseSpawnRate = 120;

// Mobil kontrol için
let moveLeftPressed = false;
let moveRightPressed = false;

// Günlük Limit Ayarları
const DAILY_LIMIT_KEY = 'tiktakGameDailyPlays';
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

//-------------------------------------------------
// Günlük Limit Fonksiyonları
//-------------------------------------------------
function checkDailyLimit() {
    const today = new Date().toLocaleDateString(); // Günün tarihini al (örn: "29.04.2025")
    let playData = localStorage.getItem(DAILY_LIMIT_KEY);
    let playCount = 0;

    if (playData) {
        try {
            playData = JSON.parse(playData);
            if (playData.date === today) {
                playCount = playData.count;
            } else {
                // Farklı bir gün, sayacı sıfırla
                playCount = 0;
                updateDailyLimit(0); // Tarihi güncellemek için
            }
        } catch (e) {
            console.error("Local Storage verisi okunamadı.");
            playCount = 0; // Hata varsa sıfırla
            localStorage.removeItem(DAILY_LIMIT_KEY);
        }
    }

    if (playCount >= MAX_PLAYS_PER_DAY) {
        messageArea.textContent = `Bugünlük ${MAX_PLAYS_PER_DAY} oyun hakkınızı kullandınız. Yarın tekrar deneyin!`;
        return false; // Limit doldu
    }
    messageArea.textContent = ""; // Limit dolmadıysa mesajı temizle
    return true; // Oynayabilir
}

function updateDailyLimit(count) {
    const today = new Date().toLocaleDateString();
    const playData = { date: today, count: count };
    try {
        localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(playData));
    } catch (e) {
        console.error("Local Storage'a yazılamadı.");
    }
}

function incrementPlayCount() {
    const today = new Date().toLocaleDateString();
    let playData = localStorage.getItem(DAILY_LIMIT_KEY);
    let playCount = 0;
    if (playData) {
         try {
            playData = JSON.parse(playData);
            if (playData.date === today) {
                playCount = playData.count;
            }
        } catch(e) {/* Hata varsa 0 kalır */}
    }
    updateDailyLimit(playCount + 1);
}

//-------------------------------------------------
// Oyun Kurulumu ve Boyutlandırma
//-------------------------------------------------
function resizeCanvas() {
    // Konteyner genişliğini al, max 400px
    const containerWidth = document.getElementById('game-container').clientWidth - 30; // padding'i çıkar
    canvasWidth = Math.min(containerWidth, 380); // Max genişlik sınırı

    // Yüksekliği genişliğe göre ayarla (örneğin 4:3 oran)
    canvasHeight = canvasWidth * 1.5; // Yüksekliği artırabiliriz
    if (window.innerHeight < canvasHeight + 200) { // Ekran yüksekliğine sığdır
         canvasHeight = window.innerHeight - 200;
         canvasWidth = canvasHeight / 1.5;
    }


    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    laneWidth = canvasWidth / laneCount;

    // Oyuncu ve nesne boyutlarını güncelle
    playerCar.width = canvasWidth * playerCarWidthRatio;
    playerCar.height = canvasWidth * playerCarHeightRatio; // Genişliğe oranla yükseklik
    playerCar.x = laneWidth + (laneWidth / 2) - (playerCar.width / 2); // Orta şeritte başla
    playerCar.y = canvasHeight - playerCar.height - 15; // Altta başla

    // Mobil kontrol butonlarının stilini ayarla
    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window);
    mobileControls.style.display = isMobile ? 'flex' : 'none';
}

//-------------------------------------------------
// Çizim Fonksiyonları
//-------------------------------------------------
function drawPlayer() {
    if (playerCar.loaded) {
        ctx.drawImage(playerCar.image, playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    } else {
        // Resim yüklenemezse fallback olarak dikdörtgen çiz
        ctx.fillStyle = 'blue';
        ctx.fillRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    }
}

function drawObstacles() {
    ctx.font = `${canvasWidth * obstacleHeightRatio * 0.9}px sans-serif`; // Emoji boyutunu ayarla
    ctx.textAlign = 'center';
    obstacles.forEach(obstacle => {
         // Emoji çizimi (metin olarak)
        ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height * 0.8);
        // // Alternatif: Dikdörtgen çizimi
        // ctx.fillStyle = 'red';
        // ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
}

function drawBonuses() {
    bonuses.forEach(bonus => {
        if (bonusImageLoaded) {
            ctx.drawImage(bonusImage, bonus.x, bonus.y, bonus.width, bonus.height);
        } else {
            // Fallback: Yıldız veya daire
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            // Basit bir daire çizelim
            ctx.arc(bonus.x + bonus.width / 2, bonus.y + bonus.height / 2, bonus.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Hareket eden yol çizgileri
let roadLineOffset = 0;
const roadLineHeight = 30;
const roadLineGap = 40;
function drawRoadLines() {
    ctx.strokeStyle = '#a0a0a0'; // Çizgi rengi
    ctx.lineWidth = 4;
    ctx.setLineDash([roadLineHeight, roadLineGap]); // Kesik çizgi ayarı

    roadLineOffset += gameSpeed / 2; // Hıza bağlı kaydırma
    if (roadLineOffset > (roadLineHeight + roadLineGap)) {
        roadLineOffset = 0;
    }

    for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, -roadLineGap + roadLineOffset); // Yukarıdan başla
        ctx.lineTo(i * laneWidth, canvasHeight + roadLineHeight + roadLineOffset); // Aşağıya kadar çiz
        ctx.stroke();
    }
     // Çizgi desenini sıfırla
    ctx.setLineDash([]);
}


//-------------------------------------------------
// Hareket ve Kontrol Fonksiyonları
//-------------------------------------------------
function movePlayer(direction) {
    if (gameOver) return;
    let targetLane = playerCar.lane;
    if (direction === 'left' && playerCar.lane > 0) {
        targetLane--;
    } else if (direction === 'right' && playerCar.lane < laneCount - 1) {
        targetLane++;
    }

    if (targetLane !== playerCar.lane) {
        playerCar.lane = targetLane;
        // Yumuşak geçiş yerine anında geçiş yapalım şimdilik
        playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
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

// Mobil Buton Kontrolleri
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeftPressed = true; }, { passive: false });
leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); moveLeftPressed = false; });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveRightPressed = true; }, { passive: false });
rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); moveRightPressed = false; });

// Mouse eventleri de ekleyelim (masaüstünde test için)
leftBtn.addEventListener('mousedown', () => { moveLeftPressed = true; });
leftBtn.addEventListener('mouseup', () => { moveLeftPressed = false; });
leftBtn.addEventListener('mouseleave', () => { moveLeftPressed = false; }); // Butondan çıkarsa dur
rightBtn.addEventListener('mousedown', () => { moveRightPressed = true; });
rightBtn.addEventListener('mouseup', () => { moveRightPressed = false; });
rightBtn.addEventListener('mouseleave', () => { moveRightPressed = false; });


function handleMobileMovement() {
     if (moveLeftPressed) {
         // Sürekli basılı tutunca hareket yerine tek dokunuşta şerit değiştirsin
         // movePlayer('left'); // Bunu kullanırsak hızlı olur, tek seferlik tetikleme daha iyi
         // Şimdilik klavye gibi tek basışta hareket edecek,
         // eğer basılı tutunca sürekli hareket istenirse farklı bir mantık gerekir.
         // Bu basit oyunda şerit değiştirme daha mantıklı.
         // Klavye event listener zaten tek basışı handle ediyor.
         // Butonlara dokunulduğunda direkt movePlayer çağrılabilir.
         // Ancak touchstart sürekli tetiklenebilir, bu yüzden dikkatli olmalı.
         // En iyisi touchstart içinde movePlayer'ı çağırmak.
         // Tekrar eden hareketi engellemek için küçük bir bekleme eklenebilir ama şimdilik basit tutalım.

         // YENİ YAKLAŞIM: Touchstart içinde direkt movePlayer çağır.
         // Yukarıdaki event listener'ları güncelleyelim:
         // leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer('left'); }, { passive: false });
         // rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer('right'); }, { passive: false });
         // Mousedown için de aynısı
         // leftBtn.addEventListener('mousedown', () => { movePlayer('left'); });
         // rightBtn.addEventListener('mousedown', () => { movePlayer('right'); });
         // NOT: Bu, butona her dokunulduğunda şerit değiştirmeye çalışır.
         // Eğer kullanıcı parmağını kaldırmazsa sorun olabilir.
         // İlk yaklaşıma geri dönelim - basılı tutma state'i ile kontrol.
          playerCar.x -= playerCar.speed; // Bu yaklaşım şerit dışına taşır, KULLANMA!
                                      // Şerit değiştirme mantığı en doğrusu.
                                      // Event listener'ları touchstart'ta movePlayer yapacak şekilde güncelleyelim.
     }
     if (moveRightPressed) {
          playerCar.x += playerCar.speed; // KULLANMA!
     }
     // Şerit sınırlarını kontrol etme burada gereksiz, movePlayer hallediyor.
}
// Event listener güncellemesi:
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('left'); }, { passive: false });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (!gameOver && gameRunning) movePlayer('right'); }, { passive: false });
leftBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('left'); });
rightBtn.addEventListener('mousedown', () => { if (!gameOver && gameRunning) movePlayer('right'); });


//-------------------------------------------------
// Nesne Oluşturma (Spawn)
//-------------------------------------------------
function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount); // Rastgele şerit (0, 1, 2)
    const width = canvasWidth * obstacleWidthRatio;
    const height = canvasWidth * obstacleHeightRatio; // Genişliğe oranlı yükseklik
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    const y = -height; // Ekranın üstünden başla
    const emoji = obstacleEmojis[Math.floor(Math.random() * obstacleEmojis.length)];

    obstacles.push({ x, y, width, height, emoji });
}

function spawnBonus() {
     // Bonusların daha zor konumlanması:
     // Engellerden hemen sonra aynı şeritte veya dar alanlarda çıkabilir.
     // Şimdilik basit rastgele şerit kullanalım, zorluk artınca konumu ayarlarız.
    const lane = Math.floor(Math.random() * laneCount);
    const width = canvasWidth * bonusWidthRatio;
    const height = canvasWidth * bonusHeightRatio;
    const x = (lane * laneWidth) + (laneWidth / 2) - (width / 2);
    const y = -height * 2; // Engellerden biraz daha yukarıdan

     // Zorluk: Bazen bir engelle aynı anda farklı şeritte spawn olabilir.
     // Veya bir engelin hemen arkasına denk gelecek şekilde ayarlanabilir.
     // Şimdilik sadece rastgele şerit.

    bonuses.push({ x, y, width, height });
}


//-------------------------------------------------
// Güncelleme ve Çarpışma Kontrolü
//-------------------------------------------------
function updateObstacles() {
    let passedObstacleCount = 0;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += gameSpeed;
        // Ekran dışına çıkan engelleri sil ve skor artır
        if (obstacles[i].y > canvasHeight) {
            obstacles.splice(i, 1);
            if (!gameOver) {
                score++; // Çarpılmadan geçen her engel için +1 puan
                scoreElement.textContent = `Skor: ${score}`;
            }
            passedObstacleCount++;
        }
    }
    // return passedObstacleCount; // Bu bilgi zorluk için kullanılabilir
}

function updateBonuses() {
    for (let i = bonuses.length - 1; i >= 0; i--) {
        bonuses[i].y += gameSpeed * 0.8; // Bonuslar biraz daha yavaş olabilir
        // Ekran dışına çıkan bonusları sil
        if (bonuses[i].y > canvasHeight) {
            bonuses.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Engellerle Çarpışma
    obstacles.forEach((obstacle, index) => {
        if (
            playerCar.x < obstacle.x + obstacle.width &&
            playerCar.x + playerCar.width > obstacle.x &&
            playerCar.y < obstacle.y + obstacle.height * 0.8 && // Çarpışma hissini iyileştir
            playerCar.y + playerCar.height > obstacle.y + obstacle.height * 0.2
        ) {
            obstacles.splice(index, 1); // Çarpılan engeli kaldır
            lives--;
            updateLivesDisplay();
            if (lives <= 0) {
                endGame();
            }
            // Küçük bir görsel efekt (ekran titremesi vb.) eklenebilir
            canvas.style.borderColor = 'red';
            setTimeout(() => { canvas.style.borderColor = '#333'; }, 100);
        }
    });

    // Bonuslarla Çarpışma
    bonuses.forEach((bonus, index) => {
         if (
            playerCar.x < bonus.x + bonus.width &&
            playerCar.x + playerCar.width > bonus.x &&
            playerCar.y < bonus.y + bonus.height &&
            playerCar.y + playerCar.height > bonus.y
        ) {
            bonuses.splice(index, 1); // Toplanan bonusu kaldır
            score += 5; // Bonus puanı
            scoreElement.textContent = `Skor: ${score}`;
            // Bonus toplama efekti eklenebilir
         }
    });
}

function updateLivesDisplay() {
    livesElement.textContent = `Can: ${'❤️'.repeat(Math.max(0, lives))}`;
}

//-------------------------------------------------
// Zorluk Ayarlama
//-------------------------------------------------
function updateDifficulty() {
    // İlk 50 puan daha kontrollü zorluk
    if (score < 50 && frameCount > 0) { // frameCount > 0 başlangıçta hemen artmasın diye
        // Başlangıç zorluğu (çok kolay olmasın)
        gameSpeed = baseSpeed + (score * 0.02); // Skora göre hafif hız artışı
        obstacleSpawnRate = Math.max(45, baseSpawnRate - Math.floor(score / 5)); // Skora göre hafif sıklaşma
    }
    // 50 puandan sonra sert artış
    else if (score >= 50) {
        // Her `difficultyIncreaseInterval` frame'de bir zorluğu artır
        if (frameCount % difficultyIncreaseInterval === 0) {
             // Hızı daha agresif artır
            gameSpeed += speedIncrement + (score / 500); // Skor arttıkça artış da artsın
            // Spawn oranını daha agresif azalt (minimum 30 frame)
            obstacleSpawnRate = Math.max(30, obstacleSpawnRate - (spawnRateDecrement + Math.floor(score / 100)));
            console.log(`Zorluk Arttı! Hız: ${gameSpeed.toFixed(2)}, Spawn Rate: ${obstacleSpawnRate.toFixed(0)}`);
        }
         // Bonus çıkma sıklığı da azalabilir veya konumları zorlaşabilir
         // bonusSpawnRate'i de skora göre azaltabiliriz.
         if (frameCount % 1500 === 0) { // Daha seyrek kontrol
             bonusSpawnRate = Math.max(400, 800 - score); // Skor arttıkça bonus sıklaşsın ama min 400 frame
         }
    }
}

//-------------------------------------------------
// Ödül Kontrolü
//-------------------------------------------------
function checkRewards(finalScore) {
    for (const tier of rewardTiers) {
        if (finalScore >= tier.score) {
            return tier.message; // En yüksek uygun ödülü döndür
        }
    }
    return "Bu seferlik ödül kazanamadınız. Tekrar deneyin!"; // Hiçbir barem geçilemediyse
}


//-------------------------------------------------
// Oyun Döngüsü
//-------------------------------------------------
function gameLoop() {
    if (gameOver) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Yol çizgilerini çiz
    drawRoadLines();

    // Nesneleri güncelle ve çiz
    updateObstacles();
    updateBonuses();
    drawObstacles();
    drawBonuses();

    // Oyuncuyu çiz
    drawPlayer();

    // Çarpışmaları kontrol et
    checkCollisions();

    // Zorluğu güncelle (eğer oyun bitmediyse)
    if (!gameOver) {
      updateDifficulty();
    }


    // Yeni nesneleri spawn et
    frameCount++;
    if (frameCount % Math.floor(obstacleSpawnRate) === 0) {
        spawnObstacle();
    }
    if (frameCount % Math.floor(bonusSpawnRate) === 0) {
        // Bonus nadirliği
        if (Math.random() < 0.4) { // %40 ihtimalle bonus spawn et
             spawnBonus();
        }
    }

    // Döngüyü tekrar çağır
    animationFrameId = requestAnimationFrame(gameLoop);
}

//-------------------------------------------------
// Oyun Durumu Yönetimi
//-------------------------------------------------
function startGame() {
    if (!checkDailyLimit()) {
        // Limit doluysa başlatma
        // Mesaj zaten checkDailyLimit içinde gösterildi.
        // Belki bir butonu disable edebiliriz ama şimdilik gerek yok.
        return;
    }

    // Oyun değişkenlerini sıfırla
    score = 0;
    lives = 3;
    gameSpeed = baseSpeed; // Zorluğu sıfırla
    obstacleSpawnRate = baseSpawnRate; // Zorluğu sıfırla
    bonusSpawnRate = 800; // Zorluğu sıfırla
    obstacles = [];
    bonuses = [];
    frameCount = 0;
    gameOver = false;
    gameRunning = true; // Oyunu başlat
    moveLeftPressed = false; // Buton state'lerini sıfırla
    moveRightPressed = false;

    scoreElement.textContent = `Skor: ${score}`;
    updateLivesDisplay();
    gameOverScreen.style.display = 'none'; // Oyun bitti ekranını gizle
    stopConfetti(); // Varsa konfetiyi durdur

    // Canvas boyutunu ayarla (özellikle ilk çalıştırmada önemli)
    resizeCanvas();
     // Oyuncu pozisyonunu sıfırla
    playerCar.lane = 1;
    playerCar.x = (playerCar.lane * laneWidth) + (laneWidth / 2) - (playerCar.width / 2);
    playerCar.y = canvasHeight - playerCar.height - 15;

    // Mevcut animasyon döngüsünü durdur (varsa)
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    // Yeni oyun döngüsünü başlat
    gameLoop();
}

function endGame() {
    if (gameOver) return; // Zaten bittiyse tekrar bitirme
    gameOver = true;
    gameRunning = false;
    cancelAnimationFrame(animationFrameId); // Oyun döngüsünü durdur
    incrementPlayCount(); // Oyun sayacını artır

    // Son skoru ve ödül mesajını göster
    finalScoreElement.textContent = `Skorun: ${score}`;
    const reward = checkRewards(score);
    rewardMessageElement.textContent = reward;

    if (reward.includes("Kazandınız")) { // Eğer bir ödül kazanıldıysa
        emailInstructionElement.innerHTML = `Ödülünü almak için oyun sonu ekranının görüntüsünü <a href="mailto:${REWARD_EMAIL}?subject=Tiktak Oyun Ödülü - Skor: ${score}" style="color: #007bff;">${REWARD_EMAIL}</a> adresine gönder.<br>Ödülün 20 dakika içerisinde iletilecektir!`;
        startConfetti(); // Konfetiyi başlat
    } else {
        emailInstructionElement.textContent = "Daha yüksek skorla tekrar dene!";
        stopConfetti();
    }

    gameOverScreen.style.display = 'flex'; // Oyun bitti ekranını göster
}

// Yeniden başlatma butonu
restartBtn.addEventListener('click', () => {
    // Yeniden başlatmadan önce limiti tekrar kontrol et!
    if (checkDailyLimit()) {
         startGame();
    } else {
        // Limit doluysa sadece ekranı kapatabilir veya mesaj gösterebilir
        // Şimdilik sadece başlatmayı engelliyoruz.
    }
});

//-------------------------------------------------
// Konfeti Fonksiyonları (Basit)
//-------------------------------------------------
let confettiInterval;

function createConfettiPiece() {
    const piece = document.createElement('div');
    piece.classList.add('confetti');
    piece.style.left = `${Math.random() * 100}%`;
    // Başlangıç pozisyonunu biraz yukarı alalım
    piece.style.top = `${-10 - Math.random() * 20}px`;
    const colors = ['#ff4d4d', '#fcca4d', '#36a4e0', '#4caf50', '#e91e63', '#ffffff'];
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
     // Düşüş animasyonunu rastgele geciktirme
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2 + Math.random() * 2}s`; // Farklı hızlar
    confettiContainer.appendChild(piece);

    // Parçacık animasyon bitince DOM'dan kaldır
    piece.addEventListener('animationend', () => {
        piece.remove();
    });
     // Veya belirli bir süre sonra kaldır
     setTimeout(() => {
         if (piece) piece.remove();
     }, 4000); // 4 saniye sonra temizle
}

function startConfetti() {
    stopConfetti(); // Öncekini durdur
    confettiContainer.innerHTML = ''; // Temizle
    // Belirli aralıklarla yeni konfeti parçacıkları oluştur
    confettiInterval = setInterval(createConfettiPiece, 100); // Her 100ms'de bir
     // Bir süre sonra konfetiyi durdur (örneğin 5 saniye)
     setTimeout(stopConfetti, 5000);
}

function stopConfetti() {
    clearInterval(confettiInterval);
     // Kalan konfetileri de temizleyebiliriz ama animasyonla kaybolmaları daha iyi
     // setTimeout(() => { confettiContainer.innerHTML = ''; }, 4000);
}


//-------------------------------------------------
// Başlangıç
//-------------------------------------------------
// Ekran boyutuna göre canvas'ı ayarla ve oyunu başlatmaya hazır hale getir
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    resizeCanvas(); // İlk yüklemede boyutlandır
    // Oyunu hemen başlatmak yerine bir "Başlat" butonu eklemek daha iyi olabilir
    // Şimdilik direkt başlatıyoruz (limit kontrolü yapıldıktan sonra)
    messageArea.textContent = "Oyuna başlamak için YENİDEN BAŞLAT butonuna tıklayın veya klavyeyi kullanın.";
    // Veya direkt başlat:
     // if (checkDailyLimit()) {
     //     startGame();
     // }
     // Şimdilik başlatmayalım, kullanıcı restart ile başlatsın
     gameRunning = false; // Oyun başlangıçta çalışmıyor
     gameOver = true; // Oyun başlangıçta bitmiş gibi davranıp restart beklesin
     finalScoreElement.textContent = "";
     rewardMessageElement.textContent = "Hazırsan Başla!";
     emailInstructionElement.textContent = "";
     gameOverScreen.style.display = 'flex'; // Başlangıçta bilgi ekranını göster
     stopConfetti();
});

// Klavye ile oyunu başlatma (ilk hareket)
// Sadece oyun bitti ekranındayken ilk tuş basımında başlatsın
document.addEventListener('keydown', (e) => {
    if(gameOver && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')) {
         if (checkDailyLimit()) {
             startGame();
         }
    }
}, { once: true }); // Sadece bir kere tetiklensin diye, ama bu riskli olabilir, kaldıralım


// Restart butonu zaten startGame'i çağırıyor.
