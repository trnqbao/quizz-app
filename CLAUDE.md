# Quiz Web App — Project Context Prompt

## 1. Project Overview

Xây dựng một **ứng dụng trắc nghiệm web đơn giản** (quiz app) cho phép người dùng trả lời lần lượt từng câu hỏi. Chỉ khi trả lời đúng, người dùng mới được chuyển sang câu tiếp theo. Dữ liệu câu hỏi được lưu trong file Excel và cần được convert sang JSON trước khi sử dụng.

---

## 2. Tech Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| UI       | HTML5, CSS3                                          |
| Logic    | JavaScript (Vanilla) **hoặc** React (với Vite)       |
| Data     | Excel (`.xlsx`) → JSON (via `SheetJS` / `xlsx` lib)  |
| Bundler  | Vite (nếu dùng React)                                |

> **Ưu tiên:** Vanilla HTML/CSS/JS nếu không cần component tái sử dụng. Dùng React + Vite nếu muốn state management dễ hơn.

---

## 3. Data Structure

### 3.1 Excel Input Format

File Excel có **1 sheet** với cấu trúc sau:
- **Row 1:** Header (tên cột) — **bỏ qua khi parse**, không dùng làm dữ liệu.
- **Row 2 trở đi:** Mỗi row là 1 câu hỏi, gồm đúng **5 cột** (A–E):

| Column A  | Column B       | Column C        | Column D        | Column E        |
| --------- | -------------- | --------------- | --------------- | --------------- |
| Câu hỏi   | Đáp án đúng    | Đáp án trộn 1   | Đáp án trộn 2   | Đáp án trộn 3   |

**Ví dụ dữ liệu thực tế (chú ý số câu không liên tục):**

```
Row 1 | Câu hỏi                              | Đáp án đúng | Trộn 1  | Trộn 2  | Trộn 3  |  ← HEADER, bỏ qua
Row 2 | Câu 56: Thủ đô của Việt Nam là gì?   | Hà Nội      | TP.HCM  | Đà Nẵng | Huế     |
Row 3 | Câu 57: Sông dài nhất Việt Nam?       | Sông Mê Kông| Sông Hồng| Sông Đà | Sông Lam|
Row 4 | Câu 59: 2 + 2 = ?                     | 4           | 3       | 5       | 6       |
Row 5 | Câu 1: Hành tinh gần Mặt Trời nhất?   | Sao Thủy    | Sao Kim | Trái Đất| Sao Hỏa |
```

> ⚠️ **Lưu ý quan trọng về số thứ tự câu hỏi:**  
> Số trong tên câu hỏi (56, 57, 59, 1, ...) **không phải sequential index** — chúng là nhãn của đề thi, có thể không liên tục và có thể lặp lại (ví dụ "Câu 1" của phần 2 xuất hiện sau "Câu 63" của phần 1).  
> **Không được sort, parse, hay dùng số này để điều hướng.** Đây chỉ là một phần của text câu hỏi ở Column A.

### 3.2 JSON Output Format (sau khi convert)

```json
[
  {
    "rowIndex": 0,
    "question": "Câu 56: Thủ đô của Việt Nam là gì?",
    "correct": "Hà Nội",
    "options": ["TP.HCM", "Hà Nội", "Huế", "Đà Nẵng"]
  },
  {
    "rowIndex": 1,
    "question": "Câu 57: Sông dài nhất Việt Nam?",
    "correct": "Sông Mê Kông",
    "options": ["Sông Lam", "Sông Mê Kông", "Sông Hồng", "Sông Đà"]
  },
  {
    "rowIndex": 2,
    "question": "Câu 59: 2 + 2 = ?",
    "correct": "4",
    "options": ["5", "3", "4", "6"]
  },
  {
    "rowIndex": 3,
    "question": "Câu 1: Hành tinh gần Mặt Trời nhất?",
    "correct": "Sao Thủy",
    "options": ["Sao Thủy", "Trái Đất", "Sao Kim", "Sao Hỏa"]
  }
]
```

> **Quan trọng về các field:**
> - `rowIndex` — vị trí 0-based trong mảng JSON, **là thứ tự duy nhất được dùng để điều hướng** (currentIndex++). Không có ý nghĩa gì khác.
> - `question` — toàn bộ text của Column A, giữ nguyên kể cả nhãn "Câu 56:", "Câu 1:", v.v.
> - `correct` — text chính xác của đáp án đúng (dùng để so sánh khi validate).
> - `options` — mảng **4 đáp án đã shuffle ngẫu nhiên** (1 đúng + 3 sai). Shuffle tại runtime khi render.

---

## 4. Application Flow

```
[Excel File]
     │
     ▼
[Convert: xlsx → JSON]        ← Dùng SheetJS (xlsx library)
     │                            Có thể làm offline 1 lần, lưu file .json
     ▼
[Load JSON vào app]           ← fetch('./questions.json') hoặc import trực tiếp
     │
     ▼
[Shuffle options mỗi câu]     ← Fisher-Yates shuffle tại runtime
     │
     ▼
[Hiển thị câu hỏi hiện tại]  ← Render question + 4 answer buttons
     │
     ├──[Người dùng chọn SAI] → Highlight đỏ, KHÔNG chuyển câu
     │                           Cho phép thử lại (không reset, chỉ báo sai)
     │
     └──[Người dùng chọn ĐÚNG] → Highlight xanh, sau ~1s chuyển câu tiếp theo
                                   Nếu đây là câu cuối → Hiển thị màn hình kết quả
```

