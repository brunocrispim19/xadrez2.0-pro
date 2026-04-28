const boardElement = document.getElementById('chessboard');
const statusElement = document.getElementById('status');
const movesList = document.getElementById('moves-list');
const gameModeSelect = document.getElementById('game-mode');

// Efeitos Sonoros
const somMover = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
const somCapturar = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');

// Configuração Inicial
let boardLayout = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let selectedSquare = null;
let turn = 'white';
let castlingRights = { white: { k: false, rl: false, rr: false }, black: { k: false, rl: false, rr: false } };
let enPassantTarget = null; 
let moveCount = 1;
let tempoBrancas = 600, tempoPretas = 600, timer;



// INTERFACE E RELÓGIO


function startGame() {
    document.getElementById('start-screen').style.display = 'none';
}

function desistir() {
    // Abre a tela personalizada em vez do alert do navegador
    document.getElementById('resign-overlay').style.display = 'flex';
}

function confirmarDesistencia() {
    document.getElementById('resign-overlay').style.display = 'none';
    const vencedor = turn === 'white' ? 'PRETAS' : 'BRANCAS';
    showGameOver(`${vencedor} (Por Desistência)`);
}

function cancelarDesistencia() {
    document.getElementById('resign-overlay').style.display = 'none';
}

function formatarTempo(segundos) {
    const min = Math.floor(segundos / 60).toString().padStart(2, '0');
    const seg = (segundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
}

function atualizarRelogios() {
    document.getElementById('clock-white').innerText = formatarTempo(tempoBrancas);
    document.getElementById('clock-black').innerText = formatarTempo(tempoPretas);
    document.getElementById('clock-white').className = turn === 'white' ? 'clock active-clock' : 'clock';
    document.getElementById('clock-black').className = turn === 'black' ? 'clock active-clock' : 'clock';
}

function iniciarRelogio() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if (turn === 'white') tempoBrancas--; else tempoPretas--;
        atualizarRelogios();
        if (tempoBrancas <= 0) showGameOver('PRETAS (Por Tempo)');
        if (tempoPretas <= 0) showGameOver('BRANCAS (Por Tempo)');
    }, 1000);
}

function registrarHistorico(peca, fR, fC, tR, tC, capturou, isXeque, isMate) {
    const letraPeca = (peca === '♙' || peca === '♟') ? '' : peca;
    const acao = capturou ? 'x' : '';
    const casa = `${String.fromCharCode(97 + tC)}${8 - tR}`;
    const sulfixo = isMate ? '#' : (isXeque ? '+' : '');
    
    const li = document.createElement('li');
    li.innerHTML = `<span><b>${moveCount}.</b> ${turn === 'white' ? 'Brancas' : 'Pretas'}</span> <span>${letraPeca}${acao}${casa}${sulfixo}</span>`;
    movesList.prepend(li);
    if (turn === 'black') moveCount++;
}



// LÓGICA DO MOTOR DE XADREZ


function getPieceColor(piece) {
    if (!piece) return null;
    return ['♙', '♖', '♘', '♗', '♕', '♔'].includes(piece) ? 'white' : 'black';
}

function isPathClear(fR, fC, tR, tC, board) {
    const dr = Math.sign(tR - fR), dc = Math.sign(tC - fC);
    let r = fR + dr, c = fC + dc;
    while (r !== tR || c !== tC) {
        if (board[r][c] !== '') return false;
        r += dr; c += dc;
    }
    return true;
}

function isPseudoLegalMove(fR, fC, tR, tC, piece, board) {
    const dr = tR - fR, dc = tC - fC, absDr = Math.abs(dr), absDc = Math.abs(dc);
    const target = board[tR][tC], color = getPieceColor(piece);
    
    if (target && getPieceColor(target) === color) return false;

    switch (piece) {
        case '♙': 
            if (fC === tC && !target) return (dr === -1) || (dr === -2 && fR === 6 && board[5][fC] === '');
            if (absDc === 1 && dr === -1) return (target !== '') || (enPassantTarget && enPassantTarget.row === tR && enPassantTarget.col === tC);
            return false;
        case '♟': 
            if (fC === tC && !target) return (dr === 1) || (dr === 2 && fR === 1 && board[2][fC] === '');
            if (absDc === 1 && dr === 1) return (target !== '') || (enPassantTarget && enPassantTarget.row === tR && enPassantTarget.col === tC);
            return false;
        case '♖': case '♜': return (fR === tR || fC === tC) && isPathClear(fR, fC, tR, tC, board);
        case '♗': case '♝': return (absDr === absDc) && isPathClear(fR, fC, tR, tC, board);
        case '♕': case '♛': return (fR === tR || fC === tC || absDr === absDc) && isPathClear(fR, fC, tR, tC, board);
        case '♔': case '♚': 
            if (absDr <= 1 && absDc <= 1) return true;
            if (dr === 0 && absDc === 2) {
                const rights = castlingRights[color];
                if (rights.k) return false;
                if (tC === 6) return !rights.rr && isPathClear(fR, fC, fR, 7, board);
                if (tC === 2) return !rights.rl && isPathClear(fR, fC, fR, 0, board);
            }
            return false;
        case '♘': case '♞': return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
    }
    return false;
}

