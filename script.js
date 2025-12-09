// --- CONFIGURATION ---
let playerRoles = [
  { role: 'Acid (Red)', color: '#ef4444', type: 'acid' },
  { role: 'Base (Blue)', color: '#3b82f6', type: 'base' }
];

let isRolesSwapped = false;
let currentPH = 7.0; // Starts neutral

const defaultXCategories = [
  'KMnO4',
  'K2Cr2O7',
  'Ce(SO4)2',
  'I2',
  'KIO3',
  'KBrO3'
];

const defaultYCategories = [
  'Does this titrant face auto-decomposition?',
  'What is the application of',
  'What is the color of',
  'What is the type of indicator used with',
  'What is the final reduction product of',
  'Is this titrant considered a 1ry standard'
];

const defaultAnswers = {
  '0-0': ['yes', 'light sensitive', 'mno2 catalyzes'],
  '0-1': [
    'redox titration',
    'iron determination',
    'oxalate',
    'hydrogen peroxide',
    'h2o2',
    'fe',
    'fe2+',
    'fe3+'
  ],
  '0-2': ['purple', 'violet', 'deep purple'],
  '0-3': ['self indicator', 'none', 'self', 'permanganate itself'],
  '0-4': [
    'mn2+',
    'manganese(ii)',
    'mno2',
    'manganese dioxide',
    'mno42-',
    'manganate'
  ],
  '0-5': ['no', 'secondary standard'],
  '1-0': ['no', 'stable'],
  '1-1': [
    'cod',
    'chemical oxygen demand',
    'iron determination',
    'alcohol determination',
    'fe2+'
  ],
  '1-2': ['orange', 'orange-red'],
  '1-3': [
    'diphenylamine',
    'bds',
    'diphenylbenzidine',
    'redox indicator',
    'internal'
  ],
  '1-4': ['cr3+', 'chromium(iii)', 'green ion'],
  '1-5': ['yes', 'primary standard'],
  '2-0': ['no', 'stable', 'very stable'],
  '2-1': ['redox titration', 'drug analysis', 'paracetamol', 'oxalate', 'fe'],
  '2-2': ['yellow', 'orange-yellow'],
  '2-3': ['ferroin', 'n-phenylanthranilic acid', 'diphenylamine'],
  '2-4': ['ce3+', 'cerium(iii)', 'colorless'],
  '2-5': ['no', 'secondary standard', 'usually standardized'],
  '3-0': ['yes', 'volatile', 'sublimes', 'disproportionates in base'],
  '3-1': [
    'iodimetry',
    'vitamin c',
    'ascorbic acid',
    'sulfides',
    'iodometry',
    'so3--',
    's2o3--'
  ],
  '3-2': ['brown', 'red-brown', 'violet vapor'],
  '3-3': ['starch', 'starch mucilage'],
  '3-4': ['i-', 'iodide'],
  '3-5': ['no', 'secondary standard', 'volatile'],
  '4-0': ['no', 'stable'],
  '4-1': [
    'andrew',
    "andrew's titration",
    'iodine source',
    'standardizing thiosulfate'
  ],
  '4-2': ['colorless', 'white solid'],
  '4-3': ['starch', 'chloroform', 'chcl3', 'extraction'],
  '4-4': ['i2', 'i-', 'i+'],
  '4-5': ['yes', 'primary standard'],
  '5-0': ['no', 'stable'],
  '5-1': ['mg2+', 'al3+', 'phenol'],
  '5-2': ['colorless', 'white solid'],
  '5-3': ['methyl orange', 'methyl red', 'naphthol blue black', 'irreversible'],
  '5-4': ['br-', 'bromide'],
  '5-5': ['yes', 'primary standard']
};

let xCategories = [...defaultXCategories];
let yCategories = [...defaultYCategories];
let validAnswers = JSON.parse(JSON.stringify(defaultAnswers));
let players = [];
let currentPlayerIndex = 0;
let board = Array(6)
  .fill(null)
  .map(() => Array(6).fill(null));
let selectedColumn = null;
let gameAudioContext = null;

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
  }
  return noiseBuffer;
}

