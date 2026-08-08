const board = document.getElementById("game-board");
const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const levelElement = document.getElementById("level");
const message = document.getElementById("message");
const startButton = document.getElementById("start-button");

// ======================================================
// MAPA CLÁSSICO
// ======================================================
const map = [
    "#####################",
    "#o.................o#",
    "#.###.###.#.###.###.#",
    "#.# #.#...#...#.# #.#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "     .#.......#.     ",
    "#####.#.##-##.#.#####",
    "      # #   # #      ",
    "#####.#.#####.#.#####",
    "     .#.......#.     ",
    "#####.#.#####.#.#####",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#o..#.....#.....#..o#",
    "###.#.#.#####.#.#.###",
    "#.....#...#...#.....#",
    "#.#########.#######.#",
    "#...................#",
    "#####################"
];

// ======================================================
// CONFIGURAÇÕES
// ======================================================
const MAP_WIDTH = 21;
const MAP_HEIGHT = 21;
const MOVE_SPEED = 130;

let currentGhostSpeed = 240; // Velocidade inicial dos fantasmas
let ghostInterval = null;

let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;

let pacman = { x: 10, y: 11, direction: null, nextDirection: null };
let ghosts = [];

// Variáveis do Bônus (Cereja)
let bonusActive = false;
let bonusTimer = null;
let bonusSpawnInterval = null;
const bonusPos = { x: 10, y: 8 }; 

const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

// ======================================================
// CRIAR TABULEIRO
// ======================================================
function createBoard() {
    board.innerHTML = "";
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            const tile = map[y][x];
            if (tile === "#") cell.classList.add("wall");
            else if (tile === ".") cell.classList.add("dot");
            else if (tile === "o") cell.classList.add("power-dot");
            board.appendChild(cell);
        }
    }
}

// ======================================================
// DESENHAR PERSONAGENS E CEREJA
// ======================================================
function drawPacman() {
    document.querySelectorAll(".pacman").forEach(el => el.remove());
    const cell = board.children[pacman.y * MAP_WIDTH + pacman.x];
    if (!cell) return;
    const player = document.createElement("div");
    player.classList.add("pacman");
    player.classList.add(pacman.direction ? pacman.direction : "right");
    cell.appendChild(player);
}

function drawGhosts() {
    document.querySelectorAll(".ghost").forEach(el => el.remove());
    ghosts.forEach(ghost => {
        if (!ghost.active) return;
        const cell = board.children[ghost.y * MAP_WIDTH + ghost.x];
        if (!cell) return;
        const ghostEl = document.createElement("div");
        ghostEl.classList.add("ghost");
        ghostEl.classList.add(ghost.frightened ? "frightened" : ghost.color);
        cell.appendChild(ghostEl);
    });
}

function drawBonus() {
    document.querySelectorAll(".cherry").forEach(el => el.remove());
    if (bonusActive) {
        const cell = board.children[bonusPos.y * MAP_WIDTH + bonusPos.x];
        if (cell) {
            const cherryEl = document.createElement("div");
            cherryEl.classList.add("cherry");
            cell.appendChild(cherryEl);
        }
    }
}

// ======================================================
// LÓGICA DO BÔNUS (SPAWN)
// ======================================================
function spawnBonus() {
    if (!gameRunning) return;
    
    bonusActive = true;
    drawBonus();
    
    if (bonusTimer) clearTimeout(bonusTimer);
    
    bonusTimer = setTimeout(() => {
        bonusActive = false;
        drawBonus();
    }, 9000);
}

// ======================================================
// VERIFICAR PAREDE E MOVIMENTO
// ======================================================
function isWall(x, y) {
    if (x < 0 || x >= MAP_WIDTH) return false;
    if (y < 0 || y >= MAP_HEIGHT) return true;
    return map[y][x] === "#";
}

function canMove(direction) {
    if (!direction) return false;
    const move = directions[direction];
    return !isWall(pacman.x + move.x, pacman.y + move.y);
}

// ======================================================
// COLETÁVEIS E MODO POWER
// ======================================================
let powerTimer = null;

