/* ==========================================================================
   Dilip Fire Safety Engineers — contact form handling
   Kept in its own file (separate from main.js) so the security-relevant
   logic for the one form on the site is easy to find, audit and update
   on its own, without wading through unrelated UI code.

   IMPORTANT — what client-side code can and can't do:
   This is a static website with no server of its own, so real security
   (the kind that can't be bypassed by someone reading this file) has to
   live on the receiving end — the Google Apps Script endpoint. Everything
   below reduces spam and bad submissions for genuine visitors; none of it
   should be treated as a guarantee against a determined attacker, because
   any value defined in this file is visible to anyone who views source.

   For real protection, on the Apps Script side you should:
     1. Check the shared secret server-side and reject requests without it.
     2. Rate-limit by IP/timestamp if your Apps Script setup allows it.
     3. Consider adding Google reCAPTCHA v3 (see the commented block below)
        for real bot-scoring — it needs a free site key from
        https://www.google.com/recaptcha/admin
   ========================================================================== */

(function () {
  var form = document.getElementById('leadForm');
  if (!form) return; // this page has no lead form — nothing to do

  var statusBox = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');
  var honeypot = document.getElementById('website');

  // ---- Configuration — update these for your own deployment ----
  var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbwsULPoEH1Z-kyY68mXQhLSGnJbuf3QC_qf3lmt2psZS_A3iedB5VpD50erXEUvg4jk/exec";
  var FORM_SECRET = "dfse-2026-change-this"; // must match the Apps Script's expected value
  var MIN_FILL_TIME_MS = 3000; // reject submissions faster than this (likely a bot)

  var formRenderedAt = Date.now();
  var isSubmitting = false; // in-memory guard against double submits (no storage APIs used)

  // ---- Field validators ----
  function setFieldError(fieldEl, message) {
    var wrapper = fieldEl.closest('.field');
    if (!wrapper) return;
    wrapper.classList.add('has-error');
    var errorEl = wrapper.querySelector('.field-error');
    if (errorEl) errorEl.textContent = message;
  }
  function clearFieldError(fieldEl) {
    var wrapper = fieldEl.closest('.field');
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
  }

  // Strip characters that have no business in a name/phone/location field,
  // and neutralise anything that looks like an HTML/script tag in free text.
  function sanitizeText(value) {
    return value.replace(/[<>]/g, '').trim();
  }

  function isValidPhone(value) {
    var digitsOnly = value.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(digitsOnly); // Indian mobile: 10 digits, starts 6-9
  }
  function isValidEmail(value) {
    if (!value) return true; // email is optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm() {
    var valid = true;
    var name = form.querySelector('#name');
    var phone = form.querySelector('#phone');
    var email = form.querySelector('#email');
    var service = form.querySelector('#service');
    var location = form.querySelector('#location');

    [name, phone, email, service, location].forEach(clearFieldError);

    if (!name.value.trim() || name.value.trim().length < 2) {
      setFieldError(name, 'Please enter your name.');
      valid = false;
    }
    if (!isValidPhone(phone.value)) {
      setFieldError(phone, 'Enter a valid 10-digit Indian mobile number.');
      valid = false;
    }
    if (!isValidEmail(email.value)) {
      setFieldError(email, 'Enter a valid email address, or leave this blank.');
      valid = false;
    }
    if (!service.value) {
      setFieldError(service, 'Please select a service.');
      valid = false;
    }
    if (!location.value.trim()) {
      setFieldError(location, 'Please tell us the site location.');
      valid = false;
    }
    return valid;
  }

  function showStatus(message, isError) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = 'form-status show ' + (isError ? 'err' : 'ok');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (isSubmitting) return;

    // Honeypot — invisible to real visitors; bots tend to fill every field.
    if (honeypot && honeypot.value) {
      form.reset();
      return; // silently drop — don't tell the bot why
    }

    // Time-trap — a real person needs at least a few seconds to fill this in.
    if (Date.now() - formRenderedAt < MIN_FILL_TIME_MS) {
      showStatus("That was fast — please double check the form and try again.", true);
      return;
    }

    if (!validateForm()) {
      showStatus('Please fix the highlighted fields and try again.', true);
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    var data = new FormData(form);
    // Re-write text fields through the sanitizer before sending.
    ['name', 'phone', 'email', 'location', 'message'].forEach(function (key) {
      if (data.has(key)) data.set(key, sanitizeText(data.get(key)));
    });
    data.append('submitted_at', new Date().toLocaleString());
    data.append('secret', FORM_SECRET);

    try {
      // Apps Script Web Apps don't return CORS headers by default,
      // so this is submitted no-cors and treated as fire-and-forget.
      await fetch(SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', body: data });

      showStatus("Thank you — we've received your requirement and will call you back shortly.", false);
      form.reset();
      formRenderedAt = Date.now(); // reset the time-trap in case they submit again

      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', { form_name: 'requirement_form' });
      }
    } catch (err) {
      showStatus('Something went wrong. Please call us directly at +91 79935 85420.', true);
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Requirement';
    }
  });

  // Clear a field's error state as soon as the person starts fixing it.
  ['name', 'phone', 'email', 'service', 'location'].forEach(function (id) {
    var el = form.querySelector('#' + id);
    if (el) el.addEventListener('input', function () { clearFieldError(el); });
  });

  /* ---- Optional: Google reCAPTCHA v3 ----
     Uncomment and add your own site key to get an invisible bot score
     alongside everything above. Requires a <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
     tag added to the page <head>.

  grecaptcha.ready(function () {
    grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' }).then(function (token) {
      data.append('recaptcha_token', token);
    });
  });
  */
})();