---

## 5. Core Business Rules

1. **Bắt buộc trả lời đúng** mới được đi tiếp — không có nút "Skip" hay "Next".
2. **Không giới hạn số lần thử** cho mỗi câu — người dùng thử lại đến khi đúng.
3. **Shuffle options** mỗi lần load câu hỏi (không shuffle lại khi thử sai).
4. **Không đếm điểm** (hoặc đếm số lần sai nếu muốn mở rộng sau).
5. **Thứ tự câu hỏi = thứ tự row trong Excel** — điều hướng dựa hoàn toàn vào `rowIndex` (0-based array index).
   - ❌ Không sort theo số trong tên câu hỏi.
   - ❌ Không parse "Câu 56" để lấy số 56 làm index.
   - ✅ `currentIndex++` sau mỗi câu đúng là đủ.
6. **Progress indicator** hiển thị **vị trí trong mảng**, không phải nhãn câu hỏi:  
   → `1 / 80`, `2 / 80`, ... (không phải "Câu 56 / 80").

---

## 6. UI/UX Screens

### Screen 1 — Start Screen
- Tiêu đề app
- Tổng số câu hỏi
- Nút **"Bắt đầu"**

### Screen 2 — Question Screen
- **Progress indicator:** `3 / 20` (vị trí trong mảng, không dùng nhãn câu hỏi)
- **Question text** (hiển thị to, rõ)
- **4 Answer buttons** (layout: 2×2 grid hoặc danh sách dọc)
- Trạng thái visual của button:
  - `default` → màu neutral
  - `wrong` → màu đỏ / shake animation
  - `correct` → màu xanh lá → tự động next sau 800–1000ms

### Screen 3 — Result Screen
- "Bạn đã hoàn thành!" hoặc tương tự
- (Tùy chọn) Thống kê: tổng số câu, tổng số lần sai
- Nút **"Làm lại"** → reset về câu 1

---

## 7. Component / Module Breakdown

> Áp dụng cho cả Vanilla JS và React

| Module           | Trách nhiệm                                                     |
| ---------------- | --------------------------------------------------------------- |
| `dataLoader`     | Đọc JSON, trả về mảng câu hỏi                                   |
| `shuffle`        | Fisher-Yates shuffle mảng options                               |
| `quizState`      | Lưu trạng thái: currentIndex, isAnswered, wrongCount            |
| `QuestionCard`   | Render câu hỏi + 4 đáp án                                       |
| `AnswerButton`   | Render từng đáp án, nhận callback khi click                     |
| `ProgressBar`    | Hiển thị tiến trình (câu X / tổng Y)                            |
| `ResultScreen`   | Hiển thị khi hoàn thành tất cả câu hỏi                          |

---

## 8. Key Implementation Notes

### Excel → JSON (one-time conversion)

```javascript
// Dùng SheetJS (xlsx) để convert
import * as XLSX from 'xlsx';

function excelToJson(file) {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 1 → trả về mảng 2D thô (rows[0] = header row)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // slice(1) bỏ qua Row 1 (header). Giữ nguyên thứ tự từ Excel — KHÔNG sort.
  return rows.slice(1).map((row, index) => ({
    rowIndex: index,          // 0-based — CHỈ dùng để điều hướng, không có nghĩa gì khác
    question: row[0],         // Giữ nguyên toàn bộ text kể cả nhãn "Câu 56:", "Câu 1:", v.v.
    correct: String(row[1]),  // String() đề phòng cell là number (ví dụ đáp án "4")
    options: shuffle([        // Shuffle 4 đáp án tại runtime
      String(row[1]),
      String(row[2]),
      String(row[3]),
      String(row[4])
    ])
  }));
}
```

### Shuffle (Fisher-Yates)

```javascript
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### Answer Validation

```javascript
function handleAnswer(selectedOption, currentQuestion) {
  if (selectedOption === currentQuestion.correct) {
    // Mark as correct → visual feedback → move next after delay
    markCorrect();
    setTimeout(() => nextQuestion(), 900);
  } else {
    // Mark as wrong → allow retry
    markWrong(selectedOption);
  }
}
```

---

## 9. Out of Scope (for now)

- ❌ Backend / database
- ❌ User authentication
- ❌ Timer per question
- ❌ Shuffle question order
- ❌ Multi-category support
- ❌ Mobile app (chỉ web)

---

## 10. File Structure (Vanilla JS version)

```
quiz-app/
├── index.html
├── style.css
├── main.js
├── data/
│   └── questions.json      ← đã convert từ Excel
└── utils/
    ├── shuffle.js
    └── dataLoader.js
```

## 10b. File Structure (React + Vite version)

```
quiz-app/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── StartScreen.jsx
│   │   ├── QuestionCard.jsx
│   │   ├── AnswerButton.jsx
│   │   ├── ProgressBar.jsx
│   │   └── ResultScreen.jsx
│   ├── utils/
│   │   ├── shuffle.js
│   │   └── dataLoader.js
│   └── data/
│       └── questions.json
└── public/
```

---

*Last updated: 2026-06-14 v1.1 — added: non-sequential question labels, header row clarification | Author: Project Owner*
