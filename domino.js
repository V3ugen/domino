let pool = [], playerTiles = [], botTiles = [], board = [];
let gameOver = false;

// 9-cell dots element layout grid shell template
const dotsTemplate = Array(9).fill('<div class="dot"></div>').join('');

function initGame() {
    pool = []; playerTiles = []; botTiles = []; board = []; gameOver = false;
    
    // Generating classic 28 tile chain pieces pool
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) { pool.push([i, j]); }
    }
    pool.sort(() => Math.random() - 0.5);

    // Initial Dealing
    for (let i = 0; i < 7; i++) {
        playerTiles.push(pool.pop());
        botTiles.push(pool.pop());
    }

    updateUI();
    logStatus("Your turn! Tap a tile matching the Left or Right ends.");
    document.getElementById('bazarBtn').disabled = false;
}

// Generate tile structure DOM elements with dot grid binding
function createTileDOM(val1, val2, isPlayer, index) {
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

// Render dynamic elements loops layout structures updates
function updateUI() {
    // Player hand layout execution loop
    const pHand = document.getElementById('playerHand');
    pHand.innerHTML = '';
    playerTiles.forEach((tile, idx) => pHand.appendChild(createTileDOM(tile[0], tile[1], true, idx)));

    // Opponent hidden deck shell rendering execution loop
    const bHand = document.getElementById('botHand');
    bHand.innerHTML = '';
    botTiles.forEach(() => {
        const el = document.createElement('div');
        el.className = 'bot-tile-hidden';
        bHand.appendChild(el);
    });
    document.getElementById('botCount').textContent = botTiles.length;
    document.getElementById('bazarCount').textContent = pool.length;

    // Center field chain stack table rendering loops
    const boardZone = document.getElementById('board');
    boardZone.innerHTML = '';
    
    board.forEach((tile, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'board-tile-wrapper';
        
        const tileDOM = createTileDOM(tile[0], tile[1], false, null);
        wrapper.appendChild(tileDOM);
        
        // Edge markers text node appends tracking anchors conditions logic
        if (idx === 0 && board.length > 1) {
            const label = document.createElement('span');
            label.className = 'edge-label';
            label.textContent = 'Left';
            wrapper.appendChild(label);
        }
        if (idx === board.length - 1 && board.length > 0) {
            const label = document.createElement('span');
            label.className = 'edge-label';
            label.style.backgroundColor = '#28a745';
            label.textContent = board.length === 1 ? 'Start' : 'Right';
            wrapper.appendChild(label);
        }
        
        boardZone.appendChild(wrapper);
    });
}

function logStatus(msg) { document.getElementById('status').textContent = msg; }

function getOpenEnds() {
    if (board.length === 0) return null;
    return { left: board[0][0], right: board[board.length - 1][1] };
}

function tryPlayTile(idx) {
    if (gameOver) return;
    const tile = playerTiles[idx];
    const ends = getOpenEnds();

    if (!ends) {
        playerTiles.splice(idx, 1);
        board.push(tile);
        endTurn();
        return;
    }

    // Play checking matching conditions matching side rules flow
    if (tile[0] === ends.right) {
        playerTiles.splice(idx, 1);
        board.push(tile);
        endTurn();
    } else if (tile[1] === ends.right) {
        playerTiles.splice(idx, 1);
        board.push([tile[1], tile[0]]);
        endTurn();
    } else if (tile[1] === ends.left) {
        playerTiles.splice(idx, 1);
        board.unshift(tile);
        endTurn();
    } else if (tile[0] === ends.left) {
        playerTiles.splice(idx, 1);
        board.unshift([tile[1], tile[0]]);
        endTurn();
    } else {
        alert("This tile doesn't match Left or Right ends!");
    }
}

function endTurn() {
    updateUI();
    if (checkWin()) return;
    
    logStatus("Opponent is choosing a move...");
    setTimeout(botTurn, 800);
}

function botTurn() {
    if (gameOver) return;
    const ends = getOpenEnds();
    
    let matchIdx = botTiles.findIndex(t => t[0] === ends.right || t[1] === ends.right || t[1] === ends.left || t[0] === ends.left);

    if (matchIdx !== -1) {
        const tile = botTiles[matchIdx];
        botTiles.splice(matchIdx, 1);
        
        if (tile[0] === ends.right) board.push(tile);
        else if (tile[1] === ends.right) board.push([tile[1], tile[0]]);
        else if (tile[1] === ends.left) board.unshift(tile);
        else if (tile[0] === ends.left) board.unshift([tile[1], tile[0]]);
        
        updateUI();
        if (checkWin()) return;
        logStatus("Your turn!");
    } else {
        if (pool.length > 0) {
            botTiles.push(pool.pop());
            updateUI();
            botTurn();
        } else {
            logStatus("Bot skipped a turn (no tiles in market)! Your turn.");
        }
    }
}

function takeFromBazar() {
    if (gameOver || pool.length === 0) return;
    playerTiles.push(pool.pop());
    updateUI();
    if (pool.length === 0) document.getElementById('bazarBtn').disabled = true;
}

function checkWin() {
    if (playerTiles.length === 0) {
        logStatus("🎉 Victory! You win!");
        gameOver = true;
        return true;
    }
    if (botTiles.length === 0) {
        logStatus("❌ Defeat! Bot wins.");
        gameOver = true;
        return true;
    }
    return false;
}

window.onload = initGame;
