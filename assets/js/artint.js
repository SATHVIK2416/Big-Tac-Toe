// ========================================
// Big Tac Toe - AI Game Logic
// ========================================

// Game State
let currentPlayer = 'X';
const ultimateGrid = Array(9).fill(null).map(() => Array(9).fill(null));
const miniGridStatus = Array(9).fill(null);
let activeMiniGrid = -1;
let gameOver = false;
let aiDifficulty = 'medium';

// AI Settings by difficulty
const AI_SETTINGS = {
    easy: { simulations: 50, randomness: 0.4 },
    medium: { simulations: 150, randomness: 0.15 },
    hard: { simulations: 400, randomness: 0.05 }
};

// Winning combinations
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Score tracking
let scores = {
    X: parseInt(localStorage.getItem('ai-score-x')) || 0,
    O: parseInt(localStorage.getItem('ai-score-o')) || 0,
    draws: parseInt(localStorage.getItem('ai-score-draws')) || 0
};

// ========================================
// Initialization
// ========================================

function initGame() {
    updateScoreDisplay();
    setupCellListeners();
    setupDifficultyButtons();
    updateGridHighlight();
    updateTurnDisplay();
}

function setupCellListeners() {
    document.querySelectorAll('.mini-grid div').forEach((cell, index) => {
        const miniGridIndex = Math.floor(index / 9);
        const cellIndex = index % 9;
        cell.dataset.index = `${miniGridIndex}-${cellIndex}`;
        cell.addEventListener('click', handleCellClick);
        cell.classList.add('empty');
    });
}

function setupDifficultyButtons() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            aiDifficulty = btn.dataset.difficulty;
        });
    });
}

// ========================================
// Human Player Move
// ========================================

function handleCellClick(event) {
    if (gameOver || currentPlayer !== 'X') return;

    const cell = event.target;
    const [miniGridIndex, cellIndex] = cell.dataset.index.split('-').map(Number);

    if (!isValidMove(miniGridIndex, cellIndex)) return;

    makeMove(miniGridIndex, cellIndex, currentPlayer);
    
    if (checkMiniGridWin(miniGridIndex)) {
        setMiniGridWinner(miniGridIndex, currentPlayer);
    } else if (isMiniGridFull(miniGridIndex)) {
        setMiniGridDraw(miniGridIndex);
    }

    const gameWinner = checkGameWinner();
    if (gameWinner) {
        endGame(gameWinner);
        return;
    }

    if (isGameDraw()) {
        endGame('draw');
        return;
    }

    currentPlayer = 'O';
    setNextActiveMiniGrid(cellIndex);
    updateGridHighlight();
    updateTurnDisplay();

    // AI's turn
    showAIThinking(true);
    setTimeout(() => makeAIMove(), 600);
}

// ========================================
// AI Move Logic
// ========================================

function makeAIMove() {
    if (gameOver) return;

    const settings = AI_SETTINGS[aiDifficulty];
    const validMoves = getValidMoves();

    if (validMoves.length === 0) return;

    let bestMove;

    // Random move chance based on difficulty
    if (Math.random() < settings.randomness) {
        bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
        bestMove = findBestMove(settings.simulations);
    }

    const [miniGridIndex, cellIndex] = bestMove;
    makeMove(miniGridIndex, cellIndex, currentPlayer);

    if (checkMiniGridWin(miniGridIndex)) {
        setMiniGridWinner(miniGridIndex, currentPlayer);
    } else if (isMiniGridFull(miniGridIndex)) {
        setMiniGridDraw(miniGridIndex);
    }

    showAIThinking(false);

    const gameWinner = checkGameWinner();
    if (gameWinner) {
        endGame(gameWinner);
        return;
    }

    if (isGameDraw()) {
        endGame('draw');
        return;
    }

    currentPlayer = 'X';
    setNextActiveMiniGrid(cellIndex);
    updateGridHighlight();
    updateTurnDisplay();
}

