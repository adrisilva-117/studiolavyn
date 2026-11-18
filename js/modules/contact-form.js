// "Let's talk" form on the contact detail page.
// The form lives inside a <template>, so listeners are attached to the document.
//
// Submissions are emailed to contact@studiolavyn.com by FormSubmit (formsubmit.co), a free
// service that works on any host, including GitHub Pages. The very first submission makes
// FormSubmit send an "Activate Form" email to that address; click it once and you're set.
// On your own computer (localhost) sending is simulated, so test runs don't email you.

const MESSAGES = {
  name: 'Please enter your name.',
  email: 'Please enter a valid email address, like name@example.com.',
  phone: 'Please enter a valid phone number.',
};

function validate(input) {
  const v = input.value.trim();
  let msg = '';
  if (input.required && !v) msg = MESSAGES[input.name] || 'This field is required.';
  else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MESSAGES.email;
  else if (v && input.type === 'tel' && (!/^\+?[\d\s().-]+$/.test(v) || v.replace(/\D/g, '').length < 7)) msg = MESSAGES.phone;

  const error = document.getElementById(`${input.id}-error`);
  if (error) error.textContent = msg;
  if (msg) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  if (msg) input.setAttribute('aria-describedby', `${input.id}-error`);
  else input.removeAttribute('aria-describedby');
  return !msg;
}

const ENDPOINT = 'https://formsubmit.co/ajax/contact@studiolavyn.com';
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(location.hostname);

async function submit(form) {
  // Everything in the form, including the hidden _subject, _template and _honey fields.
  const data = Object.fromEntries(new FormData(form));
  if (IS_LOCAL) {
    console.info('Contact form (local preview, not sent):', data);
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const reply = await res.json().catch(() => ({}));
  // FormSubmit answers {"success": "true"} (a string) when the email is on its way.
  if (!res.ok || String(reply.success) !== 'true') {
    throw new Error(`Form submission failed: ${res.status} ${reply.message || ''}`);
  }
}

export function initContactForm() {
  // Re-check a field when the visitor leaves it, and clear its error as they fix it.
  document.addEventListener('focusout', (e) => {
    const input = e.target.closest('[data-contact-form] .field input');
    if (input && input.value) validate(input);
  });
  document.addEventListener('input', (e) => {
    const input = e.target.closest('[data-contact-form] .field input');
    if (input?.hasAttribute('aria-invalid')) validate(input);
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-contact-form]');
    if (!form) return;
    e.preventDefault();

    const inputs = [...form.querySelectorAll('.field input')];
    const valid = inputs.map(validate);
    const firstBad = inputs[valid.indexOf(false)];
    if (firstBad) { firstBad.focus(); return; }

    const status = form.querySelector('.form-status');
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';

    try {
      inputs.forEach((i) => { i.value = i.value.trim(); });
      const firstName = form.elements.name.value.split(' ')[0];
      await submit(form);
      form.classList.add('is-sent');
      status.textContent = `Thanks, ${firstName}! We'll be in touch soon.`;
      form.reset();
      // The fields are now hidden, so move focus to the message instead of losing it.
      status.tabIndex = -1;
      status.focus();
    } catch (err) {
      status.innerHTML = 'Something went wrong. Please try again, or email us at <a href="mailto:contact@studiolavyn.com">contact@studiolavyn.com</a>.';
    } finally {
      button.disabled = false;
      button.textContent = 'Send';
    }
  });
}
