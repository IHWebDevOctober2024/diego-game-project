const grid = document.getElementById('grid');
const menu = document.getElementById('menu');
const startButton = document.getElementById('startButton');
const playerBombs = [];
let playerCount = 0;

let gameStartTime; 
let explosionTime;


const gridWidth = 15;
const gridHeight = 15;

const countdownSound = new Audio('./Assets/Sounds/placebomb.mp3'); 
countdownSound.volume = 1,0;

const explosionSound = new Audio('./Assets/Sounds/20 Second Timer Bomb Countdown With Sound-[AudioTrimmer.com].mp3'); // Replace with your explosion sound file path
explosionSound.volume = 0.5; // Set the volume for the explosion sound


const gameMusic = new Audio('./Assets/sounds/Swarm PvE Game Mode OST  Early Game Music.mp3'); // Replace with your file path
gameMusic.volume = 0.5; // Set the volume
gameMusic.loop = true; 

// Player data
const playerData = [
    { id: 'player1', x: 1, y: 1, hasActiveBomb: false, bombCount: 0, health: 3 },
    { id: 'player2', x: gridWidth - 2, y: gridHeight - 2, hasActiveBomb: false, bombCount: 0, health: 3 },
];

function startGame() {
    menu.style.display = 'none'; 
    grid.style.display = 'grid'; 
    gridLayout = generateGrid(gridWidth, gridHeight, playerData); 
    createGrid(); 
    startGameTimer(); 
    gameStartTime = Date.now(); 
    explosionTime = Math.random() * (3000 - 1500) + 1500
    gameMusic.play();
}
startButton.addEventListener('click', startGame);

// Initialize grid layout after playerData is defined
let gridLayout = generateGrid(gridWidth, gridHeight, playerData);

function generateGrid(width, height, playerData) {
    const layout = [];
    
    // Get spawn locations from player data
    const spawnLocations = playerData.map(player => ({ x: player.x, y: player.y }));

    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            // Check if the current cell is an outer wall
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                row.push('O'); // Outer walls
            }
            // Check if the current cell is a spawn location
            else if (spawnLocations.some(loc => loc.x === x && loc.y === y)) {
                row.push('F'); // Free space at spawn location
            } 
            // Check if the current cell is adjacent to any player spawn location
            else if (spawnLocations.some(loc => {
                return (loc.x === x && loc.y === y) || // Same position
                       (loc.x === x && loc.y === y - 1) || // Above
                       (loc.x === x && loc.y === y + 1) || // Below
                       (loc.x === x - 1 && loc.y === y) || // Left
                       (loc.x === x + 1 && loc.y === y);   // Right
            })) {
                row.push('F'); // Free space adjacent to spawn location
            } 
            // Randomly place destructible walls or free spaces
            else if (Math.random() < 0.5) {
                row.push('D'); // Destructible walls
            } else {
                // Introduce indestructible walls at random positions
                row.push(Math.random() < 0.4 ? 'I' : 'F'); // Indestructible walls 10% of the time
            }
        }
        layout.push(row);
    }
    return layout;
}

// Create grid cells in the DOM
function createGrid() {
    grid.innerHTML = ''; // Clear any existing grid cells
    gridLayout.forEach((row, rowIndex) => {
        row.forEach((cellType, colIndex) => {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            switch (cellType) {
                case 'O': cell.classList.add('outer-wall'); break;
                case 'D': cell.classList.add('destructible'); break;
                case 'F': cell.classList.add('floor'); break;
                case 'I': cell.classList.add('indestructible'); break;
            }

            grid.appendChild(cell);
        });
    });

    // Create player elements and append them to the grid
    playerData.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player', `player${index + 1}`);
        grid.children[player.y * gridLayout[0].length + player.x].appendChild(playerElement);
    });
}

function startGameTimer() {
    const timerElement = document.getElementById('timer');
    let timeLeft = 120; 

    const timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Game Over! Time's up!");
        } else {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
            timeLeft--;
        }
    }, 1000);
}

