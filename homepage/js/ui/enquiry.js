// Enquiry panel: a native <dialog> that slides in from the side (a bottom sheet on phones).
// The form validates and confirms, but as a prototype it sends nothing.

import { $, $$, listen } from '../lib/dom.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initEnquiry() {
  const dialog = $('[data-enquiry]');
  if (!dialog) return;
  const form = $('[data-enquiry-form]', dialog);
  const done = $('[data-enquiry-done]', dialog);
  const context = $('[data-enquiry-context]', dialog);
  let opener = null;
  let closeTimer = 0;

  function open({ interest, note } = {}, trigger = null) {
    opener = trigger || document.activeElement;
    clearTimeout(closeTimer);
    form.reset();
    form.hidden = false;
    done.hidden = true;
    clearErrors();
    if (interest) {
      const choice = form.querySelector(`input[name="interest"][value="${interest}"]`);
      if (choice) choice.checked = true;
    }
    context.hidden = !note;
    context.textContent = note ? `About: ${note}` : '';
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('is-locked');
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    $('#enquiry-name', dialog).focus({ preventScroll: true });
  }

  function close() {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    closeTimer = setTimeout(() => {
      dialog.close();
      document.documentElement.classList.remove('is-locked');
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    }, document.documentElement.classList.contains('motion') ? 520 : 0);
  }

  function setError(input, message) {
    const error = $(`#${input.id}-error`, dialog);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!error) return;
    error.hidden = !message;
    if (message) input.setAttribute('aria-describedby', error.id);
    else input.removeAttribute('aria-describedby');
  }

  function clearErrors() {
    $$('input, textarea', form).forEach((input) => {
      if (input.id) setError(input, '');
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#enquiry-name', form);
    const email = $('#enquiry-email', form);
    setError(name, name.value.trim() ? '' : 'required');
    setError(email, EMAIL.test(email.value.trim()) ? '' : 'required');
    const firstInvalid = [name, email].find((input) => input.getAttribute('aria-invalid') === 'true');
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    const firstName = name.value.trim().split(/\s+/)[0];
    $('[data-enquiry-name]', done).textContent = firstName ? `, ${firstName}` : '';
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  $$('input', form).forEach((input) => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') setError(input, '');
    });
  });

  $$('[data-enquiry-close]', dialog).forEach((button) => button.addEventListener('click', close));

  // Escape: animate out instead of closing abruptly.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  // A click on the dimmed backdrop lands on the dialog element itself.
  dialog.addEventListener('pointerdown', (event) => {
    if (event.target === dialog) close();
  });

  listen('bloom:enquire', ({ interest, note, trigger }) => open({ interest, note }, trigger));
}
