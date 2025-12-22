const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRID_SIZE = 20; // Cells
const TILE_COUNT = 24; // 24x24 grid
// We will recalculate canvas pixels based on container size, but logical grid is fixed.

// Colors

const COLORS = {
    snakeHead: '#FF6B9D',
    snakeBody: '#FF9A9E',
    snakeBorder: '#FFFFFF',
    food: '#18dcff',      // Normal (Vibrant Blue)
    foodStar: '#FFC312',  // Bonus (Gold)
    poison: '#a29bfe'     // Shrink (Purple Bubble)
};



// State
let gameLoop;
let lastRenderTime = 0;
let snakeSpeed = 6; // Moves per second (Start)
let score = 0;
let highScore = localStorage.getItem('jellySnakeBest') || 0;
let combo = 0;
let comboTimer = null;
let isPaused = false;
let isGameOver = false;
let selectedLevel = 3; // Default

// Timer
let timeLeft = 60;
let timerInterval = null;

// Settings
let settings = {
    sound: true,
    wall: false, // false = die on wall, true = wrap
};

// Game Objects
let snake = [];
let direction = { x: 0, y: 0 };
let inputDirection = { x: 0, y: 0 }; // Buffer for next frame
let food = { x: 5, y: 5, type: 'normal' }; // type: normal, star, bubble

// Init
function init() {
    updateBestDisplay();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inputs
    window.addEventListener('keydown', handleKeyInput);

    // Touch Inputs (Swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    const gameArea = document.getElementById('game-screen');

    gameArea.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: false });

    gameArea.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, { passive: false });

    // 카카오 광고 로드 (스크립트 로드 완료 후)
    loadIntroAds();
}

// 인트로 화면 광고 로드
function loadIntroAds() {
    // 스크립트가 아직 로드되지 않았으면 재시도
    if (typeof adfit === 'undefined') {
        setTimeout(loadIntroAds, 100);
        return;
    }
    // 인트로 화면의 모든 광고 로드
    document.querySelectorAll('#intro-screen .kakao_ad_area').forEach(ad => {
        const adUnit = ad.getAttribute('data-ad-unit');
        if (adUnit) {
            adfit.display(adUnit);
        }
    });
}

function updateBestDisplay() {
    document.getElementById('intro-best-score').textContent = highScore;
    document.getElementById('hud-best-score').textContent = highScore;
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    // Wrapper might be 0 if hidden, so check.
    let size = wrapper.clientWidth;
    if (!size || size === 0) {
        // Fallback: try to get computed style or default
        size = Math.min(window.innerWidth - 40, 500);
    }
    canvas.width = size;
    canvas.height = size;
}

// -- Game Control -- //

function selectLevel(lvl) {
    selectedLevel = lvl;
    // Update UI
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.level) === lvl) {
            btn.classList.add('selected');
        }
    });
}

function startGame() {
    // Map level to speed
    const speeds = [3, 5, 7, 10, 15];
    snakeSpeed = speeds[selectedLevel - 1];

    // Switch Screens: Active Game Screen
    document.getElementById('intro-screen').classList.remove('active');

    // Ensure Game Over screen is hidden AND inactive
    const goScreen = document.getElementById('game-over-screen');
    goScreen.classList.add('hidden');
    goScreen.classList.remove('active');

    document.getElementById('game-screen').classList.add('active');

    // Reset Game State
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    direction = { x: 0, y: -1 };
    inputDirection = { x: 0, y: -1 };
    score = 0;
    combo = 0;
    isPaused = false;
    isGameOver = false;
    spawnFood();

    // Start Timer
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 30;
    document.getElementById('game-timer').textContent = timeLeft;
    startTimer();

    updateScoreUI();

    // Resize & Draw safely
    setTimeout(() => {
        resizeCanvas();
        draw();

        // Start Loop
        lastRenderTime = 0;
        requestAnimationFrame(mainLoop);
    }, 50);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused && !isGameOver) {
            timeLeft--;
            document.getElementById('game-timer').textContent = timeLeft;

            // Time Low Effect?
            if (timeLeft <= 10) {
                document.getElementById('game-timer').style.color = '#ff6b6b';
            } else {
                document.getElementById('game-timer').style.color = ''; // Reset
            }

            if (timeLeft <= 0) {
                gameOver('시간 종료! ⏰');
            }
        }
    }, 1000);
}

