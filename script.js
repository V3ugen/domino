// script.js - Главный игровой движок
let pool = [], playerTiles = [], board = [], botTiles = [];
let gameOver = false;
let playerTurn = true;
let pendingTileIdx = null; 

let currentLang = localStorage.getItem('domino_lang') || 'en';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('domino_lang', currentLang);
    applyLanguage();
    updateUI();
}

function applyLanguage() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = currentLang === 'en' ? 'RU' : 'EN';
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
}

function startWithCoinFlip() {
    applyLanguage();
    document.getElementById('coinModal').style.display = 'flex';
    document.getElementById('choiceModal').style.display = 'none';
    document.getElementById('coinVisual').textContent = '🪙';
    document.getElementById('coinVisual').style.transform = 'none';
    const btns = document.querySelectorAll('#coinModal .modal-buttons button');
    btns.forEach(b => b.disabled = false);
}

function chooseCoin(playerChoice) {
    const btns = document.querySelectorAll('#coinModal .modal-buttons button');
    btns.forEach(b => b.disabled = true);

    const coinVisual = document.getElementById('coinVisual');
    coinVisual.style.transform = 'rotateY(1080deg)';
    
    setTimeout(() => {
        const sides = ['Heads', 'Tails'];
        const flipResult = sides[Math.floor(Math.random() * 2)];
        
        if (flipResult === 'Heads') {
            coinVisual.textContent = currentLang === 'en' ? '🟡 (Heads)' : '🟡 (Орел)';
        } else {
            coinVisual.textContent = currentLang === 'en' ? '⚪ (Tails)' : '⚪ (Решка)';
        }
        coinVisual.style.transform = 'none';

        setTimeout(() => {
            document.getElementById('coinModal').style.display = 'none';
            buildDeck();

            if (playerChoice === flipResult) {
                playerTurn = true;
                logStatus(translations[currentLang].yourTurn);
            } else {
                playerTurn = false;
                logStatus(translations[currentLang].loseFlip);
                setTimeout(botTurn, 1000);
            }
        }, 1200);
    }, 600);
}

function buildDeck() {
    pool = []; playerTiles = []; botTiles = []; board = []; gameOver = false; pendingTileIdx = null;
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) { pool.push([i, j]); }
    }
    pool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 7; i++) {
        playerTiles.push(pool.pop());
        botTiles.push(pool.pop());
    }
    updateUI();
    document.getElementById('bazarBtn').disabled = false;
}

function initGame() {
    startWithCoinFlip();
}

function createTileDOM(tile, isPlayer, index) {
    const val1 = tile[0]; 
    const val2 = tile[1]; 
    const div = document.createElement('div');
    const isDouble = val1 === val2;
    div.className = `domino ${isDouble ? 'double' : ''}`;
    
    div.innerHTML = `
        <div class="half p${val1}">${dotsTemplate}</div>
        <div class="line"></div>
        <div class="half p${val2}">${dotsTemplate}</div>
    `;
    
    if (isPlayer && !gameOver) {
        div.onclick = () => tryPlayTile(index);
    }
    return div;
}

function updateUI() {
    const pHand = document.getElementById('playerHand');
    pHand.innerHTML = '';
    playerTiles.forEach((tile, idx) => pHand.appendChild(createTileDOM(tile, true, idx)));

    const bHand = document.getElementById('botHand');
    bHand.innerHTML = '';
    botTiles.forEach(() => {
        const el = document.createElement('div');
        el.className = 'bot-tile-hidden';
        bHand.appendChild(el);
    });
    document.getElementById('botCount').textContent = botTiles.length;

    const boardZone = document.getElementById('board');
    boardZone.innerHTML = '';
    
    board.forEach((tile, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'board-tile-wrapper';
        
        if (idx === 0 && board.length > 1) {
            const label = document.createElement('span');
            label.className = 'edge-label';
            label.textContent = translations[currentLang].left;
            wrapper.appendChild(label);
        }
        if (idx === board.length - 1 && board.length > 0) {
            const label = document.createElement('span');
            label.className = 'edge-label';
            label.style.backgroundColor = '#28a745';
            label.textContent = board.length === 1 ? translations[currentLang].start : translations[currentLang].right;
            wrapper.appendChild(label);
        }

        const tileDOM = createTileDOM(tile, false, null);
        wrapper.appendChild(tileDOM);
        boardZone.appendChild(wrapper);
    });

    const bazarCountEl = document.getElementById('bazarCount');
    if (bazarCountEl) bazarCountEl.textContent = pool.length;
    
    const bazarBtn = document.getElementById('bazarBtn');
    if (bazarBtn) bazarBtn.disabled = (pool.length === 0 || !playerTurn || gameOver);
}