function createBomb(playerIndex) {
    const player = playerData[playerIndex];
    const bombX = player.x;
    const bombY = player.y;

    // Check if the placement is valid
    if (['O', 'D'].includes(gridLayout[bombY][bombX]) || player.hasActiveBomb) {
        console.log(`Player ${playerIndex + 1}: You can't place a bomb here!`);
        return;
    }

    // Check elapsed time
    const elapsedTime = (Date.now() - gameStartTime) / 1000; // Get elapsed time in seconds

    // Allow bomb placement if less than 3 bombs are currently placed
    if (elapsedTime < 30 && player.bombCount >= 1) {
        console.log(`Player ${playerIndex + 1}: You can only place 1 bomb before 30 seconds!`);
        return;
    } else if (elapsedTime >= 30 && player.bombCount >= 3) {
        console.log(`Player ${playerIndex + 1}: You can only place up to 3 bombs!`);
        return;
    }

    player.hasActiveBomb = true;
    player.bombCount++; // Increment the player's bomb count

    const bomb = document.createElement('div');
    bomb.classList.add('bomb');
    const cell = grid.children[bombY * gridLayout[0].length + bombX];
    cell.appendChild(bomb);

    gridLayout[bombY][bombX] = 'B';
    playerBombs.push({ playerIndex, x: bombX, y: bombY, bomb });

    countdownSound.currentTime = 0; // Reset the sound to the start
    countdownSound.loop = true; // Set the sound to loop
    countdownSound.play();

    // Set explosion time based on elapsed time
    let explosionTime;
    if (elapsedTime >= 60) {
        explosionTime = 1000; // Set bomb explosion time to 1 second after 1 minute
    } else {
        explosionTime = Math.random() * (3000 - 1500) + 1500; // Random explosion time between 1.5s and 3s
    }

    setTimeout(() => {
        explodeBomb(playerIndex, bomb, bombX, bombY);
        countdownSound.pause(); // Stop the countdown sound when the bomb explodes
        countdownSound.currentTime = 0; // Reset the countdown sound
        player.bombCount--; // Decrement the bomb count when the bomb explodes
        player.hasActiveBomb = false; // Reset active bomb status
    }, explosionTime);
}

function explodeBomb(playerIndex, bomb, x, y) {
    console.log(`Player ${playerIndex + 1}'s bomb at (${x}, ${y}) exploded!`);

    explosionSound.currentTime = 0; // Reset the sound to the start
    explosionSound.play();

    // Register the explosion animation
    registerExplosionAnimation(x, y);

    // Create explosion radius element
    const explosionRadius = document.createElement('div');
    explosionRadius.classList.add('explosion-radius');
    grid.children[y * gridLayout[0].length + x].appendChild(explosionRadius);

    setTimeout(() => {
        removeBomb(bomb);
        playerData[playerIndex].hasActiveBomb = false;

        // Handle explosion effects on adjacent cells
        handleExplosionEffects(x, y);
    }, 500);
}

// Function to register explosion animation
function registerExplosionAnimation(x, y) {
    const explosionAnimation = document.createElement('div');
    explosionAnimation.classList.add('explosion-animation');
    grid.children[y * gridLayout[0].length + x].appendChild(explosionAnimation);

    // Remove the animation after a short duration
    setTimeout(() => removeExplosionAnimation(explosionAnimation), 500);
}

// Function to remove explosion animation
function removeExplosionAnimation(animation) {
    if (animation && animation.parentNode) {
        animation.parentNode.removeChild(animation);
    }
}

// Handle explosion effects on adjacent cells
function handleExplosionEffects(x, y) {
    const directions = [
        { x: 0, y: 0 },  // Center
        { x: 0, y: -1 }, // Up
        { x: 0, y: 1 },  // Down
        { x: -1, y: 0 }, // Left
        { x: 1, y: 0 }   // Right
    ];

    directions.forEach(direction => {
        const targetX = x + direction.x;
        const targetY = y + direction.y;

        if (targetY >= 0 && targetY < gridLayout.length && targetX >= 0 && targetX < gridLayout[0].length) {
            // Handle destructible walls and player health
            if (gridLayout[targetY][targetX] === 'D') {
                gridLayout[targetY][targetX] = 'F';
                updateGrid(targetX, targetY);
            }

            playerData.forEach((player, index) => {
                if (player.x === targetX && player.y === targetY) {
                    player.health--;
                    updateHeartsDisplay(index); // Check health after decrementing
                }
            });

            // Create explosion radius for affected cells
            const explosionCell = document.createElement('div');
            explosionCell.classList.add('explosion-radius');
            grid.children[targetY * gridLayout[0].length + targetX].appendChild(explosionCell);
        }
    });
}

