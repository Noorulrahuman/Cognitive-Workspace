/**
 * OwlAvatarPicker - Reusable Vanilla JavaScript Profile Avatar Component
 * 
 * Slices 12 owl avatars into a responsive modal selection flow with:
 * - Hover edit/camera overlay on current avatar
 * - Dark semi-transparent modal backdrop with click-outside-to-close
 * - 12-item circular avatar grid with highlighted circular selection border
 * - Double-click fast save or Save button confirmation
 * - Custom change callback trigger
 */

class OwlAvatarPicker {
  constructor(options = {}) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : (options.container || document.body);
    
    this.basePath = options.basePath || '/assets/avatars/';
    this.avatarCount = options.avatarCount || 12;
    this.currentAvatar = options.initialAvatar || 'avatar-1.png';
    this.selectedAvatar = this.currentAvatar;
    this.onSave = typeof options.onSave === 'function' ? options.onSave : (avatar) => console.log('Avatar updated:', avatar);

    // Human-friendly labels for the 12 owl avatars
    this.avatarNames = [
      'Classic Scholar', 'Inspector Owl', 'Spring Bonnet', 'Cool Shutter',
      'Retro Afro', 'Pink Bow Lavender', 'Zombie Monster', 'Cybernetic Mecha',
      'Pirate Buccaneer', 'Bandana Cowboy', 'Mystic Wizard', 'Flower Crown'
    ];

    this.init();
  }

  init() {
    this.renderTrigger();
    this.renderModal();
    this.bindEvents();
  }

  renderTrigger() {
    // If the container already has an avatar trigger, use it; otherwise create it
    let trigger = this.container.querySelector('.owl-avatar-trigger');
    if (!trigger) {
      trigger = document.createElement('div');
      trigger.className = 'owl-avatar-trigger';
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-label', 'Change profile avatar');
      trigger.setAttribute('title', 'Click to choose an owl avatar');

      trigger.innerHTML = `
        <div class="owl-avatar-frame">
          <img src="${this.basePath}${this.currentAvatar}" alt="User Avatar" class="owl-avatar-img" />
        </div>
        <div class="owl-avatar-overlay" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span class="owl-avatar-overlay-text">Edit</span>
        </div>
      `;
      this.container.prepend(trigger);
    }

    this.triggerEl = trigger;
    this.mainImgEl = trigger.querySelector('.owl-avatar-img');
  }

  renderModal() {
    // Backdrop & Dialog structure
    const overlay = document.createElement('div');
    overlay.className = 'owl-modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="owl-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="owlModalTitle">
        <div class="owl-modal-head">
          <div>
            <h3 id="owlModalTitle">Choose Your Owl Avatar</h3>
            <p>Select from 12 distinct persona avatars</p>
          </div>
          <button class="owl-modal-close" aria-label="Close modal">&times;</button>
        </div>

        <div class="owl-modal-grid-body">
          <div class="owl-grid"></div>
        </div>

        <div class="owl-modal-foot">
          <span class="owl-foot-hint">Double-click avatar to fast-save</span>
          <div class="owl-foot-actions">
            <button class="owl-btn owl-btn-cancel">Cancel</button>
            <button class="owl-btn owl-btn-save">Save Avatar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    this.overlayEl = overlay;
    this.gridEl = overlay.querySelector('.owl-grid');
    this.closeBtn = overlay.querySelector('.owl-modal-close');
    this.cancelBtn = overlay.querySelector('.owl-btn-cancel');
    this.saveBtn = overlay.querySelector('.owl-btn-save');

    this.populateGrid();
  }

  populateGrid() {
    this.gridEl.innerHTML = '';

    for (let i = 1; i <= this.avatarCount; i++) {
      const fileName = `avatar-${i}.png`;
      const name = this.avatarNames[i - 1] || `Owl ${i}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `owl-grid-item ${fileName === this.selectedAvatar ? 'is-active' : ''}`;
      btn.dataset.filename = fileName;
      btn.setAttribute('aria-label', `Select ${name}`);
      btn.title = `${name} (Double-click to apply)`;

      btn.innerHTML = `
        <div class="owl-grid-item-circle">
          <img src="${this.basePath}${fileName}" alt="${name}" loading="lazy" />
          <div class="owl-grid-checkmark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      `;

      // Single click selects & highlights
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectAvatar(fileName);
      });

      // Double click immediately saves and closes
      btn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.selectAvatar(fileName);
        this.save();
      });

      this.gridEl.appendChild(btn);
    }
  }

  selectAvatar(fileName) {
    this.selectedAvatar = fileName;
    const items = this.gridEl.querySelectorAll('.owl-grid-item');
    items.forEach((item) => {
      if (item.dataset.filename === fileName) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });
  }

  open() {
    this.selectedAvatar = this.currentAvatar;
    this.selectAvatar(this.selectedAvatar);
    this.overlayEl.classList.add('is-active');
    this.overlayEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus active item
    setTimeout(() => {
      const active = this.gridEl.querySelector('.owl-grid-item.is-active');
      if (active) active.focus();
    }, 80);
  }

  close() {
    this.overlayEl.classList.remove('is-active');
    this.overlayEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (this.triggerEl) this.triggerEl.focus();
  }

  save() {
    const previous = this.currentAvatar;
    this.currentAvatar = this.selectedAvatar;

    // Update main avatar image
    if (this.mainImgEl) {
      this.mainImgEl.src = `${this.basePath}${this.currentAvatar}`;
    }

    this.close();

    // Trigger callback
    if (typeof this.onSave === 'function') {
      this.onSave({
        avatar: this.currentAvatar,
        previous: previous,
        url: `${this.basePath}${this.currentAvatar}`
      });
    }
  }

  bindEvents() {
    // Open on trigger click or keyboard Enter/Space
    this.triggerEl.addEventListener('click', () => this.open());
    this.triggerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
    });

    // Close buttons
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());

    // Save button
    this.saveBtn.addEventListener('click', () => this.save());

    // Close on outside click (clicking the dark semi-transparent backdrop overlay)
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlayEl.classList.contains('is-active')) {
        this.close();
      }
    });
  }
}

// Global export for vanilla script tag usage
if (typeof window !== 'undefined') {
  window.OwlAvatarPicker = OwlAvatarPicker;
}