function logStatus(msg) { document.getElementById('status').textContent = msg; }

function getOpenEnds() {
    if (board.length === 0) return null;
    return { 
        left: board[0][0], 
        right: board[board.length - 1][1] 
    };
}

function tryPlayTile(idx) {
    if (gameOver || !playerTurn) return;
    const tile = playerTiles[idx];
    const ends = getOpenEnds();

    if (!ends) {
        playerTiles.splice(idx, 1);
        board.push(tile);
        endTurn();
        return;
    }

    const canRightDirect = (tile[0] === ends.right);
    const canRightReverse = (tile[1] === ends.right);
    const canLeftDirect = (tile[1] === ends.left);
    const canLeftReverse = (tile[0] === ends.left);

    const matchesRight = canRightDirect || canRightReverse;
    const matchesLeft = canLeftDirect || canLeftReverse;

    if (matchesLeft && matchesRight) {
        pendingTileIdx = idx;
        document.getElementById('choiceModal').style.display = 'flex';
        applyLanguage();
        return;
    }

    if (canRightDirect) {
        playerTiles.splice(idx, 1);
        board.push(tile);
        endTurn();
    } else if (canRightReverse) {
        playerTiles.splice(idx, 1);
        board.push([tile[1], tile[0]]);
        endTurn();
    } else if (canLeftDirect) {
        playerTiles.splice(idx, 1);
        board.unshift(tile);
        endTurn();
    } else if (canLeftReverse) {
        playerTiles.splice(idx, 1);
        board.unshift([tile[1], tile[0]]);
        endTurn();
    } else {
        alert(translations[currentLang].notMatch);
    }
}

function playToSelectedSide(side) {
    if (pendingTileIdx === null) return;
    const tile = playerTiles[pendingTileIdx];
    const ends = getOpenEnds();
    document.getElementById('choiceModal').style.display = 'none';

    playerTiles.splice(pendingTileIdx, 1);
    pendingTileIdx = null;

    if (side === 'right') {
        if (tile[0] === ends.right) board.push(tile);
        else board.push([tile[1], tile[0]]);
    } else {
        if (tile[1] === ends.left) board.unshift(tile);
        else board.unshift([tile[1], tile[0]]);
    }
    endTurn();
}

function endTurn() {
    updateUI();
    if (checkWin()) return;
    
    playerTurn = false;
    logStatus(translations[currentLang].botThinking);
    setTimeout(botTurn, 800);
}

function botTurn() {
    if (gameOver) return;
    const ends = getOpenEnds();
    
    if (!ends) {
        const tile = botTiles.pop();
        board.push(tile);
        updateUI();
        playerTurn = true;
        logStatus(translations[currentLang].yourTurn);
        return;
    }
    
    let matchIdx = -1;
    let sidePlayed = '';
    let finalTileForm = [];

    for (let i = 0; i < botTiles.length; i++) {
        const t = botTiles[i];
        if (t[0] === ends.right) { matchIdx = i; sidePlayed = 'right'; finalTileForm = t; break; }
        if (t[1] === ends.right) { matchIdx = i; sidePlayed = 'right'; finalTileForm = [t[1], t[0]]; break; }
        if (t[1] === ends.left)  { matchIdx = i; sidePlayed = 'left'; finalTileForm = t; break; }
        if (t[0] === ends.left)  { matchIdx = i; sidePlayed = 'left'; finalTileForm = [t[1], t[0]]; break; }
    }

    if (matchIdx !== -1) {
        botTiles.splice(matchIdx, 1);
        if (sidePlayed === 'right') board.push(finalTileForm);
        else board.unshift(finalTileForm);
        
        updateUI();
        if (checkWin()) return;
        playerTurn = true;
        logStatus(translations[currentLang].yourTurn);
    } else {
        if (pool.length > 0) {
            botTiles.push(pool.pop());
            updateUI();
            setTimeout(botTurn, 600);
        } else {
            playerTurn = true;
            logStatus(translations[currentLang].botSkipped);
        }
    }
}

function takeFromBazar() {
    if (gameOver || pool.length === 0 || !playerTurn) return;
    playerTiles.push(pool.pop());
    updateUI();
}

function checkWin() {
    if (playerTiles.length === 0) {
        logStatus(translations[currentLang].victory);
        gameOver = true;
        return true;
    }
    if (botTiles.length === 0) {
        logStatus(translations[currentLang].defeat);
        gameOver = true;
        return true;
    }
    return false;
}

window.onload = initGame;