function isKingInCheck(color, board) {
    let kingR = -1, kingC = -1;
    const kingPiece = color === 'white' ? '♔' : '♚';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) if (board[r][c] === kingPiece) { kingR = r; kingC = c; break; }
    }
    if (kingR === -1) return false;
    
    const enemyColor = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(board[r][c]) === enemyColor) {
                if (isPseudoLegalMove(r, c, kingR, kingC, board[r][c], board)) return true;
            }
        }
    }
    return false;
}

function isValidMove(fR, fC, tR, tC, piece) {
    if (!isPseudoLegalMove(fR, fC, tR, tC, piece, boardLayout)) return false;
    const tempBoard = boardLayout.map(row => [...row]);
    tempBoard[tR][tC] = piece;
    tempBoard[fR][fC] = '';
    const pieceColor = getPieceColor(piece);
    if (isKingInCheck(pieceColor, tempBoard)) return false;
    return true;
}

function hasValidMoves(color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardLayout[r][c]) === color) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, boardLayout[r][c])) return true;
                    }
                }
            }
        }
    }
    return false;
}

function isInsufficientMaterial(board) {
    let pieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] !== '') pieces.push(board[r][c]);
        }
    }
    if (pieces.length === 2) return true;
    if (pieces.length === 3) {
        return pieces.some(p => ['♗', '♝', '♘', '♞'].includes(p));
    }
    return false;
}



// EXCEÇÕES DE FLUXO E MODAIS


function abrirMenuPromocao(cor) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('promotion-overlay');
        const optionsDiv = document.getElementById('promotion-options');
        const pecas = cor === 'white' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
        optionsDiv.innerHTML = '';
        pecas.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'promo-btn'; btn.innerText = p;
            btn.onclick = () => { overlay.style.display = 'none'; resolve(p); };
            optionsDiv.appendChild(btn);
        });
        overlay.style.display = 'flex';
    });
}

function abrirOferecerEmpate() { document.getElementById('draw-overlay').style.display = 'flex'; }
function aceitarEmpate() { showGameOver('EMPATE'); setTimeout(() => location.reload(), 3000); }
function recusarEmpate() { document.getElementById('draw-overlay').style.display = 'none'; }

function showGameOver(winner) {
    clearInterval(timer);
    document.getElementById('winner-text').innerText = winner.includes('EMPATE') ? `FIM DE JOGO! ${winner}` : `FIM DE JOGO! AS ${winner} VENCERAM!`;
    document.getElementById('game-over-screen').style.display = 'flex';
}



// EXECUÇÃO DO TURNO


async function executarMovimento(fR, fC, tR, tC, sPiece) {
    let capturedPiece = boardLayout[tR][tC];
    let som = capturedPiece ? somCapturar : somMover; 

    if ((sPiece === '♔' || sPiece === '♚') && Math.abs(tC - fC) === 2) {
        if (tC === 6) { boardLayout[tR][5] = boardLayout[tR][7]; boardLayout[tR][7] = ''; }
        else if (tC === 2) { boardLayout[tR][3] = boardLayout[tR][0]; boardLayout[tR][0] = ''; }
    }

    if ((sPiece === '♙' || sPiece === '♟') && Math.abs(tC - fC) === 1 && capturedPiece === '') {
        capturedPiece = boardLayout[tR + (sPiece === '♙' ? 1 : -1)][tC];
        boardLayout[tR + (sPiece === '♙' ? 1 : -1)][tC] = ''; 
        som = somCapturar;
    }

    boardLayout[tR][tC] = sPiece;
    boardLayout[fR][fC] = '';

    som.currentTime = 0; som.play();

    if (sPiece === '♔' || sPiece === '♚') castlingRights[turn].k = true;
    if (sPiece === '♖' || sPiece === '♜') {
        if (fC === 0) castlingRights[turn].rl = true;
        if (fC === 7) castlingRights[turn].rr = true;
    }
    if ((sPiece === '♙' || sPiece === '♟') && Math.abs(tR - fR) === 2) enPassantTarget = { row: fR + (sPiece === '♙' ? -1 : 1), col: fC };
    else enPassantTarget = null;

    if (!timer) iniciarRelogio();

    if ((sPiece === '♙' && tR === 0) || (sPiece === '♟' && tR === 7)) {
        createBoard(); 
        setTimeout(async () => { 
            if (turn === 'black' && gameModeSelect.value !== 'human') {
                boardLayout[tR][tC] = '♛'; 
            } else {
                boardLayout[tR][tC] = await abrirMenuPromocao(turn); 
            }
            finalizarTurno(sPiece, fR, fC, tR, tC, capturedPiece); 
        }, 50);
        return;
    }

    finalizarTurno(sPiece, fR, fC, tR, tC, capturedPiece);
}

