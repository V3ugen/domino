// game.js (Часть 1 из 4) — Состояние игры, Локализация и Безопасные утилиты пасса
let pool = [], playerTiles = [], board = [], botTiles = [];
let gameOver = false;
let playerTurn = true;
let pendingTileIdx = null; 
let isFlipping = false; 
let lastPlacedTileId = null; 
let currentLang = localStorage.getItem('domino_lang') || 'en';

const translations = {
    en: {
        gameTitle: "Dominoes", modalTitle: "Coin Flip", modalDesc: "Choose your side to see who goes first:",
        headsBtn: "Heads", tailsBtn: "Tails", choiceTitle: "Select Side", choiceDesc: "This tile matches both ends. Where do you want to place it?",
        botTitle: "Opponent (Bot) Tiles:", playerTitle: "Your Tiles (Click to play):", marketBtn: "Market", passBtn: "Skip Turn", restartBtn: "Restart",
        left: "Left", right: "Right", start: "Start", coinFlipping: "Choosing first move...",
        headsResult: "🟡 (Heads)", tailsResult: "⚪ (Tails)", yourTurn: "Your turn!", botThinking: "Opponent is choosing a move...",
        winFlip: "You won the flip! Your turn first.", loseFlip: "You lost the flip. Opponent's turn first.",
        notMatch: "This tile doesn't match Left or Right ends!", botPassed: "Bot skipped a turn (no tiles in market)! Your turn.",
        playerPassed: "You skipped a turn (no moves)! Opponent's turn.", fishGame: "🐟 Blocked Game (Fish)!",
        winPoints: "You win by points", losePoints: "Bot wins by points", drawGame: "Draw game!",
        victory: "🎉 Victory! You win!", defeat: "❌ Defeat! Bot wins."
    },
    ru: {
        gameTitle: "Домино", modalTitle: "Бросок монеты", modalDesc: "Выберите сторону, чтобы узнать, кто ходит первым:",
        headsBtn: "Орел", tailsBtn: "Решка", choiceTitle: "Выбор стороны", choiceDesc: "Костяшка подходит к обоим краям. Куда её поставить?",
        botTitle: "Костяшки соперника (Бота):", playerTitle: "Ваши костяшки (Нажмите для хода):", marketBtn: "Базар", passBtn: "Пропустить ход", restartBtn: "Заново",
        left: "Лев", right: "Прав", start: "Старт", coinFlipping: "Ждём броска монетки...",
        headsResult: "🟡 (Орел)", tailsResult: "⚪ (Решка)", yourTurn: "Ваш ход!", botThinking: "Соперник выбирает ход...",
        winFlip: "Вы выиграли жребий! Ваш ход первый.", loseFlip: "Вы проиграли жребий. Ход противника.",
        notMatch: "Эта костяшка не подходит к свободным краям!", botPassed: "Бот пропустил ход (на базаре пусто)! Ваш ход.",
        playerPassed: "Вы пропустили ход (нет вариантов)! Ход бота.", fishGame: "🐟 Игра заблокирована (Рыба)!",
        winPoints: "Вы победили по очкам", losePoints: "Бот победил по очкам", drawGame: "Ничья!",
        victory: "🎉 Победа! Вы выиграли!", defeat: "❌ Поражение! Бот выиграл."
    }
};

function logStatus(msg) { 
    const statusBox = document.getElementById('status');
    if (statusBox) statusBox.textContent = msg; 
}

function generateDotsHTML(count) {
    let dots = '';
    for(let i = 0; i < count; i++) { dots += '<div class="dot"></div>'; }
    return dots;
}

function getOpenEnds() {
    if (board.length === 0) return null;
    const first = board[0]; const last = board[board.length - 1];
    return { 
        left: first.isFlipped ? first.tile[1] : first.tile[0], 
        right: last.isFlipped ? last.tile[0] : last.tile[1] 
    };
}

