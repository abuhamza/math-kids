// Math Kids Web Application - Main Entry Point
import { GameService } from './services/game.js';
import { ProgressService } from './services/progress.js';
import { StorageService } from './services/storage.js';
import { AudioService } from './services/audio.js';
import { I18nService } from './utils/i18n.js';
import { AccessibilityHelper } from './utils/accessibility.js';

class MathKidsApp {
  constructor() {
    this.state = {
      currentLanguage: 'en',
      currentOperation: 'addition',
      currentDifficulty: 'easy',
      isGameActive: false,
      currentQuestion: null,
      sessionQuestions: [],
      sessionStartTime: null,
      settings: {
        audioEnabled: true,
        animationsEnabled: true,
        language: 'en'
      }
    };

    this.services = {
      game: new GameService(),
      progress: new ProgressService(),
      storage: new StorageService(),
      audio: new AudioService(),
      i18n: new I18nService()
    };

    this.accessibilityHelper = new AccessibilityHelper();
  }

  async init() {
    try {
      // Initialize services
      await this.services.storage.init();
      await this.services.i18n.init();
      this.services.audio.init();
      
      // Load saved settings and progress
      await this.loadUserData();
      
      // Set up UI
      this.setupEventListeners();
      this.renderMainMenu();
      
      // Initialize accessibility features
      this.accessibilityHelper.init();
      
      console.log('Math Kids App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showErrorMessage('Failed to load the application. Please refresh the page.');
    }
  }

  async loadUserData() {
    const savedSettings = await this.services.storage.getSettings();
    const savedProgress = await this.services.storage.getProgress();
    
    if (savedSettings) {
      this.state.settings = { ...this.state.settings, ...savedSettings };
      this.state.currentLanguage = savedSettings.language || 'en';
    }
    
    if (savedProgress) {
      this.services.progress.loadProgress(savedProgress);
    }
    
    // Set language
    await this.services.i18n.setLanguage(this.state.currentLanguage);
  }

  setupEventListeners() {
    // Navigation events
    document.addEventListener('click', this.handleNavigation.bind(this));
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    
    // Form submissions
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Settings changes
    document.addEventListener('change', this.handleSettingsChange.bind(this));
    
    // Custom events
    document.addEventListener('questionAnswered', this.handleQuestionAnswered.bind(this));
    document.addEventListener('gameComplete', this.handleGameComplete.bind(this));
  }

  handleNavigation(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    
    event.preventDefault();
    const action = target.dataset.action;
    
    switch (action) {
      case 'startGame':
        this.startGame();
        break;
      case 'showDashboard':
        this.showDashboard();
        break;
      case 'showSettings':
        this.showSettings();
        break;
      case 'selectOperation':
        this.selectOperation(target.dataset.operation);
        break;
      case 'selectDifficulty':
        this.selectDifficulty(target.dataset.difficulty);
        break;
      case 'resetProgress':
        this.resetProgress();
        break;
      case 'backToMenu':
        this.renderMainMenu();
        break;
    }
  }

  handleKeyboardNavigation(event) {
    // Handle keyboard navigation for accessibility
    if (event.key === 'Escape') {
      this.renderMainMenu();
    }
    
    // Handle Enter key on focusable elements
    if (event.key === 'Enter' && event.target.hasAttribute('data-action')) {
      event.target.click();
    }
  }

  handleFormSubmit(event) {
    if (event.target.id === 'answerForm') {
      event.preventDefault();
      this.submitAnswer();
    }
  }

  handleSettingsChange(event) {
    if (event.target.name && event.target.name.startsWith('setting-')) {
      const settingName = event.target.name.replace('setting-', '');
      this.updateSetting(settingName, event.target.value || event.target.checked);
    }
  }

  async handleQuestionAnswered(event) {
    const { isCorrect, answer, question } = event.detail;
    
    // Record the answer
    this.services.progress.recordAnswer(question, answer, isCorrect);
    
    // Play audio feedback
    if (this.state.settings.audioEnabled) {
      this.services.audio.playFeedback(isCorrect);
    }
    
    // Continue to next question or complete game
    setTimeout(() => {
      if (this.services.game.hasMoreQuestions()) {
        this.loadNextQuestion();
      } else {
        this.completeGame();
      }
    }, 2000);
  }

  handleGameComplete(event) {
    const { score, totalQuestions, timeSpent } = event.detail;
    
    // Save session results
    this.services.progress.recordSession({
      operation: this.state.currentOperation,
      difficulty: this.state.currentDifficulty,
      score,
      totalQuestions,
      timeSpent,
      timestamp: Date.now()
    });
    
    // Save to storage
    this.services.storage.saveProgress(this.services.progress.getProgress());
    
    // Show results
    this.showGameResults({ score, totalQuestions, timeSpent });
  }

  renderMainMenu() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-5xl md:text-7xl font-bold text-purple-800 mb-4 animate-bounce">
            🧮 ${i18n.t('app.title')}
          </h1>
          <p class="text-xl md:text-2xl text-gray-700 mb-8">
            ${i18n.t('app.subtitle')}
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <button 
              data-action="selectOperation" 
              data-operation="addition"
              class="operation-btn bg-green-500 hover:bg-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.addition.title')}"
            >
              <div class="text-4xl mb-2">➕</div>
              <div class="text-xl font-semibold">${i18n.t('operations.addition.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="subtraction"
              class="operation-btn bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.subtraction.title')}"
            >
              <div class="text-4xl mb-2">➖</div>
              <div class="text-xl font-semibold">${i18n.t('operations.subtraction.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="multiplication"
              class="operation-btn bg-red-500 hover:bg-red-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.multiplication.title')}"
            >
              <div class="text-4xl mb-2">✖️</div>
              <div class="text-xl font-semibold">${i18n.t('operations.multiplication.title')}</div>
            </button>
            
            <button 
              data-action="selectOperation" 
              data-operation="division"
              class="operation-btn bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              aria-label="${i18n.t('operations.division.title')}"
            >
              <div class="text-4xl mb-2">➗</div>
              <div class="text-xl font-semibold">${i18n.t('operations.division.title')}</div>
            </button>
          </div>
          
          <div class="flex flex-wrap justify-center gap-4">
            <button 
              data-action="showDashboard"
              class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
            >
              📊 ${i18n.t('menu.dashboard')}
            </button>
            
            <button 
              data-action="showSettings"
              class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
            >
              ⚙️ ${i18n.t('menu.settings')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  selectOperation(operation) {
    this.state.currentOperation = operation;
    this.showDifficultySelector();
  }

  showDifficultySelector() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-4xl font-bold text-purple-800 mb-8">
            ${i18n.t('difficulty.selectTitle')}
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              data-action="selectDifficulty" 
              data-difficulty="easy"
              class="difficulty-btn bg-green-500 hover:bg-green-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🌱</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.easy.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.easy.description')}</div>
            </button>
            
            <button 
              data-action="selectDifficulty" 
              data-difficulty="intermediate"
              class="difficulty-btn bg-yellow-500 hover:bg-yellow-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🌟</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.intermediate.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.intermediate.description')}</div>
            </button>
            
            <button 
              data-action="selectDifficulty" 
              data-difficulty="advanced"
              class="difficulty-btn bg-red-500 hover:bg-red-600 text-white p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div class="text-5xl mb-4">🚀</div>
              <div class="text-2xl font-bold mb-2">${i18n.t('difficulty.advanced.title')}</div>
              <div class="text-sm opacity-90">${i18n.t('difficulty.advanced.description')}</div>
            </button>
          </div>
          
          <button 
            data-action="backToMenu"
            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-colors"
          >
            ← ${i18n.t('common.back')}
          </button>
        </div>
      </div>
    `;
  }

  selectDifficulty(difficulty) {
    this.state.currentDifficulty = difficulty;
    this.startGame();
  }

  startGame() {
    this.state.isGameActive = true;
    this.state.sessionStartTime = Date.now();
    this.state.sessionQuestions = [];
    
    // Initialize game with selected operation and difficulty
    this.services.game.initializeGame(
      this.state.currentOperation,
      this.state.currentDifficulty
    );
    
    this.loadNextQuestion();
  }

  showErrorMessage(message) {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div class="text-6xl mb-4">😔</div>
          <h2 class="text-2xl font-bold text-red-600 mb-4">Oops!</h2>
          <p class="text-gray-700 mb-6">${message}</p>
          <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  // Placeholder methods - will be implemented in subsequent steps
  loadNextQuestion() {
    const question = this.services.game.getNextQuestion();
    if (!question) {
      this.completeGame();
      return;
    }

    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const currentIndex = this.services.game.getGameState().currentQuestionIndex;
    const totalQuestions = this.services.game.getGameState().totalQuestions;
    const progressPercentage = ((currentIndex + 1) / totalQuestions) * 100;

    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto w-full">
          <!-- Enhanced Progress indicator with better visual design -->
          <div class="mb-8 bg-white rounded-2xl p-6 shadow-lg">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-lg font-semibold text-gray-700">${i18n.t('game.question')} ${currentIndex + 1} ${i18n.t('game.of')} ${totalQuestions}</span>
              </div>
              <div class="flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full">
                <span class="text-2xl">${this.getOperationIcon(this.state.currentOperation)}</span>
                <span class="text-sm font-medium text-gray-600 capitalize">${this.state.currentOperation}</span>
                <span class="text-sm text-gray-500">•</span>
                <span class="text-sm font-medium text-gray-600 capitalize">${i18n.t('difficulty.' + this.state.currentDifficulty + '.title')}</span>
              </div>
            </div>
            <!-- Enhanced progress bar with gradient and animation -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div class="progress-fill-animated bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out" 
                     style="width: ${progressPercentage}%"></div>
              </div>
              <div class="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
            <div class="mt-2 text-right">
              <span class="text-sm text-gray-500">${Math.round(progressPercentage)}% ${i18n.t('common.complete', 'Complete')}</span>
            </div>
          </div>

          <!-- Enhanced Question card with better visual hierarchy -->
          <div class="bg-white rounded-3xl shadow-xl p-8 mb-6 border-t-4 border-gradient-to-r from-blue-500 to-purple-500">
            <div class="text-center mb-8">
              <div class="inline-block bg-gradient-to-br from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4">
                ${i18n.t('game.question')} ${currentIndex + 1}
              </div>
              <h2 class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-8 leading-tight">
                ${question.question} = ?
              </h2>
            </div>
            
            <form id="answerForm" class="space-y-8">
              <div>
                <label for="answerInput" class="block text-xl font-bold text-gray-700 mb-4 text-center">
                  ${i18n.t('game.yourAnswer')}
                </label>
                <!-- Enhanced input field with better styling -->
                <div class="relative">
                  <input 
                    type="number" 
                    id="answerInput" 
                    class="w-full text-3xl md:text-4xl font-bold text-center p-6 border-3 border-gray-300 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white shadow-inner"
                    placeholder="?"
                    autocomplete="off"
                    aria-describedby="answer-hint"
                    required
                  >
                  <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 transition-opacity duration-200 pointer-events-none" id="inputGlow"></div>
                </div>
                <div id="answer-hint" class="sr-only">
                  ${i18n.t('accessibility.enterAnswer')}
                </div>
              </div>
              
              <!-- Enhanced buttons with better visual appeal -->
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button type="submit" class="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 focus:ring-4 focus:ring-green-300">
                  <span class="relative z-10 flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>${i18n.t('game.submit')}</span>
                  </span>
                  <div class="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                </button>
                <button type="button" data-action="backToMenu" class="group relative bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200 focus:ring-4 focus:ring-gray-300">
                  <span class="relative z-10 flex items-center justify-center space-x-2">
                    <span>←</span>
                    <span>${i18n.t('common.back')}</span>
                  </span>
                  <div class="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                </button>
              </div>
            </form>
          </div>

          <!-- Enhanced Hint area with better styling -->
          <div id="hintArea" class="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 hidden shadow-lg">
            <div class="flex items-center space-x-3">
              <div class="text-2xl">💡</div>
              <p id="hintText" class="text-gray-700 font-medium"></p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store question start time
    this.currentQuestionStartTime = Date.now();
    
    // Enhanced input focus with glow effect
    setTimeout(() => {
      const input = document.getElementById('answerInput');
      const glow = document.getElementById('inputGlow');
      
      input.focus();
      
      // Add glow effect on focus
      input.addEventListener('focus', () => {
        glow.style.opacity = '0.1';
      });
      
      input.addEventListener('blur', () => {
        glow.style.opacity = '0';
      });
    }, 100);

    // Speak the question for accessibility
    if (this.state.settings.audioEnabled) {
      this.services.audio.speakEquation(question.operand1, question.operation, question.operand2);
    }
  }

  submitAnswer() {
    const answerInput = document.getElementById('answerInput');
    const answer = answerInput.value.trim();
    
    if (!answer) {
      this.showValidationError('Please enter an answer');
      return;
    }

    const numAnswer = parseFloat(answer);
    if (isNaN(numAnswer)) {
      this.showValidationError('Please enter a valid number');
      return;
    }

    // Submit to game service
    const result = this.services.game.submitAnswer(numAnswer, this.currentQuestionStartTime);
    
    // Disable form during feedback
    const form = document.getElementById('answerForm');
    const inputs = form.querySelectorAll('input, button');
    inputs.forEach(input => input.disabled = true);

    // Show feedback
    this.showAnswerFeedback(result.isCorrect, result.correctAnswer);
  }

  showAnswerFeedback(isCorrect, correctAnswer = null) {
    const i18n = this.services.i18n;
    const answerInput = document.getElementById('answerInput');
    
    // Update input styling
    answerInput.classList.remove('answer-correct', 'answer-incorrect');
    answerInput.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
    
    // Create feedback message
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'feedbackMessage';
    feedbackContainer.className = `mt-4 p-4 rounded-lg text-center font-semibold ${
      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`;
    
    if (isCorrect) {
      feedbackContainer.innerHTML = `
        <div class="text-2xl mb-2">🎉</div>
        <div>${i18n.t('game.correct')}</div>
      `;
    } else {
      feedbackContainer.innerHTML = `
        <div class="text-2xl mb-2">🤔</div>
        <div>${i18n.t('game.incorrect')} ${correctAnswer}</div>
      `;
    }
    
    // Insert feedback after the form
    const form = document.getElementById('answerForm');
    form.parentNode.insertBefore(feedbackContainer, form.nextSibling);
    
    // Announce for screen readers
    this.services.audio.announceText(isCorrect ? i18n.t('game.correct') : `${i18n.t('game.incorrect')} ${correctAnswer}`);
    
    // Continue after delay
    setTimeout(() => {
      if (this.services.game.hasMoreQuestions()) {
        this.loadNextQuestion();
      } else {
        this.completeGame();
      }
    }, 2000);
  }

  showValidationError(message) {
    const answerInput = document.getElementById('answerInput');
    answerInput.classList.add('animate-shake-error');
    
    // Remove existing error
    const existingError = document.getElementById('validationError');
    if (existingError) {
      existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.id = 'validationError';
    errorDiv.className = 'mt-2 text-red-600 text-sm';
    errorDiv.textContent = message;
    
    answerInput.parentNode.appendChild(errorDiv);
    
    // Remove animation class
    setTimeout(() => {
      answerInput.classList.remove('animate-shake-error');
    }, 500);
    
    // Remove error after 3 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
    
    // Play error sound
    this.services.audio.playIncorrect();
  }

  completeGame() {
    this.state.isGameActive = false;
    const results = this.services.game.finishGame();
    this.showGameResults(results);
  }

  showGameResults(results) {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    
    // Calculate additional stats
    const accuracyClass = results.accuracy >= 80 ? 'text-green-600' : 
                         results.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto text-center">
          <div class="card">
            <div class="text-6xl mb-4">${results.accuracy >= 80 ? '🏆' : results.accuracy >= 60 ? '⭐' : '👍'}</div>
            <h2 class="text-4xl font-bold text-purple-800 mb-6">
              ${i18n.t('game.gameComplete')}
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">${results.score}/${results.totalQuestions}</div>
                <div class="text-blue-800">${i18n.t('game.score')}</div>
              </div>
              
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-2xl font-bold ${accuracyClass}">${results.accuracy}%</div>
                <div class="text-green-800">${i18n.t('game.accuracy')}</div>
              </div>
              
              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">${this.formatTime(results.totalTimeSpent)}</div>
                <div class="text-purple-800">${i18n.t('game.timeSpent')}</div>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <button data-action="startGame" class="btn-success">
                ${i18n.t('common.playAgain', 'Play Again')}
              </button>
              <button data-action="showDashboard" class="btn-primary">
                ${i18n.t('menu.dashboard')}
              </button>
              <button data-action="backToMenu" class="btn-secondary">
                ${i18n.t('menu.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Play celebration sound
    if (this.state.settings.audioEnabled) {
      if (results.accuracy >= 80) {
        this.services.audio.playCelebration();
      } else {
        this.services.audio.playCorrect();
      }
    }
  }

  showDashboard() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const progressSummary = this.services.progress.getProgressSummary();
    const badges = this.services.progress.getBadges();
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
        <div class="max-w-6xl mx-auto">
          <!-- Enhanced Header with Language Switcher -->
          <div class="text-center mb-8 bg-white rounded-2xl p-6 shadow-lg">
            <h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              ${i18n.t('dashboard.title')}
            </h1>
            
            <!-- Enhanced Language Switcher with Country Flags -->
            <div class="flex items-center justify-center space-x-4 mb-4">
              <span class="text-sm font-medium text-gray-600">${i18n.t('settings.language')}:</span>
              <div class="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                <button 
                  class="language-btn ${this.state.currentLanguage === 'en' ? 'active' : ''}" 
                  data-lang="en"
                  onclick="window.mathKidsApp.switchLanguage('en')"
                >
                  <span class="text-2xl">🇺🇸</span>
                  <span class="hidden sm:inline ml-2">English</span>
                </button>
                <button 
                  class="language-btn ${this.state.currentLanguage === 'fr' ? 'active' : ''}" 
                  data-lang="fr"
                  onclick="window.mathKidsApp.switchLanguage('fr')"
                >
                  <span class="text-2xl">🇫🇷</span>
                  <span class="hidden sm:inline ml-2">Français</span>
                </button>
                <button 
                  class="language-btn ${this.state.currentLanguage === 'de' ? 'active' : ''}" 
                  data-lang="de"
                  onclick="window.mathKidsApp.switchLanguage('de')"
                >
                  <span class="text-2xl">🇩🇪</span>
                  <span class="hidden sm:inline ml-2">Deutsch</span>
                </button>
              </div>
            </div>
            
            <button data-action="backToMenu" class="inline-flex items-center space-x-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
              <span>←</span>
              <span>${i18n.t('common.back')}</span>
            </button>
          </div>
          
          <!-- Enhanced Statistics Overview with better number displays -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div class="stat-icon">📊</div>
              <div class="stat-number">${this.formatNumber(progressSummary.totalQuestions)}</div>
              <div class="stat-label">${i18n.t('dashboard.totalQuestions')}</div>
              <div class="stat-sparkle"></div>
            </div>
            
            <div class="stat-card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div class="stat-icon">✅</div>
              <div class="stat-number">${this.formatNumber(progressSummary.correctAnswers)}</div>
              <div class="stat-label">${i18n.t('dashboard.correctAnswers')}</div>
              <div class="stat-sparkle"></div>
            </div>
            
            <div class="stat-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div class="stat-icon">🎯</div>
              <div class="stat-number">${progressSummary.accuracy}%</div>
              <div class="stat-label">${i18n.t('dashboard.accuracy')}</div>
              <div class="stat-sparkle"></div>
            </div>
            
            <div class="stat-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
              <div class="stat-icon">🏆</div>
              <div class="stat-number">${this.formatNumber(badges.length)}</div>
              <div class="stat-label">${i18n.t('dashboard.badges')}</div>
              <div class="stat-sparkle"></div>
            </div>
          </div>
          
          <!-- Enhanced Badges Section -->
          <div class="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-3xl">🎖️</div>
              <h2 class="text-2xl font-bold text-gray-800">${i18n.t('dashboard.achievements')}</h2>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${this.renderEnhancedBadges(badges)}
            </div>
          </div>
          
          <!-- Enhanced Progress by Operation -->
          <div class="bg-white rounded-2xl p-6 shadow-lg">
            <div class="flex items-center space-x-3 mb-6">
              <div class="text-3xl">📈</div>
              <h2 class="text-2xl font-bold text-gray-800">${i18n.t('dashboard.stats')}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              ${this.renderEnhancedOperationStats(progressSummary.masteryProgress)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showSettings() {
    const i18n = this.services.i18n;
    const appContainer = document.getElementById('app');
    const currentSettings = this.state.settings;
    
    appContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
        <div class="max-w-2xl mx-auto w-full">
          <div class="card">
            <h2 class="text-3xl font-bold text-purple-800 mb-6 text-center">
              ${i18n.t('settings.title')}
            </h2>
            
            <form id="settingsForm" class="space-y-6">
              <!-- Language Setting -->
              <div>
                <label for="setting-language" class="block text-lg font-semibold text-gray-700 mb-2">
                  ${i18n.t('settings.language')}
                </label>
                <select name="setting-language" id="setting-language" class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none">
                  <option value="en" ${currentSettings.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="fr" ${currentSettings.language === 'fr' ? 'selected' : ''}>Français</option>
                  <option value="de" ${currentSettings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                </select>
              </div>
              
              <!-- Audio Setting -->
              <div>
                <label class="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    name="setting-audioEnabled" 
                    ${currentSettings.audioEnabled ? 'checked' : ''}
                    class="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  >
                  <span class="text-lg font-semibold text-gray-700">${i18n.t('settings.audio')}</span>
                </label>
              </div>
              
              <!-- Animations Setting -->
              <div>
                <label class="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    name="setting-animationsEnabled" 
                    ${currentSettings.animationsEnabled ? 'checked' : ''}
                    class="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  >
                  <span class="text-lg font-semibold text-gray-700">${i18n.t('settings.animations')}</span>
                </label>
              </div>
              
              <!-- Reset Progress -->
              <div class="border-t pt-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">${i18n.t('settings.resetProgress')}</h3>
                <button type="button" data-action="resetProgress" class="btn-danger">
                  🗑️ ${i18n.t('settings.resetProgress')}
                </button>
                <p class="text-sm text-gray-500 mt-2">${i18n.t('settings.confirmReset')}</p>
              </div>
            </form>
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button data-action="backToMenu" class="btn-primary">
                ← ${i18n.t('common.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateSetting(name, value) {
    this.state.settings[name] = value;
    
    // Apply setting immediately
    switch (name) {
      case 'language':
        this.services.i18n.setLanguage(value);
        this.state.currentLanguage = value;
        break;
      case 'audioEnabled':
        this.services.audio.setEnabled(value);
        break;
      case 'animationsEnabled':
        document.body.classList.toggle('animations-disabled', !value);
        break;
    }
    
    // Save settings
    this.services.storage.saveSettings(this.state.settings);
    
    console.log(`Setting updated: ${name} = ${value}`);
  }

  resetProgress() {
    const i18n = this.services.i18n;
    
    // Show confirmation modal
    this.showModal({
      title: i18n.t('settings.resetProgress'),
      message: i18n.t('settings.confirmReset'),
      buttons: [
        {
          text: i18n.t('common.cancel'),
          class: 'btn-secondary',
          action: () => this.hideModal()
        },
        {
          text: i18n.t('common.yes'),
          class: 'btn-danger',
          action: () => {
            this.services.progress.resetProgress();
            this.services.storage.clearProgress();
            this.hideModal();
            this.showNotification(i18n.t('settings.progressReset'), 'success');
            setTimeout(() => this.renderMainMenu(), 1000);
          }
        }
      ]
    });
  }

  // Helper methods
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  getOperationIcon(operation) {
    const icons = {
      addition: '➕',
      subtraction: '➖', 
      multiplication: '✖️',
      division: '➗'
    };
    return icons[operation] || '📝';
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  renderEnhancedBadges(badges) {
    if (badges.length === 0) {
      return `
        <div class="col-span-full text-center py-8">
          <div class="text-6xl mb-4">🎯</div>
          <p class="text-gray-500 font-medium">No badges earned yet. Keep practicing!</p>
        </div>
      `;
    }
    
    return badges.map(badge => `
      <div class="badge-card group cursor-pointer transform hover:scale-105 transition-all duration-200">
        <div class="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl">
          <div class="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-200">🏆</div>
          <div class="font-bold text-white text-lg mb-2">${badge.title}</div>
          <div class="text-yellow-100 text-sm leading-relaxed">${badge.description}</div>
          <div class="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
        </div>
      </div>
    `).join('');
  }

  renderEnhancedOperationStats(masteryProgress) {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'];
    const operationIcons = { addition: '➕', subtraction: '➖', multiplication: '✖️', division: '➗' };
    const operationColors = { 
      addition: 'from-green-400 to-green-600', 
      subtraction: 'from-blue-400 to-blue-600', 
      multiplication: 'from-red-400 to-red-600', 
      division: 'from-purple-400 to-purple-600' 
    };
    
    return operations.map(operation => {
      const stats = masteryProgress[operation];
      const totalMastery = Object.values(stats).reduce((sum, level) => sum + level.level, 0) / 3;
      
      return `
        <div class="operation-card bg-white rounded-xl border-2 border-gray-100 p-6 hover:border-gray-200 transition-all duration-200 hover:shadow-lg">
          <div class="text-center mb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${operationColors[operation]} rounded-full text-white text-2xl font-bold mb-3 shadow-lg">
              ${operationIcons[operation]}
            </div>
            <h3 class="font-bold text-gray-800 text-lg capitalize">${operation}</h3>
          </div>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-600">Mastery:</span>
              <span class="text-lg font-bold text-gray-800">${Math.round(totalMastery)}%</span>
            </div>
            
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div class="bg-gradient-to-r ${operationColors[operation]} h-3 rounded-full transition-all duration-500 ease-out" 
                     style="width: ${totalMastery}%"></div>
              </div>
              <div class="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse rounded-full"></div>
            </div>
            
            ${totalMastery >= 80 ? 
              '<div class="flex items-center justify-center mt-2"><span class="text-green-600 text-sm font-medium">⭐ Mastered!</span></div>' : 
              totalMastery >= 50 ? 
              '<div class="flex items-center justify-center mt-2"><span class="text-yellow-600 text-sm font-medium">📈 Progressing</span></div>' :
              '<div class="flex items-center justify-center mt-2"><span class="text-gray-500 text-sm font-medium">🌱 Learning</span></div>'
            }
          </div>
        </div>
      `;
    }).join('');
  }

  switchLanguage(lang) {
    this.updateSetting('language', lang);
    // Refresh dashboard to show new language
    setTimeout(() => this.showDashboard(), 100);
  }

  showModal(config) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
      <h3 class="text-xl font-bold mb-4">${config.title}</h3>
      <p class="text-gray-700 mb-6">${config.message}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-end">
        ${config.buttons.map((btn, index) => `
          <button class="${btn.class}" data-modal-action="${index}">${btn.text}</button>
        `).join('')}
      </div>
    `;
    
    // Add event listeners for buttons
    config.buttons.forEach((btn, index) => {
      const button = content.querySelector(`[data-modal-action="${index}"]`);
      if (button) {
        button.addEventListener('click', btn.action);
      }
    });
    
    modal.classList.remove('hidden');
    
    // Focus first button
    setTimeout(() => {
      const firstButton = content.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);
  }

  hideModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.add('hidden');
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }[type] || 'bg-blue-500';
    
    notification.className = `${bgColor} text-white p-4 rounded-lg shadow-lg animate-slide-up`;
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new MathKidsApp();
  window.mathKidsApp = app; // Expose globally for modal access
  app.init();
});

export default MathKidsApp; 