function finalizarTurno(pecaMovida, fR, fC, tR, tC, capturedPiece) {
    const proximoTurno = turn === 'white' ? 'black' : 'white';
    
    const inCheck = isKingInCheck(proximoTurno, boardLayout);
    const hasMoves = hasValidMoves(proximoTurno);
    const isMate = inCheck && !hasMoves;
    const isAfogamento = !inCheck && !hasMoves;
    const isMaterialInsuficiente = isInsufficientMaterial(boardLayout);

    registrarHistorico(pecaMovida, fR, fC, tR, tC, capturedPiece !== '', inCheck, isMate);

    if (isMate) {
        clearInterval(timer); createBoard();
        showGameOver(turn === 'white' ? 'BRANCAS (Xeque-Mate)' : 'PRETAS (Xeque-Mate)');
        return;
    } else if (isAfogamento) {
        clearInterval(timer); createBoard();
        showGameOver('EMPATE (Afogamento)');
        return;
    } else if (isMaterialInsuficiente) {
        clearInterval(timer); createBoard();
        showGameOver('EMPATE (Material Insuficiente)');
        return;
    }

    turn = proximoTurno;
    statusElement.innerText = `Vez das ${turn === 'white' ? 'Brancas' : 'Pretas'} ${inCheck ? '- XEQUE!' : ''}`;
    if (inCheck) statusElement.style.color = '#e74c3c'; else statusElement.style.color = 'white';
    
    atualizarRelogios();
    selectedSquare = null;
    createBoard();

    if (turn === 'black' && gameModeSelect.value !== 'human') {
        playAI();
    }
}



// INTELIGÊNCIA ARTIFICIAL: AVALIAÇÃO POSICIONAL E MINIMAX


function evaluateBoard(board) {
    let totalEvaluation = 0;
    
    const pieceValues = { 
        '♙': -100, '♖': -500, '♘': -320, '♗': -330, '♕': -900, '♔': -20000,
        '♟': 100,  '♜': 500,  '♞': 320,  '♝': 330,  '♛': 900,  '♚': 20000 
    };

    const knightPST = [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    const pawnPST = [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let piece = board[r][c];
            if (piece) {
                let baseVal = pieceValues[piece];
                let isBlack = baseVal > 0;
                let posVal = 0;

                if (piece === '♘' || piece === '♞') {
                    posVal = knightPST[isBlack ? r : 7-r][c];
                } else if (piece === '♙' || piece === '♟') {
                    posVal = pawnPST[isBlack ? r : 7-r][c];
                } else if (piece === '♗' || piece === '♝') {
                    posVal = (r>=2 && r<=5 && c>=2 && c<=5) ? 10 : 0;
                }

                totalEvaluation += baseVal + (isBlack ? posVal : -posVal);
            }
        }
    }
    return totalEvaluation;
}