function playSound(type) {
  if (!gameAudioContext) {
    gameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (gameAudioContext.state === 'suspended') {
    gameAudioContext.resume();
  }

  const now = gameAudioContext.currentTime;
  const gain = gameAudioContext.createGain();
  gain.connect(gameAudioContext.destination);

  switch (type) {
    case 'drop':
      const oscDrop = gameAudioContext.createOscillator();
      oscDrop.type = 'sine';
      oscDrop.frequency.setValueAtTime(500, now);
      oscDrop.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      oscDrop.frequency.linearRampToValueAtTime(600, now + 0.2);
      oscDrop.connect(gain);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      oscDrop.start(now);
      oscDrop.stop(now + 0.3);
      break;

    case 'correct':
      const osc1 = gameAudioContext.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.connect(gain);
      const osc2 = gameAudioContext.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(3000, now);
      osc2.connect(gain);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc1.start(now);
      osc1.stop(now + 1.5);
      osc2.start(now);
      osc2.stop(now + 1.5);
      break;

    case 'wrong':
      const oscWrong = gameAudioContext.createOscillator();
      oscWrong.type = 'sawtooth';
      oscWrong.frequency.setValueAtTime(150, now);
      oscWrong.frequency.linearRampToValueAtTime(50, now + 0.5);
      oscWrong.connect(gain);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      oscWrong.start(now);
      oscWrong.stop(now + 0.5);
      break;

    case 'fizz':
      const noiseSrc = gameAudioContext.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(gameAudioContext);
      const noiseFilter = gameAudioContext.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.frequency.linearRampToValueAtTime(3000, now + 1);
      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(gain);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
      noiseSrc.start(now);
      noiseSrc.stop(now + 1);
      break;

    case 'win':
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((freq, i) => {
        const o = gameAudioContext.createOscillator();
        const g = gameAudioContext.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(gameAudioContext.destination);
        const start = now + i * 0.1;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.1, start + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        o.start(start);
        o.stop(start + 0.3);
      });
      break;
  }
}

function createReactionEffect(x, y, type) {
  const cell = document.querySelector(
    `#gameBoard [data-x="${x}"][data-y="${y}"]`
  );
  if (!cell) return;
  const rect = cell.getBoundingClientRect();
  const container = document.getElementById('particles-container');
  const count = type === 'smoke' ? 15 : 8;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.classList.add(type === 'smoke' ? 'smoke' : 'bubble');
    const offsetX = Math.random() * 40 - 20;
    const offsetY = Math.random() * 40 - 20;
    p.style.left = rect.left + rect.width / 2 + offsetX + 'px';
    p.style.top = rect.top + rect.height / 2 + offsetY + 'px';
    const size = Math.random() * 10 + 5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    container.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  let icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function initPlayerSetup() {
  const container = document.getElementById('playersConfig');
  container.innerHTML = '';

  const currentRoles = isRolesSwapped
    ? [playerRoles[1], playerRoles[0]]
    : [playerRoles[0], playerRoles[1]];

  currentRoles.forEach((roleData, i) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    const existingName = players[i] ? players[i].name : `Player ${i + 1}`;

    card.innerHTML = `
        <h3>${i === 0 ? 'Team 1' : 'Team 2'}</h3>
        <input type="text"
               class="player-name-input"
               id="playerNameInput${i}"
               placeholder="Enter Name"
               value="${existingName}">
        <div class="fixed-color-display" style="background: ${
          roleData.color
        }; color: ${roleData.color}"></div>
        <p class="role-label" style="color: ${roleData.color}">${
      roleData.role
    }</p>
    `;
    container.appendChild(card);
  });
}

function swapRoles() {
  isRolesSwapped = !isRolesSwapped;
  const p1Name = document.getElementById('playerNameInput0').value;
  const p2Name = document.getElementById('playerNameInput1').value;
  players = [{ name: p1Name }, { name: p2Name }];
  initPlayerSetup();
  document.getElementById('playerNameInput0').value = p1Name;
  document.getElementById('playerNameInput1').value = p2Name;
}

function evaluateWindow(window, piece) {
  let score = 0;
  // Opponent piece (Assuming 0 is Acid/Red, 1 is Base/Blue)
  const oppPiece = piece === 0 ? 1 : 0;

  const countPiece = window.filter((cell) => cell === piece).length;
  const countEmpty = window.filter((cell) => cell === null).length;
  const countOpp = window.filter((cell) => cell === oppPiece).length;

  // RULE 1: If the window is blocked (contains opponent pieces), it's worth 0.
  // This solves your issue: "More boxes but no approach to win" = 0 score.
  if (countOpp > 0) {
    return 0;
  }

  // RULE 2: Assign weights based on threat level
  if (countPiece === 4) {
    score += 10000; // WINNING MOVE
  } else if (countPiece === 3 && countEmpty === 1) {
    score += 100; // MAJOR THREAT (3 in a row)
  } else if (countPiece === 2 && countEmpty === 2) {
    score += 10; // MINOR THREAT (2 in a row)
  }

  return score;
}

function scorePosition(board, piece) {
  let score = 0;

  // A. CENTER COLUMN PREFERENCE
  // In Connect 4, the center column is most valuable because it connects to the most lines.
  const centerArray = board.map((row) => row[3]); // Column 3 is center (0-5 index)
  const centerCount = centerArray.filter((x) => x === piece).length;
  score += centerCount * 3; // Small bonus for controlling the center

  // B. HORIZONTAL WINDOWS
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      // Stop at 3 because c+3 = 6
      const window = [
        board[r][c],
        board[r][c + 1],
        board[r][c + 2],
        board[r][c + 3]
      ];
      score += evaluateWindow(window, piece);
    }
  }

  // C. VERTICAL WINDOWS
  for (let c = 0; c < 6; c++) {
    for (let r = 0; r < 3; r++) {
      // Stop at 2 because r+3 = 5
      const window = [
        board[r][c],
        board[r + 1][c],
        board[r + 2][c],
        board[r + 3][c]
      ];
      score += evaluateWindow(window, piece);
    }
  }

  // D. DIAGONAL (Positive Slope /)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const window = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3]
      ];
      score += evaluateWindow(window, piece);
    }
  }

  // E. DIAGONAL (Negative Slope \)
  for (let r = 0; r < 3; r++) {
    // Iterate rows 0-2 (top half)
    for (let c = 0; c < 4; c++) {
      // Look "down" the diagonal.
      // Note: We need to check board[r+3] so r must start low.
      // Or we can start at r=3 and look "up". Let's stick to your index style:
      const window = [
        board[r + 3][c],
        board[r + 2][c + 1],
        board[r + 1][c + 2],
        board[r][c + 3]
      ];
      score += evaluateWindow(window, piece);
    }
  }

  return score;
}

