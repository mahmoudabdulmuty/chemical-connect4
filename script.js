const availableColors = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c'
];

// COLUMNS (Titrants)
const defaultXCategories = [
  'KMnO4',
  'K2Cr2O7',
  'Ce(SO4)2',
  'I2',
  'KIO3',
  'KBrO3'
];

// ROWS (Questions)
// Row 0 is TOP (Hardest/Last), Row 5 is BOTTOM (Easiest/First)
const defaultYCategories = [
  'Does this titrant face auto-decomposition?', // Row 0 (Top)
  'What is the application of', // Row 1
  'What is the color of', // Row 2
  'What is the type of indicator used with', // Row 3
  'What is the final reduction product of', // Row 4
  'Is this titrant considered a 1ry standard' // Row 5 (Bottom - First Question)
];

// ANSWERS (Mapped to new reversed rows)
const defaultAnswers = {
  // --- Column 0: KMnO4 ---
  '0-0': ['yes', 'light sensitive', 'mno2 catalyzes'], // Auto-decomp (Top)
  '0-1': [
    'redox titration',
    'iron determination',
    'oxalate',
    'hydrogen peroxide',
    'h2o2',
    'fe',
    'fe2+',
    'fe3+'
  ], // Application
  '0-2': ['purple', 'violet', 'deep purple'], // Color
  '0-3': ['self indicator', 'none', 'self', 'permanganate itself'], // Indicator
  '0-4': [
    'mn2+',
    'manganese(ii)',
    'mno2',
    'manganese dioxide',
    'mno42-',
    'manganate'
  ], // Reduction Product
  '0-5': ['no', 'secondary standard'], // 1ry Standard (Bottom)

  // --- Column 1: K2Cr2O7 ---
  '1-0': ['no', 'stable'], // Auto-decomp (Top)
  '1-1': [
    'cod',
    'chemical oxygen demand',
    'iron determination',
    'alcohol determination',
    'fe2+'
  ], // Application
  '1-2': ['orange', 'orange-red'], // Color
  '1-3': [
    'diphenylamine',
    'bds',
    'diphenylbenzidine',
    'redox indicator',
    'internal'
  ], // Indicator
  '1-4': ['cr3+', 'chromium(iii)', 'green ion'], // Reduction Product
  '1-5': ['yes', 'primary standard'], // 1ry Standard (Bottom)

  // --- Column 2: Ce(SO4)2 ---
  '2-0': ['no', 'stable', 'very stable'], // Auto-decomp (Top)
  '2-1': ['redox titration', 'drug analysis', 'paracetamol', 'oxalate', 'fe'], // Application
  '2-2': ['yellow', 'orange-yellow'], // Color
  '2-3': ['ferroin', 'n-phenylanthranilic acid', 'diphenylamine'], // Indicator
  '2-4': ['ce3+', 'cerium(iii)', 'colorless'], // Reduction Product
  '2-5': ['no', 'secondary standard', 'usually standardized'], // 1ry Standard (Bottom)

  // --- Column 3: I2 ---
  '3-0': ['yes', 'volatile', 'sublimes', 'disproportionates in base'], // Auto-decomp (Top)
  '3-1': [
    'iodimetry',
    'vitamin c',
    'ascorbic acid',
    'sulfides',
    'iodometry',
    'so3--',
    's2o3--'
  ], // Application
  '3-2': ['brown', 'red-brown', 'violet vapor'], // Color
  '3-3': ['starch', 'starch mucilage'], // Indicator
  '3-4': ['i-', 'iodide'], // Reduction Product
  '3-5': ['no', 'secondary standard', 'volatile'], // 1ry Standard (Bottom)

  // --- Column 4: KIO3 ---
  '4-0': ['no', 'stable'], // Auto-decomp (Top)
  '4-1': [
    'andrew',
    "andrew's titration",
    'iodine source',
    'standardizing thiosulfate'
  ], // Application
  '4-2': ['colorless', 'white solid'], // Color
  '4-3': ['starch', 'chloroform', 'chcl3', 'extraction'], // Indicator
  '4-4': ['i2', 'i-', 'i+'], // Reduction Product
  '4-5': ['yes', 'primary standard'], // 1ry Standard (Bottom)

  // --- Column 5: KBrO3 ---
  '5-0': ['no', 'stable'], // Auto-decomp (Top)
  '5-1': ['mg2+', 'al3+', 'phenol'], // Application
  '5-2': ['colorless', 'white solid'], // Color
  '5-3': ['methyl orange', 'methyl red', 'naphthol blue black', 'irreversible'], // Indicator
  '5-4': ['br-', 'bromide'], // Reduction Product
  '5-5': ['yes', 'primary standard'] // 1ry Standard (Bottom)
};