function minimax(board, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) return evaluateBoard(board);

    let color = isMaximizingPlayer ? 'black' : 'white';
    let possibleMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(board[r][c]) === color) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isPseudoLegalMove(r, c, tr, tc, board[r][c], board)) {
                            let tempBoard = board.map(row => [...row]);
                            tempBoard[tr][tc] = board[r][c];
                            tempBoard[r][c] = '';
                            if (!isKingInCheck(color, tempBoard)) {
                                possibleMoves.push(tempBoard);
                            }
                        }
                    }
                }
            }
        }
    }

    if (possibleMoves.length === 0) return isKingInCheck(color, board) ? (isMaximizingPlayer ? -99999 : 99999) : 0;

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let sim of possibleMoves) {
            let ev = minimax(sim, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break; 
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let sim of possibleMoves) {
            let ev = minimax(sim, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function playAI() {
    if (turn !== 'black') return;
    const mode = gameModeSelect.value;
    if (mode === 'human') return;

    let moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardLayout[r][c]) === 'black') {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc, boardLayout[r][c])) {
                            moves.push({ fR: r, fC: c, tR: tr, tC: tc, piece: boardLayout[r][c] });
                        }
                    }
                }
            }
        }
    }

    if (moves.length === 0) return;

    let bestMove;

    if (mode === 'ai-easy' || mode === 'ai-medium' || mode === 'ai-hard') {
        let bestScore = -Infinity;
        bestMove = moves[Math.floor(Math.random() * moves.length)]; 
        for (let m of moves) {
            let score = 0;
            let target = boardLayout[m.tR][m.tC];
            const pVals = { '♙': 10, '♖': 50, '♘': 30, '♗': 30, '♕': 90, '♔': 900 };

            if (mode === 'ai-medium' && target) score += pVals[target] || 0;
            else if (mode === 'ai-hard') {
                if (target) score += (pVals[target] || 0) * 10;
                let sB = boardLayout.map(row => [...row]);
                sB[m.tR][m.tC] = m.piece;
                sB[m.fR][m.fC] = '';
                let atk = false;
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (getPieceColor(sB[r][c]) === 'white' && isPseudoLegalMove(r, c, m.tR, m.tC, sB[r][c], sB)) {
                            atk = true;
                        }
                    }
                }
                if (atk) score -= (pVals[m.piece] || 0) * 10; else score += 5;
                if (m.tR >= 3 && m.tR <= 4 && m.tC >= 3 && m.tC <= 4) score += 2;
                score += Math.random(); 
            }
            if (score > bestScore) { bestScore = score; bestMove = m; }
        }
        
        setTimeout(() => executarMovimento(bestMove.fR, bestMove.fC, bestMove.tR, bestMove.tC, bestMove.piece), 2000);
    } 
    else if (mode === 'ai-pro' || mode === 'ai-gm') {
        const DEPTH = mode === 'ai-gm' ? 4 : 3; 
        
        statusElement.innerText = mode === 'ai-gm' ? 'GM está calculando jogadas...' : 'A IA está pensando...';
        statusElement.style.color = mode === 'ai-gm' ? '#9b59b6' : '#f1c40f'; 
        
        setTimeout(() => {
            const tempoInicio = Date.now(); 

            let bestScore = -Infinity;
            let bestMoves = [];

            for (let m of moves) {
                let tempBoard = boardLayout.map(row => [...row]);
                tempBoard[m.tR][m.tC] = m.piece;
                tempBoard[m.fR][m.fC] = '';
                
                let score = minimax(tempBoard, DEPTH - 1, -Infinity, Infinity, false);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [m];
                } else if (score === bestScore) {
                    bestMoves.push(m);
                }
            }

            bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            
            const tempoCalculo = Date.now() - tempoInicio;
            const tempoDeEspera = Math.max(0, 2000 - tempoCalculo);
            
            setTimeout(() => {
                executarMovimento(bestMove.fR, bestMove.fC, bestMove.tR, bestMove.tC, bestMove.piece);
            }, tempoDeEspera);

        }, 50); 
    }
}



// INTERAÇÃO DO USUÁRIO E RENDERIZAÇÃO DOM


async function handleSquareClick(row, col) {
    if (turn === 'black' && gameModeSelect.value !== 'human') return;

    const piece = boardLayout[row][col];
    const pieceColor = getPieceColor(piece);

    if (selectedSquare) {
        const sR = selectedSquare.row, sC = selectedSquare.col, sPiece = boardLayout[sR][sC];
        if (isValidMove(sR, sC, row, col, sPiece)) {
            executarMovimento(sR, sC, row, col, sPiece);
        } else {
            selectedSquare = (piece && pieceColor === turn) ? { row, col } : null;
            createBoard();
        }
    } else if (piece && pieceColor === turn) {
        selectedSquare = { row, col };
        createBoard();
    }
}

function createBoard() {
    boardElement.innerHTML = '';
    const possibleMoves = [];
    if (selectedSquare) {
        const p = boardLayout[selectedSquare.row][selectedSquare.col];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (isValidMove(selectedSquare.row, selectedSquare.col, r, c, p)) {
                    possibleMoves.push({ r, c });
                }
            }
        }
    }

    const colLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'white' : 'black'}`;
            if (selectedSquare?.row === r && selectedSquare?.col === c) sq.classList.add('selected');
            
            const isMove = possibleMoves.find(m => m.r === r && m.c === c);
            if (isMove) {
                sq.classList.add('possible-move');
                if (boardLayout[r][c] !== '' || (enPassantTarget && enPassantTarget.row === r && enPassantTarget.col === c)) sq.classList.add('has-enemy');
            }

            sq.innerText = boardLayout[r][c];
            
            if (c === 0) { const el = document.createElement('div'); el.className = 'coord-rank'; el.innerText = 8 - r; sq.appendChild(el); }
            if (r === 7) { const el = document.createElement('div'); el.className = 'coord-file'; el.innerText = colLetters[c]; sq.appendChild(el); }

            sq.onclick = () => handleSquareClick(r, c);
            boardElement.appendChild(sq);
        }
    }
}


createBoard();
