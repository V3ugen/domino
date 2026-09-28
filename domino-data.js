// domino-data.js - Переводы и разметка шаблонов
const translations = {
    en: {
        gameTitle: "Dominoes", modalTitle: "Coin Flip", modalDesc: "Choose your side to see who goes first:",
        choiceTitle: "Select Side", choiceDesc: "This tile matches both ends. Where do you want to place it?",
        headsBtn: "Heads", tailsBtn: "Tails", botTitle: "Opponent (Bot) Tiles:", playerTitle: "Your Tiles (Click to play):",
        marketBtn: "Market", restartBtn: "Restart", loading: "Game Loading...", left: "Left", right: "Right", start: "Start",
        winFlip: "🎉 You won the flip! Your turn first.", loseFlip: "❌ You lost the flip. Opponent's turn first.",
        botThinking: "Opponent is choosing a move...", yourTurn: "Your turn!", botSkipped: "Bot skipped a turn (no tiles in market)! Your turn.",
        notMatch: "This tile doesn't match Left or Right ends!", victory: "🎉 Victory! You win!", defeat: "❌ Defeat! Bot wins."
    },
    ru: {
        gameTitle: "Домино", modalTitle: "Бросок монеты", modalDesc: "Выберите сторону, чтобы узнать, кто ходит первым:",
        choiceTitle: "Выбор стороны", choiceDesc: "Костяшка подходит к обоим краям. Куда её поставить?",
        headsBtn: "Орел", tailsBtn: "Решка", botTitle: "Костяшки соперника (Бота):", playerTitle: "Ваши костяшки (Нажмите для хода):",
        marketBtn: "Базар", restartBtn: "Заново", loading: "Игра загружается...", left: "Лев", right: "Прав", start: "Старт",
        winFlip: "🎉 Вы выиграли жребий! Ваш ход первый.", loseFlip: "❌ Вы проиграли жребий. Ход противника.",
        botThinking: "Соперник выбирает ход...", yourTurn: "Ваш ход!", botSkipped: "Бот пропустил ход (на базаре пусто)! Ваш ход.",
        notMatch: "Эта костяшка не подходит к свободным краям!", victory: "🎉 Победа! Вы выиграли!", defeat: "❌ Поражение! Бот выиграл."
    }
};

const dotsTemplate = Array(9).fill('<div class="dot"></div>').join('');
