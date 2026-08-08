document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    const levelDisplay = document.getElementById('level');
    const messageContainer = document.getElementById('message');
    const startButton = document.getElementById('start-button');

    // Configurações do Mapa (21x21)
    // 1: Parede, 0: Bolinha, 2: Espaço Vazio, 3: Super Bolinha, 4: Casa dos Fantasmas
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
        1,1,1,1,1,0,1,2,1,1,4,1,1,2,1,0,1,1,1,1,1,
        2,2,2,2,2,0,2,2,1,4,4,4,1,2,2,0,2,2,2,2,2,
        1,1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1,1,
        2,2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2,2,
        1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,
        1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,
        1,3,0,0,1,0,0,0,0,0,2,0,0,0,0,0,1,0,0,3,1,
        1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,
        1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,
        1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
    ];

    const width = 21;
    const squares = [];
    
    // Estado do Jogo
    let score = 0;
    let lives = 3;
    let level = 1;
    let dotsLeft = 0;
    let gameInterval = null;
    let ghostInterval = null;
    let cherryTimeout = null;
    let isGameOver = false;

    // Estado do Pac-Man
    let pacmanCurrentIndex = 325; // Posição inicial no grid
    let pacmanVelocity = 0;
    let nextVelocity = 0;

    // Fantasmas
    class Ghost {
        constructor(className, startIndex, speed) {
            this.className = className;
            this.startIndex = startIndex;
            this.currentIndex = startIndex;
            this.speed = speed;
            this.timerId = NaN;
            this.isFrightened = false;
        }
    }

    const ghosts = [
        new Ghost('red', 220, 250),
        new Ghost('pink', 221, 300),
        new Ghost('cyan', 222, 350),
        new Ghost('orange', 223, 400)
    ];

    // 1. Criar o Tabuleiro
    function createBoard() {
        board.innerHTML = '';
        squares.length = 0;
        dotsLeft = 0;

        for (let i = 0; i < layout.length; i++) {
            const square = document.createElement('div');
            square.classList.add('cell');
            board.appendChild(square);
            squares.push(square);

            if (layout[i] === 1) {
                square.classList.add('wall');
            } else if (layout[i] === 0) {
                square.classList.add('dot');
                dotsLeft++;
            } else if (layout[i] === 3) {
                square.classList.add('power-dot');
                dotsLeft++;
            }
        }
    }

    // 2. Controles de Entrada
    function handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                nextVelocity = -1;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                nextVelocity = -width;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                nextVelocity = 1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                nextVelocity = width;
                break;
        }
    }

    // 3. Loop do Pac-Man
    function movePacman() {
        // Tenta mudar para a direção desejada se não houver parede
        if (nextVelocity !== 0 && !squares[pacmanCurrentIndex + nextVelocity].classList.contains('wall')) {
            pacmanVelocity = nextVelocity;
        }

        // Aplica o movimento se o caminho estiver livre
        if (pacmanVelocity !== 0 && !squares[pacmanCurrentIndex + pacmanVelocity].classList.contains('wall')) {
            // Remove a classe do Pac-Man do local atual
            squares[pacmanCurrentIndex].classList.remove('pacman', 'right', 'left', 'up', 'down');
            
            // Lógica do Túnel (Teleporte)
            if (pacmanCurrentIndex === 210 && pacmanVelocity === -1) {
                pacmanCurrentIndex = 230;
            } else if (pacmanCurrentIndex === 230 && pacmanVelocity === 1) {
                pacmanCurrentIndex = 210;
            } else {
                pacmanCurrentIndex += pacmanVelocity;
            }

            // Adiciona a classe no novo local
            squares[pacmanCurrentIndex].classList.add('pacman');

            // Atualiza a rotação visual
            if (pacmanVelocity === 1) squares[pacmanCurrentIndex].classList.add('right');
            if (pacmanVelocity === -1) squares[pacmanCurrentIndex].classList.add('left');
            if (pacmanVelocity === -width) squares[pacmanCurrentIndex].classList.add('up');
            if (pacmanVelocity === width) squares[pacmanCurrentIndex].classList.add('down');

            // Interações
            eatenDot();
            eatenPowerDot();
            eatenCherry();
            checkGhostCollision();
        }
    }

    // Comendo itens
    function eatenDot() {
        if (squares[pacmanCurrentIndex].classList.contains('dot')) {
            squares[pacmanCurrentIndex].classList.remove('dot');
            score += 10;
            dotsLeft--;
            scoreDisplay.textContent = score;
            checkWin();
        }
    }

    function eatenPowerDot() {
        if (squares[pacmanCurrentIndex].classList.contains('power-dot')) {
            squares[pacmanCurrentIndex].classList.remove('power-dot');
            score += 50;
            dotsLeft--;
            scoreDisplay.textContent = score;
            
            // Deixa os fantasmas assustados
            ghosts.forEach(ghost => {
                ghost.isFrightened = true;
                squares[ghost.currentIndex].classList.add('frightened');
            });

            setTimeout(unfrightenGhosts, 8000);
            checkWin();
        }
    }

    function unfrightenGhosts() {
        ghosts.forEach(ghost => {
            ghost.isFrightened = false;
            squares[ghost.currentIndex].classList.remove('frightened');
        });
    }

    function spawnCherry() {
        if (isGameOver) return;
        const availableIndexes = [];
        squares.forEach((square, idx) => {
            if (!square.classList.contains('wall') && 
                !square.classList.contains('pacman') && 
                !square.classList.contains('ghost')) {
                availableIndexes.push(idx);
            }
        });

        if (availableIndexes.length > 0) {
            const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            squares[randomIndex].classList.add('cherry');

            // A cereja desaparece após 10 segundos se não for comida
            setTimeout(() => {
                if (squares[randomIndex]) squares[randomIndex].classList.remove('cherry');
            }, 10000);
        }

        // Tenta gerar outra cereja em 20-30 segundos
        cherryTimeout = setTimeout(spawnCherry, Math.random() * 10000 + 20000);
    }

    function eatenCherry() {
        if (squares[pacmanCurrentIndex].classList.contains('cherry')) {
            squares[pacmanCurrentIndex].classList.remove('cherry');
            score += 100;
            scoreDisplay.textContent = score;
        }
    }

    // 4. Inteligência Artificial dos Fantasmas
    function moveGhost(ghost) {
        const directions = [-1, +1, -width, +width];
        
        ghost.timerId = setInterval(() => {
            // Filtra movimentações válidas (sem bater na parede nem em outro fantasma)
            const validDirections = directions.filter(dir => {
                const nextPos = ghost.currentIndex + dir;
                return !squares[nextPos].classList.contains('wall') && 
                       !squares[nextPos].classList.contains('ghost');
            });

            if (validDirections.length > 0) {
                // Remove visual do fantasma da célula anterior
                squares[ghost.currentIndex].classList.remove('ghost', ghost.className, 'frightened');

                let nextMove;

                // Se o fantasma estiver assustado, move-se aleatoriamente
                if (ghost.isFrightened) {
                    nextMove = validDirections[Math.floor(Math.random() * validDirections.length)];
                } else {
                    // Persegue o Pac-Man calculando a distância até ele
                    nextMove = validDirections.reduce((bestDir, dir) => {
                        const currentDist = getDistance(ghost.currentIndex + dir, pacmanCurrentIndex);
                        const bestDist = getDistance(ghost.currentIndex + bestDir, pacmanCurrentIndex);
                        return currentDist < bestDist ? dir : bestDir;
                    }, validDirections[0]);
                }

                ghost.currentIndex += nextMove;

                // Aplica visual na nova célula
                squares[ghost.currentIndex].classList.add('ghost', ghost.className);
                if (ghost.isFrightened) {
                    squares[ghost.currentIndex].classList.add('frightened');
                }
            }

            checkGhostCollision();
        }, ghost.speed);
    }

    function getDistance(index1, index2) {
        const x1 = index1 % width;
        const y1 = Math.floor(index1 / width);
        const x2 = index2 % width;
        const y2 = Math.floor(index2 / width);
        return Math.hypot(x2 - x1, y2 - y1);
    }

    // 5. Colisão e Vidas
    function checkGhostCollision() {
        ghosts.forEach(ghost => {
            if (ghost.currentIndex === pacmanCurrentIndex) {
                if (ghost.isFrightened) {
                    // Pac-Man come o fantasma
                    squares[ghost.currentIndex].classList.remove('ghost', ghost.className, 'frightened');
                    ghost.currentIndex = ghost.startIndex;
                    score += 200;
                    scoreDisplay.textContent = score;
                    ghost.isFrightened = false;
                    squares[ghost.currentIndex].classList.add('ghost', ghost.className);
                } else {
                    // Fantasma pega o Pac-Man
                    handlePacmanDeath();
                }
            }
        });
    }

    function handlePacmanDeath() {
        lives--;
        livesDisplay.textContent = lives;

        if (lives <= 0) {
            triggerGameOver(false);
        } else {
            resetPositions();
        }
    }

    function resetPositions() {
        // Limpa Pac-Man do local atual
        squares[pacmanCurrentIndex].classList.remove('pacman', 'right', 'left', 'up', 'down');
        pacmanCurrentIndex = 325;
        pacmanVelocity = 0;
        nextVelocity = 0;
        squares[pacmanCurrentIndex].classList.add('pacman');

        // Reseta fantasmas
        ghosts.forEach(ghost => {
            squares[ghost.currentIndex].classList.remove('ghost', ghost.className, 'frightened');
            ghost.currentIndex = ghost.startIndex;
            squares[ghost.currentIndex].classList.add('ghost', ghost.className);
        });
    }

    // 6. Condições de Vitória / Derrota
    function checkWin() {
        if (dotsLeft === 0) {
            level++;
            levelDisplay.textContent = level;
            triggerGameOver(true);
        }
    }

    function triggerGameOver(isWin) {
        isGameOver = true;
        clearInterval(gameInterval);
        ghosts.forEach(ghost => clearInterval(ghost.timerId));
        clearTimeout(cherryTimeout);

        const titleText = messageContainer.querySelector('h2');
        const descText = messageContainer.querySelector('p');

        if (isWin) {
            titleText.textContent = "VOCÊ VENCEU!";
            titleText.style.color = "#4ade80";
            descText.textContent = `Avançando para o nível ${level}...`;
            startButton.textContent = "PRÓXIMO NÍVEL";
        } else {
            titleText.textContent = "GAME OVER";
            titleText.style.color = "#ef4444";
            descText.textContent = `Pontuação Final: ${score}`;
            startButton.textContent = "JOGAR NOVAMENTE";
        }

        messageContainer.classList.remove('hidden');
    }

    // 7. Inicialização do Jogo
    function startGame() {
        if (isGameOver && lives <= 0) {
            score = 0;
            lives = 3;
            level = 1;
            scoreDisplay.textContent = score;
            livesDisplay.textContent = lives;
            levelDisplay.textContent = level;
        }

        isGameOver = false;
        createBoard();
        resetPositions();

        // Esconde menu inicial
        messageContainer.classList.add('hidden');

        // Registra evento do teclado
        document.removeEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleKeyDown);

        // Inicia loops do jogo
        clearInterval(gameInterval);
        gameInterval = setInterval(movePacman, 150);

        ghosts.forEach(ghost => {
            clearInterval(ghost.timerId);
            moveGhost(ghost);
        });

        clearTimeout(cherryTimeout);
        cherryTimeout = setTimeout(spawnCherry, 15000);
    }

    startButton.addEventListener('click', startGame);
});