function checkPlayerPassRequirement() {
    const passBtn = document.getElementById('passBtn'); const bazarBtn = document.getElementById('bazarBtn');
    if (!passBtn || !bazarBtn) return;
    if (!playerTurn || gameOver) { passBtn.style.display = 'none'; return; }
    const ends = getOpenEnds();
    if (pool.length === 0 && ends) {
        const hasMove = playerTiles.some(t => t[0] === ends.left || t[1] === ends.left || t[0] === ends.right || t[1] === ends.right);
        if (!hasMove) { passBtn.style.display = 'block'; bazarBtn.style.display = 'none'; return; }
    }
    passBtn.style.display = 'none'; bazarBtn.style.display = 'block';
}
// game.js (Часть 2 из 4) — Генерация DOM-структур, Рендеринг и Адаптивный авто-зум
function createTileDOM(tile, isPlayer, index) {
    const val1 = tile[0]; 
    const val2 = tile[1]; 
    const div = document.createElement('div');
    const isDouble = val1 === val2;
    div.className = `domino ${isDouble ? 'double' : ''}`;
    
    div.innerHTML = `
        <div class="half p${val1}">${generateDotsHTML(val1)}</div>
        <div class="line"></div>
        <div class="half p${val2}">${generateDotsHTML(val2)}</div>
    `;
    if (isPlayer && !gameOver) { div.onclick = () => tryPlayTile(index); }
    return div;
}

function updateUI() {
    const pHand = document.getElementById('playerHand');
    if (pHand) {
        pHand.innerHTML = '';
        playerTiles.forEach((tile, idx) => pHand.appendChild(createTileDOM(tile, true, idx)));
    }

    const bHand = document.getElementById('botHand');
    if (bHand) {
        bHand.innerHTML = '';
        botTiles.forEach(() => {
            const el = document.createElement('div');
            el.className = 'bot-tile-hidden'; bHand.appendChild(el);
        });
    }
    if (document.getElementById('botCount')) document.getElementById('botCount').textContent = botTiles.length;

    const boardZone = document.getElementById('board');
    if (!boardZone) return;
    boardZone.innerHTML = '';
    
    let gridWrapper = document.getElementById('boardGridWrapper');
    if (!gridWrapper) {
        gridWrapper = document.createElement('div');
        gridWrapper.id = 'boardGridWrapper'; gridWrapper.className = 'board-grid-wrapper';
        boardZone.appendChild(gridWrapper);
    } else { gridWrapper.innerHTML = ''; }

    board.forEach((item, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'board-tile-wrapper';

        // ИСПРАВЛЕНО: Сборка ключа из подмассивов для точной подсветки любого последнего хода
        const tileKey = `${item.tile[0]}-${item.tile[1]}`;
        if (tileKey === lastPlacedTileId) { wrapper.classList.add('last-placed'); }

        const displayTile = item.isFlipped ? [item.tile[1], item.tile[0]] : item.tile;
        const tileDOM = createTileDOM(displayTile, false, null);
        wrapper.appendChild(tileDOM);

        if (idx === 0 && board.length > 1) {
            const label = document.createElement('span');
            label.className = 'edge-label'; label.textContent = translations[currentLang].left;
            wrapper.appendChild(label);
        }
        if (idx === board.length - 1 && board.length > 0) {
            const label = document.createElement('span');
            label.className = 'edge-label'; label.style.backgroundColor = '#28a745';
            label.textContent = board.length === 1 ? translations[currentLang].start : translations[currentLang].right;
            wrapper.appendChild(label);
        }
        gridWrapper.appendChild(wrapper);
    });

    setTimeout(() => {
        const zoneHeight = boardZone.clientHeight;
        const gridHeight = gridWrapper.scrollHeight;
        const zoneWidth = boardZone.clientWidth;
        const gridWidth = gridWrapper.scrollWidth;
        const scaleY = zoneHeight / (gridHeight + 35);
        const scaleX = zoneWidth / (gridWidth + 35);
        let finalScale = Math.min(scaleX, scaleY);
        if (finalScale > 1) finalScale = 1;
        gridWrapper.style.transform = `scale(${finalScale})`;
    }, 50);

    const bazarBtn = document.getElementById('bazarBtn');
    if (bazarBtn) {
        bazarBtn.innerHTML = `${translations[currentLang].marketBtn} (<span id="bazarCount">${pool.length}</span>)`;
        bazarBtn.disabled = (pool.length === 0 || gameOver);
    }
}
// game.js (Часть 3 из 4) — Создание колоды, математика пристыковки и ИИ бота
function buildDeck() {
    pool = []; playerTiles = []; board = []; botTiles = []; gameOver = false; pendingTileIdx = null;
    for (let i = 0; i <= 6; i++) { for (let j = i; j <= 6; j++) { pool.push([i, j]); } }
    pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 7; i++) { playerTiles.push(pool.pop()); botTiles.push(pool.pop()); }
    updateUI();
}