function quitGame() {
    isGameOver = true;
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('intro-screen').classList.add('active');
}

function toggleSettings() {
    const pn = document.getElementById('settings-panel');
    pn.classList.toggle('hidden');
}

function toggleSound() {
    settings.sound = !settings.sound;
    const btn = document.getElementById('btn-sound');
    btn.textContent = settings.sound ? 'ON' : 'OFF';
    btn.className = `toggle-btn ${settings.sound ? 'on' : 'off'}`;
}

function toggleWall() {
    settings.wall = !settings.wall;
    const btn = document.getElementById('btn-wall');
    btn.textContent = settings.wall ? 'ON' : 'OFF';
    btn.className = `toggle-btn ${settings.wall ? 'on' : 'off'}`;
}

function togglePause() {
    console.log("snake build v2", Date.now());
    isPaused = !isPaused;
    const btn = document.querySelector('.pause-btn');
    btn.textContent = isPaused ? '▶️' : '⏸️';
}

function restartGame() {
    const goScreen = document.getElementById('game-over-screen');
    goScreen.classList.add('hidden');
    goScreen.classList.remove('active');

    startGame();
}

function goToHome() {
    if (timerInterval) clearInterval(timerInterval);
    isGameOver = true;

    document.getElementById('game-screen').classList.remove('active');

    const goScreen = document.getElementById('game-over-screen');
    goScreen.classList.add('hidden');
    goScreen.classList.remove('active');

    document.getElementById('intro-screen').classList.add('active');
}

// -- Main Loop -- //

function mainLoop(currentTime) {
    if (isGameOver) return;

    window.requestAnimationFrame(mainLoop);

    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    if (secondsSinceLastRender < 1 / snakeSpeed) return;

    lastRenderTime = currentTime;

    if (!isPaused) {
        update();
        draw();
    }
}

function update() {
    // Apply buffered direction
    direction = inputDirection;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        if (settings.wall) {
            // Wrap logic
            if (head.x < 0) head.x = TILE_COUNT - 1;
            else if (head.x >= TILE_COUNT) head.x = 0;
            if (head.y < 0) head.y = TILE_COUNT - 1;
            else if (head.y >= TILE_COUNT) head.y = 0;
        } else {
            return gameOver('벽에 쿵! 별들이 핑 돌아요💫');
        }
    }

    // Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return gameOver('내 꼬리를 물어버렸어요😱');
    }

    snake.unshift(head); // Add new head

    // Food Collision
    if (head.x === food.x && head.y === food.y) {
        handleEarFood();
    } else {
        snake.pop(); // Remove tail if not eating
    }
}

function handleEarFood() {
    // Score logic
    let points = 10;
    if (food.type === 'star') points = 30;

    // Combo Bonus
    combo++;
    if (combo > 1) {
        points += (combo * 5);
        showComboUI();
    }
    resetComboTimer();

    score += points;
    updateScoreUI();
    spawnFood();
}

function showComboUI() {
    const el = document.getElementById('combo-display');
    document.getElementById('combo-count').textContent = combo;

    el.classList.remove('hidden'); // Ensure visible
    el.classList.remove('show');
    void el.offsetWidth; // Trigger Reflow
    el.classList.add('show');

    // Auto hide after animation
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
        el.classList.remove('show');
        el.classList.add('hidden');
    }, 800);
}

