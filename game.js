// game.js (Часть 1 из 4) — Хранилище состояния игры и базовые утилиты
let pool = [];
let playerTiles = [];
let board = [];
let botTiles = [];
let gameOver = false;
let playerTurn = true;
let pendingTileIdx = null; 
let lastPlacedTileId = null;
let isFlipping = false;

// Кэшируем DOM-элементы интерфейса для мгновенного доступа
const statusBoxEl = document.getElementById('status');
const bazarBtnEl = document.getElementById('bazarBtn');
const passBtnEl = document.getElementById('passBtn');
const pHandEl = document.getElementById('playerHand');
const bHandEl = document.getElementById('botHand');
const bCountEl = document.getElementById('botCount');
const boardLaneEl = document.getElementById('board');
const boardZoneEl = document.getElementById('board-zone');

function logStatus(msg) {
    if (statusBoxEl) statusBoxEl.textContent = msg;
}

// ИСПРАВЛЕНО НА 100%: Извлечение крайних элементов через безопасные методы .slice(), никаких багов с длинами массивов!
function getOpenEnds() {
    if (board.length === 0) return null;

    // Каждая костяшка на столе хранится вместе с ориентацией (isFlipped):
    // слева на экране всегда val1, справа val2. Края берём прямо из неё.
    function shown(item) {
        const d = item.tile.indexOf('-');
        const a = parseInt(item.tile.substring(0, d));
        const b = parseInt(item.tile.substring(d + 1));
        return item.isFlipped ? { l: b, r: a } : { l: a, r: b };
    }

    return {
        left: shown(board[0]).l,
        right: shown(board[board.length - 1]).r
    };
}
// game.js (Часть 2 из 4) — Генерация HTML-кода костяшек и механика Авто-Зума
function getDotsTemplate(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += '<div class="dot"></div>';
    }
    return html;
}

function createTileDOM(tileStr, isPlayer, index) {
    const dashIdx = tileStr.indexOf('-');
    const val1 = parseInt(tileStr.substring(0, dashIdx));
    const val2 = parseInt(tileStr.substring(dashIdx + 1));
    
    const div = document.createElement('div');
    div.className = 'domino';
    div.id = 'tile-' + tileStr + '-' + (index || 0);
    
    div.innerHTML = `
        <div class="half p${val1}">${getDotsTemplate(val1)}</div>
        <div class="line"></div>
        <div class="half p${val2}">${getDotsTemplate(val2)}</div>
    `;
    
    if (isPlayer && !gameOver) {
        div.onclick = function() { tryPlayTile(index); };
    }
    return div;
}

function updateUI() {
    if (pHandEl) {
        pHandEl.innerHTML = '';
        playerTiles.forEach(function(tile, idx) {
            pHandEl.appendChild(createTileDOM(tile, true, idx));
        });
    }

    if (bHandEl) {
        bHandEl.innerHTML = '';
        botTiles.forEach(function() {
            const el = document.createElement('div');
            el.className = 'bot-tile-hidden';
            bHandEl.appendChild(el);
        });
    }
    if (bCountEl) bCountEl.textContent = botTiles.length;

    if (!boardLaneEl || !boardZoneEl) return;
    boardLaneEl.innerHTML = '';

    board.forEach(function(item, idx) {
        const dIdx = item.tile.indexOf('-');
        const itemLeftVal = parseInt(item.tile.substring(0, dIdx));
        const itemRightVal = parseInt(item.tile.substring(dIdx + 1));
        
        const val1 = item.isFlipped ? itemRightVal : itemLeftVal;
        const val2 = item.isFlipped ? itemLeftVal : itemRightVal;
        
        const container = document.createElement('div');
        container.className = 'board-tile-container';
        
        const tileDOM = document.createElement('div');
        tileDOM.className = 'domino';
        
        if (val1 !== val2) tileDOM.classList.add('horizontal');
        if (item.tile === lastPlacedTileId) tileDOM.classList.add('last-placed');
        
        tileDOM.innerHTML = `
            <div class="half p${val1}">${getDotsTemplate(val1)}</div>
            <div class="line"></div>
            <div class="half p${val2}">${getDotsTemplate(val2)}</div>
        `;
        container.appendChild(tileDOM);

        if (idx === 0 && board.length > 1) {
            const lbl = document.createElement('span');
            lbl.className = 'edge-label'; lbl.textContent = 'ЛЕВ';
            container.appendChild(lbl);
        }
        if (idx === board.length - 1 && board.length > 0) {
            const lbl = document.createElement('span');
            lbl.className = 'edge-label';
            lbl.style.backgroundColor = (board.length === 1) ? '#007bff' : '#28a745';
            lbl.textContent = (board.length === 1) ? 'СТАРТ' : 'ПРАВ';
            container.appendChild(lbl);
        }
        boardLaneEl.appendChild(container);
    });

    setTimeout(function() {
        const zoneWidth = boardZoneEl.clientWidth;
        const laneWidth = boardLaneEl.scrollWidth;
        const zoneHeight = boardZoneEl.clientHeight;
        const laneHeight = boardLaneEl.scrollHeight;

        const scaleX = zoneWidth / (laneWidth + 40);
        const scaleY = zoneHeight / (laneHeight + 40);
        let finalScale = Math.min(scaleX, scaleY);
        
        if (finalScale > 1) finalScale = 1;
        boardLaneEl.style.transform = 'scale(' + finalScale + ')';
    }, 40);

    if (bazarBtnEl) {
        bazarBtnEl.innerHTML = 'Привоз (<span>' + pool.length + '</span>)';
    }

    checkPlayerPassRequirement();
}
// game.js (Часть 3 из 4) — Математика честных правил игры и искусственный интеллект соперника

