// Game State
let currentPlayer = "X";
const ultimateGrid = Array(9).fill(null).map(() => Array(9).fill(null));
const miniGridStatus = Array(9).fill(null); // null, 'X', 'O', or 'draw'
let activeMiniGrid = -1;
let gameOver = false;

// Score tracking
let scores = {
    X: parseInt(localStorage.getItem('score-x')) || 0,
    O: parseInt(localStorage.getItem('score-o')) || 0,
    draws: parseInt(localStorage.getItem('score-draws')) || 0
};

// Winning combinations
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Initialize game
function initGame() {
    updateScoreDisplay();
    setupCellListeners();
    updateGridHighlight();
    updateTurnDisplay();
}

// Setup click listeners for all cells
function setupCellListeners() {
    document.querySelectorAll('.mini-grid div').forEach((cell, index) => {
        const miniGridIndex = Math.floor(index / 9);
        const cellIndex = index % 9;
        cell.dataset.index = `${miniGridIndex}-${cellIndex}`;
        cell.addEventListener('click', handleCellClick);
        cell.classList.add('empty');
    });
}

// Handle cell click
function handleCellClick(event) {
    if (gameOver) return;

    const cell = event.target;
    const [miniGridIndex, cellIndex] = cell.dataset.index.split('-').map(Number);

    // Validate move
    if (!isValidMove(miniGridIndex, cellIndex)) return;

    // Make the move
    makeMove(miniGridIndex, cellIndex, cell);

    // Check for mini-grid win
    if (checkWinner(ultimateGrid[miniGridIndex])) {
        setMiniGridWinner(miniGridIndex, currentPlayer);
    } else if (isMiniGridFull(miniGridIndex)) {
        setMiniGridDraw(miniGridIndex);
    }

    // Check for game win
    const gameWinner = checkGameWinner();
    if (gameWinner) {
        endGame(gameWinner);
        return;
    }

    // Check for game draw
    if (isGameDraw()) {
        endGame('draw');
        return;
    }

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

    // Set next active mini-grid
    setNextActiveMiniGrid(cellIndex);

    // Update displays
    updateGridHighlight();
    updateTurnDisplay();
}

// Check if move is valid
function isValidMove(miniGridIndex, cellIndex) {
    // Cell already filled
    if (ultimateGrid[miniGridIndex][cellIndex]) return false;

    // Mini-grid already won or drawn
    if (miniGridStatus[miniGridIndex]) return false;

    // Must play in active mini-grid (unless it's free play)
    if (activeMiniGrid !== -1 && activeMiniGrid !== miniGridIndex) return false;

    return true;
}

// Make a move
function makeMove(miniGridIndex, cellIndex, cell) {
    ultimateGrid[miniGridIndex][cellIndex] = currentPlayer;
    cell.textContent = currentPlayer;
    cell.classList.remove('empty');
    cell.classList.add('filled', currentPlayer);
}

// Check if a grid has a winner
function checkWinner(grid) {
    return WINNING_COMBINATIONS.some(combination =>
        combination.every(index => grid[index] && grid[index] === grid[combination[0]])
    );
}

// Check game winner (main grid)
function checkGameWinner() {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;
        if (miniGridStatus[a] && 
            miniGridStatus[a] !== 'draw' &&
            miniGridStatus[a] === miniGridStatus[b] && 
            miniGridStatus[a] === miniGridStatus[c]) {
            return miniGridStatus[a];
        }
    }
    return null;
}

// Check if mini-grid is full
function isMiniGridFull(miniGridIndex) {
    return ultimateGrid[miniGridIndex].every(cell => cell !== null);
}

// Check if game is a draw
function isGameDraw() {
    // All mini-grids must be decided
    if (!miniGridStatus.every(status => status !== null)) return false;

    // No winner possible
    return !checkGameWinner();
}

// Set mini-grid winner
function setMiniGridWinner(miniGridIndex, winner) {
    miniGridStatus[miniGridIndex] = winner;
    const miniGridElement = document.querySelectorAll('.mini-grid')[miniGridIndex];
    miniGridElement.classList.add(`won-${winner}`);
    miniGridElement.setAttribute('data-winner', winner);
}

// Set mini-grid as draw
function setMiniGridDraw(miniGridIndex) {
    miniGridStatus[miniGridIndex] = 'draw';
    const miniGridElement = document.querySelectorAll('.mini-grid')[miniGridIndex];
    miniGridElement.classList.add('draw');
}

// Set next active mini-grid
function setNextActiveMiniGrid(cellIndex) {
    // If the target mini-grid is already won or full, free play
    if (miniGridStatus[cellIndex]) {
        activeMiniGrid = -1;
    } else {
        activeMiniGrid = cellIndex;
    }
}

// Update grid highlighting
function updateGridHighlight() {
    document.querySelectorAll('.mini-grid').forEach((grid, index) => {
        grid.classList.remove('active');
        
        // Highlight active grids (that aren't already won/drawn)
        if (!miniGridStatus[index]) {
            if (activeMiniGrid === -1 || activeMiniGrid === index) {
                grid.classList.add('active');
            }
        }
    });
}

// Update turn display
function updateTurnDisplay() {
    const infoElement = document.getElementById('info');
    infoElement.textContent = `Current turn: ${currentPlayer}`;
    infoElement.className = `turn-${currentPlayer}`;
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
    document.getElementById('score-draws').textContent = scores.draws;
}

// End game
function endGame(result) {
    gameOver = true;
    const winnerLine = document.getElementById('winner-line');
    const overlay = document.getElementById('game-over-overlay');
    const title = document.getElementById('game-over-title');

    if (result === 'draw') {
        winnerLine.textContent = "It's a Draw!";
        winnerLine.className = 'draw';
        title.textContent = "It's a Draw!";
        title.className = 'game-over-title draw';
        scores.draws++;
        localStorage.setItem('score-draws', scores.draws);
    } else {
        winnerLine.textContent = `Player ${result} Wins!`;
        winnerLine.className = `winner-${result}`;
        title.textContent = `Player ${result} Wins!`;
        title.className = `game-over-title ${result}`;
        scores[result]++;
        localStorage.setItem(`score-${result.toLowerCase()}`, scores[result]);
    }

    updateScoreDisplay();
    
    // Show overlay after a short delay
    setTimeout(() => {
        overlay.classList.add('active');
    }, 500);
}

// Reset game
function resetGame() {
    // Reset state
    currentPlayer = 'X';
    ultimateGrid.forEach(miniGrid => miniGrid.fill(null));
    miniGridStatus.fill(null);
    activeMiniGrid = -1;
    gameOver = false;

    // Reset UI
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

    updateGridHighlight();
    updateTurnDisplay();
}

// Initialize on load
initGame();
