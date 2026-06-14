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

  reset() {
    this.currentIndex = 0;
    this.wrongCount = 0;
    this.state = 'idle';
    this.clearResetListener();
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  isLastQuestion() {
    return this.currentIndex === this.questions.length - 1;
  }

  recordWrongAnswer() {
    this.wrongCount++;
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
  }

  restoreOriginalOrder() {
    this.questions = JSON.parse(JSON.stringify(this.originalQuestions));
    this.currentIndex = 0;
    this.isShuffled = false;
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
      this.renderStartScreen();
    } catch (error) {
      console.error('Failed to load questions:', error);
      this.app.innerHTML = '<p>Failed to load quiz data</p>';
    }
  }

  renderStartScreen() {
    const template = document.getElementById('start-screen');
    const clone = template.content.cloneNode(true);
    
    clone.getElementById('total-questions').textContent = this.state.questions.length;
    clone.getElementById('start-btn').addEventListener('click', () => this.renderQuestionScreen());
    
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

    // Setup Back button
    const backBtn = clone.getElementById('back-btn');
    if (this.state.currentIndex === 0) {
      backBtn.disabled = true;
    } else {
      backBtn.disabled = false;
      backBtn.addEventListener('click', () => this.handleBack());
    }

    // Setup Shuffle button
    const shuffleBtn = clone.getElementById('shuffle-btn');
    shuffleBtn.textContent = this.state.isShuffled ? 'Về thứ tự gốc 📋' : 'Trộn câu hỏi 🔀';
    shuffleBtn.addEventListener('click', () => this.handleShuffleQuestions());

    // Setup Next button (initially hidden)
    const nextBtn = clone.getElementById('next-btn');
    nextBtn.addEventListener('click', () => this.handleNext());
    nextBtn.style.display = 'none';

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
      // CORRECT ANSWER - add green border and show Next button
      this.state.state = 'correct';
      buttonElement.classList.add('correct');
      buttons.forEach(btn => btn.style.pointerEvents = 'none');

      // Show Next button
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) {
        nextBtn.style.display = 'inline-block';
      }
    } else {
      // WRONG ANSWER - add red border to selected button only
      this.state.state = 'wrong';
      this.state.recordWrongAnswer();
      buttonElement.classList.add('wrong');
      buttons.forEach(btn => btn.style.pointerEvents = 'none');

      // Setup one-time click listener to clear borders (ANY click anywhere)
      this.state.resetClickListener = () => this.handleReset(buttons);
      document.addEventListener('click', this.state.resetClickListener, { once: true });
    }
  }

  handleReset(buttons) {
    // Triggered by any click after wrong answer
    if (this.state.state !== 'wrong') return;

    // Clear borders and re-enable pointer events
    buttons.forEach(btn => {
      btn.classList.remove('wrong');
      btn.style.pointerEvents = 'auto';
    });

    // Back to idle
    this.state.state = 'idle';
  }

  handleNext() {
    if (this.state.state !== 'correct') return;

    if (this.state.isLastQuestion()) {
      this.renderResultScreen();
    } else {
      this.state.currentIndex++;
      this.renderQuestionScreen();
    }
  }

  handleBack() {
    if (this.state.currentIndex > 0) {
      // Clear any pending state
      this.state.clearResetListener();
      this.state.state = 'idle';
      this.state.currentIndex--;
      this.renderQuestionScreen();
    }
  }

  handleShuffleQuestions() {
    // Clear any pending state from wrong/correct
    this.state.clearResetListener();
    
    if (this.state.isShuffled) {
      // Restore original order
      this.state.restoreOriginalOrder();
    } else {
      // Shuffle questions
      this.state.shuffleQuestions();
    }
    
    // Show Bảo message
    setBaoState('question_shuffled');
    
    // Re-render question after showing message, then go back to idle
    setTimeout(() => {
      this.renderQuestionScreen();
    }, 1800);
  }

  renderResultScreen() {
    const template = document.getElementById('result-screen');
    const clone = template.content.cloneNode(true);

    clone.getElementById('total-questions-result').textContent = this.state.questions.length;
    clone.getElementById('wrong-count-result').textContent = this.state.wrongCount;
    clone.getElementById('restart-btn').addEventListener('click', () => {
      this.state.reset();
      this.renderQuestionScreen();
    });

    this.app.innerHTML = '';
    this.app.appendChild(clone);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new QuizApp();
});
