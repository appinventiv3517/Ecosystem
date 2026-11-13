// Custom dropdown following the WAI-ARIA listbox pattern: a button opens a listbox,
// arrow keys move, Enter or Space chooses, Escape closes, typing jumps to a match.

import { $, $$ } from '../lib/dom.js';

const openSelects = new Set();

document.addEventListener('pointerdown', (event) => {
  openSelects.forEach((select) => {
    if (!select.root.contains(event.target)) select.close();
  });
});

export class Select {
  constructor(root, { onChange } = {}) {
    this.root = root;
    this.name = root.dataset.select;
    this.button = $('.select__button', root);
    this.list = $('.select__list', root);
    this.valueLabel = $('.select__value', root);
    this.input = $('input[type="hidden"]', root);
    this.options = $$('[role="option"]', this.list);
    this.onChange = onChange;
    this.activeIndex = Math.max(0, this.options.findIndex((option) => option.getAttribute('aria-selected') === 'true'));
    this.typed = '';
    this.typedTimer = 0;
    this.closeTimer = 0;

    this.options.forEach((option, index) => option.style.setProperty('--i', index));

    this.button.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    this.button.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    });
    this.list.addEventListener('keydown', (event) => this.onListKey(event));
    this.list.addEventListener('focusout', (event) => {
      if (!this.root.contains(event.relatedTarget)) this.close({ refocus: false });
    });
    this.options.forEach((option, index) => {
      option.addEventListener('click', () => {
        this.choose(index);
        this.close();
      });
      option.addEventListener('pointermove', () => this.setActive(index));
    });
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  get value() {
    return this.input.value;
  }

  get label() {
    const option = this.options.find((item) => item.dataset.value === this.value);
    return option ? $('span', option).textContent : '';
  }

  open() {
    if (this.isOpen) return;
    openSelects.forEach((select) => select.close({ refocus: false }));
    clearTimeout(this.closeTimer);
    this.list.hidden = false;
    // Flush so the opening transition starts from the closed styles.
    void this.list.offsetWidth;
    this.root.classList.add('is-open');
    this.button.setAttribute('aria-expanded', 'true');
    const selected = this.options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
    this.setActive(Math.max(0, selected));
    this.list.focus({ preventScroll: true });
    openSelects.add(this);
  }

  close({ refocus = true } = {}) {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    this.button.setAttribute('aria-expanded', 'false');
    this.list.removeAttribute('aria-activedescendant');
    openSelects.delete(this);
    if (refocus) this.button.focus({ preventScroll: true });
    this.closeTimer = setTimeout(() => {
      if (!this.isOpen) this.list.hidden = true;
    }, 320);
  }

  setActive(index) {
    this.activeIndex = (index + this.options.length) % this.options.length;
    this.options.forEach((option, i) => option.classList.toggle('is-active', i === this.activeIndex));
    const active = this.options[this.activeIndex];
    this.list.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  choose(index, { silent = false } = {}) {
    const option = this.options[index];
    if (!option) return;
    const changed = this.input.value !== option.dataset.value;
    this.options.forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
    this.input.value = option.dataset.value;
    this.valueLabel.textContent = $('span', option).textContent;
    this.root.classList.toggle('is-filled', Boolean(option.dataset.value));
    if (changed) {
      // Restart the small "value arrived" animation.
      this.valueLabel.classList.remove('is-changing');
      void this.valueLabel.offsetWidth;
      this.valueLabel.classList.add('is-changing');
      if (!silent && this.onChange) this.onChange(this.value, this);
    }
  }

  /** Set by value from elsewhere on the page (quick starts, community cards, the menu). */
  set(value, options) {
    const index = this.options.findIndex((option) => option.dataset.value === value);
    if (index >= 0) this.choose(index, options);
  }

  onListKey(event) {
    const { key } = event;
    if (key === 'ArrowDown') {
      event.preventDefault();
      this.setActive(this.activeIndex + 1);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      this.setActive(this.activeIndex - 1);
    } else if (key === 'Home') {
      event.preventDefault();
      this.setActive(0);
    } else if (key === 'End') {
      event.preventDefault();
      this.setActive(this.options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.choose(this.activeIndex);
      this.close();
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (key === 'Tab') {
      this.close({ refocus: false });
    } else if (key.length === 1 && /\S/.test(key)) {
      this.typed += key.toLowerCase();
      clearTimeout(this.typedTimer);
      this.typedTimer = setTimeout(() => {
        this.typed = '';
      }, 600);
      const match = this.options.findIndex((option) => option.textContent.trim().toLowerCase().startsWith(this.typed));
      if (match >= 0) this.setActive(match);
    }
  }
}