function resetComboTimer() {
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
        combo = 0;
        const el = document.getElementById('combo-display');
        el.classList.remove('show');
        el.classList.add('hidden');
    }, 4000);
}

function spawnFood() {
    // Prevent spawning on snake
    let newFood;
    let valid = false;
    while (!valid) {
        newFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT),
            type: Math.random() > 0.8 ? 'star' : 'normal' // 20% chance for star
        };

        valid = !snake.some(s => s.x === newFood.x && s.y === newFood.y);
    }
    food = newFood;
}

function gameOver(msg) {
    isGameOver = true;

    // Stop Timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Save High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('jellySnakeBest', highScore);
        document.getElementById('final-score').textContent = score + " (NEW!🏆)";
        updateBestDisplay(); // Refresh UI instantly
    } else {
        document.getElementById('final-score').textContent = score;
    }

    document.getElementById('final-best-score').textContent = highScore;
    document.getElementById('result-message').textContent = msg || '게임 오버!';

    // Show Overlay: Force Visibility
    const goScreen = document.getElementById('game-over-screen');
    goScreen.classList.remove('hidden');
    goScreen.classList.add('active');
    goScreen.style.display = 'flex'; // Nuclear option

    // 게임오버 화면 광고 로드
    loadGameOverAd();
}

function loadGameOverAd() {
    // 카카오 AdFit 광고 다시 로드
    const adContainer = document.querySelector('.gameover-ad');
    if (adContainer && window.adfit) {
        // 기존 광고 초기화
        adContainer.innerHTML = '<ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-ZUtEWIJRDcHkQ4SQ" data-ad-width="320" data-ad-height="50"></ins>';
        // 광고 다시 로드
        adfit.display('DAN-ZUtEWIJRDcHkQ4SQ');
    }
}

function updateScoreUI() {
    document.getElementById('current-score').textContent = score;
}