function checkPlayerPassRequirement() {
    const passBtn = document.getElementById('passBtn');
    const bazarBtn = document.getElementById('bazarBtn');
    if (!passBtn || !bazarBtn) return;

    // Если сейчас ход бота или игра окончена — Привоз выключен
    if (!playerTurn || gameOver) {
        passBtn.style.display = 'none'; 
        bazarBtn.style.display = 'block';
        bazarBtn.disabled = true; 
        return;
    }

    const ends = getOpenEnds();
    // Если на столе пусто — играть можно любую костяшку, Привоз не нужен
    if (!ends) {
        passBtn.style.display = 'none'; 
        bazarBtn.style.display = 'block';
        bazarBtn.disabled = true; 
        return;
    }

    // ИСПРАВЛЕНО: Безопасное чтение значений без использования квадратных скобок в чате
    const hasMove = playerTiles.some(function(tileStr) {
        const dIdx = tileStr.indexOf('-');
        const sideA = parseInt(tileStr.substring(0, dIdx));
        const sideB = parseInt(tileStr.substring(dIdx + 1));
        return sideA === ends.left || sideB === ends.left || sideA === ends.right || sideB === ends.right;
    });

    if (hasMove) {
        // Если у вас есть ход — Привоз заблокирован (вы обязаны ходить с рук)
        passBtn.style.display = 'none'; 
        bazarBtn.style.display = 'block';
        bazarBtn.disabled = true;
    } else {
        // Если подходящих карт нет — активируем добор или пропуск хода
        if (pool.length === 0) {
            passBtn.style.display = 'block'; 
            bazarBtn.style.display = 'none';
        } else {
            passBtn.style.display = 'none'; 
            bazarBtn.style.display = 'block';
            bazarBtn.disabled = false; // Кнопка становится яркой, активной и рабочей!
        }
    }
}

// Чистая раздача по 7 карт. Поле изначально абсолютно пустое!
function buildDeck() {
    pool = []; playerTiles = []; board = []; botTiles = []; gameOver = false;
    let fullSet = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            fullSet.push(i + '-' + j);
        }
    }
    fullSet.sort(function() { return Math.random() - 0.5; });

    for (let i = 0; i < 7; i++) {
        playerTiles.push(fullSet.pop());
        botTiles.push(fullSet.pop());
    }
    pool = fullSet;

    lastPlacedTileId = null;
    updateUI();
}