function collectDot() {
    const cell = board.children[pacman.y * MAP_WIDTH + pacman.x];
    if (!cell) return;

    if (cell.classList.contains("dot")) {
        cell.classList.remove("dot");
        score += 10;
        scoreElement.textContent = score;
    }

    if (cell.classList.contains("power-dot")) {
        cell.classList.remove("power-dot");
        score += 1000;
        scoreElement.textContent = score;
        triggerPowerMode();
    }
    
    if (bonusActive && pacman.x === bonusPos.x && pacman.y === bonusPos.y) {
        bonusActive = false;
        score += 500;
        scoreElement.textContent = score;
        drawBonus();
    }

    checkWinCondition();
}

function triggerPowerMode() {
    ghosts.forEach(g => { if (g.active) g.frightened = true; });
    drawGhosts();
    if (powerTimer) clearTimeout(powerTimer);
    powerTimer = setTimeout(() => {
        ghosts.forEach(g => g.frightened = false);
        drawGhosts();
    }, 7000);
}

// ======================================================
// MOVER PAC-MAN E FANTASMAS
// ======================================================
function movePacman() {
    if (!gameRunning) return;

    if (canMove(pacman.nextDirection)) pacman.direction = pacman.nextDirection;
    if (!pacman.direction || !canMove(pacman.direction)) return;

    const move = directions[pacman.direction];
    pacman.x += move.x;
    pacman.y += move.y;

    if (pacman.x < 0) pacman.x = MAP_WIDTH - 1;
    else if (pacman.x >= MAP_WIDTH) pacman.x = 0;

    collectDot();
    drawPacman();
    checkCollision();
}

function createGhosts() {
    ghosts = [
        { x: 9, y: 9, color: "red", direction: "left", frightened: false, active: true, type: "chase" },
        { x: 10, y: 9, color: "pink", direction: "right", frightened: false, active: true, type: "ambush" },
        { x: 10, y: 10, color: "cyan", direction: "up", frightened: false, active: true, type: "flank" },
        { x: 11, y: 9, color: "orange", direction: "down", frightened: false, active: true, type: "coward" }
    ];
}

function moveGhosts() {
    if (!gameRunning) return;

    ghosts.forEach(ghost => {
        if (!ghost.active) return;
        const possibleDirections = [];

        Object.keys(directions).forEach(dir => {
            const move = directions[dir];
            if (!isWall(ghost.x + move.x, ghost.y + move.y)) possibleDirections.push(dir);
        });

        const opposites = { up: "down", down: "up", left: "right", right: "left" };
        let options = possibleDirections.filter(dir => dir !== opposites[ghost.direction]);
        if (options.length === 0) options = possibleDirections;

        let chosenDirection;
        if (ghost.frightened) {
            chosenDirection = options[Math.floor(Math.random() * options.length)];
        } else {
            let targetX = pacman.x;
            let targetY = pacman.y;

            if (ghost.type === "ambush" && pacman.direction) {
                targetX += directions[pacman.direction].x * 3;
                targetY += directions[pacman.direction].y * 3;
            } else if (ghost.type === "flank" && pacman.direction) {
                targetX += directions[pacman.direction].x * 2;
                targetY += directions[pacman.direction].y * 2;
            } else if (ghost.type === "coward") {
                const dist = Math.abs(ghost.x - pacman.x) + Math.abs(ghost.y - pacman.y);
                if (dist < 4) { targetX = 0; targetY = MAP_HEIGHT; }
            }

            options.sort((a, b) => {
                const distA = Math.abs((ghost.x + directions[a].x) - targetX) + Math.abs((ghost.y + directions[a].y) - targetY);
                const distB = Math.abs((ghost.x + directions[b].x) - targetX) + Math.abs((ghost.y + directions[b].y) - targetY);
                return distA - distB;
            });

            // Conta quantos fantasmas já foram eliminados para calcular a raiva/precisão da IA
            const defeatedCount = ghosts.filter(g => !g.active).length;
            
            // Quanto mais mortes, maior a chance de acertar a rota perfeita (de 95% até 100%)
            const precisionRate = 0.95 + (defeatedCount * 0.015);

            chosenDirection = (options.length > 0 && Math.random() < precisionRate) ? options[0] : options[Math.floor(Math.random() * options.length)];
        }

        const move = directions[chosenDirection];
        ghost.x += move.x;
        ghost.y += move.y;

        if (ghost.x < 0) ghost.x = MAP_WIDTH - 1;
        if (ghost.x >= MAP_WIDTH) ghost.x = 0;

        ghost.direction = chosenDirection;
    });

    drawGhosts();
    checkCollision();
}