// -- Rendering -- //

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tileSize = canvas.width / TILE_COUNT;

    // Draw Snake
    snake.forEach((segment, index) => {
        const isHead = index === 0;

        ctx.fillStyle = isHead ? COLORS.snakeHead : COLORS.snakeBody;

        // Make it round
        const px = segment.x * tileSize;
        const py = segment.y * tileSize;
        const size = tileSize - 2; // Gaps
        const radius = size / 2;

        // Round Rect manually or act as circles
        drawRoundedRect(ctx, px + 1, py + 1, size, size, 8);

        // Draw Face on Head
        if (isHead) {
            ctx.fillStyle = 'white';
            const eyeOffset = size / 4;
            // Eyes based on direction? For simplicity, just two dots
            ctx.beginPath();
            ctx.arc(px + size / 3, py + size / 3, 2, 0, Math.PI * 2); // Left Eye
            ctx.arc(px + size - size / 3, py + size / 3, 2, 0, Math.PI * 2); // Right Eye
            ctx.fill();
        }
    });

    // Draw Food
    const fx = food.x * tileSize + tileSize / 2;
    const fy = food.y * tileSize + tileSize / 2;
    const fRadius = (tileSize / 2) - 2;

    ctx.beginPath();
    ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
    ctx.fillStyle = food.type === 'star' ? COLORS.foodStar : COLORS.food;

    // Glow effect for Star
    if (food.type === 'star') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "white";
    }

    ctx.fill();

    // Reset Shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // If star, add sparkle? (simple text for now)
    if (food.type === 'star') {
        ctx.fillStyle = 'white';
        ctx.font = `${tileSize / 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', fx, fy);
    }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// -- Inputs -- //

function handleKeyInput(e) {
    switch (e.key) {
        case 'ArrowUp':
            if (direction.y !== 0) break;
            inputDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (direction.y !== 0) break;
            inputDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (direction.x !== 0) break;
            inputDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x !== 0) break;
            inputDirection = { x: 1, y: 0 };
            break;
        case ' ': // Space to Pause
            togglePause();
            break;
    }
}

// For D-Pad clicks
window.handleBtn = function (dir) {
    switch (dir) {
        case 'up':
            if (direction.y !== 0) break;
            inputDirection = { x: 0, y: -1 };
            break;
        case 'down':
            if (direction.y !== 0) break;
            inputDirection = { x: 0, y: 1 };
            break;
        case 'left':
            if (direction.x !== 0) break;
            inputDirection = { x: -1, y: 0 };
            break;
        case 'right':
            if (direction.x !== 0) break;
            inputDirection = { x: 1, y: 0 };
            break;
    }
};

window.handleTouchBtn = function (dir, e) {
    e.preventDefault(); // Stop double-firing (touch+click)
    handleBtn(dir);
};

function handleSwipe(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;

    // Threshold
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return; // Tap

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal
        if (diffX > 0) handleBtn('right');
        else handleBtn('left');
    } else {
        // Vertical
        if (diffY > 0) handleBtn('down');
        else handleBtn('up');
    }
}

// Share Game with Image
window.shareGame = async function () {
    const shareBtn = document.querySelector('.btn-outline');
    const originalText = shareBtn.textContent;

    try {
        // 캔버스로 결과 이미지 생성
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = 1200;
        imageCanvas.height = 630;
        const ctx = imageCanvas.getContext('2d');

        // 배경 그라디언트
        const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
        gradient.addColorStop(0, '#FFE5EC');
        gradient.addColorStop(1, '#FFF5F7');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 630);

        // 뱀 이모지
        ctx.font = '120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐍', 600, 180);

        // 게임 타이틀
        ctx.fillStyle = '#FF6B9D';
        ctx.font = 'bold 60px Arial';
        ctx.fillText('젤리뱀 별사탕 줍줍', 600, 280);

        // 점수
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 100px Arial';
        ctx.fillText(`${score}점`, 600, 420);

        // 최고기록 표시
        if (score >= highScore && score > 0) {
            ctx.fillStyle = '#FFC312';
            ctx.font = 'bold 40px Arial';
            ctx.fillText('🏆 NEW RECORD! 🏆', 600, 500);
        }

        // 사이트 URL
        ctx.fillStyle = '#7F8C8D';
        ctx.font = '30px Arial';
        ctx.fillText('moahub.co.kr', 600, 580);

        // 이미지를 Blob으로 변환
        const blob = await new Promise(resolve => imageCanvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'jelly-snake-score.png', { type: 'image/png' });

        // Web Share API 지원 확인
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            // 사파리 체크 (Safari는 url과 files를 같이 공유 가능)
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            try {
                if (isSafari) {
                    // Safari: 이미지 + URL 같이 공유
                    await navigator.share({
                        files: [file],
                        url: window.location.href
                    });
                } else {
                    // Chrome 등: 이미지만 공유
                    await navigator.share({
                        files: [file]
                    });
                }
            } catch (err) {
                // 사용자가 공유 취소한 경우
                if (err.name !== 'AbortError') {
                    throw err;
                }
            }
        } else {
            // Web Share API 미지원 시 클립보드 복사
            const shareText = `젤리뱀 별사탕 줍줍에서 ${score}점 달성! 🐍⭐\n${window.location.href}`;
            await navigator.clipboard.writeText(shareText);
            shareBtn.textContent = '복사 완료! ✓';
            setTimeout(() => {
                shareBtn.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Share failed:', err);
        // 에러 시 클립보드 복사로 fallback
        const shareText = `젤리뱀 별사탕 줍줍에서 ${score}점 달성! 🐍⭐\n${window.location.href}`;
        try {
            await navigator.clipboard.writeText(shareText);
            shareBtn.textContent = '복사 완료! ✓';
            setTimeout(() => {
                shareBtn.textContent = originalText;
            }, 2000);
        } catch (clipErr) {
            alert('공유하기에 실패했습니다.');
        }
    }
};

// Start
init();