function calculateStrategicPH() {
  // 0 = Acid (Red), 1 = Base (Blue)
  const acidScore = scorePosition(board, 0);
  const baseScore = scorePosition(board, 1);

  // Calculate the advantage
  // Positive number = Base is winning
  // Negative number = Acid is winning
  const scoreDiff = baseScore - acidScore;

  // MAPPING STRATEGY:
  // We want a difference of ~150 (a major threat + some positioning) to swing the meter significantly.
  // We use a clamp function to prevent the needle from spinning wildly if someone has a score of 10000.

  const maxSwing = 200; // The score difference that equals "Total Domination" (pH 0 or 14)

  // Normalize score between -1 and 1
  let normalized = scoreDiff / maxSwing;

  // Clamp it (cannot go beyond -1 or 1)
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;

  // Map -1 to pH 0 (Acid Win)
  // Map  0 to pH 7 (Neutral)
  // Map +1 to pH 14 (Base Win)

  // Formula: pH = 7 + (normalized * 7)
  let newPH = 7.0 + normalized * 7.0;

  return parseFloat(newPH.toFixed(1));
}

function updatePHDisplay() {
  const needle = document.getElementById('phNeedle');
  const valueDisplay = document.getElementById('phValue');
  const statusDisplay = document.getElementById('phStatus');

  // Calculate Percentage (0-14 mapped to 0-100%)
  const percentage = (currentPH / 14) * 100;
  needle.style.left = `${percentage}%`;
  valueDisplay.innerText = currentPH.toFixed(1);

  // Color the text based on value
  if (currentPH < 6.5) {
    valueDisplay.style.color = '#ef4444'; // Red
    statusDisplay.innerText = '(Acidic)';
    statusDisplay.style.color = '#ef4444';
  } else if (currentPH > 7.5) {
    valueDisplay.style.color = '#3b82f6'; // Blue
    statusDisplay.innerText = '(Basic)';
    statusDisplay.style.color = '#3b82f6';
  } else {
    valueDisplay.style.color = '#22c55e'; // Green
    statusDisplay.innerText = '(Neutral)';
    statusDisplay.style.color = '#22c55e';
  }
}

