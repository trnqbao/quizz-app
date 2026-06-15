// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Quiz State
class QuizState {
  constructor() {
    this.questions = [];
    this.originalQuestions = []; // backup of original order
    this.currentIndex = 0;
    this.wrongCount = 0;
    this.state = 'idle'; // idle | wrong | correct
    this.resetClickListener = null; // store reference to reset listener for cleanup
    this.isShuffled = false; // track if questions are currently shuffled
  }

  setQuestions(questions) {
    this.questions = questions;
    this.originalQuestions = JSON.parse(JSON.stringify(questions)); // deep copy for backup
  }

  // LƯU TIẾN ĐỘ VÀO LOCALSTORAGE
  saveProgress() {
    const progressData = {
      currentIndex: this.currentIndex,
      wrongCount: this.wrongCount,
      isShuffled: this.isShuffled,
      questions: this.questions,
      originalQuestions: this.originalQuestions
    };
    localStorage.setItem('khuyen_quiz_progress', JSON.stringify(progressData));
  }

  // TẢI TIẾN ĐỘ TỪ LOCALSTORAGE
  loadProgress() {
    const savedData = localStorage.getItem('khuyen_quiz_progress');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.currentIndex = data.currentIndex;
      this.wrongCount = data.wrongCount;
      this.isShuffled = data.isShuffled;
      this.questions = data.questions;
      this.originalQuestions = data.originalQuestions;
      return true;
    }
    return false;
  }

  // XÓA TIẾN ĐỘ KHI HOÀN THÀNH
  clearProgress() {
    localStorage.removeItem('khuyen_quiz_progress');
  }

  reset() {
    this.currentIndex = 0;
    this.wrongCount = 0;
    this.state = 'idle';
    this.isShuffled = false;
    this.clearResetListener();
    this.clearProgress();
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  isLastQuestion() {
    return this.currentIndex === this.questions.length - 1;
  }

  recordWrongAnswer() {
    this.wrongCount++;
    this.saveProgress(); // Lưu tiến độ ngay khi có câu sai
  }

  clearResetListener() {
    if (this.resetClickListener) {
      document.removeEventListener('click', this.resetClickListener);
      this.resetClickListener = null;
    }
  }

  shuffleQuestions() {
    this.questions = shuffle([...this.questions]);
    this.currentIndex = 0;
    this.isShuffled = true;
    this.saveProgress(); // Lưu tiến độ sau khi trộn
  }

  restoreOriginalOrder() {
    this.questions = JSON.parse(JSON.stringify(this.originalQuestions));
    this.currentIndex = 0;
    this.isShuffled = false;
    this.saveProgress(); // Lưu tiến độ sau khi phục hồi thứ tự
  }
}

// Quiz App
class QuizApp {
  constructor() {
    this.state = new QuizState();
    this.app = document.getElementById('app');
    this.init();
  }

  async init() {
    try {
      const response = await fetch('./data/questions.json');
      const questions = await response.json();
      
      this.state.setQuestions(questions);

      // Kiểm tra xem có phiên làm việc nào đang dang dở không
      if (this.state.loadProgress()) {
        this.renderQuestionScreen(); // Có thì nhảy thẳng vào câu đang làm
      } else {
        this.renderStartScreen();    // Không có thì hiện màn hình bắt đầu
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      this.app.innerHTML = '<p>Failed to load quiz data</p>';
    }
  }

  renderStartScreen() {
    const template = document.getElementById('start-screen');
    const clone = template.content.cloneNode(true);
    
    clone.getElementById('total-questions').textContent = this.state.questions.length;
    
    clone.getElementById('start-btn').addEventListener('click', () => {
      this.state.saveProgress(); // Bắt đầu làm là lưu luôn phiên làm việc
      this.renderQuestionScreen();
    });
    
    this.app.innerHTML = '';
    this.app.appendChild(clone);
  }

  renderQuestionScreen() {
    const question = this.state.getCurrentQuestion();
    const template = document.getElementById('question-screen');
    const clone = template.content.cloneNode(true);

    // Clear any pending reset listener from previous state
    this.state.clearResetListener();

    // Update progress
    const progress = this.state.currentIndex + 1;
    const total = this.state.questions.length;
    clone.getElementById('progress-text').textContent = `${progress} / ${total}`;

    // ==========================================
    // THÊM MỚI: Xử lý logic Nhảy câu (Jump)
    // ==========================================
    const jumpInput = clone.getElementById('jump-input');
    const jumpBtn = clone.getElementById('jump-btn');
    
    // Đặt giới hạn cho ô input dựa trên tổng số câu
    jumpInput.max = total;

    const handleJump = () => {
      const targetStr = jumpInput.value.trim();
      if (!targetStr) return; // Không làm gì nếu để trống

      const targetQuestion = parseInt(targetStr, 10);

      // Validate: Đảm bảo số nhập vào hợp lệ (từ 1 đến tổng số câu)
      if (isNaN(targetQuestion) || targetQuestion < 1 || targetQuestion > total) {
        alert(`Vui lòng nhập số từ 1 đến ${total}`);
        jumpInput.value = ''; // Xóa input sai
        return;
      }

      // Chuyển order (1-based) thành index (0-based)
      const targetIndex = targetQuestion - 1;

      // Tránh re-render nếu nhập đúng câu đang đứng
      if (this.state.currentIndex !== targetIndex) {
        this.state.currentIndex = targetIndex;
        this.state.clearResetListener();
        this.state.state = 'idle';
        this.state.saveProgress(); // Cập nhật lại localStorage với vị trí mới
        this.renderQuestionScreen();
      } else {
        jumpInput.value = ''; // Nếu đang ở câu đó rồi thì chỉ xóa chữ đi
      }
    };

    // Bắt sự kiện click nút "Đi"
    jumpBtn.addEventListener('click', handleJump);
    
    // Bắt sự kiện bấm phím Enter trong ô input cho tiện
    jumpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleJump();
    });
    // ==========================================