// Monte Carlo Tree Search for best move
function findBestMove(simulations) {
    const validMoves = getValidMoves();
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    const scores = new Array(validMoves.length).fill(0);

    // Check for immediate wins or blocks
    for (let i = 0; i < validMoves.length; i++) {
        const [mg, c] = validMoves[i];
        
        // Check if AI can win this mini-grid
        const testGrid = [...ultimateGrid[mg]];
        testGrid[c] = 'O';
        if (checkWinner(testGrid)) {
            // Check if winning this mini-grid wins the game
            const testMiniStatus = [...miniGridStatus];
            testMiniStatus[mg] = 'O';
            if (checkWinnerArray(testMiniStatus, 'O')) {
                return validMoves[i]; // Winning move!
            }
            scores[i] += 500; // High priority
        }

        // Check if player could win here
        testGrid[c] = 'X';
        if (checkWinner(testGrid)) {
            scores[i] += 300; // Block priority
        }
    }

    // Run simulations
    for (let i = 0; i < validMoves.length; i++) {
        for (let j = 0; j < simulations; j++) {
            const result = simulateGame(validMoves[i]);
            if (result === 'O') scores[i] += 3;
            else if (result === 'draw') scores[i] += 1;
        }
    }

    // Strategic bonuses
    for (let i = 0; i < validMoves.length; i++) {
        const [mg, c] = validMoves[i];
        
        // Prefer center cells
        if (c === 4) scores[i] += 50;
        
        // Prefer corners
        if ([0, 2, 6, 8].includes(c)) scores[i] += 25;
        
        // Prefer center mini-grid
        if (mg === 4 && !miniGridStatus[4]) scores[i] += 30;
        
        // Avoid sending opponent to a free mini-grid they could win
        const nextMiniGrid = miniGridStatus[c] ? -1 : c;
        if (nextMiniGrid !== -1) {
            const oppWinChance = countWinningMoves(ultimateGrid[nextMiniGrid], 'X');
            scores[i] -= oppWinChance * 20;
        }
    }

    const bestIndex = scores.indexOf(Math.max(...scores));
    return validMoves[bestIndex];
}

function countWinningMoves(grid, player) {
    let count = 0;
    for (let i = 0; i < 9; i++) {
        if (!grid[i]) {
            const testGrid = [...grid];
            testGrid[i] = player;
            if (checkWinner(testGrid)) count++;
        }
    }
    return count;
}

function simulateGame(initialMove) {
    // Clone state
    const simGrid = ultimateGrid.map(g => [...g]);
    const simStatus = [...miniGridStatus];
    let simActive = activeMiniGrid;
    let simPlayer = 'O';

    // Make initial move
    const [mg, c] = initialMove;
    simGrid[mg][c] = simPlayer;
    if (checkWinner(simGrid[mg])) {
        simStatus[mg] = simPlayer;
    } else if (simGrid[mg].every(cell => cell !== null)) {
        simStatus[mg] = 'draw';
    }

    if (checkWinnerArray(simStatus, simPlayer)) return simPlayer;
    if (simStatus.every(s => s !== null)) return 'draw';

    simActive = simStatus[c] ? -1 : c;
    simPlayer = 'X';

    // Random playout
    let moves = 0;
    while (moves < 81) {
        const validMoves = getValidMovesForSim(simGrid, simStatus, simActive);
        if (validMoves.length === 0) break;

        const [mgIdx, cIdx] = validMoves[Math.floor(Math.random() * validMoves.length)];
        simGrid[mgIdx][cIdx] = simPlayer;

        if (checkWinner(simGrid[mgIdx])) {
            simStatus[mgIdx] = simPlayer;
        } else if (simGrid[mgIdx].every(cell => cell !== null)) {
            simStatus[mgIdx] = 'draw';
        }

        if (checkWinnerArray(simStatus, simPlayer)) return simPlayer;
        if (simStatus.every(s => s !== null)) return 'draw';

        simActive = simStatus[cIdx] ? -1 : cIdx;
        simPlayer = simPlayer === 'X' ? 'O' : 'X';
        moves++;
    }

    return 'draw';
}

function getValidMovesForSim(grid, status, active) {
    const moves = [];
    const gridsToCheck = active === -1 ? 
        Array.from({length: 9}, (_, i) => i).filter(i => !status[i]) : 
        (status[active] ? Array.from({length: 9}, (_, i) => i).filter(i => !status[i]) : [active]);

    gridsToCheck.forEach(mgIdx => {
        for (let cIdx = 0; cIdx < 9; cIdx++) {
            if (!grid[mgIdx][cIdx]) moves.push([mgIdx, cIdx]);
        }
    });
    return moves;
}

// ========================================
// Game Logic Helpers
// ========================================

function isValidMove(miniGridIndex, cellIndex) {
    if (ultimateGrid[miniGridIndex][cellIndex]) return false;
    if (miniGridStatus[miniGridIndex]) return false;
    if (activeMiniGrid !== -1 && activeMiniGrid !== miniGridIndex) return false;
    return true;
}

function makeMove(miniGridIndex, cellIndex, player) {
    ultimateGrid[miniGridIndex][cellIndex] = player;
    const cell = document.querySelector(`[data-index="${miniGridIndex}-${cellIndex}"]`);
    cell.textContent = player;
    cell.classList.remove('empty');
    cell.classList.add('filled', player);
}