let xCategories = [];
let yCategories = [];
let validAnswers = {};
let players = [];
let currentPlayerIndex = 0;
let board = Array(6)
  .fill(null)
  .map(() => Array(6).fill(null));
let selectedColumn = null;
let gameAudioContext = null;

/* --- FEATURE 1: LEVENSHTEIN DISTANCE (Fuzzy Matching) --- */
function getLevenshteinDistance(a, b) {
  const matrix = [];

  // 1. Setup matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // 2. Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/* --- FEATURE 2: ADVANCED SOUND ENGINE --- */
function playSound(type) {
  if (!gameAudioContext) {
    gameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (gameAudioContext.state === 'suspended') {
    gameAudioContext.resume();
  }

  const now = gameAudioContext.currentTime;
  const osc = gameAudioContext.createOscillator();
  const gain = gameAudioContext.createGain();

  osc.connect(gain);
  gain.connect(gameAudioContext.destination);

  switch (type) {
    case 'drop':
      // Low thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'correct':
      // Happy "Ding" (High Sine + Triangle)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.linearRampToValueAtTime(1046.5, now + 0.1); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    case 'wrong':
      // Dissonant "Buzz"
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'win':
      // Victory Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C E G C E
      notes.forEach((freq, i) => {
        const o = gameAudioContext.createOscillator();
        const g = gameAudioContext.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(gameAudioContext.destination);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.2);
      });
      break;
  }
}

/* --- FEATURE 3: TOAST NOTIFICATIONS --- */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  // Set icon based on type
  let icon = '';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'info') icon = 'ℹ';

  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // Remove element from DOM after animation finishes (3 seconds total)
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function loadData() {
  const savedX = localStorage.getItem('chemConnect4XLabels');
  const savedY = localStorage.getItem('chemConnect4YLabels');
  const savedAnswers = localStorage.getItem('chemConnect4Answers');

  xCategories = savedX ? JSON.parse(savedX) : [...defaultXCategories];
  yCategories = savedY ? JSON.parse(savedY) : [...defaultYCategories];
  validAnswers = savedAnswers
    ? JSON.parse(savedAnswers)
    : JSON.parse(JSON.stringify(defaultAnswers));

  console.log('Loaded data:', { xCategories, yCategories, validAnswers });
}

function saveData() {
  localStorage.setItem('chemConnect4XLabels', JSON.stringify(xCategories));
  localStorage.setItem('chemConnect4YLabels', JSON.stringify(yCategories));
  localStorage.setItem('chemConnect4Answers', JSON.stringify(validAnswers));
  console.log('Saved data:', { xCategories, yCategories, validAnswers });
}

loadData();