function tryPlayTile(idx) {
    if (gameOver || !playerTurn) return;
    const tile = playerTiles[idx]; const ends = getOpenEnds();
    if (!ends) { 
        playerTiles.splice(idx, 1); 
        lastPlacedTileId = `${tile[0]}-${tile[1]}`;
        board.push({ tile: tile, isFlipped: false }); 
        endTurn(); return; 
    }

    const matchesRight = (tile[0] === ends.right || tile[1] === ends.right);
    const matchesLeft = (tile[0] === ends.left || tile[1] === ends.left);

    if (matchesLeft && matchesRight) { pendingTileIdx = idx; document.getElementById('choiceModal').style.display = 'flex'; applyLanguage(); return; }

    if (matchesRight) {
        playerTiles.splice(idx, 1);
        lastPlacedTileId = `${tile[0]}-${tile[1]}`;
        board.push({ tile: tile, isFlipped: (tile[0] !== ends.right) }); endTurn();
    } else if (matchesLeft) {
        playerTiles.splice(idx, 1);
        lastPlacedTileId = `${tile[0]}-${tile[1]}`;
        board.unshift({ tile: tile, isFlipped: (tile[1] !== ends.left) }); endTurn();
    } else { alert(translations[currentLang].notMatch); }
}

function playToSelectedSide(side) {
    if (pendingTileIdx === null) return;
    const tile = playerTiles[pendingTileIdx]; const ends = getOpenEnds();
    document.getElementById('choiceModal').style.display = 'none';
    playerTiles.splice(pendingTileIdx, 1); pendingTileIdx = null;

    lastPlacedTileId = `${tile[0]}-${tile[1]}`;
    if (side === 'right') { board.push({ tile: tile, isFlipped: (tile[0] !== ends.right) }); } 
    else { board.unshift({ tile: tile, isFlipped: (tile[1] !== ends.left) }); }
    endTurn();
}

function endTurn() { updateUI(); if (checkWin()) return; playerTurn = false; logStatus(translations[currentLang].botThinking); setTimeout(botTurn, 800); }

function botTurn() {
    if (gameOver) return; const ends = getOpenEnds();
    if (!ends) {
        const tile = botTiles.pop();
        lastPlacedTileId = `${tile[0]}-${tile[1]}`;
        board.push({ tile: tile, isFlipped: false });
        updateUI(); playerTurn = true; logStatus(translations[currentLang].yourTurn); return;
    }
    let matchIdx = -1, sidePlayed = '', flip = false;
    for (let i = 0; i < botTiles.length; i++) {
        const t = botTiles[i];
        if (t[0] === ends.right || t[1] === ends.right) { matchIdx = i; sidePlayed = 'right'; flip = (t[0] !== ends.right); break; }
        if (t[0] === ends.left || t[1] === ends.left) { matchIdx = i; sidePlayed = 'left'; flip = (t[1] !== ends.left); break; }
    }
    if (matchIdx !== -1) {
        const tile = botTiles[matchIdx]; botTiles.splice(matchIdx, 1);
        lastPlacedTileId = `${tile[0]}-${tile[1]}`;
        if (sidePlayed === 'right') board.push({ tile: tile, isFlipped: flip });
        else board.unshift({ tile: tile, isFlipped: flip });
        updateUI(); if (checkWin()) return; playerTurn = true; logStatus(translations[currentLang].yourTurn);
    } else {
        if (pool.length > 0) { botTiles.push(pool.pop()); updateUI(); setTimeout(botTurn, 600); } 
        else { if (!checkFish()) { playerTurn = true; logStatus(translations[currentLang].botPassed); } }
    }
}
// game.js (Часть 4 из 4) — Переводы, Базар, Проверка «Рыбы» и Конец игры
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('domino_lang', currentLang);
    applyLanguage();
    updateUI();
}

function applyLanguage() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = currentLang === 'en' ? 'RU' : 'EN';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.id === 'status' && (board.length > 0 || gameOver)) return;
            el.textContent = translations[currentLang][key];
        }
    });
}

