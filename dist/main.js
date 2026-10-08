// Minimal progressive enhancement: mobile menu + contact form fallback. No dependencies.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  form.addEventListener('submit', function (e) {
    if (form.dataset.configured === 'true') return; // real endpoint: normal submit
    e.preventDefault();
    var email = form.dataset.email;
    if (!email) {
      status.textContent = 'This form is not connected yet. Please add an email address or form endpoint in site.config.json.';
      return;
    }
    var d = new FormData(form);
    var lines = ['name', 'business', 'email', 'phone', 'website', 'service', 'budget'].map(function (k) {
      return k.charAt(0).toUpperCase() + k.slice(1) + ': ' + (d.get(k) || '');
    });
    lines.push('', String(d.get('message') || ''));
    window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Project enquiry from ' + (d.get('name') || 'website')) + '&body=' + encodeURIComponent(lines.join('\n'));
    status.textContent = 'Opening your email app with your details. If nothing opens, email ' + email + ' directly.';
  });
})();
