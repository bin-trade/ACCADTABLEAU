/* ACCAD Trace — dashboard de supervision */
(function () {
  'use strict';
  const CFG = window.ACCAD_CONFIG, $ = (s) => document.querySelector(s), SS = sessionStorage;
  const esc = (v) => String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => Number(v) || 0, money = (v, d) => `${num(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${d || 'USD'}`;
  const toISO = (d) => { const p = String(d || '').split('-'); return p.length === 3 && p[0].length === 2 ? `${p[2]}-${p[1]}-${p[0]}` : String(d || ''); };
  let data = null, view = 'overview', idle;
  const TITLES = { overview: 'Vue générale', operations: 'Opérations', payments: 'Paiements', verifications: 'Vérifications', funds: 'Situation des fonds', reversements: 'Reversements', agents: 'Agents', tarifs: 'Tarifs' };

  async function api(action, extra) {
    let r; try { r = await fetch(CFG.apiUrl, { method: 'POST', body: JSON.stringify(Object.assign({ action, sessionToken: SS.getItem('accadSession') || '', deviceId: 'DASHBOARD' }, extra || {})) }); } catch (e) { throw new Error('Pas de connexion au service central.'); }
    let j; try { j = await r.json(); } catch (e) { throw new Error('Service temporairement indisponible.'); }
    if (!j.ok) { const err = new Error(j.error || 'Opération refusée.'); err.session = /session|reconnecter/i.test(err.message); throw err; }
    return j.data;
  }
  function msg(zone, text, kind) { zone.innerHTML = text ? `<div class="alert alert-${kind}" role="${kind === 'error' ? 'alert' : 'status'}"><span class="sym" aria-hidden="true">${kind === 'error' ? '✖' : kind === 'success' ? '✔' : 'ℹ'}</span><span>${esc(text)}</span></div>` : ''; }
  function touch() { clearTimeout(idle); if (SS.getItem('accadSession')) idle = setTimeout(() => logout('Session expirée après 15 minutes d’inactivité.'), 15 * 60000); }
  function logout(text) { SS.clear(); clearTimeout(idle); $('#app-panel').hidden = true; $('#login-card').hidden = false; $('#session-info').hidden = true; msg($('#login-status'), text || 'Session fermée.', 'info'); }
  ['click', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, touch, { passive: true }));

  async function load() {
    const filters = { search: $('#search').value, dateFrom: $('#date-from').value, dateTo: $('#date-to').value, agent: $('#agent-filter').value, status: $('#status-filter').value };
    data = await api('dashboard.data', { filters });
    const sel = $('#agent-filter'), cur = sel.value; sel.innerHTML = '<option value="">Tous les agents</option>' + data.agents.filter((a) => ['PERCEPTION', 'VERIFICATION'].includes(String(a.ROLE).toUpperCase())).map((a) => `<option value="${esc(a.ID_AGENT)}">${esc(a.NOM_COMPLET)} (${esc(a.ID_AGENT)})</option>`).join(''); sel.value = cur;
    render();
  }
  const table = (heads, rows, foot) => `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th${h.startsWith('#') ? ' class="num"' : ''}>${esc(h.replace(/^#/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="calc">Aucune donnée.</td></tr>`}</tbody>${foot || ''}</table></div>`;
  const card = (title, inner, sub) => `<section class="card"><h2>${esc(title)}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}${inner}</section>`;
  const tag = (t, c) => `<span class="tag ${c || ''}">${esc(t)}</span>`;

  function overview() {
    const today = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })();
    const paid = data.payments.filter((p) => p.STATUT_PAIEMENT === 'CONFIRMED');
    const ver = data.verifications, ok = ver.filter((v) => v.RESULTAT_VERIFICATION === 'CONFORME' || (!v.RESULTAT_VERIFICATION && v.RESULTAT_SIGNATURE === 'VALIDE')).length;
    const dev = (paid[0] || {}).DEVISE || 'USD';
    return `<div class="kpis"><div class="kpi"><b>${data.operations.length}</b><span>Opérations</span></div><div class="kpi"><b>${esc(money(paid.reduce((s, p) => s + num(p.MONTANT_PAYE), 0), dev))}</b><span>Recettes confirmées</span></div><div class="kpi"><b>${data.operations.filter((o) => o.DATE_CREATION === today).length}</b><span>Entrées du jour</span></div><div class="kpi"><b>${ver.length}</b><span>Vérifications · ${ok} conformes · ${ver.length - ok} non conformes</span></div></div>` +
      card('Dernières opérations', opsTable(data.operations.slice().reverse().slice(0, 8)));
  }
  function opsTable(rows) { return table(['Référence', 'Date', 'Plaque', 'Exportateur', 'Agent', 'Site', '#Montant'], rows.map((o) => `<tr><td><button class="secondary" data-op="${esc(o.ID_OPERATION)}" style="min-height:36px;padding:4px 8px;font-size:13px">${esc(o.REFERENCE_OPERATION)}</button></td><td>${esc(o.DATE_CREATION)} ${esc(String(o.HEURE_CREATION).slice(0, 5))}</td><td>${esc(o.NUMERO_PLAQUE)}</td><td>${esc(o.NOM_EXPORTATEUR)}</td><td>${esc(o.NOM_AGENT_SNAPSHOT)}</td><td>${esc(o.SITE_OPERATION || 'BENI')}</td><td class="num">${esc(money(o.MONTANT, o.DEVISE))}</td></tr>`)); }

  function funds() {
    const f = data.funds, field = f.agents.filter((a) => a.role !== 'DEPOT'), dep = f.agents.filter((a) => a.role === 'DEPOT');
    const line = (a) => `<tr><td><b>${esc(a.nom)}</b><br><small class="muted">${esc(a.idAgent)}</small>${a.anomalie ? '<br>' + tag(a.anomalie, 'bad') : ''}</td><td>${esc(a.role)}</td><td>${esc(a.site)}</td><td class="num">${esc(money(a.percu, f.devise))}</td><td class="num">${esc(money(a.remis, f.devise))}</td><td class="num">${esc(money(a.recu, f.devise))}</td><td class="num"><b>${esc(money(a.detenu, f.devise))}</b></td></tr>`;
    const foot = (label, rows) => `<tfoot><tr><td colspan="3">${label}</td><td class="num">${esc(money(rows.reduce((s, a) => s + a.percu, 0), f.devise))}</td><td class="num">${esc(money(rows.reduce((s, a) => s + a.remis, 0), f.devise))}</td><td class="num">${esc(money(rows.reduce((s, a) => s + a.recu, 0), f.devise))}</td><td class="num">${esc(money(rows.reduce((s, a) => s + a.detenu, 0), f.devise))}</td></tr></tfoot>`;
    const heads = ['Agent', 'Rôle', 'Site', '#Perçu', '#Reversé (confirmé)', '#Reçu en dépôt', '#Détenu'];
    const cards = `<div class="fund-cards">${f.agents.map((a) => `<div class="fund-card"><b>${esc(a.nom)}</b><span class="muted">${esc(a.role)} · ${esc(a.site)}</span><b class="amount">${esc(money(a.detenu, f.devise))}</b><span class="calc">${esc(money(a.percu, f.devise))} perçu − ${esc(money(a.remis, f.devise))} reversé + ${esc(money(a.recu, f.devise))} reçu</span></div>`).join('')}</div>`;
    return `<div class="kpis"><div class="kpi"><b>${esc(money(f.totalDetenuPerception, f.devise))}</b><span>Détenu par les agents de perception et de vérification</span></div><div class="kpi"><b>${esc(money(f.totalRecuDepot, f.devise))}</b><span>Reçu par les agents de dépôt</span></div><div class="kpi"><b>${esc(money(f.totalGlobal, f.devise))}</b><span>Total global (égal au total perçu : ${esc(money(f.totalPercu, f.devise))})</span></div></div>` +
      card('Montant détenu par agent', cards, 'Détenu = perçu − reversements confirmés + montants reçus en dépôt. Un reversement n’existe qu’après confirmation du receveur.') +
      card('Agents de perception et de vérification', table(heads, field.map(line), foot('Total', field))) +
      card('Agents de dépôt', table(heads, dep.map(line), foot('Total', dep)), 'Un agent de dépôt ne perçoit pas : seuls les montants confirmés lui sont comptés.') +
      (f.historiquesNonFinalises.length ? card('Anciennes déclarations non finalisées (historique, non comptées)', table(['Identifiant', 'Date', 'Agent', '#Montant déclaré', 'Détails'], f.historiquesNonFinalises.map((h) => `<tr><td>${esc(h.id)}</td><td>${esc(h.date)}</td><td>${esc(h.agent)}</td><td class="num">${esc(money(h.montant, f.devise))}</td><td>${esc(h.details)}</td></tr>`)), 'Conservées sans modification ; elles ne réduisent aucun montant détenu.') : '');
  }
  function reversements() {
    const rows = data.reversements, fin = rows.filter((r) => r.FINALISE), old = rows.filter((r) => !r.FINALISE);
    const name = (id) => { const a = data.agents.find((x) => x.ID_AGENT === id); return a ? `${a.NOM_COMPLET} (${id})` : id; };
    return card('Reversements confirmés', table(['Date', 'Site', 'Déposant', 'Receveur', '#Montant', 'Détails'], fin.slice().reverse().map((r) => `<tr><td>${esc(r.DATE_REVERSEMENT)} ${esc(String(r.HEURE_REVERSEMENT || r.HEURE_CONFIRMATION || '').slice(0, 5))}</td><td>${esc(r.SITE || (data.agents.find((a) => a.ID_AGENT === r.ID_AGENT) || {}).SITE || '')}</td><td>${esc(name(r.ID_AGENT))}</td><td>${esc(r.NOM_AGENT_RECEPTEUR || name(r.ID_AGENT_RECEPTEUR))}</td><td class="num">${esc(money(r.MONTANT_REVERSE, r.DEVISE))}</td><td>${esc(r.OBSERVATION)}</td></tr>`)), 'Seuls les reversements confirmés par l’agent receveur apparaissent ici.') +
      (old.length ? card('Historique non finalisé', table(['Date', 'Déposant', '#Montant déclaré', 'Détails', 'Statut'], old.map((r) => `<tr><td>${esc(r.DATE_REVERSEMENT)}</td><td>${esc(name(r.ID_AGENT))}</td><td class="num">${esc(money(r.MONTANT_DECLARE || r.MONTANT_REVERSE, r.DEVISE))}</td><td>${esc(r.OBSERVATION)}</td><td>${tag('HISTORIQUE · NON FINALISÉ', 'warn')}</td></tr>`)), 'Anciennes déclarations sans confirmation de receveur. Elles sont conservées mais non comptabilisées.') : '');
  }
  function render() {
    $('#page-title').textContent = TITLES[view]; const c = $('#content'); if (!data) return;
    const R = {
      overview, funds, reversements,
      operations: () => card('Registre des opérations', opsTable(data.operations.slice().reverse())),
      payments: () => card('Paiements', table(['Reçu', 'Date', 'Agent', 'Statut', '#Montant'], data.payments.slice().reverse().map((p) => `<tr><td>${esc(p.REFERENCE_RECU)}</td><td>${esc(p.DATE_PAIEMENT)} ${esc(String(p.HEURE_PAIEMENT).slice(0, 5))}</td><td>${esc(p.NOM_AGENT_SNAPSHOT)}</td><td>${tag(p.STATUT_PAIEMENT, p.STATUT_PAIEMENT === 'CONFIRMED' ? 'ok' : 'warn')}</td><td class="num">${esc(money(p.MONTANT_PAYE, p.DEVISE))}</td></tr>`))),
      verifications: () => card('Vérifications et passages', table(['Reçu', 'Date', 'Agent', 'Mode', 'Résultat'], data.verifications.slice().reverse().map((v) => { const ok = v.RESULTAT_VERIFICATION === 'CONFORME' || (!v.RESULTAT_VERIFICATION && v.RESULTAT_SIGNATURE === 'VALIDE'); return `<tr><td style="overflow-wrap:anywhere">${esc(v.REFERENCE_RECU)}</td><td>${esc(v.DATE_VERIFICATION)} ${esc(String(v.HEURE_VERIFICATION).slice(0, 5))}</td><td>${esc(v.NOM_AGENT_VERIFICATION)}</td><td>${esc(v.MODE_VERIFICATION)}</td><td>${ok ? tag('✔ CONFORME', 'ok') : (v.RESULTAT_VERIFICATION ? tag('✖ NON CONFORME', 'bad') : tag('NON DISPONIBLE', 'warn'))}</td></tr>`; }))),
      agents: () => card('Agents', table(['Agent', 'Téléphone', 'Rôle', 'Site', 'Statut'], data.agents.map((a) => `<tr><td><b>${esc(a.NOM_COMPLET)}</b><br><small class="muted">${esc(a.ID_AGENT)}</small></td><td>${esc(a.TELEPHONE)}</td><td>${esc(a.ROLE)}</td><td>${esc(a.SITE)}</td><td>${tag(a.STATUT, String(a.STATUT).toUpperCase() === 'ACTIF' ? 'ok' : 'bad')}</td></tr>`)), 'Les codes d’accès ne sont jamais affichés.'),
      tarifs: () => card('Tarifs', table(['Identifiant', 'Libellé', '#Montant', 'Statut'], data.tarifs.map((t) => `<tr><td>${esc(t.ID_TARIF)}</td><td>${esc(t.LIBELLE)}</td><td class="num">${esc(money(t.MONTANT, t.DEVISE))}</td><td>${tag(t.STATUT, String(t.STATUT).toUpperCase() === 'ACTIF' ? 'ok' : '')}</td></tr>`)))
    };
    c.innerHTML = R[view]();
    c.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => detail(b.dataset.op)));
  }
  function detail(id) {
    const o = data.operations.find((x) => x.ID_OPERATION === id); if (!o) return; const p = data.payments.find((x) => x.ID_OPERATION === id) || {};
    const rows = [['Référence', o.REFERENCE_OPERATION], ['Date', `${o.DATE_CREATION} ${o.HEURE_CREATION}`], ['Plaque', o.NUMERO_PLAQUE], ['Type', o.TYPE_CAMION_SNAPSHOT], ['Agence', o.NOM_AGENCE], ['Exportateur', o.NOM_EXPORTATEUR], ['Produit', o.PRODUIT], ['Agent', `${o.NOM_AGENT_SNAPSHOT} (${o.ID_AGENT_PERCEPTION})`], ['Montant', money(o.MONTANT, o.DEVISE)], ['Paiement', p.STATUT_PAIEMENT || o.STATUT_PAIEMENT], ['Synchronisé le', o.DATE_SYNCHRONISATION || '']];
    $('#modal-content').innerHTML = `<h2>Détail de l’opération</h2><dl class="details" style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px">${rows.map(([k, v]) => `<dt class="muted">${esc(k)}</dt><dd style="margin:0;font-weight:700;overflow-wrap:anywhere">${esc(v)}</dd>`).join('')}</dl>`; $('#modal').hidden = false;
  }
  async function refresh(btn) {
    const zone = $('#global-status'); const orig = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = 'Chargement…'; } msg(zone, 'Chargement des données…', 'info');
    try { await load(); msg(zone, '', ''); } catch (e) { if (e.session) logout(e.message); else msg(zone, e.message, 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = orig; } }
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; document.querySelectorAll('.nav-item').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-current', x === b ? 'page' : 'false'); }); render(); window.scrollTo({ top: 0 }); }));
    $('#apply-filters').addEventListener('click', (e) => refresh(e.currentTarget)); $('#refresh').addEventListener('click', (e) => refresh(e.currentTarget));
    $('#close-modal').addEventListener('click', () => { $('#modal').hidden = true; }); $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').hidden = true; });
    $('#logout').addEventListener('click', () => logout());
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const btn = e.submitter, zone = $('#login-status'); btn.disabled = true; const o = btn.textContent; btn.textContent = 'Connexion en cours…'; msg(zone, '', '');
      try { const d = await api('auth.login', { identifier: $('#identifier').value, code: $('#code').value, sessionToken: '' }); if (!['ADMIN', 'PRESIDENT'].includes(d.profile.role)) throw new Error('Ce profil n’a pas accès au dashboard.'); SS.setItem('accadSession', d.sessionToken); $('#login-card').hidden = true; $('#app-panel').hidden = false; $('#session-info').hidden = false; $('#session-info').textContent = d.profile.nomComplet; $('#login-form').reset(); touch(); await refresh(); }
      catch (err) { SS.removeItem('accadSession'); msg(zone, err.message, 'error'); } finally { btn.disabled = false; btn.textContent = o; }
    });
  });
})();