// ======================================================
// ATUALIZAR VELOCIDADE DOS FANTASMAS (FÚRIA)
// ======================================================
function updateGhostSpeed() {
    if (ghostInterval) clearInterval(ghostInterval);

    // Conta quantos fantasmas já foram eliminados
    const defeatedCount = ghosts.filter(g => !g.active).length;

    // Cada fantasma abatido diminui o tempo do intervalo (deixando-os mais rápidos)
    currentGhostSpeed = Math.max(100, 240 - (defeatedCount * 35));

    ghostInterval = setInterval(moveGhosts, currentGhostSpeed);
}

// ======================================================
// COLISÕES E ESTADO DO JOGO
// ======================================================
function checkCollision() {
    ghosts.forEach(ghost => {
        if (!ghost.active) return;
        if (ghost.x === pacman.x && ghost.y === pacman.y) {
            if (ghost.frightened) {
                ghost.active = false;
                score += 200;
                scoreElement.textContent = score;
                
                // Aumenta a fúria e velocidade dos restantes imediatamente!
                updateGhostSpeed();

                drawGhosts();
                checkWinCondition();
            } else {
                loseLife();
            }
        }
    });
}

function checkWinCondition() {
    const allGhostsDefeated = ghosts.every(g => !g.active);
    const remainingDots = document.querySelectorAll(".dot, .power-dot").length;
    if (allGhostsDefeated || remainingDots === 0) endGame("VOCÊ VENCEU!");
}

function loseLife() {
    lives--;
    livesElement.textContent = lives;
    if (lives <= 0) return endGame("GAME OVER");
    gameRunning = false;
    setTimeout(() => { resetPositions(); gameRunning = true; }, 1200);
}

function endGame(title) {
    gameRunning = false;
    if (powerTimer) clearTimeout(powerTimer);
    if (bonusSpawnInterval) clearInterval(bonusSpawnInterval);
    if (bonusTimer) clearTimeout(bonusTimer);
    if (ghostInterval) clearInterval(ghostInterval);
    
    message.classList.remove("hidden");
    message.querySelector("h2").textContent = title;
    message.querySelector("p").textContent = `Pontuação final: ${score}`;
    startButton.textContent = "JOGAR NOVAMENTE";
}

function resetPositions() {
    pacman.x = 10;
    pacman.y = 11;
    pacman.direction = null;
    pacman.nextDirection = null;
    
    bonusActive = false;
    drawBonus();

    if (powerTimer) clearTimeout(powerTimer);
    createGhosts();
    
    currentGhostSpeed = 240; // Reseta a velocidade base
    updateGhostSpeed();

    drawPacman();
    drawGhosts();
}

// ======================================================
// CONTROLES E INICIALIZAÇÃO
// ======================================================
document.addEventListener("keydown", event => {
    const keys = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right"
    };
    if (keys[event.key]) {
        pacman.nextDirection = keys[event.key];
        event.preventDefault();
    }
});

function startGame() {
    score = 0; lives = 3; level = 1;
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    levelElement.textContent = level;

    createBoard();
    resetPositions();

    message.classList.add("hidden");
    gameRunning = true;
    startButton.textContent = "REINICIAR";
    
    if (bonusSpawnInterval) clearInterval(bonusSpawnInterval);
    bonusSpawnInterval = setInterval(spawnBonus, 25000);
}

startButton.addEventListener("click", startGame);

createBoard();
resetPositions();
setInterval(movePacman, MOVE_SPEED);