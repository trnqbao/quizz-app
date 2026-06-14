const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Read Excel file
const filePath = path.join(__dirname, 'data.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert to array (header: 1 returns 2D array)
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Skip row 1 (header), convert remaining rows to quiz format
const questions = rows.slice(1).map((row, index) => ({
  rowIndex: index,
  question: String(row[0]),
  correct: String(row[1]),
  options: shuffle([
    String(row[1]),
    String(row[2]),
    String(row[3]),
    String(row[4])
  ])
}));

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Write to questions.json
fs.writeFileSync(
  path.join(dataDir, 'questions.json'),
  JSON.stringify(questions, null, 2)
);

console.log(`✓ Converted ${questions.length} questions to data/questions.json`);