function startGame() {
  if (!gameAudioContext)
    gameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (gameAudioContext.state === 'suspended') gameAudioContext.resume();

  players = [];
  const currentRoles = isRolesSwapped
    ? [playerRoles[1], playerRoles[0]]
    : [playerRoles[0], playerRoles[1]];

  for (let i = 0; i < 2; i++) {
    const nameVal = document.getElementById(`playerNameInput${i}`).value.trim();
    players.push({
      id: i,
      name: nameVal || `Player ${i + 1}`,
      color: currentRoles[i].color,
      role: currentRoles[i].role,
      type: currentRoles[i].type
    });
  }

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  initGame();
}

function initGame() {
  board = Array(6)
    .fill(null)
    .map(() => Array(6).fill(null));
  currentPlayerIndex = 0;
  currentPH = 7.0; // Reset pH
  updatePHDisplay();

  const boardElement = document.getElementById('gameBoard');
  boardElement.innerHTML = '';
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('data-x', x);
      cell.setAttribute('data-y', y);
      boardElement.appendChild(cell);
    }
  }
  const indicatorsElement = document.getElementById('columnIndicators');
  indicatorsElement.innerHTML = '';
  for (let x = 0; x < 6; x++) {
    const indicator = document.createElement('div');
    indicator.className = 'column-indicator';
    indicator.textContent = '▼';
    indicator.onclick = () => dropPiece(x);
    indicatorsElement.appendChild(indicator);
  }
  document.getElementById('xLabels').innerHTML = xCategories
    .map((cat) => `<div class="x-label">${cat}</div>`)
    .join('');
  document.getElementById('yLabels').innerHTML = yCategories
    .map((cat) => `<div class="y-label">${cat}</div>`)
    .join('');
  updateCurrentPlayer();
}

function updateCurrentPlayer() {
  const player = players[currentPlayerIndex];
  document.getElementById('currentPlayerIndicator').style.background =
    player.color;
  document.getElementById('currentPlayerName').textContent =
    player.name + ` (${player.role})`;
  document.getElementById('currentPlayerName').style.color = player.color;
}

function dropPiece(column) {
  let targetRow = -1;
  for (let y = 5; y >= 0; y--) {
    if (board[y][column] === null) {
      targetRow = y;
      break;
    }
  }
  if (targetRow === -1) {
    showToast('This burette is full! Choose another.', 'error');
    return;
  }
  selectedColumn = { x: column, y: targetRow };
  const xCat = xCategories[column];
  const yCat = yCategories[targetRow];
  const questionEnding = yCat.trim().endsWith('?') ? '' : '?';
  document.getElementById(
    'questionText'
  ).innerText = `Topic: ${xCat}\n\n${yCat}${questionEnding}`;
  const input = document.getElementById('answerInput');
  input.value = '';
  document.getElementById('answerModal').style.display = 'flex';
  input.focus();
}

