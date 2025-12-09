/**
 * CHEMICAL CONNECT 4 - MAIN APPLICATION
 *
 * TABLE OF CONTENTS:
 * 1. CONFIGURATION & CONSTANTS
 * 2. APP STATE
 * 3. AUDIO SYSTEM
 * 4. HELPER UTILITIES
 * 5. GAME LOGIC (AI & STRATEGY)
 * 6. VISUAL EFFECTS
 * 7. GAME FLOW CONTROLLERS
 * 8. UI INTERACTION HANDLERS
 * 9. INITIALIZATION
 */

/* =========================================
   1. CONFIGURATION & CONSTANTS
   ========================================= */

// UPDATED: Cleaner names (removed parenthetical colors)
const PLAYER_ROLES = [
  { role: 'Acid', color: '#ef4444', type: 'acid' },
  { role: 'Base', color: '#3b82f6', type: 'base' }
];

// Categories for Columns (X-axis) - The titrants/chemicals
const DEFAULT_X_CATEGORIES = [
  'KMnO4',
  'K2Cr2O7',
  'Ce(SO4)2',
  'I2',
  'KIO3',
  'KBrO3'
];

// Categories for Rows (Y-axis) - The questions to answer
const DEFAULT_Y_CATEGORIES = [
  'Does this titrant face auto-decomposition?',
  'What is the application of',
  'What is the color of',
  'What is the type of indicator used with',
  'What is the final reduction product of',
  'Is this titrant considered a 1ry standard'
];

// The Answer Key: Maps grid coordinates "Col-Row" to valid answers
const DEFAULT_ANSWERS = {
  // --- COLUMN 0: Potassium Permanganate (KMnO4) ---
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

  // --- COLUMN 1: Potassium Dichromate (K2Cr2O7) ---
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

  // --- COLUMN 2: Ceric Sulfate (Ce(SO4)2) ---
  '2-0': ['no', 'stable', 'very stable'],
  '2-1': ['redox titration', 'drug analysis', 'paracetamol', 'oxalate', 'fe'],
  '2-2': ['yellow', 'orange-yellow'],
  '2-3': ['ferroin', 'n-phenylanthranilic acid', 'diphenylamine'],
  '2-4': ['ce3+', 'cerium(iii)', 'colorless'],
  '2-5': ['no', 'secondary standard', 'usually standardized'],

  // --- COLUMN 3: Iodine (I2) ---
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

  // --- COLUMN 4: Potassium Iodate (KIO3) ---
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

  // --- COLUMN 5: Potassium Bromate (KBrO3) ---
  '5-0': ['no', 'stable'],
  '5-1': ['mg2+', 'al3+', 'phenol'],
  '5-2': ['colorless', 'white solid'],
  '5-3': ['methyl orange', 'methyl red', 'naphthol blue black', 'irreversible'],
  '5-4': ['br-', 'bromide'],
  '5-5': ['yes', 'primary standard']
};

/* =========================================
   2. APP STATE
   ========================================= */

let gameState = {
  isRolesSwapped: false,
  currentPH: 7.0,
  players: [],
  currentPlayerIndex: 0,
  board: [], // 6x6 Grid initialized in initGame
  selectedColumn: null, // Tracks user's pending move
  history: [], // Tracks question log for "Review" mode

  // Dynamic Content (can be shuffled in future versions)
  xCategories: [...DEFAULT_X_CATEGORIES],
  yCategories: [...DEFAULT_Y_CATEGORIES],
  validAnswers: JSON.parse(JSON.stringify(DEFAULT_ANSWERS))
};

/* =========================================
   3. AUDIO SYSTEM
   ========================================= */

let audioSys = {
  context: null,
  noiseBuffer: null
};

// Generates white noise buffer for "Fizz" effects
function getNoiseBuffer(ctx) {
  if (!audioSys.noiseBuffer) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    audioSys.noiseBuffer = buffer;
  }
  return audioSys.noiseBuffer;
}