    // Setup Back button (đã dời xuống dưới)
    const backBtn = clone.getElementById('back-btn');
    if (this.state.currentIndex === 0) {
      backBtn.disabled = true;
    } else {
      backBtn.disabled = false;
      backBtn.addEventListener('click', () => this.handleBack());
    }

    // Setup Next button (Khóa mặc định, không dùng display: none nữa)
    const nextBtn = clone.getElementById('next-btn');
    nextBtn.disabled = true; 
    nextBtn.addEventListener('click', () => this.handleNext());

    // Setup Shuffle button
    const shuffleBtn = clone.getElementById('shuffle-btn');
    shuffleBtn.textContent = this.state.isShuffled ? 'Về thứ tự gốc' : 'Trộn câu hỏi';
    shuffleBtn.addEventListener('click', () => this.handleShuffleQuestions());

    // Update question
    clone.getElementById('question-text').textContent = question.question;

    // Render answer buttons with fresh shuffle
    question.options = shuffle([...question.options]);
    const container = clone.getElementById('answers-container');
    container.innerHTML = '';

    question.options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'answer-btn';
      button.textContent = option;
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAnswer(option, button, question, clone);
      });
      container.appendChild(button);
    });

    this.app.innerHTML = '';
    this.app.appendChild(clone);
    
    // Reset state to idle
    this.state.state = 'idle';
  }

  handleAnswer(selectedOption, buttonElement, question, screenClone) {
    if (this.state.state !== 'idle') return;

    const buttons = document.querySelectorAll('.answer-btn');

    if (selectedOption === question.correct) {
      // CORRECT ANSWER
      this.state.state = 'correct';
      buttonElement.classList.add('correct');
      buttons.forEach(btn => btn.style.pointerEvents = 'none');

      // Show Next button
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) {
        nextBtn.disabled = false;
      }
    } else {
      // WRONG ANSWER
      this.state.state = 'wrong';
      this.state.recordWrongAnswer(); // Hàm này giờ đã kiêm luôn việc lưu localStorage
      buttonElement.classList.add('wrong');
      buttons.forEach(btn => btn.style.pointerEvents = 'none');

      this.state.resetClickListener = () => this.handleReset(buttons);
      document.addEventListener('click', this.state.resetClickListener, { once: true });
    }
  }

  handleReset(buttons) {
    if (this.state.state !== 'wrong') {
      return;
    }

    buttons.forEach(btn => {
      btn.classList.remove('wrong');
      btn.style.pointerEvents = 'auto';
    });

    this.state.state = 'idle';
  }

  handleNext() {
    if (this.state.state !== 'correct') return;

    if (this.state.isLastQuestion()) {
      this.renderResultScreen();
    } else {
      this.state.currentIndex++;
      this.state.saveProgress(); // Lưu tiến độ khi sang câu mới
      this.renderQuestionScreen();
    }
  }

  handleBack() {
    if (this.state.currentIndex > 0) {
      this.state.clearResetListener();
      this.state.state = 'idle';
      this.state.currentIndex--;
      this.state.saveProgress(); // Lưu tiến độ khi quay lại
      this.renderQuestionScreen();
    }
  }

  handleShuffleQuestions() {
    this.state.clearResetListener();
    
    if (this.state.isShuffled) {
      this.state.restoreOriginalOrder();
    } else {
      this.state.shuffleQuestions();
    }

    setTimeout(() => {
      this.renderQuestionScreen();
    }, 0);
  }

  renderResultScreen() {
    // KHI TỚI MÀN HÌNH KẾT QUẢ TỨC LÀ ĐÃ XONG, XÓA DỮ LIỆU LƯU TẠM
    this.state.clearProgress();

    const template = document.getElementById('result-screen');
    const clone = template.content.cloneNode(true);

    clone.getElementById('total-questions-result').textContent = this.state.questions.length;
    clone.getElementById('wrong-count-result').textContent = this.state.wrongCount;
    clone.getElementById('restart-btn').addEventListener('click', () => {
      this.state.reset();
      this.init(); // Reset xong thì gọi lại init để load lại data chuẩn
    });

    this.app.innerHTML = '';
    this.app.appendChild(clone);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new QuizApp();
});