function submitAnswer() {
  if (gameAudioContext && gameAudioContext.state === 'suspended')
    gameAudioContext.resume();
  if (!selectedColumn) return;

  const answerInput = document.getElementById('answerInput');
  const userAnswer = answerInput.value.trim().toLowerCase();

  if (userAnswer === '') {
    showToast('Please enter an answer!', 'info');
    return;
  }

  const targetCell = { x: selectedColumn.x, y: selectedColumn.y };
  const validAnswersForCell =
    validAnswers[`${targetCell.x}-${targetCell.y}`] || [];
  let isCorrect = false;

  if (validAnswersForCell.length === 0) {
    isCorrect = true;
  } else {
    for (let validAnswer of validAnswersForCell) {
      const validLower = validAnswer.toLowerCase().trim();
      const distance = getLevenshteinDistance(userAnswer, validLower);
      const allowedErrors =
        validLower.length > 6 ? 2 : validLower.length > 3 ? 1 : 0;
      if (
        userAnswer === validLower ||
        (distance <= allowedErrors && distance > 0)
      ) {
        isCorrect = true;
        break;
      }
    }
  }

  closeModal();

  if (isCorrect) {
    playSound('correct');
    showToast('Correct Answer!', 'success');

    const player = players[currentPlayerIndex];

    // UPDATE BOARD DATA
    board[targetCell.y][targetCell.x] = currentPlayerIndex;

    // CALCULATE NEW STRATEGIC PH
    currentPH = calculateStrategicPH();
    updatePHDisplay();

    const cellElement = document.querySelector(
      `#gameBoard [data-x="${targetCell.x}"][data-y="${targetCell.y}"]`
    );

    if (cellElement) {
      cellElement.classList.add('falling');
      cellElement.style.background = player.color;
      cellElement.classList.add('filled');
      cellElement.textContent = userAnswer.substring(0, 6).toUpperCase();

      setTimeout(() => {
        cellElement.classList.remove('falling');
        if (targetCell.y < 5) {
          const belowIndex = board[targetCell.y + 1][targetCell.x];
          if (belowIndex !== null && belowIndex !== currentPlayerIndex) {
            playSound('fizz');
            createReactionEffect(targetCell.x, targetCell.y, 'smoke');
          } else {
            playSound('drop');
            createReactionEffect(targetCell.x, targetCell.y, 'bubble');
          }
        } else {
          playSound('drop');
          createReactionEffect(targetCell.x, targetCell.y, 'bubble');
        }

        if (checkWinner(targetCell.x, targetCell.y)) {
          setTimeout(() => showWinner(), 300);
          return;
        }

        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        updateCurrentPlayer();
      }, 600);
    }
  } else {
    playSound('wrong');
    showToast("Wrong! Next player's turn.", 'error');
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateCurrentPlayer();
  }
}

function closeModal() {
  document.getElementById('answerModal').style.display = 'none';
  selectedColumn = null;
}

function checkWinner(lastX, lastY) {
  const player = currentPlayerIndex;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];
  for (let d of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const x = lastX + d[0] * i;
      const y = lastY + d[1] * i;
      if (x < 0 || x > 5 || y < 0 || y > 5) break;
      if (board[y][x] === player) count++;
      else break;
    }
    for (let i = 1; i < 4; i++) {
      const x = lastX - d[0] * i;
      const y = lastY - d[1] * i;
      if (x < 0 || x > 5 || y < 0 || y > 5) break;
      if (board[y][x] === player) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

function showWinner() {
  const player = players[currentPlayerIndex];
  document.getElementById('winnerColor').style.background = player.color;
  document.getElementById('winnerName').textContent = player.name;

  // Display final pH in winner modal
  document.getElementById(
    'finalPH'
  ).textContent = `Final Solution pH: ${currentPH.toFixed(1)}`;

  document.getElementById('winnerModal').style.display = 'flex';
  playSound('win');
}

function resetGame() {
  document.getElementById('winnerModal').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  document.getElementById('gameScreen').style.display = 'none';
  players = [];
  initPlayerSetup();
}

function openHelp() {
  document.getElementById('helpModal').style.display = 'flex';
}

function closeHelp() {
  document.getElementById('helpModal').style.display = 'none';
}

window.onclick = function (event) {
  const helpModal = document.getElementById('helpModal');
  if (event.target === helpModal) {
    helpModal.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initPlayerSetup();
  document.getElementById('answerInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });
});