// Plays synthesized sound effects (Oscillators)
function playSound(type) {
  if (!audioSys.context) {
    audioSys.context = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioSys.context.state === 'suspended') {
    audioSys.context.resume();
  }

  const ctx = audioSys.context;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  switch (type) {
    case 'drop':
      const oscDrop = ctx.createOscillator();
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
      const osc1 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(1200, now);
      osc1.connect(gain);
      const osc2 = ctx.createOscillator();
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
      const oscWrong = ctx.createOscillator();
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
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer(ctx);
      const noiseFilter = ctx.createBiquadFilter();
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
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
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

/* =========================================
   4. HELPER UTILITIES
   ========================================= */

// FUZZY MATCHING: Calculates difference between strings (for typos)
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
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

// CHEMISTRY FORMATTER: Converts "mn+2" -> "Mn²⁺" and "so4" -> "SO₄"
function formatChemistryText(text) {
  let formatted = text.toLowerCase();
  const twoCharElements = [
    'mn',
    'fe',
    'ce',
    'br',
    'cr',
    'cl',
    'mg',
    'al',
    'na'
  ];

  // Mask 2-letter elements
  twoCharElements.forEach((el, index) => {
    formatted = formatted.replace(new RegExp(el, 'gi'), `__${index}__`);
  });

  // Uppercase everything else & Restore masked elements
  formatted = formatted.toUpperCase();
  twoCharElements.forEach((el, index) => {
    const title = el.charAt(0).toUpperCase() + el.charAt(1);
    formatted = formatted.split(`__${index}__`).join(title);
  });

  // Apply Sub/Superscripts
  const map = {
    sup: {
      0: '⁰',
      1: '¹',
      2: '²',
      3: '³',
      4: '⁴',
      5: '⁵',
      6: '⁶',
      7: '⁷',
      8: '⁸',
      9: '⁹',
      '+': '⁺',
      '-': '⁻'
    },
    sub: {
      0: '₀',
      1: '₁',
      2: '₂',
      3: '₃',
      4: '₄',
      5: '₅',
      6: '₆',
      7: '₇',
      8: '₈',
      9: '₉'
    }
  };

  formatted = formatted.replace(/[+-]/g, (m) => map.sup[m]);
  formatted = formatted.replace(
    /(\d)(?=[⁺⁻])|(?<=[⁺⁻])(\d)/g,
    (m) => map.sup[m]
  );
  formatted = formatted.replace(/\d/g, (m) => map.sub[m]);

  return formatted;
}

// TEXT-TO-SPEECH: Reads questions aloud
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    let spoken = text
      .replace(/1ry/gi, 'primary')
      .replace(/2ry/gi, 'secondary')
      .replace(/3ry/gi, 'tertiary')
      .replace(/\+/g, ' plus ')
      .replace(/\-/g, ' minus ');

    const u = new SpeechSynthesisUtterance(spoken);
    u.pitch = 0.9;
    u.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    u.voice =
      voices.find(
        (v) => v.name.includes('Google US English') || v.name.includes('Zira')
      ) || null;
    window.speechSynthesis.speak(u);
  }
}

/* =========================================
   5. GAME LOGIC (AI & STRATEGY)
   ========================================= */

// Evaluates a window of 4 cells for strategic scoring
function evaluateWindow(window, piece) {
  const oppPiece = piece === 0 ? 1 : 0;
  const countPiece = window.filter((c) => c === piece).length;
  const countEmpty = window.filter((c) => c === null).length;
  const countOpp = window.filter((c) => c === oppPiece).length;

  if (countOpp > 0) return 0; // Blocked
  if (countPiece === 4) return 10000; // Win
  if (countPiece === 3 && countEmpty === 1) return 100; // Major Threat
  if (countPiece === 2 && countEmpty === 2) return 10; // Minor Threat
  return 0;
}

// Scores entire board to determine advantage
function scorePosition(board, piece) {
  let score = 0;

  // Center Column Bonus
  score += board.map((r) => r[3]).filter((x) => x === piece).length * 3;

  // Scan Windows (Horizontal, Vertical, Diagonal)
  const rows = 6,
    cols = 6;

  // Horizontal
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols - 3; c++)
      score += evaluateWindow(
        [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]],
        piece
      );

  // Vertical
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows - 3; r++)
      score += evaluateWindow(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        piece
      );

  // Diagonals
  for (let r = 0; r < rows - 3; r++) {
    for (let c = 0; c < cols - 3; c++) {
      score += evaluateWindow(
        [
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3]
        ],
        piece
      ); // /
      score += evaluateWindow(
        [
          board[r + 3][c],
          board[r + 2][c + 1],
          board[r + 1][c + 2],
          board[r][c + 3]
        ],
        piece
      ); // \
    }
  }
  return score;
}

