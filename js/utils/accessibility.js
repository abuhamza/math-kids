// Accessibility Helper - Handles keyboard navigation, focus management, and screen reader support
export class AccessibilityHelper {
  constructor() {
    this.focusableElements = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[data-action]'
    ].join(', ');
    
    this.currentFocusIndex = 0;
    this.focusableItems = [];
    this.isKeyboardNavigating = false;
    this.announcements = [];
    this.lastAnnouncementTime = 0;
  }

  init() {
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.setupHighContrastSupport();
    this.updateFocusableElements();
    
    console.log('Accessibility helper initialized');
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    document.addEventListener('keyup', this.handleKeyup.bind(this));
    
    // Detect keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.isKeyboardNavigating = true;
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    // Detect mouse usage
    document.addEventListener('mousedown', () => {
      this.isKeyboardNavigating = false;
      document.body.classList.remove('keyboard-navigation');
    });
  }

  setupFocusManagement() {
    // Track focus changes
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    // Setup focus indicators
    this.setupFocusIndicators();
  }

  setupFocusIndicators() {
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-navigation *:focus {
        outline: 3px solid #8B5CF6 !important;
        outline-offset: 2px !important;
      }
      
      .keyboard-navigation .btn-primary:focus {
        outline-color: #FFFFFF !important;
      }
      
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      .sr-only-focusable:focus {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: inherit !important;
        margin: inherit !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: inherit !important;
      }
    `;
    document.head.appendChild(style);
  }

  setupScreenReaderSupport() {
    // Ensure aria-live regions exist
    this.ensureAriaLiveRegions();
    
    // Setup dynamic content announcements
    this.setupDynamicAnnouncements();
  }

  ensureAriaLiveRegions() {
    // Main announcements
    if (!document.getElementById('aria-announcements')) {
      const announcer = document.createElement('div');
      announcer.id = 'aria-announcements';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    
    // Polite announcements
    if (!document.getElementById('aria-status')) {
      const status = document.createElement('div');
      status.id = 'aria-status';
      status.className = 'sr-only';
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      document.body.appendChild(status);
    }
  }

  setupDynamicAnnouncements() {
    // Listen for game events
    document.addEventListener('questionAnswered', this.handleQuestionAnswered.bind(this));
    document.addEventListener('gameComplete', this.handleGameComplete.bind(this));
    document.addEventListener('achievementUnlocked', this.handleAchievementUnlocked.bind(this));
    document.addEventListener('languageChanged', this.handleLanguageChanged.bind(this));
  }

  setupHighContrastSupport() {
    // Detect high contrast mode
    if (window.matchMedia) {
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      if (highContrast.matches) {
        document.body.classList.add('high-contrast');
      }
      
      highContrast.addListener((e) => {
        if (e.matches) {
          document.body.classList.add('high-contrast');
        } else {
          document.body.classList.remove('high-contrast');
        }
      });
    }
  }

  handleKeydown(event) {
    const { key, ctrlKey, altKey, shiftKey } = event;
    
    // Handle escape key
    if (key === 'Escape') {
      this.handleEscape();
      return;
    }
    
    // Handle arrow key navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.handleArrowNavigation(key, event);
    }
    
    // Handle Enter and Space on interactive elements
    if (key === 'Enter' || key === ' ') {
      this.handleActivation(event);
    }
    
    // Handle keyboard shortcuts
    if (ctrlKey || altKey) {
      this.handleKeyboardShortcuts(event);
    }
  }

  handleKeyup(event) {
    // Update keyboard navigation state
    if (event.key === 'Tab') {
      this.updateFocusableElements();
    }
  }

  handleFocusIn(event) {
    const element = event.target;
    
    // Update current focus index
    this.currentFocusIndex = this.focusableItems.indexOf(element);
    
    // Announce focused element for screen readers
    if (this.isKeyboardNavigating) {
      this.announceFocusedElement(element);
    }
    
    // Add visual focus indicator if needed
    if (this.isKeyboardNavigating && !element.matches(':focus-visible')) {
      element.classList.add('keyboard-focused');
    }
  }

  handleFocusOut(event) {
    const element = event.target;
    element.classList.remove('keyboard-focused');
  }

  handleEscape() {
    // Close modals
    const modal = document.getElementById('modal-overlay');
    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      this.announce('Dialog closed');
      return;
    }
    
    // Return to main menu
    if (window.mathKidsApp && typeof window.mathKidsApp.renderMainMenu === 'function') {
      window.mathKidsApp.renderMainMenu();
      this.announce('Returned to main menu');
    }
  }

  handleArrowNavigation(direction, event) {
    const currentElement = document.activeElement;
    
    // Check if we're in a grid or list
    const container = currentElement.closest('[role="grid"], [role="listbox"], .grid');
    if (container) {
      event.preventDefault();
      this.navigateInContainer(direction, container);
    }
  }

  navigateInContainer(direction, container) {
    const items = Array.from(container.querySelectorAll(this.focusableElements));
    const currentIndex = items.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    const isGrid = container.hasAttribute('role') && container.getAttribute('role') === 'grid';
    
    if (isGrid) {
      // Calculate grid navigation
      const columns = this.calculateGridColumns(container);
      nextIndex = this.calculateGridNavigation(direction, currentIndex, items.length, columns);
    } else {
      // Simple list navigation
      nextIndex = this.calculateListNavigation(direction, currentIndex, items.length);
    }
    
    if (nextIndex !== -1 && items[nextIndex]) {
      items[nextIndex].focus();
    }
  }

  calculateGridColumns(container) {
    const firstRow = container.querySelector('.grid-cols-1, .grid-cols-2, .grid-cols-3, .grid-cols-4');
    if (firstRow) {
      const classList = Array.from(firstRow.classList);
      const gridClass = classList.find(cls => cls.startsWith('grid-cols-'));
      if (gridClass) {
        return parseInt(gridClass.split('-')[2]) || 1;
      }
    }
    return 1;
  }

  calculateGridNavigation(direction, currentIndex, totalItems, columns) {
    switch (direction) {
      case 'ArrowUp':
        return currentIndex - columns >= 0 ? currentIndex - columns : -1;
      case 'ArrowDown':
        return currentIndex + columns < totalItems ? currentIndex + columns : -1;
      case 'ArrowLeft':
        return currentIndex % columns > 0 ? currentIndex - 1 : -1;
      case 'ArrowRight':
        return (currentIndex + 1) % columns !== 0 && currentIndex + 1 < totalItems ? currentIndex + 1 : -1;
      default:
        return -1;
    }
  }

  calculateListNavigation(direction, currentIndex, totalItems) {
    switch (direction) {
      case 'ArrowUp':
      case 'ArrowLeft':
        return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      case 'ArrowDown':
      case 'ArrowRight':
        return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      default:
        return -1;
    }
  }

  handleActivation(event) {
    const element = event.target;
    
    // Don't interfere with form inputs
    if (element.matches('input, textarea, select')) {
      return;
    }
    
    // Handle buttons and interactive elements
    if (element.matches('button, [data-action], [role="button"]')) {
      event.preventDefault();
      element.click();
    }
  }

  handleKeyboardShortcuts(event) {
    const { key, ctrlKey, altKey } = event;
    
    // Alt + M: Main menu
    if (altKey && key.toLowerCase() === 'm') {
      event.preventDefault();
      if (window.mathKidsApp && typeof window.mathKidsApp.renderMainMenu === 'function') {
        window.mathKidsApp.renderMainMenu();
        this.announce('Main menu opened');
      }
    }
    
    // Alt + S: Settings
    if (altKey && key.toLowerCase() === 's') {
      event.preventDefault();
      if (window.mathKidsApp && typeof window.mathKidsApp.showSettings === 'function') {
        window.mathKidsApp.showSettings();
        this.announce('Settings opened');
      }
    }
    
    // Alt + D: Dashboard
    if (altKey && key.toLowerCase() === 'd') {
      event.preventDefault();
      if (window.mathKidsApp && typeof window.mathKidsApp.showDashboard === 'function') {
        window.mathKidsApp.showDashboard();
        this.announce('Dashboard opened');
      }
    }
  }

  updateFocusableElements() {
    this.focusableItems = Array.from(document.querySelectorAll(this.focusableElements))
      .filter(el => this.isVisible(el) && !el.hasAttribute('aria-hidden'));
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  // Focus management methods
  focusFirst() {
    this.updateFocusableElements();
    if (this.focusableItems.length > 0) {
      this.focusableItems[0].focus();
    }
  }

  focusLast() {
    this.updateFocusableElements();
    if (this.focusableItems.length > 0) {
      this.focusableItems[this.focusableItems.length - 1].focus();
    }
  }

  trapFocus(container) {
    const focusableInContainer = container.querySelectorAll(this.focusableElements);
    const firstFocusable = focusableInContainer[0];
    const lastFocusable = focusableInContainer[focusableInContainer.length - 1];
    
    const handleTabKey = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  // Announcement methods
  announce(message, priority = 'polite') {
    const now = Date.now();
    
    // Debounce announcements
    if (now - this.lastAnnouncementTime < 100) {
      return;
    }
    
    this.lastAnnouncementTime = now;
    
    const announcer = priority === 'assertive' 
      ? document.getElementById('aria-announcements')
      : document.getElementById('aria-status');
    
    if (announcer) {
      // Clear and set new message
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 10);
    }
    
    console.log(`Accessibility announcement (${priority}):`, message);
  }

  announceFocusedElement(element) {
    let announcement = '';
    
    // Get element label
    const label = this.getElementLabel(element);
    if (label) {
      announcement = label;
    }
    
    // Add role information
    const role = element.getAttribute('role') || this.getImplicitRole(element);
    if (role && role !== 'generic') {
      announcement += `, ${role}`;
    }
    
    // Add state information
    const state = this.getElementState(element);
    if (state) {
      announcement += `, ${state}`;
    }
    
    if (announcement) {
      this.announce(announcement, 'polite');
    }
  }

  getElementLabel(element) {
    // Check aria-label
    if (element.hasAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }
    
    // Check aria-labelledby
    if (element.hasAttribute('aria-labelledby')) {
      const labelId = element.getAttribute('aria-labelledby');
      const labelElement = document.getElementById(labelId);
      if (labelElement) {
        return labelElement.textContent.trim();
      }
    }
    
    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }
    
    // Use text content
    return element.textContent.trim();
  }

  getImplicitRole(element) {
    const tagName = element.tagName.toLowerCase();
    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'select': 'combobox',
      'textarea': 'textbox',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading'
    };
    
    return roleMap[tagName] || 'generic';
  }

  getElementState(element) {
    const states = [];
    
    if (element.hasAttribute('aria-expanded')) {
      const expanded = element.getAttribute('aria-expanded') === 'true';
      states.push(expanded ? 'expanded' : 'collapsed');
    }
    
    if (element.hasAttribute('aria-selected')) {
      const selected = element.getAttribute('aria-selected') === 'true';
      if (selected) states.push('selected');
    }
    
    if (element.hasAttribute('aria-checked')) {
      const checked = element.getAttribute('aria-checked');
      if (checked === 'true') states.push('checked');
      else if (checked === 'false') states.push('unchecked');
    }
    
    if (element.hasAttribute('disabled') || element.hasAttribute('aria-disabled')) {
      states.push('disabled');
    }
    
    return states.join(', ');
  }

  // Event handlers for app events
  handleQuestionAnswered(event) {
    const { isCorrect, questionsRemaining } = event.detail;
    const message = isCorrect 
      ? `Correct! ${questionsRemaining} questions remaining.`
      : `Incorrect. ${questionsRemaining} questions remaining.`;
    
    this.announce(message, 'assertive');
  }

  handleGameComplete(event) {
    const { score, totalQuestions, accuracy } = event.detail;
    const message = `Game complete! You scored ${score} out of ${totalQuestions} questions. Accuracy: ${accuracy}%.`;
    
    this.announce(message, 'assertive');
  }

  handleAchievementUnlocked(event) {
    const { achievement } = event.detail;
    this.announce(`Achievement unlocked: ${achievement}!`, 'assertive');
  }

  handleLanguageChanged(event) {
    const { language } = event.detail;
    this.announce(`Language changed to ${language}`, 'polite');
  }

  // Utility methods
  addLandmarks() {
    // Add skip links
    this.addSkipLinks();
    
    // Add landmark roles where missing
    this.addLandmarkRoles();
  }

  addSkipLinks() {
    const skipLink = document.querySelector('.skip-link');
    if (!skipLink) {
      const skip = document.createElement('a');
      skip.href = '#main-content';
      skip.className = 'skip-link sr-only-focusable';
      skip.textContent = 'Skip to main content';
      document.body.insertBefore(skip, document.body.firstChild);
    }
  }

  addLandmarkRoles() {
    // Add main role if missing
    const main = document.querySelector('main, #main-content');
    if (main && !main.hasAttribute('role')) {
      main.setAttribute('role', 'main');
    }
    
    // Add navigation role to nav elements
    const navs = document.querySelectorAll('nav');
    navs.forEach(nav => {
      if (!nav.hasAttribute('role')) {
        nav.setAttribute('role', 'navigation');
      }
    });
  }

  // Cleanup
  destroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('keyup', this.handleKeyup);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    
    console.log('Accessibility helper destroyed');
  }
} 