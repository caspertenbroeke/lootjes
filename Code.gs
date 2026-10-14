/**
 * Lootjes trekken — backend voor Google Apps Script.
 * Plak dit hele bestand in een Apps Script-project (script.google.com, of Extensies > Apps Script in een Sheet).
 * Draai één keer de functie setup.
 * Daarna: Implementeren > Nieuwe implementatie > Web-app, uitvoeren als "Ik", toegang "Iedereen".
 *
 * In het tabblad "lootjes" staat per groep één rij. De lootjes zijn versleuteld:
 * ook de eigenaar van deze Sheet kan niet zien wie wie heeft.
 */

function doGet() {
  return ContentService.createTextOutput('De lootjes-backend werkt. Plak deze URL in index.html bij API_URL.');
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = { ok: true, data: lootjesRoute(req, env_()) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create('Lootjes - gegevens'); }
  props.setProperty('SHEET_ID', ss.getId());
  var sh = ss.getSheetByName('lootjes');
  if (!sh) {
    sh = ss.insertSheet('lootjes');
    sh.appendRow(['groep', 'gegevens (niet met de hand aanpassen)', 'bijgewerkt']);
  }
  return sh;
}

// Draai deze functie één keer in de editor: maakt de Sheet aan en vraagt toestemming.
function setup() {
  var sh = sheet_();
  Logger.log('Klaar. Gegevens staan in: ' + sh.getParent().getUrl());
}

function row_(sh, gid) {
  var f = sh.getRange('A:A').createTextFinder(gid).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}

function load_(gid) {
  if (!gid) return null;
  var cache = CacheService.getScriptCache();
  var hit = cache.get('g:' + gid);
  if (hit) return JSON.parse(hit);
  var sh = sheet_(), r = row_(sh, gid);
  if (!r) return null;
  var raw = sh.getRange(r, 2).getValue();
  try { cache.put('g:' + gid, raw, 300); } catch (e) {}
  return JSON.parse(raw);
}

function save_(g) {
  var sh = sheet_(), r = row_(sh, g.id), raw = JSON.stringify(g);
  var v = [[g.id, raw, new Date()]];
  if (r) sh.getRange(r, 1, 1, 3).setValues(v); else sh.appendRow(v[0]);
  try { CacheService.getScriptCache().put('g:' + g.id, raw, 300); } catch (e) {}
}

function env_() {
  return {
    load: load_,
    save: save_,
    uid: function (n) {
      var s = '';
      while (s.length < n) s += Utilities.getUuid().replace(/-/g, '');
      return s.slice(0, n);
    },
    now: function () { return Date.now(); },
    lock: function (fn) {
      var l = LockService.getScriptLock();
      l.waitLock(20000);
      try { return fn(); } finally { l.releaseLock(); }
    }
  };
}