// Updates the global pH value based on strategic score
function calculateStrategicPH() {
  const acidScore = scorePosition(gameState.board, 0);
  const baseScore = scorePosition(gameState.board, 1);
  const diff = baseScore - acidScore;

  const maxSwing = 200;
  let normalized = diff / maxSwing;
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;

  return parseFloat((7.0 + normalized * 7.0).toFixed(1));
}

// Checks for 4-in-a-row winner
function checkWinner(lastX, lastY) {
  const p = gameState.currentPlayerIndex;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  for (let d of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      // Forward
      const x = lastX + d[0] * i,
        y = lastY + d[1] * i;
      if (x < 0 || x > 5 || y < 0 || y > 5 || gameState.board[y][x] !== p)
        break;
      count++;
    }
    for (let i = 1; i < 4; i++) {
      // Backward
      const x = lastX - d[0] * i,
        y = lastY - d[1] * i;
      if (x < 0 || x > 5 || y < 0 || y > 5 || gameState.board[y][x] !== p)
        break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
}

/* =========================================
   6. VISUAL EFFECTS
   ========================================= */

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Particle Effects (Smoke/Bubbles)
function createReactionEffect(x, y, type) {
  const cell = document.querySelector(
    `#gameBoard [data-x="${x}"][data-y="${y}"]`
  );
  if (!cell) return;
  const rect = cell.getBoundingClientRect();
  const container = document.getElementById('particles-container');

  for (let i = 0; i < (type === 'smoke' ? 15 : 8); i++) {
    const p = document.createElement('div');
    p.classList.add('particle', type === 'smoke' ? 'smoke' : 'bubble');
    p.style.left = rect.left + rect.width / 2 + Math.random() * 40 - 20 + 'px';
    p.style.top = rect.top + rect.height / 2 + Math.random() * 40 - 20 + 'px';
    p.style.width = p.style.height = Math.random() * 10 + 5 + 'px';
    container.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

// Updates the pH Meter UI (Simplified: No Reactive Backgrounds)
function updatePHDisplay() {
  const needle = document.getElementById('phNeedle');
  const valDisp = document.getElementById('phValue');
  const statDisp = document.getElementById('phStatus');

  const ph = gameState.currentPH;
  needle.style.left = `${(ph / 14) * 100}%`;
  valDisp.innerText = ph.toFixed(1);

  if (ph < 6.5) {
    valDisp.style.color = statDisp.style.color = '#ef4444';
    statDisp.innerText = '(Acidic)';
  } else if (ph > 7.5) {
    valDisp.style.color = statDisp.style.color = '#3b82f6';
    statDisp.innerText = '(Basic)';
  } else {
    valDisp.style.color = statDisp.style.color = '#22c55e';
    statDisp.innerText = '(Neutral)';
  }
}

/* =========================================
   7. GAME FLOW CONTROLLERS
   ========================================= */

// Builds the lobby UI
function initPlayerSetup() {
  const container = document.getElementById('playersConfig');
  container.innerHTML = '';

  const roles = gameState.isRolesSwapped
    ? [PLAYER_ROLES[1], PLAYER_ROLES[0]]
    : [PLAYER_ROLES[0], PLAYER_ROLES[1]];

  roles.forEach((roleData, i) => {
    const existingName = gameState.players[i]
      ? gameState.players[i].name
      : `Player ${i + 1}`;
    container.innerHTML += `
      <div class="player-card">
        <h3>${i === 0 ? 'Team 1' : 'Team 2'}</h3>
        <input type="text" class="player-name-input" id="playerNameInput${i}" value="${existingName}" placeholder="Enter Name">
        <div class="fixed-color-display" style="background: ${
          roleData.color
        }; color: ${roleData.color}"></div>
        <p class="role-label" style="color: ${roleData.color}">${
      roleData.role
    }</p>
      </div>`;
  });
}

function startGame() {
  if (!audioSys.context)
    audioSys.context = new (window.AudioContext || window.webkitAudioContext)();
  if (audioSys.context.state === 'suspended') audioSys.context.resume();

  gameState.players = [];
  const roles = gameState.isRolesSwapped
    ? [PLAYER_ROLES[1], PLAYER_ROLES[0]]
    : [PLAYER_ROLES[0], PLAYER_ROLES[1]];

  for (let i = 0; i < 2; i++) {
    const name =
      document.getElementById(`playerNameInput${i}`).value.trim() ||
      `Player ${i + 1}`;
    gameState.players.push({ id: i, name, ...roles[i] });
  }

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  initGame();
}

function initGame() {
  gameState.board = Array(6)
    .fill(null)
    .map(() => Array(6).fill(null));
  gameState.currentPlayerIndex = 0;
  gameState.currentPH = 7.0;
  gameState.history = []; // Clear review log

  updatePHDisplay();

  const boardEl = document.getElementById('gameBoard');
  boardEl.innerHTML = '';
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('data-x', x);
      cell.setAttribute('data-y', y);
      boardEl.appendChild(cell);
    }
  }

  const indEl = document.getElementById('columnIndicators');
  indEl.innerHTML = '';
  for (let x = 0; x < 6; x++) {
    const arr = document.createElement('div');
    arr.className = 'column-indicator';
    arr.textContent = '▼';
    arr.onclick = () => dropPiece(x);
    indEl.appendChild(arr);
  }

  // Format X Labels nicely (Subscripts)
  document.getElementById('xLabels').innerHTML = gameState.xCategories
    .map((c) => `<div class="x-label">${formatChemistryText(c)}</div>`)
    .join('');

  document.getElementById('yLabels').innerHTML = gameState.yCategories
    .map((c) => `<div class="y-label">${c}</div>`)
    .join('');

  updateCurrentPlayerUI();
}

function updateCurrentPlayerUI() {
  const p = gameState.players[gameState.currentPlayerIndex];
  document.getElementById('currentPlayerIndicator').style.background = p.color;
  const nameEl = document.getElementById('currentPlayerName');

  // UPDATED: Design - "Player Name • Role" instead of "Player Name (Role)"
  nameEl.innerHTML = `${p.name} <span style="opacity:0.6; margin:0 5px;">•</span> ${p.role}`;
  nameEl.style.color = p.color;
}

function resetGame() {
  document.getElementById('winnerModal').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  document.getElementById('gameScreen').style.display = 'none';
  gameState.players = [];
  initPlayerSetup();
}

function swapRoles() {
  gameState.isRolesSwapped = !gameState.isRolesSwapped;
  // Preserve names during swap
  const p1 = document.getElementById('playerNameInput0').value;
  const p2 = document.getElementById('playerNameInput1').value;
  gameState.players = [{ name: p1 }, { name: p2 }];
  initPlayerSetup();
}

/* =========================================
   8. UI INTERACTION HANDLERS
   ========================================= */

// Handles column click -> Finds row -> Opens Question
function dropPiece(column) {
  let targetRow = -1;
  for (let y = 5; y >= 0; y--) {
    if (gameState.board[y][column] === null) {
      targetRow = y;
      break;
    }
  }

  if (targetRow === -1) return showToast('This burette is full!', 'error');

  gameState.selectedColumn = { x: column, y: targetRow };
  const q = `${gameState.yCategories[targetRow]}${
    gameState.yCategories[targetRow].endsWith('?') ? '' : '?'
  }`;
  const text = `Topic: ${gameState.xCategories[column]}\n\n${q}`;

  document.getElementById('questionText').innerText = text;
  speakText(text.replace('\n\n', '. '));

  document.getElementById('answerInput').value = '';
  document.getElementById('answerModal').style.display = 'flex';
  document.getElementById('answerInput').focus();
}

// Handles Answer Submission
function submitAnswer() {
  if (!gameState.selectedColumn) return;
  const input = document
    .getElementById('answerInput')
    .value.trim()
    .toLowerCase();
  if (!input) return showToast('Please enter an answer!', 'info');

  const { x, y } = gameState.selectedColumn;
  const valid = gameState.validAnswers[`${x}-${y}`] || [];
  let isCorrect = valid.length === 0; // If no answers defined, assume correct (debug)

  // Check fuzzy match
  if (!isCorrect) {
    for (let ans of valid) {
      const dist = getLevenshteinDistance(input, ans.toLowerCase());
      const allowed = ans.length > 6 ? 2 : ans.length > 3 ? 1 : 0;
      if (input === ans.toLowerCase() || (dist <= allowed && dist > 0)) {
        isCorrect = true;
        break;
      }
    }
  }

  // --- LOG HISTORY FOR REVIEW ---
  gameState.history.push({
    player: gameState.players[gameState.currentPlayerIndex].name,
    topic: gameState.xCategories[x],
    question: gameState.yCategories[y],
    userAnswer: input,
    isCorrect: isCorrect,
    validAnswers: valid
  });

  closeModal();

  if (isCorrect) {
    handleCorrectMove(x, y, input);
  } else {
    playSound('wrong');
    showToast('Wrong! Turn lost.', 'error');
    nextTurn();
  }
}

// Executes a successful move
function handleCorrectMove(x, y, answerText) {
  playSound('correct');
  showToast('Correct!', 'success');

  gameState.board[y][x] = gameState.currentPlayerIndex;
  gameState.currentPH = calculateStrategicPH();
  updatePHDisplay();

  const cell = document.querySelector(
    `#gameBoard [data-x="${x}"][data-y="${y}"]`
  );
  const player = gameState.players[gameState.currentPlayerIndex];

  cell.classList.add('falling', 'filled');
  cell.style.background = player.color;
  cell.textContent = formatChemistryText(answerText);

  // Animation delay
  setTimeout(() => {
    cell.classList.remove('falling');
    // Reaction Effects
    if (y < 5) {
      const below = gameState.board[y + 1][x];
      if (below !== null && below !== gameState.currentPlayerIndex) {
        playSound('fizz');
        createReactionEffect(x, y, 'smoke');
      } else {
        playSound('drop');
        createReactionEffect(x, y, 'bubble');
      }
    } else {
      playSound('drop');
      createReactionEffect(x, y, 'bubble');
    }

    if (checkWinner(x, y)) showWinner();
    else nextTurn();
  }, 600);
}

function nextTurn() {
  gameState.currentPlayerIndex =
    (gameState.currentPlayerIndex + 1) % gameState.players.length;
  updateCurrentPlayerUI();
}

function showWinner() {
  const p = gameState.players[gameState.currentPlayerIndex];
  document.getElementById('winnerColor').style.background = p.color;
  document.getElementById('winnerName').textContent = p.name;
  document.getElementById(
    'finalPH'
  ).textContent = `Final Solution pH: ${gameState.currentPH.toFixed(1)}`;
  document.getElementById('winnerModal').style.display = 'flex';
  playSound('win');
}

function closeModal() {
  document.getElementById('answerModal').style.display = 'none';
  gameState.selectedColumn = null;
  window.speechSynthesis.cancel();
}

function openHelp() {
  document.getElementById('helpModal').style.display = 'flex';
}
function closeHelp() {
  document.getElementById('helpModal').style.display = 'none';
}

// Review Modal Logic
function openReviewModal() {
  document.getElementById('winnerModal').style.display = 'none'; // Close winner modal
  const list = document.getElementById('reviewList');
  list.innerHTML = '';

  if (gameState.history.length === 0) {
    list.innerHTML =
      '<p style="text-align:center; padding:20px;">No questions answered yet.</p>';
  }

  gameState.history.forEach((item) => {
    const card = document.createElement('div');
    card.className = `review-item ${item.isCorrect ? 'correct' : 'wrong'}`;
    const acceptedStr =
      item.validAnswers && item.validAnswers.length > 0
        ? item.validAnswers[0]
        : 'Free Space';

    card.innerHTML = `
      <div class="review-meta">
        <span>👤 ${item.player}</span>
        <span>${item.isCorrect ? '✅ Correct' : '❌ Wrong'}</span>
      </div>
      <div class="review-q">
        <span style="color:#818cf8">${item.topic}:</span> ${item.question}
      </div>
      <div class="review-ans">
        You said: "<strong>${item.userAnswer}</strong>"
      </div>
      ${
        !item.isCorrect
          ? `
        <div class="review-note">
          💡 Note: Accepted answer was "${acceptedStr}".
        </div>
      `
          : ''
      }
    `;
    list.appendChild(card);
  });
  document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
  document.getElementById('reviewModal').style.display = 'none';
  resetGame(); // Go back to "First Page" (Setup Screen)
}

/* =========================================
   9. INITIALIZATION
   ========================================= */

// Event Listeners
window.addEventListener('click', (e) => {
  if (e.target === document.getElementById('helpModal')) closeHelp();
  if (e.target === document.getElementById('reviewModal')) closeReviewModal();
});

document.addEventListener('DOMContentLoaded', () => {
  initPlayerSetup();
  document.getElementById('answerInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });
});