function getValidMoves() {
    const moves = [];
    const gridsToCheck = activeMiniGrid === -1 ? 
        Array.from({length: 9}, (_, i) => i).filter(i => !miniGridStatus[i]) : 
        [activeMiniGrid];

    gridsToCheck.forEach(mgIdx => {
        if (!miniGridStatus[mgIdx]) {
            for (let cIdx = 0; cIdx < 9; cIdx++) {
                if (!ultimateGrid[mgIdx][cIdx]) moves.push([mgIdx, cIdx]);
            }
        }
    });
    return moves;
}

function checkWinner(grid) {
    return WINNING_COMBINATIONS.some(combo =>
        combo.every(i => grid[i] && grid[i] === grid[combo[0]] && grid[i] !== 'draw')
    );
}

function checkWinnerArray(arr, player) {
    return WINNING_COMBINATIONS.some(combo =>
        combo.every(i => arr[i] === player)
    );
}

function checkMiniGridWin(miniGridIndex) {
    return checkWinner(ultimateGrid[miniGridIndex]);
}

function checkGameWinner() {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (miniGridStatus[a] && 
            miniGridStatus[a] !== 'draw' &&
            miniGridStatus[a] === miniGridStatus[b] && 
            miniGridStatus[a] === miniGridStatus[c]) {
            return miniGridStatus[a];
        }
    }
    return null;
}

function isMiniGridFull(miniGridIndex) {
    return ultimateGrid[miniGridIndex].every(cell => cell !== null);
}

function isGameDraw() {
    return miniGridStatus.every(s => s !== null) && !checkGameWinner();
}

function setMiniGridWinner(miniGridIndex, winner) {
    miniGridStatus[miniGridIndex] = winner;
    const el = document.querySelectorAll('.mini-grid')[miniGridIndex];
    el.classList.add(`won-${winner}`);
    el.setAttribute('data-winner', winner);
}

function setMiniGridDraw(miniGridIndex) {
    miniGridStatus[miniGridIndex] = 'draw';
    document.querySelectorAll('.mini-grid')[miniGridIndex].classList.add('draw');
}

function setNextActiveMiniGrid(cellIndex) {
    activeMiniGrid = miniGridStatus[cellIndex] ? -1 : cellIndex;
}

// ========================================
// UI Updates
// ========================================

function updateGridHighlight() {
    document.querySelectorAll('.mini-grid').forEach((grid, index) => {
        grid.classList.remove('active');
        if (!miniGridStatus[index] && (activeMiniGrid === -1 || activeMiniGrid === index)) {
            grid.classList.add('active');
        }
    });
}

function updateTurnDisplay() {
    const info = document.getElementById('info');
    if (currentPlayer === 'X') {
        info.textContent = 'Your turn';
        info.className = 'turn-X';
    } else {
        info.textContent = 'AI thinking...';
        info.className = 'turn-O';
    }
}

function updateScoreDisplay() {
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
    document.getElementById('score-draws').textContent = scores.draws;
}

function showAIThinking(show) {
    document.getElementById('ai-thinking').classList.toggle('active', show);
}

function endGame(result) {
    gameOver = true;
    showAIThinking(false);
    
    const winnerLine = document.getElementById('winner-line');
    const overlay = document.getElementById('game-over-overlay');
    const title = document.getElementById('game-over-title');

    if (result === 'draw') {
        winnerLine.textContent = "It's a Draw!";
        winnerLine.className = 'draw';
        title.textContent = "It's a Draw!";
        title.className = 'game-over-title draw';
        scores.draws++;
        localStorage.setItem('ai-score-draws', scores.draws);
    } else if (result === 'X') {
        winnerLine.textContent = 'You Win!';
        winnerLine.className = 'winner-X';
        title.textContent = 'You Win! 🎉';
        title.className = 'game-over-title X';
        scores.X++;
        localStorage.setItem('ai-score-x', scores.X);
    } else {
        winnerLine.textContent = 'AI Wins!';
        winnerLine.className = 'winner-O';
        title.textContent = 'AI Wins!';
        title.className = 'game-over-title O';
        scores.O++;
        localStorage.setItem('ai-score-o', scores.O);
    }

    updateScoreDisplay();
    setTimeout(() => overlay.classList.add('active'), 500);
}

function resetGame() {
    currentPlayer = 'X';
    ultimateGrid.forEach(g => g.fill(null));
    miniGridStatus.fill(null);
    activeMiniGrid = -1;
    gameOver = false;

    document.querySelectorAll('.mini-grid div').forEach(cell => {
        cell.textContent = '';
        cell.className = 'empty';
    });

    document.querySelectorAll('.mini-grid').forEach(grid => {
        grid.className = 'mini-grid';
        grid.removeAttribute('data-winner');
    });

    document.getElementById('winner-line').textContent = '';
    document.getElementById('winner-line').className = '';
    document.getElementById('game-over-overlay').classList.remove('active');
    showAIThinking(false);

    updateGridHighlight();
    updateTurnDisplay();
}

// Start the game
initGame();