// Gedeelde server-logica. Draait in Google Apps Script (Code.gs) én in de demomodus van de site.
// De server ziet nooit wie wie heeft: lootjes komen versleuteld binnen, met de sleutel uit ieders persoonlijke link.
// env levert: load, save, uid, now, lock
function lootjesRoute(req, env) {
  var A = req.action;
  var clean = function (s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); };
  var need = function (c, msg) { if (!c) throw new Error(msg); };
  var blob = function (b, max) { return b && typeof b === 'object' ? { i: String(b.i || '').slice(0, 40), c: String(b.c || '').slice(0, max) } : null; };
  var pub = function (g, withVault) {
    var o = {
      id: g.id, name: g.name, budget: g.budget, date: g.date, state: g.state, drawnAt: g.drawnAt || 0,
      now: env.now(), excl: g.excl,
      people: g.people.map(function (p) {
        return { id: p.id, name: p.name, wish: p.wish || [], opened: !!(p.opens && p.opens.length) };
      })
    };
    if (withVault) o.vault = g.vault;
    return o;
  };
  var checkTok = function (p, th) { need(p.th && p.th === String(th || ''), 'Deze link klopt niet (meer). Vraag de organisator om je nieuwe link.'); };

  if (A === 'create') {
    var list = (req.people || []).map(function (p) { return { name: clean(p && p.name, 40), th: String(p && p.th || '').slice(0, 100) }; })
      .filter(function (p) { return p.name && p.th; });
    need(list.length >= 3, 'Je hebt minimaal 3 deelnemers nodig.');
    need(list.length <= 60, 'Maximaal 60 deelnemers.');
    var lower = list.map(function (p) { return p.name.toLowerCase(); });
    need(lower.filter(function (n, i) { return lower.indexOf(n) === i; }).length === lower.length, 'Er staan dubbele namen in de lijst.');
    need(req.adminTh && req.ids && req.ids.length === list.length, 'Aanmaken is mislukt. Probeer het opnieuw.');
    var ng = {
      id: clean(req.gid, 20) || env.uid(10), name: clean(req.name, 80) || 'Lootjes', budget: Math.max(0, Math.round(+req.budget || 0)),
      date: clean(req.date, 10), adminTh: String(req.adminTh).slice(0, 100), state: 'open', drawnAt: 0, excl: [], cipher: null,
      vault: blob(req.vault, 4000),
      people: list.map(function (p, i) { return { id: clean(req.ids[i], 12), name: p.name, th: p.th, wish: [], opens: [] }; })
    };
    need(!env.load(ng.id), 'Probeer het nog een keer.');
    return env.lock(function () { env.save(ng); return pub(ng, false); });
  }

  var g0 = env.load(clean(req.gid, 20));
  need(g0, 'Deze groep bestaat niet (meer). Controleer de link.');
  var isAdmin = function (g) { need(g.adminTh === String(req.adminTh || ''), 'Deze organisatorlink klopt niet.'); };

  if (A === 'get') return pub(g0, false);
  if (A === 'adminGet') { isAdmin(g0); return pub(g0, true); }
  if (A === 'mine') {
    // je eigen versleutelde lootje ophalen + eerdere openingen (spiek-alarm)
    var mp = g0.people.filter(function (p) { return p.id === req.pid; })[0];
    need(mp, 'Deze link hoort bij niemand in de groep.');
    checkTok(mp, req.th);
    return {
      cipher: g0.state === 'drawn' && g0.cipher ? g0.cipher[mp.id] : null, opens: mp.opens || [],
      qs: (mp.qs || []).map(function (q) { return { id: q.id, q: q.q, a: q.a, qt: q.qt, at: q.at }; })
    };
  }
  if (A === 'askList') {
    // de vrager haalt zijn eigen vragen op met zijn geheime sleutel k (de server bewaart niet wie vraagt)
    var ap = g0.people.filter(function (p) { return p.id === req.pid; })[0];
    need(ap, 'Deze link hoort bij niemand in de groep.');
    checkTok(ap, req.th);
    var rq = g0.people.filter(function (p) { return p.id === req.rid; })[0];
    need(rq, 'Deze persoon staat niet (meer) in de groep.');
    return { qs: (rq.qs || []).filter(function (q) { return q.k && q.k === String(req.k || ''); }).map(function (q) { return { id: q.id, q: q.q, a: q.a, qt: q.qt, at: q.at }; }) };
  }

  return env.lock(function () {
    var g = env.load(g0.id);
    var person = function (id) {
      var p = g.people.filter(function (x) { return x.id === id; })[0];
      need(p, 'Deze persoon staat niet (meer) in de groep.');
      return p;
    };
    var open = function () { need(g.state === 'open', 'De lootjes zijn al getrokken. Trek eerst opnieuw als je iets wilt aanpassen.'); };
    var res = null;

    if (A === 'wish') {
      var wp = person(req.pid); checkTok(wp, req.th);
      wp.wish = (req.wish || []).slice(0, 25).map(function (w) {
        var u = clean(w && w.u, 400);
        return { t: clean(w && w.t, 140), u: /^https?:\/\//i.test(u) ? u : '' };
      }).filter(function (w) { return w.t; });
      res = { wish: wp.wish };
    } else if (A === 'ask') {
      var asker = person(req.pid); checkTok(asker, req.th);
      need(g.state === 'drawn', 'Er is nog niet getrokken.');
      var to = person(req.rid);
      need(to.id !== asker.id, 'Je kunt jezelf geen vraag stellen.');
      var k = String(req.k || '').slice(0, 100), q = clean(req.q, 300);
      need(k && q, 'Typ eerst een vraag.');
      to.qs = to.qs || [];
      need(to.qs.filter(function (x) { return x.k === k; }).length < 10, 'Je hebt al 10 vragen gesteld. Wacht eerst op antwoord.');
      to.qs.push({ id: env.uid(6), k: k, q: q, a: '', qt: env.now(), at: 0 });
      res = { qs: to.qs.filter(function (x) { return x.k === k; }).map(function (x) { return { id: x.id, q: x.q, a: x.a, qt: x.qt, at: x.at }; }) };
    } else if (A === 'answer') {
      var ar = person(req.pid); checkTok(ar, req.th);
      var qq = (ar.qs || []).filter(function (x) { return x.id === req.qid; })[0];
      need(qq, 'Deze vraag bestaat niet meer.');
      qq.a = clean(req.a, 500); qq.at = env.now();
      res = { qs: ar.qs.map(function (x) { return { id: x.id, q: x.q, a: x.a, qt: x.qt, at: x.at }; }) };
    } else if (A === 'opened') {
      var op = person(req.pid); checkTok(op, req.th);
      need(g.state === 'drawn', 'Er is nog niet getrokken.');
      var dev = clean(req.dev, 40) || 'onbekend', now = env.now();
      op.opens = op.opens || [];
      var hit = op.opens.filter(function (o) { return o.d === dev; })[0];
      if (hit) hit.l = now; else op.opens.push({ d: dev, f: now, l: now });
      op.opens = op.opens.slice(-20);
      res = { opens: op.opens };
    } else {
      isAdmin(g);
      if (A === 'settings') {
        if (req.name != null) g.name = clean(req.name, 80) || g.name;
        if (req.budget != null) g.budget = Math.max(0, Math.round(+req.budget || 0));
        if (req.date != null) g.date = clean(req.date, 10);
      } else if (A === 'addPerson') {
        open();
        var n = clean(req.name, 40);
        need(n, 'Vul een naam in.');
        need(!g.people.some(function (p) { return p.name.toLowerCase() === n.toLowerCase(); }), n + ' staat er al tussen.');
        need(req.pid && req.th && req.vault, 'Toevoegen is mislukt. Probeer het opnieuw.');
        g.people.push({ id: clean(req.pid, 12), name: n, th: String(req.th).slice(0, 100), wish: [], opens: [] });
        g.vault = blob(req.vault, 4000);
      } else if (A === 'removePerson') {
        open(); person(req.pid);
        need(g.people.length > 3, 'Er moeten minimaal 3 deelnemers overblijven.');
        g.people = g.people.filter(function (p) { return p.id !== req.pid; });
        g.excl = g.excl.filter(function (e) { return e.indexOf(req.pid) < 0; });
      } else if (A === 'rekey') {
        open();
        var rp = person(req.pid);
        need(req.th && req.vault, 'Nieuwe link maken is mislukt.');
        rp.th = String(req.th).slice(0, 100); rp.opens = [];
        g.vault = blob(req.vault, 4000);
      } else if (A === 'excl') {
        open();
        var ids = g.people.map(function (p) { return p.id; });
        g.excl = (req.excl || []).filter(function (e) {
          return e && e.length === 2 && e[0] !== e[1] && ids.indexOf(e[0]) >= 0 && ids.indexOf(e[1]) >= 0;
        }).slice(0, 100);
      } else if (A === 'draw') {
        open();
        var c = req.cipher || {};
        need(g.people.every(function (p) { return c[p.id] && c[p.id].i && c[p.id].c; }), 'De trekking is niet compleet. Probeer het opnieuw.');
        g.cipher = {};
        g.people.forEach(function (p) { g.cipher[p.id] = blob(c[p.id], 300); p.opens = []; p.qs = []; });
        g.state = 'drawn';
        g.drawnAt = env.now();
      } else if (A === 'undraw') {
        g.state = 'open'; g.cipher = null; g.drawnAt = 0;
        g.people.forEach(function (p) { p.opens = []; p.qs = []; });
      } else {
        throw new Error('Onbekende actie.');
      }
    }
    env.save(g);
    return res || pub(g, true);
  });
}