function initPlayerSetup() {
  const playerCount = parseInt(document.getElementById('playerCount').value);
  const container = document.getElementById('playersConfig');
  container.innerHTML = '';
  players = [];

  for (let i = 0; i < playerCount; i++) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
        <h3>Player ${i + 1}</h3>
        <input type="text" class="player-name-input" id="playerName${i}" placeholder="Enter name..." value="Player ${
      i + 1
    }">
        <div class="color-options" id="colorOptions${i}">
            ${availableColors
              .map(
                (color) => `
                <div class="color-btn" style="background: ${color}"
                     data-color="${color}"
                     onclick="selectColor(${i}, '${color}')"></div>
            `
              )
              .join('')}
        </div>
    `;
    container.appendChild(card);
  }

  for (let i = 0; i < playerCount; i++) {
    selectColor(i, availableColors[i]);
  }
}

function selectColor(playerIndex, color) {
  const colorTaken = players.some(
    (p) => p.id !== playerIndex && p.color === color
  );
  if (colorTaken) {
    showToast('This color is already taken! Please choose another.', 'info');
    return;
  }

  const colorOptions = document.getElementById(`colorOptions${playerIndex}`);
  if (!colorOptions) return;

  colorOptions
    .querySelectorAll('.color-btn')
    .forEach((btn) => btn.classList.remove('selected'));

  const selectedBtn = colorOptions.querySelector(`[data-color="${color}"]`);
  if (selectedBtn) selectedBtn.classList.add('selected');

  const nameInput = document.getElementById(`playerName${playerIndex}`);
  const playerName = nameInput
    ? nameInput.value.trim() || `Player ${playerIndex + 1}`
    : `Player ${playerIndex + 1}`;

  const existingPlayerIndex = players.findIndex((p) => p.id === playerIndex);
  if (existingPlayerIndex !== -1) {
    players[existingPlayerIndex].color = color;
    players[existingPlayerIndex].name = playerName;
  } else {
    players.push({ id: playerIndex, name: playerName, color: color });
  }
}

function toggleQuestionEditor() {
  const editor = document.getElementById('questionsEditor');
  const isVisible = editor.style.display === 'block';

  if (!isVisible) {
    renderQuestionEditor();
    editor.style.display = 'block';
  } else {
    editor.style.display = 'none';
  }
}

function renderQuestionEditor() {
  const grid = document.getElementById('questionGrid');
  grid.innerHTML = '';

  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 6; y++) {
      const key = `${x}-${y}`;
      const answers = validAnswers[key] || [];

      const item = document.createElement('div');
      item.className = 'question-item';
      item.innerHTML = `
            <h4>Cell (${x}, ${y})</h4>
            <div class="label-row">
              <div class="label-field">
                <label>X-Label (Column ${x}):</label>
                <input type="text" id="xlabel-${x}-${y}" value="${
        xCategories[x]
      }">
              </div>
              <div class="label-field">
                <label>Y-Label (Row ${y}):</label>
                <input type="text" id="ylabel-${x}-${y}" value="${
        yCategories[y]
      }">
              </div>
            </div>
            <div class="answers-field">
              <label>Valid Answers:</label>
              <textarea id="answers-${key}" placeholder="Enter answers separated by commas...">${answers.join(
        ', '
      )}</textarea>
            </div>
        `;
      grid.appendChild(item);
    }
  }
}

function saveQuestions() {
  // Collect X and Y labels from the first occurrence of each
  const newXCategories = [];
  const newYCategories = [];

  // Get X labels from row 0
  for (let x = 0; x < 6; x++) {
    const input = document.getElementById(`xlabel-${x}-0`);
    if (input) newXCategories[x] = input.value.trim();
  }

  // Get Y labels from column 0
  for (let y = 0; y < 6; y++) {
    const input = document.getElementById(`ylabel-0-${y}`);
    if (input) newYCategories[y] = input.value.trim();
  }

  // Validate that all labels are consistent across cells
  let inconsistent = false;
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 6; y++) {
      const xInput = document.getElementById(`xlabel-${x}-${y}`);
      const yInput = document.getElementById(`ylabel-${x}-${y}`);
      if (xInput && xInput.value.trim() !== newXCategories[x]) {
        inconsistent = true;
      }
      if (yInput && yInput.value.trim() !== newYCategories[y]) {
        inconsistent = true;
      }
    }
  }

  if (inconsistent) {
    if (
      !confirm(
        'Warning: Some X or Y labels are inconsistent across cells. The labels from the first row/column will be used. Continue?'
      )
    ) {
      return;
    }
  }

  xCategories = newXCategories;
  yCategories = newYCategories;

  // Save answers
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 6; y++) {
      const key = `${x}-${y}`;
      const textarea = document.getElementById(`answers-${key}`);
      if (textarea) {
        const value = textarea.value.trim();
        validAnswers[key] = value
          ? value
              .split(',')
              .map((a) => a.trim().toLowerCase())
              .filter((a) => a.length > 0)
          : [];
      }
    }
  }

  saveData();
  showToast('All changes saved successfully!', 'success');
  toggleQuestionEditor();
}

function resetToDefault() {
  if (confirm('Are you sure you want to reset everything to default values?')) {
    xCategories = [...defaultXCategories];
    yCategories = [...defaultYCategories];
    validAnswers = JSON.parse(JSON.stringify(defaultAnswers));
    saveData();
    renderQuestionEditor();
    showToast('Reset to default values!', 'info');
  }
}

function startGame() {
  // --- ADD THESE LINES TO UNLOCK AUDIO ---
  if (!gameAudioContext) {
    gameAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (gameAudioContext.state === 'suspended') {
    gameAudioContext.resume();
  }

  const playerCount = parseInt(document.getElementById('playerCount').value);

  for (let i = 0; i < playerCount; i++) {
    const nameInput = document.getElementById(`playerName${i}`);
    const playerName = nameInput
      ? nameInput.value.trim() || `Player ${i + 1}`
      : `Player ${i + 1}`;
    const player = players.find((p) => p.id === i);
    if (player) player.name = playerName;
  }

  if (players.length !== playerCount) {
    showToast('Please select colors for all players', 'error');
    return;
  }

  players.sort((a, b) => a.id - b.id);
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  initGame();
}

function initGame() {
  board = Array(6)
    .fill(null)
    .map(() => Array(6).fill(null));
  currentPlayerIndex = 0;

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
  document.getElementById('currentPlayerName').textContent = player.name;
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
    showToast('This column is full! Choose another column.', 'error');
    return;
  }

  selectedColumn = { x: column, y: targetRow };

  const xCat = xCategories[column];
  const yCat = yCategories[targetRow];

  // This formats the text to look like a clean Question Card
  const questionText = document.getElementById('questionText');

  // We add a question mark (?) automatically if the text doesn't have one
  const questionEnding = yCat.trim().endsWith('?') ? '' : '?';

  // This sets the text to:
  // "Topic: KMnO4"
  // "What is the color of?"
  questionText.innerText = `Topic: ${xCat}\n\n${yCat}${questionEnding}`;

  const input = document.getElementById('answerInput');
  input.value = '';
  // Removed Rich Text clearing since element is gone

  document.getElementById('answerModal').style.display = 'flex';
  input.focus();
}

function submitAnswer() {
  if (gameAudioContext && gameAudioContext.state === 'suspended') {
    gameAudioContext.resume();
  }

  if (!selectedColumn) return;

  const answerInput = document.getElementById('answerInput');
  const userAnswer = answerInput.value.trim().toLowerCase();

  if (userAnswer === '') {
    showToast('Please enter an answer!', 'info');
    return;
  }

  const targetCell = { x: selectedColumn.x, y: selectedColumn.y };
  const key = `${targetCell.x}-${targetCell.y}`;
  const validAnswersForCell = validAnswers[key] || [];

  let isCorrect = false;

  // Logic for Empty Cells (Free Space)
  if (validAnswersForCell.length === 0) {
    isCorrect = true;
  } else {
    for (let validAnswer of validAnswersForCell) {
      const validLower = validAnswer.toLowerCase().trim();

      // 1. Direct Match
      if (userAnswer === validLower) {
        isCorrect = true;
        break;
      }

      // 2. Fuzzy Match
      // Allow 1 error for words > 3 chars, 2 errors for words > 6 chars
      const distance = getLevenshteinDistance(userAnswer, validLower);
      const allowedErrors =
        validLower.length > 6 ? 2 : validLower.length > 3 ? 1 : 0;

      if (distance <= allowedErrors && distance > 0) {
        console.log(
          `Fuzzy match accepted: ${userAnswer} vs ${validLower} (Dist: ${distance})`
        );
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
    board[targetCell.y][targetCell.x] = currentPlayerIndex;

    const cellElement = document.querySelector(
      `#gameBoard [data-x="${targetCell.x}"][data-y="${targetCell.y}"]`
    );
    if (!cellElement) return;

    cellElement.classList.add('falling');
    cellElement.style.background = player.color;
    cellElement.classList.add('filled');

    // Format Display Text (Capitalize)
    cellElement.textContent = userAnswer.substring(0, 6).toUpperCase();
    cellElement.style.color = 'white';
    cellElement.style.fontWeight = 'bold';

    setTimeout(() => {
      cellElement.classList.remove('falling');
      playSound('drop'); // Feature 3: Thud sound when it lands

      if (checkWinner(targetCell.x, targetCell.y)) {
        setTimeout(() => showWinner(), 300);
        return;
      }

      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      updateCurrentPlayer();
    }, 800);
  } else {
    playSound('wrong');
    // NO SPOILER: Just says wrong.
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

  let count = 1;
  for (let x = lastX - 1; x >= 0; x--) {
    if (board[lastY][x] === player) count++;
    else break;
  }
  for (let x = lastX + 1; x < 6; x++) {
    if (board[lastY][x] === player) count++;
    else break;
  }
  if (count >= 4) return true;

  count = 1;
  for (let y = lastY - 1; y >= 0; y--) {
    if (board[y][lastX] === player) count++;
    else break;
  }
  for (let y = lastY + 1; y < 6; y++) {
    if (board[y][lastX] === player) count++;
    else break;
  }
  if (count >= 4) return true;

  count = 1;
  for (let i = 1; lastX - i >= 0 && lastY - i >= 0; i++) {
    if (board[lastY - i][lastX - i] === player) count++;
    else break;
  }
  for (let i = 1; lastX + i < 6 && lastY + i < 6; i++) {
    if (board[lastY + i][lastX + i] === player) count++;
    else break;
  }
  if (count >= 4) return true;

  count = 1;
  for (let i = 1; lastX + i < 6 && lastY - i >= 0; i++) {
    if (board[lastY - i][lastX + i] === player) count++;
    else break;
  }
  for (let i = 1; lastX - i >= 0 && lastY + i < 6; i++) {
    if (board[lastY + i][lastX - i] === player) count++;
    else break;
  }
  if (count >= 4) return true;

  return false;
}

function showWinner() {
  const player = players[currentPlayerIndex];
  document.getElementById('winnerColor').style.background = player.color;
  document.getElementById('winnerName').textContent = player.name;
  document.getElementById('winnerModal').style.display = 'flex';

  playSound('win');
}

function resetGame() {
  document.getElementById('winnerModal').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  players = [];
  initPlayerSetup();
}

document.addEventListener('DOMContentLoaded', () => {
  initPlayerSetup();

  // Answer Input Keypress
  const answerInput = document.getElementById('answerInput');
  answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });

  document
    .getElementById('playerCount')
    .addEventListener('change', initPlayerSetup);
});