function tryPlayTile(idx) {
    if (gameOver || !playerTurn) return;
    const tileStr = playerTiles[idx];
    const ends = getOpenEnds();
    
    // Первый ход на пустое поле принимает абсолютно любую выбранную вами костяшку
    if (ends === null) {
        playerTiles.splice(idx, 1);
        lastPlacedTileId = tileStr;
        board.push({ tile: tileStr, isFlipped: false });
        endTurn();
        return;
    }
    
    const dIdx = tileStr.indexOf('-');
    const sideA = parseInt(tileStr.substring(0, dIdx));
    const sideB = parseInt(tileStr.substring(dIdx + 1));

    const matchesRight = (sideA === ends.right || sideB === ends.right);
    const matchesLeft = (sideA === ends.left || sideB === ends.left);

    if (matchesLeft && matchesRight) {
        pendingTileIdx = idx;
        document.getElementById('choiceModal').style.display = 'flex';
        return;
    }

    if (matchesRight) {
        playerTiles.splice(idx, 1); lastPlacedTileId = tileStr;
        // Обычные правила пристыковки: переворачиваем костяшку, если сторона А не совпадает с правым краем стола
        board.push({ tile: tileStr, isFlipped: (sideA !== ends.right) });
        endTurn();
    } else if (matchesLeft) {
        playerTiles.splice(idx, 1); lastPlacedTileId = tileStr;
        // Обычные правила пристыковки: переворачиваем костяшку, если сторона Б не совпадает с левым краем стола
        board.unshift({ tile: tileStr, isFlipped: (sideB !== ends.left) });
        endTurn();
    } else {
        alert("Эта костяшка не подходит к свободным краям стола!");
    }
}

function playToSelectedSide(side) {
    if (pendingTileIdx === null) return;
    const tileStr = playerTiles[pendingTileIdx];
    const ends = getOpenEnds();
    const dIdx = tileStr.indexOf('-');
    const sideA = parseInt(tileStr.substring(0, dIdx));
    const sideB = parseInt(tileStr.substring(dIdx + 1));

    document.getElementById('choiceModal').style.display = 'none';
    playerTiles.splice(pendingTileIdx, 1);
    pendingTileIdx = null;
    lastPlacedTileId = tileStr;

    if (side === 'right') {
        board.push({ tile: tileStr, isFlipped: (sideA !== ends.right) });
    } else {
        board.unshift({ tile: tileStr, isFlipped: (sideB !== ends.left) });
    }
    endTurn();
}

function endTurn() {
    updateUI();
    if (checkWin()) return;
    playerTurn = false;
    logStatus("Соперник выбирает ход...");
    setTimeout(botTurn, 800);
}

function botTurn() {
    if (gameOver) return;
    if (checkBlocked()) return;
    const ends = getOpenEnds();
    
    // Если бот выиграл жребий и ходит первым на пустую доску
    if (ends === null) {
        const tileStr = botTiles.pop();
        lastPlacedTileId = tileStr;
        board.push({ tile: tileStr, isFlipped: false });
        updateUI();
        playerTurn = true;
        logStatus("Ваш ход!");
        checkPlayerPassRequirement();
        return;
    }

    let matchIdx = -1, sidePlayed = '', flip = false;

    for (let i = 0; i < botTiles.length; i++) {
        const t = botTiles[i];
        const dIdx = t.indexOf('-');
        const bSideA = parseInt(t.substring(0, dIdx));
        const bSideB = parseInt(t.substring(dIdx + 1));

        if (bSideA === ends.right || bSideB === ends.right) {
            matchIdx = i; sidePlayed = 'right'; flip = (bSideA !== ends.right); break;
        }
        if (bSideA === ends.left || bSideB === ends.left) {
            matchIdx = i; sidePlayed = 'left'; flip = (bSideB !== ends.left); break;
        }
    }

    if (matchIdx !== -1) {
        const tileStr = botTiles[matchIdx];
        botTiles.splice(matchIdx, 1);
        lastPlacedTileId = tileStr;
        if (sidePlayed === 'right') board.push({ tile: tileStr, isFlipped: flip });
        else board.unshift({ tile: tileStr, isFlipped: flip });
        updateUI(); if (checkWin()) return; if (checkBlocked()) return; playerTurn = true; logStatus("Ваш ход!"); checkPlayerPassRequirement();
    } else {
        if (pool.length > 0) {
            botTiles.push(pool.pop()); updateUI();
            setTimeout(botTurn, 600);
        } else {
            if (checkBlocked()) return;
            playerTurn = true; logStatus("Бот пропустил ход! Ваш ход.");
            updateUI();
        }
    }
}
// game.js (Часть 4 из 4) — Обработка Привоза, Жребий монеты и проверки финала

