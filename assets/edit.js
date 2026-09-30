/*
 * サイト編集ツール（/edit/）のプログラム
 * - 公開中の text/*.txt を読み、入力欄で直して、下見に映す
 * - 「保存して公開する」は、GitHub の API でリポジトリの text/*.txt を書きかえる（鍵＝トークンが要る。鍵はこのブラウザの中にだけ置く）
 * - 鍵がないときは、中身をコピーして GitHub の編集画面に貼る手順を出す
 * - 途中の内容は、このブラウザの中にだけ残る
 */
(function () {
  'use strict';
  var T = window.Toco, S = T.SCHEMA;
  var OWNER = 'toco-works', REPO = 'toco-works.github.io', BRANCH = 'main', SITE = 'https://toco-works.com';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';
  var TOKEN_KEY = 'toco-gh-token', DRAFT = 'toco-draft:';
  var $ = function (id) { return document.getElementById(id); };
  var st = { file: null, pages: [], live: {}, blocks: [], head: [], sel: null, ready: false, images: {}, warn: [] };
  var uid = 0, timer = null;

  var NOTES = {
    '上のメニュー': ['メニューは、1行に1つ。「文字 | リンク」の順に書きます。', '3つ目に「スマホでも出す」と書いたものだけが、スマホの画面にも出ます。'],
    '下のメニュー': ['1行に1つ。「文字 | リンク」の順に書きます。'],
    'ページ一覧': ['編集ツールが使う一覧です（名前 | リンク | ファイル）。ページを増やすときだけ変わります。']
  };
  var SAMPLE = {
    'ヒーロー': { f: { '見出し': 'ここに見出しを書きます', '文': 'ここに説明の文を書きます。', 'ボタン': ['ボタンの文字 | /contact/'], '絵': 'なし' } },
    'カード': { f: { '見出し': '見出し' }, items: [{ '名前': '1つ目', '文': '説明の文' }, { '名前': '2つ目', '文': '説明の文' }] },
    'パネル': { f: { '見出し': '見出し' }, items: [{ '見出し': '1つ目', '文': '説明の文' }, { '見出し': '2つ目', '文': '説明の文' }] },
    '案内': { f: { '見出し': '見出し', '文': '説明の文', 'ボタン': ['ボタンの文字 | /contact/ | オレンジ'] } },
    '文章': { f: { '本文': '■ 見出し\nここに文を書きます。' } },
    'メール': { f: { 'ボタンの文字': 'メールアプリで書く', '件名': 'お問い合わせ' } },
    '画像': { f: { 'ファイル': '', '説明': '' } },
    '画像と文': { f: { 'ファイル': '', '見出し': '見出し', '文': '説明の文' } },
    'ボタン': { f: { 'ボタン': ['ボタンの文字 | /contact/'] } }
  };
  var BTN_COLS = [{ n: '文字', k: 'line' }, { n: 'リンク', k: 'link' }, { n: '色', k: 'select', o: ['', '紺', '白', 'オレンジ'] }];

  function el(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'value') e.value = attrs[k];
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    [].concat(kids == null ? [] : kids).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, ms || 4000);
  }
  function status(msg, dirty) { var s = $('status'); s.textContent = msg; s.className = 'status' + (dirty ? ' dirty' : ''); }
  function modal(id, on) { $(id).classList.toggle('on', on !== false); }
  function nameOf(file) { var p = pageOf(file); return file === 'common' ? '共通' : p ? p.name : file; }
  function pageOf(file) {
    for (var i = 0; i < st.pages.length; i++) if (st.pages[i].file === file) return st.pages[i];
    return null;
  }

  /* ---------- 書き出し（ブロックの並び → .txt） ---------- */
  function known(defs, name) { return (defs || []).some(function (d) { return d.n === name; }); }
  function guard(line, defs, inBody) {
    if (/^\s*[#＃\\]/.test(line)) return '\\' + line;
    var m = line.match(/^\s*【\s*([^】]+?)\s*】\s*$/);
    if (m && S[m[1]]) return '\\' + line;
    if (inBody) return line;
    if (/^\s*[-‐－―ー]{3,}\s*$/.test(line)) return '\\' + line;
    var f = line.match(/^\s*([^\s:：|｜「」『』（）()\[\]【】*]{1,8})\s*[:：]/);
    if (f && known(defs, f[1])) return '\\' + line;
    return line;
  }
  function fieldsOut(out, defs, o) {
    (defs || []).forEach(function (d) {
      var v = o[d.n];
      if (d.k === 'buttons') { (v || []).forEach(function (x) { if (String(x).trim()) out.push(d.n + ': ' + x); }); return; }
      v = v == null ? '' : String(v).replace(/\r/g, '').replace(/\s+$/, '');
      if (!v) { if (!d.opt) out.push(d.n + ': '); return; }
      var ls = v.split('\n');
      if (d.k === 'body') {
        out.push(d.n + ':');
        ls.forEach(function (l) { out.push(guard(l, defs, true)); });
      } else {
        out.push(d.n + ': ' + ls[0]);
        ls.slice(1).forEach(function (l) { out.push(guard(l, defs, false)); });
      }
    });
  }
  function write(file, blocks, head) {
    var out = head.length ? head.slice() : defaultHead(file);
    out.push('');
    blocks.forEach(function (b) {
      var sc = S[b.type];
      (NOTES[b.type] || []).forEach(function (n) { out.push('# ' + n); });
      out.push('【' + b.type + '】');
      if (sc.rows) {
        b.rows.forEach(function (r) {
          var c = r.map(function (x) { return String(x || '').trim(); });
          while (c.length && !c[c.length - 1]) c.pop();
          if (c.length && c[0]) out.push(c.join(' | '));
        });
      } else {
        fieldsOut(out, sc.fields, b.f);
        b.items.forEach(function (it) { out.push('---'); fieldsOut(out, sc.item, it); });
      }
      out.push('');
    });
    return out.join('\n').replace(/\n+$/, '\n');
  }
  function serialize() { return write(st.file, st.blocks, st.head); }
  function defaultHead(file) {
    var p = pageOf(file);
    return [
      file === 'common' ? '# 全部のページに共通の中身です（上と下のメニュー、屋号、メールアドレス）。'
        : '# 「' + (p ? p.name : file) + '」のページ（' + SITE + (p ? p.url : '/' + file + '/') + '）の中身です。',
      '# 直すときは、編集ツール ' + SITE + '/edit/ を使うのがかんたんです。',
      '# 「#」で始まる行は説明で、サイトには出ません。【 】の行が、ブロックの始まりです。'
    ];
  }
  function headOf(text) {
    var out = [], ls = String(text || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n');
    for (var i = 0; i < ls.length; i++) {
      if (/^\s*[#＃]/.test(ls[i])) out.push(ls[i]);
      else if (ls[i].trim()) break;
    }
    /* ブロックの直前の説明（NOTES）は、書き出すときに付け直すので、頭の説明からは外す */
    var notes = [];
    Object.keys(NOTES).forEach(function (k) { NOTES[k].forEach(function (n) { notes.push('# ' + n); }); });
    return out.filter(function (l) { return notes.indexOf(l.trim()) < 0; });
  }
  function normalize(text, file) { return write(file, T.parse(text).blocks, headOf(text)); }

  /* ---------- 途中の内容（このブラウザの中） ---------- */
  function getDraft(f) { try { return localStorage.getItem(DRAFT + f); } catch (e) { return null; } }
  function setDraft(f, t) { try { if (t == null) localStorage.removeItem(DRAFT + f); else localStorage.setItem(DRAFT + f, t); } catch (e) { /* 残せなくても、編集は続けられる */ } }
  function isDirty(f, text) { return st.live[f] == null || normalize(st.live[f], f) !== text; }
  function dirtyFiles() {
    var cur = serialize(), out = [];
    ['common'].concat(st.pages.map(function (p) { return p.file; })).forEach(function (f) {
      var t = f === st.file ? cur : getDraft(f);
      if (t != null && isDirty(f, t)) out.push({ file: f, text: t });
    });
    return out;
  }

  /* ---------- GitHub ---------- */
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { return decodeURIComponent(escape(atob(String(s).replace(/\s/g, '')))); }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function gh(method, path, body, tk) {
    return fetch(API + encPath(path) + (method === 'GET' ? '?ref=' + BRANCH + '&t=' + Date.now() : ''), {
      method: method,
      headers: { 'Authorization': 'Bearer ' + (tk || token()), 'Accept': 'application/vnd.github+json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok) return j;
        var e = new Error(j.message || String(r.status)); e.status = r.status; throw e;
      });
    });
  }
  function ghError(e) {
    if (e.status === 401) return '鍵（トークン）が正しくないか、期限が切れています。「保存の準備」で、新しい鍵を入れてください';
    if (e.status === 403 || e.status === 404) return '鍵の権限が足りません。「保存の準備」の手順で、Contents を「Read and write」、対象を toco-works.github.io にした鍵を作り直してください';
    if (e.status === 409 || e.status === 422) return '保存が重なりました。少し待って、もう一度「保存して公開する」を押してください';
    return '保存できませんでした（' + (e.message || '通信エラー') + '）。インターネットの接続を確かめて、もう一度お試しください';
  }
  function ghGet(path) {
    return gh('GET', path).then(function (j) { return { sha: j.sha, text: j.content != null ? unb64(j.content) : '' }; },
      function (e) { if (e.status === 404) return null; throw e; });
  }
  /* 1つのファイルを保存する。content は base64 済みの文字列でもよい（画像） */
  function ghPut(path, text, msg, raw) {
    return gh('GET', path).then(function (j) { return j.sha; }, function (e) { if (e.status === 404) return null; throw e; })
      .then(function (sha) {
        var body = { message: msg, content: raw ? text : b64(text), branch: BRANCH };
        if (sha) body.sha = sha;
        return gh('PUT', path, body);
      });
  }

  /* ---------- 入力欄 ---------- */
  function autoRows(t, min) { t.rows = Math.max(min, Math.min(30, t.value.split('\n').length + 1)); }
  function inputFor(d, get, set, structural) {
    var e, v = get();
    if (d.k === 'text' || d.k === 'body') {
      e = el('textarea', { value: v || '' });
      autoRows(e, d.k === 'body' ? 8 : 2);
      e.addEventListener('input', function () { autoRows(e, d.k === 'body' ? 8 : 2); set(e.value); changed(false); });
      return e;
    }
    if (d.k === 'select' || d.k === 'icon') {
      var opts = d.k === 'icon' ? [''].concat(T.ICON_NAMES, ['なし']) : d.o.slice();
      if (v && opts.indexOf(v) < 0) opts.push(v);
      e = el('select', null, opts.map(function (o) { return el('option', { value: o }, o === '' ? '（おまかせ）' : o); }));
      e.value = v == null || opts.indexOf(v) < 0 ? opts[0] : v;
      e.addEventListener('change', function () { set(e.value); changed(!!structural); });
      return e;
    }
    e = el('input', { type: 'text', value: v || '', list: d.k === 'link' ? 'links' : null, autocomplete: 'off', spellcheck: 'false' });
    if (d.k === 'link') e.placeholder = '/contact/ や /#works や https://...';
    if (d.k === 'image') e.placeholder = '例：app1-screen.png';
    if (d.k === 'anchor') e.placeholder = '例：works（半角の英数字）';
    e.addEventListener('input', function () { set(e.value); changed(false); });
    return e;
  }
  function field(d, obj) {
    var wrap = el('div', { class: 'f' }), id = 'f' + (++uid);
    wrap.appendChild(el('label', { for: id }, [d.n, d.opt ? null : el('small', null, '必ず入れる')]));
    var inp = inputFor(d, function () { return obj[d.n]; }, function (v) { obj[d.n] = v; }, d.n === '形');
    inp.id = id;
    if (d.k === 'image') {
      var pick = el('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: function () { if (pick.files[0]) addImage(pick.files[0], function (name) { inp.value = name; obj[d.n] = name; changed(false); }); pick.value = ''; } });
      wrap.appendChild(el('div', { class: 'imgrow' }, [inp, el('button', { type: 'button', class: 'btn ghost', onclick: function () { pick.click(); } }, '画像を選ぶ'), pick]));
      wrap.appendChild(el('span', { class: 'hint' }, '「画像を選ぶ」で選ぶと、位置情報などを消して、サイトに入れます。すでに入れた画像は、ファイルの名前を書きます。'));
    } else wrap.appendChild(inp);
    if (d.help) wrap.appendChild(el('span', { class: 'hint' }, d.help));
    return wrap;
  }
  function fields(box, defs, obj) {
    var adv = defs.filter(function (d) { return d.adv; });
    defs.forEach(function (d) {
      if (d.adv) return;
      if (d.k === 'buttons') box.appendChild(buttonsBox(d, obj));
      else box.appendChild(field(d, obj));
    });
    if (!adv.length) return;
    var used = adv.filter(function (d) { return obj[d.n]; });
    var det = el('details', { class: 'adv' }, [el('summary', null, 'くわしい設定（' + adv.map(function (d) { return d.n; }).join('・') + '）' + (used.length ? ' ― 入力あり' : ''))]);
    adv.forEach(function (d) { det.appendChild(field(d, obj)); });
    det.open = !!obj._adv;
    det.addEventListener('toggle', function () { obj._adv = det.open; });
    box.appendChild(det);
  }
  function miniBtns(list, i, after, o) {
    o = o || {};
    function b(txt, title, fn, off, cls) { return el('button', { type: 'button', class: 'mini' + (cls ? ' ' + cls : ''), title: title, disabled: off, onclick: fn }, txt); }
    return el('span', { class: 'item-btns' }, [
      b('↑', '上へ', function () { var x = list.splice(i, 1)[0]; list.splice(i - 1, 0, x); after(i - 1); }, i <= (o.min || 0)),
      b('↓', '下へ', function () { var x = list.splice(i, 1)[0]; list.splice(i + 1, 0, x); after(i + 1); }, i >= list.length - 1),
      o.copy ? b('複製', '同じものをもう1つ作る', function () { list.splice(i + 1, 0, clone(list[i])); after(i + 1); }) : null,
      b('削除', '削除', function () { if (confirm(o.ask || 'この項目を削除しますか？')) { list.splice(i, 1); after(null); } }, false, 'danger')
    ]);
  }
  /* 「文字 | リンク | …」の行の並び。rows は配列の配列 */
  function rowsBox(title, help, rows, cols, fresh, sync) {
    var box = el('div', { class: 'list' });
    box.appendChild(el('div', { class: 'list-head' }, [el('b', null, title), help ? el('small', null, help) : null]));
    var body = el('div');
    function done() { if (sync) sync(); changed(false); }
    function draw() {
      body.textContent = '';
      rows.forEach(function (r, i) {
        var card = el('div', { class: 'item' });
        card.appendChild(el('div', { class: 'item-bar' }, [el('span', null, String(i + 1)), miniBtns(rows, i, function () { draw(); done(); })]));
        card.appendChild(el('div', { class: cols.length > 2 ? 'grid3' : 'grid2' }, cols.map(function (c, ci) {
          var id = 'f' + (++uid), inp = inputFor(c, function () { return r[ci] || ''; }, function (v) { r[ci] = v; if (sync) sync(); });
          inp.id = id;
          return el('div', { class: 'f' }, [el('label', { for: id }, c.n), inp]);
        })));
        body.appendChild(card);
      });
    }
    draw();
    box.appendChild(body);
    box.appendChild(el('div', { class: 'list-add' }, [el('button', { type: 'button', class: 'btn', onclick: function () { rows.push(fresh()); draw(); done(); } }, '追加')]));
    return box;
  }
  function buttonsBox(d, obj) {
    var rows = (obj[d.n] || []).map(function (s) { return T.splitBar(s); });
    function sync() {
      obj[d.n] = rows.map(function (r) {
        var c = r.map(function (x) { return String(x || '').trim(); });
        while (c.length && !c[c.length - 1]) c.pop();
        return c.join(' | ');
      }).filter(Boolean);
    }
    return rowsBox('ボタン', '押したときの行き先を「リンク」に書きます', rows, BTN_COLS, function () { return ['ボタンの文字', '/contact/', '']; }, sync);
  }
  function summary(b) {
    var f = b.f, s = f['見出し'] || f['題名'] || f['屋号'] || f['ファイル'] || '';
    if (!s && b.items.length) s = b.items.map(function (it) { return it['名前'] || it['見出し'] || ''; }).filter(Boolean).join('、');
    if (!s && f['本文']) s = f['本文'];
    if (!s && f['ボタン']) s = f['ボタン'].map(function (x) { return T.splitBar(x)[0]; }).join('、');
    if (!s && b.rows.length) s = b.rows.map(function (r) { return r[0]; }).join('、');
    return String(s).replace(/\*\*/g, '').replace(/[■※]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function shortLabel(t) { return S[t].label.replace(/（.*$/, ''); }
  function firstMovable() {
    for (var i = 0; i < st.blocks.length; i++) if (!S[st.blocks[i].type].single) return i;
    return st.blocks.length;
  }
  function blockBox(b, i) {
    var sc = S[b.type];
    var box = el('div', { class: 'list' + (st.sel === i ? ' sel' : ''), 'data-i': i });
    box.addEventListener('focusin', function () { if (st.sel !== i) { mark(i); push(false); } });
    var note = sc.label.indexOf('（') > 0 ? sc.label.replace(/^[^（]*（/, '').replace(/）$/, '') : '';
    box.appendChild(el('div', { class: 'list-head' }, [
      el('b', null, shortLabel(b.type)), note ? el('small', null, note) : null,
      el('span', { class: 'btns' }, [
        st.file !== 'common' && !sc.single ? el('button', { type: 'button', class: 'mini see', title: '下見のこの部分へ移動', onclick: function () { mark(i); push(true); showView(true); } }, '下見で見る') : null,
        sc.single ? null : miniBtns(st.blocks, i, function (to) { st.sel = to; changed(true); if (to != null) scrollToBlock(to); }, { copy: true, min: firstMovable(), ask: 'このブロック（' + shortLabel(b.type) + '）を削除しますか？' })
      ])
    ]));
    if (sc.rows) {
      var inner = rowsBox('行', sc.rows[2] && sc.rows[2].help ? sc.rows[2].help : '上から順に並びます', b.rows, sc.rows, function () { return ['新しいメニュー', '/', '']; });
      inner.className = 'list';
      box.appendChild(inner);
      return box;
    }
    fields(box, sc.fields, b.f);
    if (sc.item) {
      var lb = el('div', { class: 'list' });
      lb.appendChild(el('div', { class: 'list-head' }, [el('b', null, sc.itemName + '（' + b.items.length + '件）'), el('small', null, '上から順に並びます')]));
      b.items.forEach(function (it, k) {
        var card = el('div', { class: 'item' });
        card.appendChild(el('div', { class: 'item-bar' }, [
          el('span', null, (k + 1) + '：' + String(it['名前'] || it['見出し'] || '').slice(0, 30)),
          miniBtns(b.items, k, function () { changed(true); }, { copy: true, ask: 'この' + sc.itemName + 'を削除しますか？' })
        ]));
        fields(card, sc.item, it);
        lb.appendChild(card);
      });
      lb.appendChild(el('div', { class: 'list-add' }, [el('button', { type: 'button', class: 'btn', onclick: function () {
        var n = {}; sc.item.forEach(function (d) { if (!d.opt) n[d.n] = '新しい' + sc.itemName; });
        b.items.push(n); changed(true);
      } }, sc.itemName + 'を追加')]));
      box.appendChild(lb);
    }
    return box;
  }
  function renderForm() {
    var root = $('form'), top = root.scrollTop;
    root.textContent = '';
    var p = pageOf(st.file);
    root.appendChild(el('h2', null, st.file === 'common' ? '共通（全部のページに反映）' : nameOf(st.file)));
    root.appendChild(el('p', { class: 'lead' }, st.file === 'common' ? '上と下のメニュー、屋号、メールアドレスを直します。' : (SITE + (p ? p.url : '')) + ' の中身です。ブロックは、上から順にページに並びます。'));
    var w = el('div', { id: 'warn', class: 'warnbox', hidden: true });
    root.appendChild(w);
    st.blocks.forEach(function (b, i) { if (!S[b.type].hidden) root.appendChild(blockBox(b, i)); });
    if (st.file !== 'common') {
      var sel = el('select', null, Object.keys(S).filter(function (k) { return S[k].where === 'page' && !S[k].single; })
        .map(function (k) { return el('option', { value: k }, S[k].label); }));
      var box = el('div', { class: 'list' }, [
        el('div', { class: 'list-head' }, [el('b', null, 'ブロックを追加'), el('small', null, 'えらんでいるブロックのすぐ下に入ります（えらんでいなければ、いちばん下）')]),
        el('div', { class: 'list-add' }, [sel, el('button', { type: 'button', class: 'btn', onclick: function () {
          var s = clone(SAMPLE[sel.value] || { f: {} });
          var nb = { type: sel.value, f: s.f || {}, items: s.items || [], rows: [] };
          var at = st.sel != null && st.blocks[st.sel] && !S[st.blocks[st.sel].type].single ? st.sel + 1 : st.blocks.length;
          st.blocks.splice(at, 0, nb);
          st.sel = at;
          changed(true);
          scrollToBlock(at);
          toast('「' + shortLabel(sel.value) + '」を追加しました。中身を直してください');
        } }, '追加')])
      ]);
      root.appendChild(box);
    }
    root.scrollTop = top;
    showWarn(st.warn);
  }
  function renderNav() {
    var nav = $('nav'), sel = $('file');
    nav.textContent = ''; sel.textContent = '';
    function item(file, label) {
      var d = file === st.file ? isDirty(file, serialize()) : !!getDraft(file);
      nav.appendChild(el('button', { type: 'button', class: 'nav' + (file === st.file ? ' on' : ''), onclick: function () { go(file); } }, [d ? el('span', { class: 'dot', title: 'まだ保存していない変更あり' }, '●') : null, label]));
      sel.appendChild(el('option', { value: file }, (d ? '● ' : '') + label));
      if (file !== st.file) return;
      st.blocks.forEach(function (b, i) {
        if (S[b.type].hidden) return;
        nav.appendChild(el('button', { type: 'button', class: 'nav blk' + (st.sel === i ? ' on' : ''), onclick: function () { mark(i); scrollToBlock(i); push(true); } }, shortLabel(b.type) + (summary(b) ? '：' + summary(b) : '')));
      });
    }
    nav.appendChild(el('div', { class: 'nav-sec' }, 'ページ'));
    st.pages.forEach(function (p) { item(p.file, p.name); });
    nav.appendChild(el('button', { type: 'button', class: 'nav add', onclick: openNewPage }, '＋ ページを追加'));
    nav.appendChild(el('div', { class: 'nav-sec' }, '全部のページに共通'));
    item('common', '共通（メニュー・屋号・メール）');
    sel.value = st.file;
  }
  function scrollToBlock(i) {
    setTimeout(function () {
      var e = $('form').querySelector('[data-i="' + i + '"]');
      if (e) e.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
  }
  function mark(i) {
    st.sel = i;
    Array.prototype.forEach.call($('form').querySelectorAll('.list[data-i]'), function (e) { e.classList.toggle('sel', Number(e.getAttribute('data-i')) === i); });
    Array.prototype.forEach.call($('nav').querySelectorAll('.nav.blk'), function (e) { e.classList.remove('on'); });
    renderNav();
  }
  function showView(view) {
    $('layout').classList.toggle('showView', view);
    $('tabView').classList.toggle('on', view);
    $('tabForms').classList.toggle('on', !view);
  }

  /* ---------- 下見 ---------- */
  function currentCommon() { return st.file === 'common' ? serialize() : (getDraft('common') || st.live.common); }
  function push(scroll) {
    if (!st.ready) return;
    var isCommon = st.file === 'common';
    $('pv').contentWindow.postMessage({
      toco: 'preview',
      common: currentCommon(),
      page: isCommon ? (getDraft('home') || st.live.home || null) : serialize(),
      focus: isCommon ? null : st.sel,
      scroll: !!scroll,
      images: st.images
    }, location.origin);
  }
  function changed(structural) {
    if (structural) renderForm();
    clearTimeout(timer);
    timer = setTimeout(function () {
      var text = serialize(), dirty = isDirty(st.file, text);
      setDraft(st.file, dirty ? text : null);
      showState();
      renderNav();
      push(false);
    }, structural ? 0 : 300);
  }
  function showState() {
    var d = dirtyFiles();
    if (!d.length) { status('公開中の内容と同じです。左で直すページを選び、真ん中で直します。', false); return; }
    status('直した内容があります（' + d.map(function (x) { return nameOf(x.file); }).join('、') + '）。このブラウザに自動で残しています ― サイトに反映するには「保存して公開する」を押してください', true);
  }
  function showWarn(list) {
    st.warn = list || [];
    var w = $('warn');
    if (!w) return;
    w.hidden = !st.warn.length;
    w.textContent = '';
    if (!st.warn.length) return;
    w.appendChild(el('b', null, '書き方の注意：' + st.warn.length + '件'));
    w.appendChild(el('ul', null, st.warn.map(function (x) { return el('li', null, x); })));
  }

  /* ---------- 画像 ---------- */
  function addImage(file, done) {
    if (!/^image\//.test(file.type)) { toast('画像のファイルを選んでください'); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      /* 描き直すことで、位置情報などの付加情報を消し、大きすぎる画像は小さくする */
      var max = 1600, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      var g = c.getContext('2d'), png = /png|gif|svg|webp/.test(file.type) && file.type !== 'image/webp';
      if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var data = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.86);
      var base = file.name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
      var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
      if (!base) base = 'img-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      var name = base + (png ? '.png' : '.jpg');
      st.images[name] = data;
      if (!token()) {
        done(name);
        toast('下見に出しました。サイトに入れるには「保存の準備」が要ります（または、GitHub の assets/img に「' + name + '」を手で入れます）', 9000);
        return;
      }
      status('画像をサイトに入れています…', true);
      ghPut('assets/img/' + name, data.split(',')[1], '編集ツール：画像 ' + name + ' を追加', true).then(function () {
        done(name);
        showState();
        toast('画像「' + name + '」をサイトに入れました（位置情報などは消してあります）');
      }, function (e) { done(name); showState(); toast(ghError(e), 9000); });
    };
    im.onerror = function () { URL.revokeObjectURL(url); toast('この画像は読み込めませんでした。JPEG か PNG の画像を選んでください', 7000); };
    im.src = url;
  }

  /* ---------- ページを開く ---------- */
  function go(file) {
    if (file === st.file) return;
    clearTimeout(timer);
    if (st.file) { var t = serialize(); setDraft(st.file, isDirty(st.file, t) ? t : null); }
    open(file);
  }
  function open(file) {
    st.file = file;
    st.sel = null;
    st.warn = [];
    var draft = getDraft(file), text = draft != null ? draft : (st.live[file] || '');
    st.head = headOf(st.live[file] || text);
    st.blocks = T.parse(text).blocks;
    if (file !== 'common' && !st.blocks.some(function (b) { return b.type === 'ページ'; })) {
      st.blocks.unshift({ type: 'ページ', f: { '題名': nameOf(file) + ' | Toco Works', '形': '読みもの', '見出し': nameOf(file) }, items: [], rows: [] });
    }
    buildLinks();
    renderNav();
    renderForm();
    $('form').scrollTop = 0;
    showState();
    st.ready = false;
    var p = pageOf(file), url = file === 'common' || !p ? '/' : p.url;
    $('pv').src = url + '?preview=1';
    $('pv-name').textContent = file === 'common' ? '共通の下見（トップのページで表示）' : nameOf(file) + '（' + url + '）';
    $('btn-open').href = url;
    try { history.replaceState(null, '', '?p=' + encodeURIComponent(file)); } catch (e) { /* なくても困らない */ }
  }
  function buildLinks() {
    var dl = $('links') || document.body.appendChild(el('datalist', { id: 'links' }));
    dl.textContent = '';
    st.pages.forEach(function (p) {
      dl.appendChild(el('option', { value: p.url }, p.name));
      T.parse(getDraft(p.file) || st.live[p.file] || '').blocks.forEach(function (b) {
        var a = String(b.f['目印'] || '').replace(/[^A-Za-z0-9_-]/g, '');
        if (a) dl.appendChild(el('option', { value: p.url + '#' + a }, p.name + ' の「' + (b.f['見出し'] || a) + '」'));
      });
    });
    dl.appendChild(el('option', { value: '{メール}' }, 'メールを書く（共通のアドレス宛て）'));
  }
  function readPages(commonText) {
    var out = [];
    T.parse(commonText).blocks.forEach(function (b) {
      if (b.type === 'ページ一覧') out = b.rows.filter(function (r) { return r[2]; }).map(function (r) { return { name: r[0], url: r[1], file: r[2] }; });
    });
    return out;
  }
  /* 公開中の中身を読む。鍵があれば GitHub から（保存した直後でも最新）、なければサイトから */
  function loadLive(file) {
    var fromSite = function () { return T.get('/text/' + file + '.txt'); };
    if (!token()) return fromSite();
    return ghGet('text/' + file + '.txt').then(function (r) { if (!r) throw new Error('none'); return r.text; }).catch(fromSite);
  }

  /* ---------- 保存 ---------- */
  function save() {
    clearTimeout(timer);
    var list = dirtyFiles();
    if (!list.length) { toast('公開中の内容から、変わっていません'); return; }
    if (st.warn.length && !confirm('書き方の注意が ' + st.warn.length + ' 件あります。このまま保存しますか？')) return;
    if (!token()) { openManual(); return; }
    var btn = $('btn-save');
    btn.disabled = true; btn.textContent = '保存しています…';
    var names = list.map(function (x) { return nameOf(x.file); }).join('、');
    var chain = Promise.resolve();
    list.forEach(function (x) {
      chain = chain.then(function () {
        return ghGet('text/' + x.file + '.txt').then(function (cur) {
          var base = st.live[x.file];
          if (cur && base != null && normalize(cur.text, x.file) !== normalize(base, x.file) && normalize(cur.text, x.file) !== x.text) {
            if (!confirm('「' + nameOf(x.file) + '」の公開中の内容が、このツールで開いたあとに変わっています（別の場所で直した可能性）。いまの内容で上書きしますか？')) { var e = new Error('cancel'); e.cancel = true; throw e; }
          }
          var body = { message: '編集ツール：' + nameOf(x.file) + ' を更新', content: b64(x.text), branch: BRANCH };
          if (cur) body.sha = cur.sha;
          return gh('PUT', 'text/' + x.file + '.txt', body);
        }).then(function () {
          st.live[x.file] = x.text;
          setDraft(x.file, null);
          if (x.file === 'common') st.pages = readPages(x.text);
        });
      });
    });
    chain.then(function () {
      st.head = headOf(st.live[st.file]);
      status('保存しました（' + names + '）。1〜2分で、サイトに反映されます', false);
      toast('保存しました。1〜2分で、サイトに反映されます', 6000);
      renderNav();
    }, function (e) {
      if (e.cancel) { toast('保存をやめました'); showState(); return; }
      showState();
      toast(ghError(e), 10000);
    }).then(function () { btn.disabled = false; btn.textContent = '保存して公開する'; });
  }
  function openManual() {
    var text = serialize(), others = dirtyFiles().filter(function (x) { return x.file !== st.file; });
    if (!isDirty(st.file, text) && others.length) { go(others[0].file); text = serialize(); others = dirtyFiles().filter(function (x) { return x.file !== st.file; }); }
    $('out').value = text;
    $('copied').textContent = '';
    $('manual-what').textContent = '保存するのは「' + nameOf(st.file) + '」（text/' + st.file + '.txt）です。' +
      (others.length ? '　ほかに「' + others.map(function (x) { return nameOf(x.file); }).join('、') + '」にも直した内容があります（このあと、1つずつ保存します）。' : '');
    $('gh').href = 'https://github.com/' + OWNER + '/' + REPO + '/edit/' + BRANCH + '/text/' + st.file + '.txt';
    modal('manual');
  }

  /* ---------- ページを追加 ---------- */
  function openNewPage() {
    if (!token()) { toast('ページの追加には「保存の準備」が要ります。先に「保存の準備」を行ってください', 7000); modal('setup'); return; }
    $('np-title').value = ''; $('np-name').value = ''; $('np-url').textContent = '';
    modal('newpage');
  }
  function makePage() {
    var title = $('np-title').value.trim(), name = $('np-name').value.trim();
    if (!title) { toast('ページの題名を入れてください'); return; }
    if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(name)) { toast('アドレスに使う名前は、半角の小文字・数字・ハイフンで入れてください（例：faq）'); return; }
    if (pageOf(name) || ['edit', 'assets', 'text', 'common', 'home'].indexOf(name) >= 0) { toast('その名前は、もう使われています。別の名前にしてください'); return; }
    var btn = $('btn-np-make');
    btn.disabled = true; btn.textContent = '作っています…';
    var commonNow = getDraft('common') || st.live.common, cblocks = T.parse(commonNow).blocks, list = null;
    cblocks.forEach(function (b) { if (b.type === 'ページ一覧') list = b; });
    if (!list) { list = { type: 'ページ一覧', f: {}, items: [], rows: [] }; cblocks.push(list); }
    list.rows.push([title, '/' + name + '/', name]);
    var commonNew = write('common', cblocks, headOf(commonNow));
    var pageText = write(name, [
      { type: 'ページ', f: { '題名': title + ' | Toco Works', '形': '読みもの', '見出し': title }, items: [], rows: [] },
      { type: '文章', f: { '本文': 'ここに文を書きます。' }, items: [], rows: [] }
    ], ['# 「' + title + '」のページ（' + SITE + '/' + name + '/）の中身です。', '# 直すときは、編集ツール ' + SITE + '/edit/ を使うのがかんたんです。', '# 「#」で始まる行は説明で、サイトには出ません。【 】の行が、ブロックの始まりです。']);
    ghGet(name + '/index.html').then(function (ex) {
      if (ex) { var e = new Error('exists'); e.exists = true; throw e; }
      return T.get('/edit/page-template.txt');
    }).then(function (tpl) {
      var safe = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return ghPut(name + '/index.html', tpl.split('{{title}}').join(safe), '編集ツール：ページ ' + name + ' を追加');
    }).then(function () { return ghPut('text/' + name + '.txt', pageText, '編集ツール：ページ ' + name + ' の中身を追加'); })
      .then(function () { return ghPut('text/common.txt', commonNew, '編集ツール：ページ一覧に ' + name + ' を追加'); })
      .then(function () {
        st.live.common = commonNew; setDraft('common', null);
        st.live[name] = pageText;
        st.pages = readPages(commonNew);
        modal('newpage', false);
        /* 「共通」を開いたまま作ったときは、画面の中身が古い（新しいページが一覧にない）ので、途中の内容として残さない */
        if (st.file === 'common') st.file = null;
        go(name);
        toast('ページ「' + title + '」を作りました。1〜2分で ' + SITE + '/' + name + '/ が開けるようになります', 9000);
      }, function (e) { toast(e.exists ? 'その名前のページは、もうあります。別の名前にしてください' : ghError(e), 9000); })
      .then(function () { btn.disabled = false; btn.textContent = 'ページを作る'; });
  }

  /* ---------- 起動 ---------- */
  function start() {
    loadLive('common').then(function (c) {
      st.live.common = c;
      st.pages = readPages(c);
      var d = getDraft('common');
      if (d) readPages(d).forEach(function (p) { if (!pageOf(p.file)) st.pages.push(p); });
      return Promise.all(st.pages.map(function (p) {
        return loadLive(p.file).then(function (t) { st.live[p.file] = t; }, function () { st.live[p.file] = ''; });
      }));
    }).then(function () {
      var want = (location.search.match(/[?&]p=([^&]+)/) || [])[1];
      want = want ? decodeURIComponent(want) : 'home';
      if (want !== 'common' && !pageOf(want)) want = st.pages.length ? st.pages[0].file : 'common';
      open(want);
      if (dirtyFiles().length) toast('このブラウザに残っていた、途中の内容を開きました（「公開中の内容に戻す」で捨てられます）', 6000);
      if (!token()) setTimeout(function () { status($('status').textContent + '　※ ボタン1つで保存するには、はじめに「保存の準備」を行います', $('status').className.indexOf('dirty') >= 0); }, 50);
    }).catch(function (e) {
      status('中身を読み込めませんでした。少し待ってから、ページを読み込み直してください（' + e.message + '）', true);
    });

    $('file').addEventListener('change', function () { go($('file').value); });
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.toco === 'ready') { st.ready = true; push(false); }
      if (e.data.toco === 'rendered') showWarn(e.data.warn || []);
      if (e.data.toco === 'pick') {
        if (e.data.href) toast('このリンクの行き先：' + e.data.href + '（下見では移動しません）', 5000);
        if (e.data.index != null && st.file !== 'common' && st.blocks[e.data.index]) {
          mark(e.data.index);
          showView(false);
          scrollToBlock(e.data.index);
          push(false);
        }
      }
    });
    $('tabForms').addEventListener('click', function () { showView(false); });
    $('tabView').addEventListener('click', function () { showView(true); push(true); });
    function width(sp) {
      $('pv').classList.toggle('sp', sp);
      $('wMobile').classList.toggle('on', sp);
      $('wPc').classList.toggle('on', !sp);
    }
    $('wPc').addEventListener('click', function () { width(false); });
    $('wMobile').addEventListener('click', function () { width(true); });
    if (window.innerWidth < 1500) width(true);

    Array.prototype.forEach.call(document.querySelectorAll('.modal'), function (m) {
      m.addEventListener('click', function (e) { if (e.target === m || (e.target.hasAttribute && e.target.hasAttribute('data-close'))) m.classList.remove('on'); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Array.prototype.forEach.call(document.querySelectorAll('.modal.on'), function (m) { m.classList.remove('on'); }); });
    $('btn-help').addEventListener('click', function () { modal('help'); });
    $('btn-setup').addEventListener('click', function () {
      $('token').value = '';
      $('token-state').textContent = token() ? 'このブラウザには、鍵が入っています。入れ直すときは、新しい鍵を貼ってください。' : 'このブラウザには、まだ鍵が入っていません。';
      modal('setup');
    });
    $('btn-token-save').addEventListener('click', function () {
      var tk = $('token').value.trim();
      if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(tk)) { $('token-state').textContent = '鍵の形が正しくありません。github_pat_ で始まる文字を、全部コピーして貼ってください。'; return; }
      $('token-state').textContent = '確かめています…';
      gh('GET', 'text/common.txt', null, tk).then(function () {
        try { localStorage.setItem(TOKEN_KEY, tk); } catch (e) { /* 覚えられないブラウザでは、毎回入れる */ }
        $('token').value = '';
        $('token-state').textContent = '確かめました。このブラウザに覚えさせました。これからは「保存して公開する」を押すだけで保存できます。';
        toast('保存の準備ができました');
      }, function (e) { $('token-state').textContent = ghError(e); });
    });
    $('btn-token-clear').addEventListener('click', function () {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 何もしない */ }
      $('token').value = '';
      $('token-state').textContent = 'このブラウザから鍵を消しました。GitHub 側の鍵も消すときは、GitHub の Settings → Developer settings → Personal access tokens で「Delete」します。';
    });
    $('btn-reset').addEventListener('click', function () {
      if (!confirm('「' + nameOf(st.file) + '」で直した内容を捨てて、公開中の内容に戻します。よろしいですか？')) return;
      var f = st.file;
      clearTimeout(timer);
      setDraft(f, null);
      loadLive(f).then(function (t) { st.live[f] = t; }, function () { /* 読めなければ、前に読んだ中身を使う */ }).then(function () {
        open(f);
        toast('公開中の内容に戻しました');
      });
    });
    $('btn-save').addEventListener('click', save);
    $('btn-copy').addEventListener('click', function () {
      var text = $('out').value;
      function ok() { $('copied').textContent = 'コピーしました'; }
      function manual() {
        $('out').closest('details').open = true;
        $('out').focus(); $('out').select();
        try { if (document.execCommand('copy')) { ok(); return; } } catch (e) { /* 下の案内に進む */ }
        $('copied').textContent = 'コピーできませんでした。下の枠の中身を、手でコピーしてください';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, manual);
      else manual();
    });
    $('btn-manual-done').addEventListener('click', function () {
      st.live[st.file] = $('out').value;
      setDraft(st.file, null);
      st.head = headOf(st.live[st.file]);
      if (st.file === 'common') st.pages = readPages(st.live.common);
      modal('manual', false);
      showState(); renderNav();
      var rest = dirtyFiles();
      if (rest.length) { go(rest[0].file); openManual(); }
    });
    $('np-name').addEventListener('input', function () { $('np-url').textContent = $('np-name').value ? 'ページのアドレス：' + SITE + '/' + $('np-name').value.trim() + '/' : ''; });
    $('btn-np-make').addEventListener('click', makePage);
    window.addEventListener('beforeunload', function () {
      clearTimeout(timer);
      if (st.file && st.blocks.length) { var t = serialize(); setDraft(st.file, isDirty(st.file, t) ? t : null); }
    });
  }

  window.TocoEdit = { serialize: serialize, normalize: normalize, state: st, dirtyFiles: dirtyFiles };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