function startWithCoinFlip() {
    isFlipping = false;
    applyLanguage();
    document.getElementById('coinModal').style.display = 'flex';
    document.getElementById('choiceModal').style.display = 'none';
    const coinVisual = document.getElementById('coinVisual');
    if (coinVisual) {
        coinVisual.textContent = '🪙';
        coinVisual.style.transform = 'none';
    }
    const btns = document.querySelectorAll('#coinModal .modal-buttons button');
    btns.forEach(b => b.disabled = false);
    
    logStatus(translations[currentLang].coinFlipping);
}

function chooseCoin(playerChoice) {
    if (isFlipping) return; 
    isFlipping = true; 

    const btns = document.querySelectorAll('#coinModal .modal-buttons button');
    btns.forEach(b => b.disabled = true);
    const coinVisual = document.getElementById('coinVisual');
    if (coinVisual) coinVisual.style.transform = 'rotateY(1080deg)';
    
    setTimeout(() => {
        const sides = ['Heads', 'Tails'];
        const flipResult = sides[Math.floor(Math.random() * 2)];
        
        if (coinVisual) {
            if (flipResult === 'Heads') { coinVisual.textContent = translations[currentLang].headsResult; } 
            else { coinVisual.textContent = translations[currentLang].tailsResult; }
            coinVisual.style.transform = 'none';
        }
        
        setTimeout(() => {
            document.getElementById('coinModal').style.display = 'none';
            buildDeck();
            if (playerChoice === flipResult) {
                playerTurn = true;
                logStatus(translations[currentLang].yourTurn);
            } else {
                playerTurn = false;
                logStatus(translations[currentLang].botThinking);
                setTimeout(botTurn, 1000);
            }
        }, 1200);
    }, 600);
}

function restartGame() {
    const statusBox = document.getElementById('status');
    if (statusBox) statusBox.className = 'status-box';
    isFlipping = false;
    lastPlacedTileId = null; 
    startWithCoinFlip();
}

function takeFromBazar() {
    if (gameOver || pool.length === 0) return;
    if (!playerTurn) { alert(currentLang === 'en' ? "Wait for opponent's turn!" : "Ожидайте, сейчас ход противника!"); return; }
    playerTiles.push(pool.pop()); updateUI(); checkFish();
}

function playerPass() {
    if (gameOver || !playerTurn) return; logStatus(translations[currentLang].playerPassed);
    document.getElementById('passBtn').style.display = 'none'; document.getElementById('bazarBtn').style.display = 'block';
    endTurn();
}

function checkFish() {
    if (pool.length > 0) return false; const ends = getOpenEnds(); if (!ends) return false;
    const playerHasMove = playerTiles.some(t => t[0] === ends.left || t[1] === ends.left || t[0] === ends.right || t[1] === ends.right);
    const botHasMove = botTiles.some(t => t[0] === ends.left || t[1] === ends.left || t[0] === ends.right || t[1] === ends.right);
    if (!playerHasMove && !botHasMove) {
        gameOver = true; const playerPoints = playerTiles.reduce((sum, t) => sum + t[0] + t[1], 0); const botPoints = botTiles.reduce((sum, t) => sum + t[0] + t[1], 0);
        let resultMsg = translations[currentLang].fishGame;
        if (playerPoints < botPoints) { resultMsg += ` ${translations[currentLang].winPoints} (${playerPoints} vs ${botPoints})!`; } 
        else if (botPoints < playerPoints) { resultMsg += ` ${translations[currentLang].losePoints} (${botPoints} vs ${playerPoints}).`; } 
        else { resultMsg += ` ${translations[currentLang].drawGame}`; }
        logStatus(resultMsg); return true;
    }
    return false;
}

function checkWin() {
    const statusBox = document.getElementById('status');
    if (playerTiles.length === 0) {
        logStatus(translations[currentLang].victory); gameOver = true;
        if (statusBox) statusBox.className = 'status-box victory-animation';
        let duration = 3 * 1000; let end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) { requestAnimationFrame(frame); }
        }());
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); return true;
    }
    if (botTiles.length === 0) {
        logStatus(translations[currentLang].defeat); gameOver = true;
        if (statusBox) statusBox.className = 'status-box defeat-animation'; return true;
    }
    return checkFish();
}

window.onload = startWithCoinFlip;