function updateGrid(x, y) {
    const cellIndex = y * gridLayout[0].length + x;
    const cell = grid.children[cellIndex];
    cell.innerHTML = '';

    switch (gridLayout[y][x]) {
        case 'O': cell.classList.add('outer-wall'); break;
        case 'D': cell.classList.add('destructible'); break;
        case 'F': cell.classList.add('floor'); break;
        case 'P': 
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');
            cell.appendChild(playerElement);
            break;
    }
}

// Function to remove bomb from the DOM
function removeBomb(bomb) {
    if (bomb && bomb.parentNode) {
        bomb.parentNode.removeChild(bomb);
    }
}

// Function to update the hearts display
function updateHeartsDisplay(playerIndex) {
    const heartContainers = document.querySelectorAll('.hearts');
    const hearts = heartContainers[playerIndex].children;

    // Update heart visibility based on player health
    for (let i = 0; i < hearts.length; i++) {
        hearts[i].style.visibility = i < playerData[playerIndex].health ? 'visible' : 'hidden';
    }

    // Check if the player has lost
    if (playerData[playerIndex].health <= 0) {
        alert(`Player ${playerIndex + 1} has lost!`);
        endGame();
    }

    // Check if the other player has lost (player 2 if current is player 1)
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
    if (playerData[otherPlayerIndex].health <= 0) {
        alert(`Player ${otherPlayerIndex + 1} has won!`);
        endGame();
    }
}
// Player movement function
function movePlayer(playerIndex, newX, newY) {
    const playerDataEntry = playerData[playerIndex];

    if (newY >= 0 && newY < gridLayout.length && newX >= 0 && newX < gridLayout[0].length) {
        if (gridLayout[newY][newX] === 'F' || gridLayout[newY][newX] === 'B') {
            const playerElement = grid.querySelector(`.${playerDataEntry.id}`);
            gridLayout[playerDataEntry.y][playerDataEntry.x] = 'F';
            grid.children[playerDataEntry.y * gridLayout[0].length + playerDataEntry.x].removeChild(playerElement);

            playerDataEntry.x = newX;
            playerDataEntry.y = newY;
            gridLayout[newY][newX] = 'P';
            grid.children[newY * gridLayout[0].length + newX].appendChild(playerElement);
        }
    }
}

document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        event.preventDefault();
    }

    const player1 = playerData[0];
    const player2 = playerData[1];

    switch (event.key) {
        case 'w': movePlayer(0, player1.x, player1.y - 1); break;
        case 's': movePlayer(0, player1.x, player1.y + 1); break;
        case 'a': movePlayer(0, player1.x - 1, player1.y); break;
        case 'd': movePlayer(0, player1.x + 1, player1.y); break;
        case 'ArrowUp': movePlayer(1, player2.x, player2.y - 1); break;
        case 'ArrowDown': movePlayer(1, player2.x, player2.y + 1); break;
        case 'ArrowLeft': movePlayer(1, player2.x - 1, player2.y); break;
        case 'ArrowRight': movePlayer(1, player2.x + 1, player2.y); break;

        case 'b': createBomb(0, player1.x, player1.y); break; 
        case '-': createBomb(1, player2.x, player2.y); break;
    }
});

function endGame() {
    // Stop all game activity, e.g., clear intervals, stop music, etc.
    clearInterval(timerInterval); // Assuming you have a timerInterval defined
    gameMusic.pause(); // Stop the game music
    menu.style.display = 'block'; // Show menu or game over screen
    grid.style.display = 'none'; // Hide the grid
}