document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    const levelDisplay = document.getElementById('level');
    const messageDisplay = document.getElementById('message');
    const startButton = document.getElementById('start-button');

    const width = 21;
    let score = 0;
    let lives = 3;
    let level = 1;
    let gameInterval = null;
    let ghosts = [];
    let pacmanCurrentIndex = 220;
    let pacmanDirection = 'ArrowRight';
    let isGameOver = false;
    let dotsEaten = 0;
    let totalDots = 0;

    // Variáveis para o fechamento do labirinto a cada 10 segundos
    let mazeTimer = null;
    let closedWallsCount = 0;
    // Lista de posições de corredores estratégicos que podem virar paredes com o tempo
    const potentialWalls = [
        45, 46, 47, 48, 49, 51, 52, 53, 54, 55,
        85, 95, 105, 115, 125,
        315, 316, 317, 318, 319, 321, 322, 323, 324, 325,
        145, 146, 154, 155, 265, 266, 274, 275
    ];

    // Layout do Labirinto (1 = Parede, 0 = Ponto, 2 = Vazio, 3 = Power Dot)
    const layout = [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,3,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,3,1,
        1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,
        1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,
        1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
        1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,
        1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,
        1,1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1,1,
        2,2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2,2,
        1,1,1,1,1,0,1,2,1,1,2,1,1,2,1,0,1,1,1,1,1,
        2,2,2,2,2,0,2,2,1,2,2,2,1,2,2,0,2,2,2,2,2,
        1,1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1,1,
        2,2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2,2,
        1,1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,
        1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,
        1,3,0,0,1,0,0,0,0,0,2,0,0,0,0,0,1,0,0,3,1,
        1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,
        1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,
        1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
    ];

    let squares = [];

    class Ghost {
        constructor(className, startIndex, speed) {
            this.className = className;
            this.startIndex = startIndex;
            this.currentIndex = startIndex;
            this.speed = speed;
            this.timerId = null;
            this.isScared = false;
        }
    }

    function createBoard() {
        board.innerHTML = '';
        squares = [];
        totalDots = 0;
        dotsEaten = 0;
        closedWallsCount = 0;

        for (let i = 0; i < layout.length; i++) {
            const square = document.createElement('div');
            square.classList.add('cell');
            square.dataset.index = i;
            board.appendChild(square);
            squares.push(square);

            if (layout[i] === 0) {
                squares[i].classList.add('dot');
                totalDots++;
            } else if (layout[i] === 1) {
                squares[i].classList.add('wall');
            } else if (layout[i] === 3) {
                squares[i].classList.add('power-dot');
                totalDots++;
            }
        }
    }

    function startGame() {
        if (gameInterval) clearInterval(gameInterval);
        if (mazeTimer) clearInterval(mazeTimer);

        messageDisplay.classList.add('hidden');
        isGameOver = false;
        score = 0;
        lives = 3;
        level = 1;
        scoreDisplay.innerHTML = score;
        livesDisplay.innerHTML = lives;
        levelDisplay.innerHTML = level;

        createBoard();
        
        pacmanCurrentIndex = 220;
        pacmanDirection = 'ArrowRight';
        squares[pacmanCurrentIndex].classList.add('pacman');

        // Fantasmas com velocidades adaptadas (quanto menor o número, mais rápido)
        ghosts = [
            new Ghost('blinky', 180, 300),
            new Ghost('pinky', 181, 350),
            new Ghost('inky', 198, 400),
            new Ghost('clyde', 199, 450)
        ];

        ghosts.forEach(ghost => {
            squares[ghost.currentIndex].classList.add('ghost', ghost.className);
            moveGhost(ghost);
        });

        // Loop principal do jogo
        gameInterval = setInterval(gameLoop, 250);

        // A cada 10 segundos, fecha uma parte do labirinto!
        mazeTimer = setInterval(closeRandomMazePart, 10000);
    }

    // Função que fecha o labirinto dinamicamente a cada 10s
    function closeRandomMazePart() {
        if (isGameOver) return;

        // Procura um espaço vazio ou ponto que pode virar parede
        for (let pos of potentialWalls) {
            let actualPos = (pos + closedWallsCount) % squares.length;
            if (!squares[actualPos].classList.contains('wall') && 
                !squares[actualPos].classList.contains('pacman')) {
                
                // Remove qualquer ponto que estava lá
                squares[actualPos].classList.remove('dot', 'power-dot');
                // Transforma em parede intransitável!
                squares[actualPos].classList.add('wall');
                layout[actualPos] = 1;
                closedWallsCount++;
                break;
            }
        }
    }

    function gameLoop() {
        movePacman();
        checkForGameOver();
        checkForWin();
    }

    function movePacman() {
        squares[pacmanCurrentIndex].classList.remove('pacman');
        let nextIndex = pacmanCurrentIndex;

        if (pacmanDirection === 'ArrowLeft' && pacmanCurrentIndex % width !== 0 && !squares[pacmanCurrentIndex - 1].classList.contains('wall')) {
            nextIndex -= 1;
        } else if (pacmanDirection === 'ArrowRight' && pacmanCurrentIndex % width < width - 1 && !squares[pacmanCurrentIndex + 1].classList.contains('wall')) {
            nextIndex += 1;
        } else if (pacmanDirection === 'ArrowUp' && pacmanCurrentIndex - width >= 0 && !squares[pacmanCurrentIndex - width].classList.contains('wall')) {
            nextIndex -= width;
        } else if (pacmanDirection === 'ArrowDown' && pacmanCurrentIndex + width < width * width && !squares[pacmanCurrentIndex + width].classList.contains('wall')) {
            nextIndex += width;
        }

        // Túnel lateral
        if (nextIndex === 189) nextIndex = 209;
        else if (nextIndex === 209) nextIndex = 189;

        pacmanCurrentIndex = nextIndex;
        squares[pacmanCurrentIndex].classList.add('pacman');

        eatDot();
        eatPowerDot();
    }

    function eatDot() {
        if (squares[pacmanCurrentIndex].classList.contains('dot')) {
            squares[pacmanCurrentIndex].classList.remove('dot');
            score += 10;
            dotsEaten++;
            scoreDisplay.innerHTML = score;
        }
    }

    function eatPowerDot() {
        if (squares[pacmanCurrentIndex].classList.contains('power-dot')) {
            squares[pacmanCurrentIndex].classList.remove('power-dot');
            score += 50;
            dotsEaten++;
            scoreDisplay.innerHTML = score;

            ghosts.forEach(ghost => ghost.isScared = true);
            setTimeout(unscareGhosts, 8000);
        }
    }

    function unscareGhosts() {
        ghosts.forEach(ghost => ghost.isScared = false);
    }

    function moveGhost(ghost) {
        const directions = [-1, 1, width, -width];
        
        ghost.timerId = setInterval(function() {
            if (isGameOver) {
                clearInterval(ghost.timerId);
                return;
            }

            const validDirections = directions.filter(dir => {
                let nextPos = ghost.currentIndex + dir;
                return nextPos >= 0 && nextPos < width * width && 
                       !squares[nextPos].classList.contains('wall');
            });

            if (validDirections.length > 0) {
                squares[ghost.currentIndex].classList.remove('ghost', ghost.className, 'scared-ghost');
                
                // IA Básica de perseguição ou fuga
                let direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                if (!ghost.isScared) {
                    let closestDir = validDirections.reduce((best, dir) => {
                        let distBest = Math.abs((ghost.currentIndex + best) - pacmanCurrentIndex);
                        let distDir = Math.abs((ghost.currentIndex + dir) - pacmanCurrentIndex);
                        return distDir < distBest ? dir : best;
                    });
                    if (Math.random() < 0.7) direction = closestDir; // 70% de chance de inteligência direcionada
                }

                ghost.currentIndex += direction;
                squares[ghost.currentIndex].classList.add('ghost', ghost.className);

                if (ghost.isScared) {
                    squares[ghost.currentIndex].classList.add('scared-ghost');
                }
            }

            checkForGameOver();
        }, ghost.speed);
    }

    function checkForGameOver() {
        if (isGameOver) return;

        // Se o Pac-Man encostar num fantasma
        for (let i = 0; i < ghosts.length; i++) {
            if (squares[ghosts[i].currentIndex].classList.contains('pacman')) {
                if (ghosts[i].isScared) {
                    // Comeu o fantasma
                    squares[ghosts[i].currentIndex].classList.remove('ghost', ghosts[i].className, 'scared-ghost');
                    // O fantasma NÃO reseta para o começo, ele apenas renasce onde foi comido ou continua na mesma área
                    ghosts[i].currentIndex = 180 + i; 
                    score += 200;
                    scoreDisplay.innerHTML = score;
                } else {
                    // Fantasma pegou o Pac-Man!
                    lives--;
                    livesDisplay.innerHTML = lives;

                    if (lives <= 0) {
                        endGame(false);
                    } else {
                        // PERDEU UMA VIDA: MAS OS FANTASMAS CONTINUAM ONDE ESTAVAM!
                        // Apenas reposicionamos o Pac-Man para o início, mantendo o cerco dos fantasmas
                        squares[pacmanCurrentIndex].classList.remove('pacman');
                        pacmanCurrentIndex = 220;
                        squares[pacmanCurrentIndex].classList.add('pacman');
                    }
                    break;
                }
            }
        }
    }

    function checkForWin() {
        if (dotsEaten >= totalDots) {
            endGame(true);
        }
    }

    function endGame(won) {
        isGameOver = true;
        clearInterval(gameInterval);
        if (mazeTimer) clearInterval(mazeTimer);

        ghosts.forEach(ghost => clearInterval(ghost.timerId));

        messageDisplay.classList.remove('hidden');
        const h2 = messageDisplay.querySelector('h2');
        const p = messageDisplay.querySelector('p');
        const btn = messageDisplay.querySelector('button');

        if (won) {
            h2.style.color = '#22c55e';
            h2.innerHTML = 'VOCÊ VENCEU!';
            p.innerHTML = `Pontuação Final: ${score}`;
        } else {
            h2.style.color = '#ef4444';
            h2.innerHTML = 'FIM DE JOGO';
            p.innerHTML = 'O labirinto fechou com você!';
        }
        btn.innerHTML = 'JOGAR NOVAMENTE';
    }

    // Controles do Teclado
    window.addEventListener('keydown', e => {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                pacmanDirection = 'ArrowLeft';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                pacmanDirection = 'ArrowRight';
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                pacmanDirection = 'ArrowUp';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                pacmanDirection = 'ArrowDown';
                break;
        }
    });

    startButton.addEventListener('click', startGame);
});