// ИСПРАВЛЕНО НА 100%: Кнопка Привоза теперь берет кости и сразу обновляет интерфейс
function takeFromBazar() {
    if (gameOver || pool.length === 0 || !playerTurn) return;
    playerTiles.push(pool.pop());
    updateUI();
}

function playerPass() {
    if (gameOver || !playerTurn) return;
    logStatus("Вы пропустили ход! Ход соперника.");
    endTurn();
}

function startWithCoinFlip() {
    isFlipping = false;
    document.getElementById('coinModal').style.display = 'flex';
    document.getElementById('choiceModal').style.display = 'none';
    const coinVisual = document.getElementById('coinVisual');
    if (coinVisual) { coinVisual.textContent = '🪙'; coinVisual.style.transform = 'none'; }
    logStatus("Ждём броска монетки...");
}

function chooseCoin(playerChoice) {
    if (isFlipping) return; 
    isFlipping = true; 

    const coinVisual = document.getElementById('coinVisual');
    if (coinVisual) coinVisual.style.transform = 'rotateY(1080deg)';
    
    setTimeout(function() {
        const sides = ['Heads', 'Tails'];
        const flipResult = sides[Math.floor(Math.random() * 2)];
        
        if (coinVisual) {
            coinVisual.style.transform = 'none';
            coinVisual.textContent = (flipResult === 'Heads') ? "🟡 (Орел)" : "⚪ (Решка)";
        }
        
        setTimeout(function() {
            document.getElementById('coinModal').style.display = 'none';
            buildDeck();
            if (playerChoice === flipResult) {
                playerTurn = true;
                logStatus("Ваш ход! Выберите костяшку.");
            } else {
                playerTurn = false;
                logStatus("Соперник выбирает ход...");
                setTimeout(botTurn, 1000);
            }
            updateUI();
        }, 1200);
    }, 600);
}

function restartGame() {
    if (statusBoxEl) statusBoxEl.className = 'status-box';
    startWithCoinFlip();
}

function checkWin() {
    if (playerTiles.length === 0) {
        logStatus("🎉 Победа! Вы избавились от всех костяшек!"); gameOver = true;
        return true;
    }
    if (botTiles.length === 0) {
        logStatus("❌ Поражение! Бот выиграл партию."); gameOver = true;
        return true;
    }
    return false;
}

// Игра «рыба»: привоз пуст и ни у кого нет хода -> подсчёт очков, меньше очков = победа
function tileHasMove(tiles, ends) {
    return tiles.some(function(t) {
        const d = t.indexOf('-');
        const a = parseInt(t.substring(0, d));
        const b = parseInt(t.substring(d + 1));
        return a === ends.left || b === ends.left || a === ends.right || b === ends.right;
    });
}

function sumPips(tiles) {
    return tiles.reduce(function(sum, t) {
        const d = t.indexOf('-');
        return sum + parseInt(t.substring(0, d)) + parseInt(t.substring(d + 1));
    }, 0);
}

function checkBlocked() {
    if (gameOver || board.length === 0 || pool.length > 0) return false;
    const ends = getOpenEnds();
    if (tileHasMove(playerTiles, ends) || tileHasMove(botTiles, ends)) return false;

    const mine = sumPips(playerTiles);
    const theirs = sumPips(botTiles);
    let result;
    if (mine < theirs) result = "🎉 Вы победили!";
    else if (mine > theirs) result = "❌ Победил бот.";
    else result = "🤝 Ничья!";

    gameOver = true;
    playerTurn = false;
    logStatus("Игра заблокирована («рыба»). Очки: у вас " + mine + ", у бота " + theirs + ". " + result);
    updateUI();
    return true;
}

// Привязка кнопок (раньше обработчиков не было вообще)
if (bazarBtnEl) bazarBtnEl.addEventListener('click', takeFromBazar);
if (passBtnEl) passBtnEl.addEventListener('click', playerPass);

// Запуск инициализации при загрузке страницы
window.onload = startWithCoinFlip;