/* =========================================================
   Diseña tu flujo · constructor de flujos (modal)
   - Arrastrar y soltar con Pointer Events (mouse, lápiz y touch)
   - Alternativas accesibles: tocar/Enter para agregar, botones para ordenar
   - Borrador guardado en localStorage
   - Emite el evento "fs:lead" con el flujo y los datos de contacto
   ========================================================= */
(function () {
  const dlg = document.getElementById('flow-builder');
  if (!dlg) return;

  const MODULES = [
    { id: 'captura', short: 'Formularios dinámicos',   name: 'Captura de datos',            icon: 'fa-keyboard',            cat: 'Datos',        desc: 'Formularios que recogen la información y generan el documento.', evidence: 'Datos del cliente y documento generado automáticamente' },
    { id: 'biometria', short: 'Rostro, prueba de vida y documento', name: 'Validación biométrica',       icon: 'fa-fingerprint',         cat: 'Identidad',    desc: 'Rostro, prueba de vida y documento de identidad.',             evidence: 'Identidad verificada con prueba de vida' },
    { id: 'listas', short: 'Listas restrictivas y de control',    name: 'Listas de riesgo',            icon: 'fa-user-shield',         cat: 'Cumplimiento', desc: 'Consulta en listas restrictivas antes de vincular.',           evidence: 'Consulta en listas restrictivas y de control' },
    { id: 'firma', short: 'Simple, certificada o digital',     name: 'Firma electrónica y digital', icon: 'fa-file-signature',      cat: 'Firma',        desc: 'Firma simple, certificada o digital desde cualquier dispositivo.', evidence: 'Documento firmado con estampa de tiempo', free: true },
    { id: 'pagare', short: 'Emisión, endoso y custodia',    name: 'Pagaré electrónico',          icon: 'fa-file-invoice-dollar', cat: 'Firma',        desc: 'Emisión, endoso y custodia de pagarés.',                       evidence: 'Pagaré emitido y custodiado con validez jurídica' },
    { id: 'notif', short: 'Email y SMS con trazabilidad',     name: 'Notificaciones certificadas', icon: 'fa-bell',                cat: 'Comunicación', desc: 'Email y SMS con certificación de entrega y lectura.',          evidence: 'Certificado de envío, entrega y lectura' },
    { id: 'gestion', short: 'Expedientes organizados y seguros',   name: 'Gestión documental',          icon: 'fa-folder-open',         cat: 'Custodia',     desc: 'Expediente organizado, íntegro y fácil de consultar.',         evidence: 'Expediente digital organizado y custodiado' }
  ];
  const ORDER = MODULES.map((m) => m.id);
  const byId = Object.fromEntries(MODULES.map((m) => [m.id, m]));

  const TEMPLATES = [
    { id: 'vinculacion', name: 'Vinculación de clientes', flow: ['captura', 'biometria', 'listas', 'firma', 'notif', 'gestion'] },
    { id: 'credito',     name: 'Crédito con pagaré',      flow: ['captura', 'biometria', 'listas', 'firma', 'pagare', 'notif', 'gestion'] },
    { id: 'laboral',     name: 'Contratación laboral',    flow: ['captura', 'biometria', 'firma', 'notif', 'gestion'] }
  ];

  const STORE = 'fs-flow-draft';
  const state = { flow: [], template: null, step: 1 };

  const $ = (s, r = dlg) => r.querySelector(s);
  const $$ = (s, r = dlg) => [...r.querySelectorAll(s)];
  const el = {
    mods: $('.fb-mods'), track: $('.fb-track'), empty: $('.fb-empty'), zone: $('.fb-dropzone'),
    tpls: $('.fb-templates'), tips: $('.fb-tips'),
    count: $('.fb-count'), next: $('.fb-next'), live: $('.fb-live'), form: $('.fb-form'),
    recap: $('#fb-recap-list'), doneList: $('#fb-done-list'), doneName: $('#fb-done-name'), doneTrial: $('#fb-done-trial')
  };

  /* ---------- Persistencia ---------- */
  function save() {
    try {
      const fields = {};
      $$('input[name], select[name]', el.form).forEach((f) => { if (f.type !== 'checkbox') fields[f.name] = f.value; });
      localStorage.setItem(STORE, JSON.stringify({ flow: state.flow, template: state.template, fields }));
    } catch (e) { /* almacenamiento no disponible: se continúa sin borrador */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!d) return;
      state.flow = (d.flow || []).filter((id) => byId[id]);
      state.template = d.template || null;
      Object.entries(d.fields || {}).forEach(([k, v]) => { const f = el.form.elements[k]; if (f) f.value = v; });
    } catch (e) { /* borrador ilegible: se ignora */ }
  }
  function clearDraft() { try { localStorage.removeItem(STORE); } catch (e) {} }

  const announce = (msg) => { el.live.textContent = ''; setTimeout(() => { el.live.textContent = msg; }, 30); };

  /* ---------- Acciones sobre el flujo ---------- */
  function addModule(id, index = null) {
    if (state.flow.includes(id)) { flash(id); announce(byId[id].name + ' ya está en tu flujo.'); return; }
    const at = index === null ? state.flow.length : Math.max(0, Math.min(index, state.flow.length));
    state.flow.splice(at, 0, id);
    state.template = null;
    render();
    announce(byId[id].name + ' agregada en el paso ' + (at + 1) + '.');
  }
  function removeModule(id) {
    state.flow = state.flow.filter((x) => x !== id);
    state.template = null;
    render();
    announce(byId[id].name + ' eliminada del flujo.');
  }
  function moveModule(id, to) {
    const from = state.flow.indexOf(id);
    if (from < 0) return;
    state.flow.splice(from, 1);
    to = Math.max(0, Math.min(to, state.flow.length));
    state.flow.splice(to, 0, id);
    state.template = null;
    render();
    announce(byId[id].name + ' movida al paso ' + (to + 1) + '.');
  }
  function sortRecommended() {
    state.flow.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    render();
    announce('Flujo ordenado según lo recomendado.');
  }
  function applyTemplate(id) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    state.flow = t.flow.slice();
    state.template = id;
    render();
    announce('Plantilla ' + t.name + ' aplicada: ' + t.flow.length + ' pasos.');
  }
  function flash(id) {
    const node = el.track.querySelector('[data-id="' + id + '"]');
    if (!node) return;
    node.classList.remove('is-flash'); void node.offsetWidth; node.classList.add('is-flash');
  }

  /* ---------- Sugerencias que enseñan ---------- */
  function tips() {
    const f = state.flow, has = (id) => f.includes(id), idx = (id) => f.indexOf(id);
    const out = [];
    if (!f.length) return out;
    if (has('pagare') && !has('firma')) out.push({ title: 'El pagaré necesita firma', text: 'Para emitir un pagaré electrónico, el deudor debe firmarlo.', label: 'Agregar firma', fn: () => addModule('firma', idx('pagare')) });
    if ((has('firma') || has('pagare')) && !has('biometria')) out.push({ title: 'Valida la identidad antes de firmar', text: 'La biometría confirma que quien firma es quien dice ser y te protege frente a la suplantación (Ley 2573 de 2026).', label: 'Agregar validación biométrica', fn: () => addModule('biometria', Math.min(...['firma', 'pagare'].filter(has).map(idx))) });
    if (has('biometria') && !has('listas') && (has('captura') || has('pagare'))) out.push({ title: 'Suma listas de riesgo', text: 'Consulta listas restrictivas en el mismo paso de la vinculación.', label: 'Agregar listas de riesgo', fn: () => addModule('listas', idx('biometria') + 1) });
    const ordered = f.slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    if (f.join() !== ordered.join()) out.push({ title: 'Orden recomendado', text: 'Primero se captura y se valida, luego se firma, se notifica y se custodia.', label: 'Ordenar automáticamente', fn: sortRecommended });
    if (f.length >= 2 && !has('gestion')) out.push({ title: 'Cierra con el expediente', text: 'Gestión documental custodia los documentos y evidencias de todo el flujo.', label: 'Agregar gestión documental', fn: () => addModule('gestion') });
    return out.slice(0, 2);
  }

  /* ---------- Render ---------- */
  function renderPalette() {
    el.mods.innerHTML = MODULES.map((m) => {
      const added = state.flow.includes(m.id);
      return '<button type="button" class="fb-mod' + (added ? ' is-added' : '') + '" data-id="' + m.id + '" aria-label="' + (added ? m.name + ', ya está en tu flujo' : 'Agregar ' + m.name) + '">' +
        '<span class="fb-ico"><i class="fas ' + m.icon + '" aria-hidden="true"></i></span>' +
        '<span><strong>' + m.name + '</strong><small>' + m.short + (m.free ? ' · <span class="fb-free">Prueba gratis</span>' : '') + '</small></span>' +
        '<span class="fb-add" aria-hidden="true"><i class="fas ' + (added ? 'fa-check' : 'fa-plus') + '"></i></span>' +
        '</button>';
    }).join('');
  }
  function renderFlow() {
    el.track.innerHTML = state.flow.map((id, i) => {
      const m = byId[id], last = i === state.flow.length - 1;
      return '<li class="fb-node" data-id="' + id + '">' +
        '<button type="button" class="fb-grip" aria-label="Arrastrar ' + m.name + ' para reordenar"><i class="fas fa-grip-vertical" aria-hidden="true"></i></button>' +
        '<span class="fb-num"><i class="fas ' + m.icon + '" aria-hidden="true"></i></span>' +
        '<span><span class="fb-step-n">Paso ' + (i + 1) + '</span><strong>' + m.name + '</strong><small>' + m.evidence + '</small></span>' +
        '<span class="fb-actions">' +
          '<button type="button" data-act="up" aria-label="Subir ' + m.name + '"' + (i === 0 ? ' disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
          '<button type="button" data-act="down" aria-label="Bajar ' + m.name + '"' + (last ? ' disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
          '<button type="button" class="rm" data-act="rm" aria-label="Quitar ' + m.name + '"><i class="fas fa-times"></i></button>' +
        '</span></li>';
    }).join('');
    el.empty.hidden = state.flow.length > 0;
  }
  function renderTemplates() {
    $$('.fb-tpl', el.tpls).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tpl === state.template)));
  }
  function renderSummary() {
    const n = state.flow.length;
    // Una sola sugerencia a la vez, debajo del flujo
    const t = tips().slice(0, 1);
    el.tips.innerHTML = t.map((x, i) =>
      '<div class="fb-tip"><i class="fas fa-lightbulb" aria-hidden="true"></i>' +
      '<p><b>' + x.title + '.</b> ' + x.text + '</p>' +
      '<button type="button" data-tip="' + i + '"><i class="fas fa-plus" aria-hidden="true"></i>' + x.label + '</button></div>').join('');
    el.tips._tips = t;
    el.count.textContent = n ? n + (n === 1 ? ' paso en tu flujo' : ' pasos en tu flujo') : 'Tu flujo está vacío';
    el.next.disabled = n === 0;
  }
  function render() {
    renderPalette(); renderFlow(); renderTemplates(); renderSummary(); save();
  }

  const miniList = () => state.flow.map((id) => '<li><i class="fas ' + byId[id].icon + '" aria-hidden="true"></i>' + byId[id].name + '</li>').join('');

  /* ---------- Pasos ---------- */
  function goTo(step) {
    state.step = step;
    $$('.fb-step').forEach((p) => { p.hidden = Number(p.dataset.panel) !== step; });
    $$('.fb-steps li').forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle('done', s < step);
      if (s === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (step === 2) el.recap.innerHTML = miniList();
    const focusTarget = step === 1 ? $('.fb-palette h3') : step === 2 ? $('#fb-name') : $('.fb-done h3');
    if (focusTarget) { if (!focusTarget.hasAttribute('tabindex') && step !== 2) focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: false }); }
  }

  /* ---------- Formulario ---------- */
  const RULES = {
    name:    (v) => v.trim().length >= 3 || 'Escribe tu nombre y apellido.',
    email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Escribe un correo válido.',
    company: (v) => v.trim().length >= 2 || 'Escribe el nombre de tu empresa.',
    phone:   (v) => !v.trim() || /^[+\d\s()-]{7,}$/.test(v.trim()) || 'Revisa el número de celular.',
    volume:  (v) => !!v || 'Selecciona un rango.',
    consent: (v, f) => f.checked || 'Necesitamos tu autorización para contactarte.'
  };
  function validateField(f) {
    const rule = RULES[f.name];
    if (!rule) return true;
    const res = rule(f.value, f);
    const err = document.getElementById('fb-err-' + f.name);
    const ok = res === true;
    f.setAttribute('aria-invalid', String(!ok));
    if (err) err.textContent = ok ? '' : res;
    return ok;
  }
  el.form.addEventListener('blur', (e) => { if (e.target.name) validateField(e.target); }, true);
  el.form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); save(); });
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('[name]', el.form);
    const bad = fields.filter((f) => !validateField(f));
    if (bad.length) { bad[0].focus(); announce('Revisa los campos marcados.'); return; }
    const data = Object.fromEntries(fields.map((f) => [f.name, f.type === 'checkbox' ? f.checked : f.value.trim()]));
    const payload = {
      source: 'home · Diseña tu flujo',
      flow: state.flow.map((id, i) => ({ step: i + 1, id, name: byId[id].name })),
      template: state.template,
      contact: data,
      createdAt: new Date().toISOString()
    };
    const btn = $('.fb-submit');
    btn.classList.add('is-loading');
    btn.innerHTML = 'Enviando <i class="fas fa-circle-notch" aria-hidden="true"></i>';
    // Integración real: enviar `payload` al CRM (p. ej. formulario de HubSpot, webhook de n8n o Elementor Pro Forms).
    dlg.dispatchEvent(new CustomEvent('fs:lead', { bubbles: true, detail: payload }));
    console.info('[Diseña tu flujo] lead', payload);
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.innerHTML = 'Enviar mi flujo <i class="fas fa-arrow-right" aria-hidden="true"></i>';
      el.doneName.textContent = data.name.split(' ')[0];
      el.doneList.innerHTML = miniList();
      el.doneTrial.hidden = !state.flow.includes('firma');
      clearDraft();
      goTo(3);
    }, 900);
  });

  /* ---------- Clicks ---------- */
  let suppressClick = false;
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) { dlg.close(); return; }                 // clic en el fondo
    if (suppressClick) { suppressClick = false; return; }
    const mod = e.target.closest('.fb-mod');
    if (mod) { addModule(mod.dataset.id); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const id = act.closest('.fb-node').dataset.id, i = state.flow.indexOf(id);
      if (act.dataset.act === 'up') moveModule(id, i - 1);
      if (act.dataset.act === 'down') moveModule(id, i + 1);
      if (act.dataset.act === 'rm') removeModule(id);
      const again = el.track.querySelector('[data-id="' + id + '"] [data-act="' + act.dataset.act + '"]');
      if (again && !again.disabled) again.focus();
      return;
    }
    const tpl = e.target.closest('.fb-tpl');
    if (tpl) { applyTemplate(tpl.dataset.tpl); return; }
    const tip = e.target.closest('[data-tip]');
    if (tip) { el.tips._tips[Number(tip.dataset.tip)].fn(); return; }
    if (e.target.closest('.fb-close')) { dlg.close(); return; }
    if (e.target.closest('.fb-next')) { goTo(2); return; }
    if (e.target.closest('.fb-back')) { goTo(1); return; }
    if (e.target.closest('.fb-clear')) { state.flow = []; state.template = null; render(); announce('Flujo vacío.'); return; }
    if (e.target.closest('.fb-restart')) { state.flow = []; state.template = null; el.form.reset(); render(); goTo(1); return; }
  });

  /* ---------- Arrastrar y soltar (Pointer Events) ---------- */
  let drag = null;
  function onPointerDown(e) {
    if (e.button !== 0) return;
    const mod = e.target.closest('.fb-mod');
    const grip = e.target.closest('.fb-grip');
    if (mod) {
      if (mod.classList.contains('is-added') || e.pointerType === 'touch') return; // en touch: tocar para agregar
      drag = { kind: 'new', id: mod.dataset.id, x: e.clientX, y: e.clientY, started: false, source: mod };
    } else if (grip) {
      const node = grip.closest('.fb-node');
      drag = { kind: 'move', id: node.dataset.id, x: e.clientX, y: e.clientY, started: false, source: node };
      e.preventDefault();
    } else return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cancelDrag);
  }
  function startDrag(e) {
    drag.started = true;
    const m = byId[drag.id];
    drag.ghost = document.createElement('div');
    drag.ghost.className = 'fb-ghost';
    drag.ghost.innerHTML = '<i class="fas ' + m.icon + '"></i>' + m.name;
    document.body.appendChild(drag.ghost);
    drag.placeholder = document.createElement('li');
    drag.placeholder.className = 'fb-placeholder';
    drag.placeholder.setAttribute('aria-hidden', 'true');
    dlg.classList.add('is-dragging');
    if (drag.kind === 'move') drag.source.classList.add('is-source');
    moveGhost(e);
  }
  function moveGhost(e) {
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
    const r = el.zone.getBoundingClientRect();
    const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    el.zone.classList.toggle('is-over', over);
    drag.over = over;
    if (!over) { drag.placeholder.remove(); drag.index = null; return; }
    const nodes = $$('.fb-node', el.track).filter((n) => n !== drag.source);
    let index = nodes.length;
    for (let i = 0; i < nodes.length; i++) {
      const b = nodes[i].getBoundingClientRect();
      if (e.clientY < b.top + b.height / 2) { index = i; break; }
    }
    drag.index = index;
    const ref = nodes[index] || null;
    if (drag.placeholder.nextSibling !== ref || !drag.placeholder.parentNode) el.track.insertBefore(drag.placeholder, ref);
    el.empty.hidden = true;
  }
  function onPointerMove(e) {
    if (!drag) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      startDrag(e);
    }
    moveGhost(e);
  }
  function endListeners() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', cancelDrag);
  }
  function cleanupDrag() {
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    if (drag.placeholder) drag.placeholder.remove();
    if (drag.source) drag.source.classList.remove('is-source');
    el.zone.classList.remove('is-over');
    dlg.classList.remove('is-dragging');
    el.empty.hidden = state.flow.length > 0;
  }
  function onPointerUp() {
    endListeners();
    if (!drag) return;
    const d = drag;
    cleanupDrag();
    drag = null;
    if (!d.started) return;            // fue un clic: lo maneja el evento click
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (!d.over || d.index === null) return;
    if (d.kind === 'new') addModule(d.id, d.index);
    else moveModule(d.id, d.index);
  }
  function cancelDrag() { endListeners(); cleanupDrag(); drag = null; }
  dlg.addEventListener('pointerdown', onPointerDown);
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) { e.preventDefault(); cancelDrag(); } });

  /* ---------- Abrir / cerrar ---------- */
  function open(template) {
    load();
    if (template && !state.flow.length) applyTemplate(template);
    render();
    dlg.showModal();
    document.documentElement.classList.add('fb-open');
    goTo(1);
  }
  dlg.addEventListener('close', () => { cancelDrag(); document.documentElement.classList.remove('fb-open'); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-flow]');
    if (!t) return;
    e.preventDefault();
    open(t.dataset.template);
  });

  el.tpls.insertAdjacentHTML('beforeend', TEMPLATES.map((t) => '<button type="button" class="fb-tpl" data-tpl="' + t.id + '" aria-pressed="false">' + t.name + '</button>').join(''));
})();
