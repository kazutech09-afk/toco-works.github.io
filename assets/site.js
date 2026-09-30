/*
 * Toco Works：ページの中身を組み立てるプログラム
 * - 文章・ブロックの並び・リンクは text フォルダの .txt に書く（編集ページ /edit/ で直せる）
 * - 色・文字の大きさなどの見た目は assets/site.css
 * - 改行は、文節の切れ目に自動で入る（assets/budoux-ja.js）
 * .txt に HTML は書けない（書いても文字として出る）。書き間違いでページが壊れないようにするため。
 */
(function () {
  'use strict';

  /* ---------- 絵（アイコン） ---------- */
  var ICONS = {
    '本': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M9 8h7M9 12h7"/>',
    'ハート': '<path d="M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 5.4 8.8 10.4 8.8 10.4s8.8-5 8.8-10.4z"/>',
    '家': '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
    '星': '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    '電球': '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    'スマホ': '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    'メール': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    'チェック': '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>'
  };
  var ICON_NAMES = Object.keys(ICONS);
  var COLORS = { 'オレンジ': 'a', '青': 'b', '緑': 'c' };
  var BTN_COLORS = { '紺': '', '白': ' ghost', 'オレンジ': ' orange' };

  /* ---------- ブロックの種類と項目（編集ページもこの表を使う） ----------
     k（入力の形）: line=1行 / text=複数行 / body=本文 / select=選ぶ / buttons=ボタンの並び / image=画像 / icon=絵 / anchor=目印 */
  var HEAD = [
    { n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字。例：works）。リンクには「/#works」と書く' },
    { n: '小見出し', k: 'line', opt: true, adv: true, help: '見出しの横に小さく出る英字（例：WORKS）。「読みもの」のページでは出ない' },
    { n: '見出し', k: 'line', opt: true },
    { n: '文', k: 'text', opt: true }
  ];
  var BTN = { n: 'ボタン', k: 'buttons', opt: true };
  var SCHEMA = {
    'ページ': {
      where: 'page', single: true, label: 'ページの設定',
      fields: [
        { n: '題名', k: 'line', help: 'ブラウザのタブと検索結果に出る名前' },
        { n: '説明', k: 'text', opt: true, adv: true, help: '検索結果に出る短い説明（1〜2文）' },
        { n: '形', k: 'select', o: ['広い', '読みもの'], help: '広い＝トップのような横いっぱいの形／読みもの＝文章が中心の細い形' },
        { n: '見出し', k: 'line', opt: true, help: '「読みもの」のとき、いちばん上に大きく出る' },
        { n: 'ひとこと', k: 'text', opt: true, help: '見出しのすぐ下に小さく出る文（日付や補足）' },
        { n: '検索', k: 'select', o: ['出す', '出さない'], opt: true, adv: true, help: '「出さない」にすると、Google などの検索結果に出にくくなる' }
      ]
    },
    'ヒーロー': {
      where: 'page', label: 'ヒーロー（いちばん上の大きな見出し）',
      fields: [
        { n: '小見出し', k: 'line', opt: true },
        { n: '見出し', k: 'text', help: '改行したい所で改行する。**こう書く**と下線で目立つ' },
        { n: '文', k: 'text', opt: true },
        BTN,
        { n: '絵', k: 'select', o: ['あり', 'なし'], opt: true, help: '右側の飾りの絵' }
      ]
    },
    'カード': {
      where: 'page', label: 'カード（四角い箱を横に並べる）', itemName: 'カード',
      fields: HEAD.concat([{ n: '列', k: 'select', o: ['自動', '1', '2', '3', '4'], opt: true, adv: true, help: 'パソコンで横に並べる数。スマホでは縦に並ぶ' }]),
      item: [
        { n: '絵', k: 'icon', opt: true },
        { n: '色', k: 'select', o: ['オレンジ', '青', '緑'], opt: true },
        { n: '名前', k: 'line' },
        { n: '文', k: 'text', opt: true },
        { n: '札', k: 'line', opt: true, help: '小さなラベル（例：準備中、公開中）' },
        BTN
      ]
    },
    'パネル': {
      where: 'page', label: 'パネル（紺色の箱に、番号つきで並べる）', itemName: '項目',
      fields: HEAD.slice(0, 3),
      item: [{ n: '見出し', k: 'line' }, { n: '文', k: 'text', opt: true }]
    },
    '案内': {
      where: 'page', label: '案内（色つきの箱とボタン）',
      fields: [{ n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字）' }, { n: '見出し', k: 'line' }, { n: '文', k: 'text', opt: true }, BTN]
    },
    '文章': {
      where: 'page', label: '文章（見出し・段落・表・箇条書き）',
      fields: HEAD.slice(0, 3).concat([{ n: '本文', k: 'body' }])
    },
    'メール': {
      where: 'page', label: 'メール（アドレスと「メールを書く」ボタン）',
      fields: [
        { n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字）' },
        { n: '宛先', k: 'line', opt: true, adv: true, help: '空なら、共通のメールアドレスを使う' },
        { n: 'ボタンの文字', k: 'line', opt: true },
        { n: '件名', k: 'line', opt: true, adv: true, help: 'メールアプリが開いたときに、最初から入る件名' },
        { n: '注意', k: 'text', opt: true }
      ]
    },
    '画像': {
      where: 'page', label: '画像',
      fields: [
        { n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字）' },
        { n: 'ファイル', k: 'image' },
        { n: '説明', k: 'line', opt: true, help: '画像が出ないときや、読み上げで使われる説明' },
        { n: '大きさ', k: 'select', o: ['中', '小', '大'], opt: true },
        { n: 'リンク', k: 'link', opt: true, adv: true, help: '画像を押したときの行き先' },
        { n: 'ひとこと', k: 'text', opt: true, help: '画像の下に小さく出る文' }
      ]
    },
    '画像と文': {
      where: 'page', label: '画像と文（横に並べる）',
      fields: [
        { n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字）' },
        { n: 'ファイル', k: 'image' },
        { n: '説明', k: 'line', opt: true },
        { n: '位置', k: 'select', o: ['左', '右'], opt: true, help: '画像を左右どちらに置くか' },
        { n: '見出し', k: 'line', opt: true },
        { n: '文', k: 'text', opt: true },
        BTN
      ]
    },
    'ボタン': {
      where: 'page', label: 'ボタン（1つ〜いくつか）',
      fields: [{ n: '目印', k: 'anchor', opt: true, adv: true, help: 'メニューやボタンから、このブロックへ飛ぶための名前（半角の英数字）' }, { n: '位置', k: 'select', o: ['左', '中央'], opt: true }, { n: 'ボタン', k: 'buttons' }]
    },
    'サイト': {
      where: 'common', single: true, label: 'サイト全体の設定',
      fields: [
        { n: '屋号', k: 'line', help: '左上と左下に出る名前' },
        { n: 'メール', k: 'line', help: '文の中に {メール} と書くと、このアドレスに置きかわる' },
        { n: '下の一言', k: 'line', opt: true, help: 'ページのいちばん下に出る（例：© Toco Works）' },
        { n: '改行しない言葉', k: 'text', opt: true, adv: true, help: '途中で改行したくない言葉を「、」で区切って並べる' }
      ]
    },
    '上のメニュー': {
      where: 'common', single: true, label: '上のメニュー',
      rows: [{ n: '文字', k: 'line' }, { n: 'リンク', k: 'link' }, { n: 'スマホ', k: 'select', o: ['', 'スマホでも出す'], help: 'スマホの画面は狭いので、「スマホでも出す」にしたものだけが出る' }]
    },
    '下のメニュー': {
      where: 'common', single: true, label: '下のメニュー',
      rows: [{ n: '文字', k: 'line' }, { n: 'リンク', k: 'link' }]
    },
    'ページ一覧': {
      where: 'common', single: true, label: 'ページ一覧（編集ページ用）', hidden: true,
      rows: [{ n: '名前', k: 'line' }, { n: 'リンク', k: 'line' }, { n: 'ファイル', k: 'line' }]
    }
  };

  /* ---------- 読み取り（.txt → ブロックの並び） ---------- */
  function splitBar(s) {
    return String(s).split(/[|｜]/).map(function (x) { return x.trim(); });
  }
  function findDef(defs, name) {
    if (!defs) return null;
    for (var i = 0; i < defs.length; i++) if (defs[i].n === name) return defs[i];
    return null;
  }
  function allFieldNames() {
    var s = {};
    Object.keys(SCHEMA).forEach(function (t) {
      (SCHEMA[t].fields || []).concat(SCHEMA[t].item || []).forEach(function (d) { s[d.n] = 1; });
    });
    return s;
  }
  var KNOWN_NAMES = allFieldNames();

  function parse(text) {
    var out = { blocks: [], warn: [] };
    var lines = String(text == null ? '' : text).replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    var cur = null, target = null, last = null, body = false, S = null;
    function warn(i, msg) { out.warn.push((i + 1) + '行目：' + msg); }
    function finish(b) {
      if (!b) return;
      [b.f].concat(b.items).forEach(function (o) {
        Object.keys(o).forEach(function (k) {
          if (typeof o[k] === 'string') o[k] = o[k].replace(/^\n+/, '').replace(/\s+$/, '');
        });
      });
    }
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (/^\s*[#＃]/.test(raw)) continue;
      var literal = /^\s*\\/.test(raw);
      if (literal) raw = raw.replace(/^(\s*)\\/, '$1');
      var m = literal ? null : raw.match(/^\s*【\s*([^】]+?)\s*】\s*$/);
      if (m) {
        if (SCHEMA[m[1]]) {
          finish(cur);
          S = SCHEMA[m[1]];
          cur = { type: m[1], f: {}, items: [], rows: [] };
          out.blocks.push(cur); target = cur.f; last = null; body = false;
          continue;
        }
        warn(i, '【' + m[1] + '】という名前のブロックはありません（書き間違いかもしれません）。文としてあつかいます');
      }
      if (!cur) {
        if (raw.trim()) warn(i, '最初の【 】より上に書いた文は、サイトに出ません');
        continue;
      }
      if (S.rows) {
        if (raw.trim()) cur.rows.push(splitBar(raw));
        continue;
      }
      if (body) { last.o[last.n] += '\n' + raw; continue; }
      if (!literal && S.item && /^\s*[-‐－―ー]{3,}\s*$/.test(raw)) {
        target = {}; cur.items.push(target); last = null;
        continue;
      }
      var fm = literal ? null : raw.match(/^\s*([^\s:：|｜「」『』（）()\[\]【】*]{1,8})\s*[:：][ 　]?(.*)$/);
      if (fm) {
        var inItem = target !== cur.f;
        var d = findDef(inItem ? S.item : S.fields, fm[1]);
        if (d) {
          if (d.k === 'buttons') {
            if (!target[d.n]) target[d.n] = [];
            if (fm[2].trim()) target[d.n].push(fm[2].trim());
            last = null;
          } else {
            target[d.n] = fm[2];
            last = { o: target, n: d.n };
            if (d.k === 'body') body = true;
          }
          continue;
        }
        if (KNOWN_NAMES[fm[1]] && !last) {
          warn(i, '「' + fm[1] + '」は、【' + cur.type + '】' + (inItem ? 'の中の1件' : '') + 'では使えない項目です');
          continue;
        }
        if (KNOWN_NAMES[fm[1]]) warn(i, '「' + fm[1] + '」は、【' + cur.type + '】' + (inItem ? 'の中の1件' : '') + 'では使えない項目です。前の文の続きとしてあつかいます');
      }
      if (last) last.o[last.n] += '\n' + raw;
      else if (raw.trim()) warn(i, 'どの項目の文か分かりません（行の頭に「見出し: 」のような項目名がありません）');
    }
    finish(cur);
    return out;
  }

  /* ---------- 文字の組み立て ---------- */
  var ctx = { site: { '屋号': 'Toco Works', 'メール': 'info@toco-works.com' }, nb: null };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fill(s) {
    return String(s == null ? '' : s).replace(/[{｛]\s*(メール|屋号)\s*[}｝]/g, function (_, k) { return ctx.site[k] || ''; });
  }
  function href(u) {
    u = fill(u).trim();
    if (!u) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
    if (/^[\/#]/.test(u)) return u;
    if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(u)) return 'mailto:' + u;
    if (/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([\/?#].*)?$/.test(u)) return 'https://' + u;
    if (/^[A-Za-z0-9_\-\/]+$/.test(u)) return '/' + u.replace(/^\/+|\/+$/g, '') + '/';
    return '';
  }
  function linkAttrs(u) {
    var h = href(u);
    if (!h) return ' href="#" data-badlink="' + esc(u) + '"';
    var ext = /^https?:\/\//i.test(h) && h.indexOf(location.origin + '/') !== 0;
    return ' href="' + esc(h) + '"' + (ext ? ' target="_blank" rel="noopener"' : '');
  }
  function buildNb(words) {
    var list = (words || []).filter(Boolean).sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    list.push('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}');
    list.push('0\\d{1,4}-\\d{1,4}-\\d{3,4}');
    return new RegExp(list.join('|'), 'g');
  }
  function cutsOf(s) {
    var cut = {}, B = window.TocoBudoux;
    if (B && s) B.boundaries(s).forEach(function (p) {
      /* かっこの始まりの直後・句読点や閉じかっこの直前・空白のとなりでは、改行させない */
      if (/[（「『(【［\[〈《\s]/.test(s.charAt(p - 1))) return;
      if (/[）」』)】］\]〉》、。，．・：；！？!?,.\sー〜ぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(s.charAt(p))) return;
      cut[p] = 1;
    });
    return cut;
  }
  /* s を、文節の切れ目（cut）に <wbr> を入れて HTML にする。base は、s が全体の何文字目から始まるか */
  function plainAt(s, base, cut) {
    if (!s) return '';
    var ranges = [], m, re = ctx.nb || (ctx.nb = buildNb([])), i;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      if (!m[0]) { re.lastIndex++; continue; }
      ranges.push([m.index, m.index + m[0].length]);
    }
    var out = '', pos = 0;
    function piece(a, b) {
      var t = '', start = a;
      for (var p = a + 1; p < b; p++) {
        if (cut[base + p]) { t += esc(s.slice(start, p)) + '<wbr>'; start = p; }
      }
      return t + esc(s.slice(start, b));
    }
    for (i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r[0] > pos) { if (pos > 0 && cut[base + pos]) out += '<wbr>'; out += piece(pos, r[0]); }
      if (r[0] > 0 && cut[base + r[0]]) out += '<wbr>';
      out += '<span class="nb">' + esc(s.slice(r[0], r[1])) + '</span>';
      pos = r[1];
    }
    if (pos < s.length) { if (pos > 0 && cut[base + pos]) out += '<wbr>'; out += piece(pos, s.length); }
    return out;
  }
  function plain(s) { return plainAt(s, 0, cutsOf(s)); }
  /* 1つの文の中の書き方： **目立たせる**　[文字](リンク)　改行 */
  function inline(s) {
    s = fill(s);
    var toks = [], V = '', re = /\*\*([^*\n]+)\*\*|[\[［]([^\]］\n]+)[\]］][(（]([^)）\s]+)[)）]|\n/g, pos = 0, m;
    function add(t, str, link) { if (t === 'text' && !str) return; toks.push({ t: t, s: str, link: link, at: V.length }); V += str; }
    while ((m = re.exec(s))) {
      add('text', s.slice(pos, m.index));
      if (m[1] != null) add('em', m[1]);
      else if (m[2] != null) add('a', m[2], m[3]);
      else add('br', '\n');
      pos = re.lastIndex;
    }
    add('text', s.slice(pos));
    var cut = cutsOf(V), out = '';
    toks.forEach(function (k, i) {
      if (k.t === 'br') { out += '<br>'; return; }
      if (k.at > 0 && cut[k.at] && toks[i - 1].t !== 'br') out += '<wbr>';
      var h = plainAt(k.s, k.at, cut);
      out += k.t === 'em' ? '<em>' + h + '</em>' : k.t === 'a' ? '<a' + linkAttrs(k.link) + '>' + h + '</a>' : h;
    });
    return out;
  }
  /* 本文の書き方： ■見出し　・箇条書き　項目｜内容（表）　※注記　空行で段落を分ける */
  function bodyHtml(s) {
    var lines = fill(s).split('\n'), out = '', para = [], list = [], rows = [];
    function flush() {
      if (para.length) {
        var note = /^\s*※/.test(para[0]);
        out += '<p' + (note ? ' class="note"' : '') + '>' + inline(para.join('\n')) + '</p>';
        para = [];
      }
      if (list.length) { out += '<ul>' + list.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>'; list = []; }
      if (rows.length) {
        out += '<table>' + rows.map(function (r) { return '<tr><th>' + inline(r[0]) + '</th><td>' + inline(r[1]) + '</td></tr>'; }).join('') + '</table>';
        rows = [];
      }
    }
    lines.forEach(function (ln) {
      var t = ln.trim(), m;
      if (!t) { flush(); return; }
      if ((m = t.match(/^[■◆]\s*(.+)$/))) { flush(); out += '<h2>' + inline(m[1]) + '</h2>'; return; }
      if ((m = t.match(/^[・•]\s*(.+)$/))) { if (para.length || rows.length) flush(); list.push(m[1]); return; }
      var bar = t.search(/[|｜]/);
      if (bar > 0) {
        if (para.length || list.length) flush();
        rows.push([t.slice(0, bar).trim(), t.slice(bar + 1).trim()]);
        return;
      }
      if (list.length || rows.length) flush();
      para.push(t);
    });
    flush();
    return out;
  }

  /* ---------- 部品 ---------- */
  function anchor(v) { return String(v || '').replace(/^#/, '').replace(/[^A-Za-z0-9_-]/g, ''); }
  function buttons(list, firstColor) {
    return (list || []).map(function (b, i) {
      var p = splitBar(b), color = BTN_COLORS[p[2]];
      if (color == null) color = i === 0 ? (firstColor || '') : ' ghost';
      if (!p[0]) return '';
      return '<a class="btn' + color + '"' + linkAttrs(p[1] || '') + '>' + plain(fill(p[0])) + '</a>';
    }).join('');
  }
  function icon(name, color, idx) {
    if (name === 'なし') return '';
    var d = ICONS[name] || ICONS[ICON_NAMES[idx % ICON_NAMES.length]];
    var c = COLORS[color] || 'abc'.charAt(idx % 3);
    return '<div class="ico ' + c + '"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg></div>';
  }
  function imgSrc(f) {
    f = String(f || '').trim();
    if (!f) return '';
    if (/^https?:\/\//i.test(f) || f.charAt(0) === '/') return f;
    return '/assets/img/' + f.replace(/^(\.?\/)?(assets\/img\/)?/, '').split('/').map(encodeURIComponent).join('/');
  }
  function img(f, alt) {
    var src = (ctx.images && ctx.images[String(f || '').trim()]) || imgSrc(f);
    if (!src) return '<div class="noimg">画像のファイル名が入っていません</div>';
    return '<img src="' + esc(src) + '" alt="' + esc(fill(alt || '')) + '" loading="lazy" data-file="' + esc(f) + '">';
  }
  function head(f, narrow) {
    var o = '';
    if (f['見出し']) {
      o += narrow ? '<h2>' + inline(f['見出し']) + '</h2>'
        : '<div class="sec-h">' + (f['小見出し'] ? '<span>' + esc(fill(f['小見出し'])) + '</span>' : '') + '<h2>' + inline(f['見出し']) + '</h2></div>';
    }
    if (f['文']) o += '<p class="lead">' + inline(f['文']) + '</p>';
    return o;
  }

  var RENDER = {
    'ヒーロー': function (b) {
      var f = b.f, art = f['絵'] !== 'なし';
      return '<div class="hero-in' + (art ? '' : ' noart') + '"><div>' +
        (f['小見出し'] ? '<div class="eyebrow">' + esc(fill(f['小見出し'])) + '</div>' : '') +
        '<h1>' + inline(f['見出し'] || '') + '</h1>' +
        (f['文'] ? '<p>' + inline(f['文']) + '</p>' : '') +
        (f['ボタン'] && f['ボタン'].length ? '<div class="actions">' + buttons(f['ボタン']) + '</div>' : '') +
        '</div>' +
        (art ? '<div class="art" aria-hidden="true"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="card"><div class="t"></div><div class="l"></div><div class="l s"></div><div class="l"></div><span class="chip"></span></div><div class="card2"><div class="ico"></div><div class="l"></div><div class="l"></div></div></div>' : '') +
        '</div>';
    },
    'カード': function (b, narrow) {
      var cols = /^[1-4]$/.test(b.f['列'] || '') ? ' cols-' + b.f['列'] : '';
      return head(b.f, narrow) + '<div class="cards' + cols + '">' + b.items.map(function (it, i) {
        return '<article class="card">' + icon(it['絵'], it['色'], i) +
          (it['名前'] ? '<h3>' + inline(it['名前']) + '</h3>' : '') +
          (it['文'] ? '<p>' + inline(it['文']) + '</p>' : '') +
          (it['札'] ? '<span class="tag">' + esc(fill(it['札'])) + '</span>' : '') +
          ((it['ボタン'] || []).length ? '<div class="more">' + it['ボタン'].map(function (x) {
            var p = splitBar(x);
            return p[0] ? '<a' + linkAttrs(p[1] || '') + '>' + plain(fill(p[0])) + '</a>' : '';
          }).join('') + '</div>' : '') +
          '</article>';
      }).join('') + '</div>';
    },
    'パネル': function (b) {
      var f = b.f;
      return '<div class="values">' +
        (f['見出し'] ? '<div class="sec-h">' + (f['小見出し'] ? '<span>' + esc(fill(f['小見出し'])) + '</span>' : '') + '<h2>' + inline(f['見出し']) + '</h2></div>' : '') +
        '<ol>' + b.items.map(function (it, i) {
          return '<li><span class="num">' + (i < 9 ? '0' : '') + (i + 1) + '</span><b>' + inline(it['見出し'] || '') + '</b>' +
            (it['文'] ? '<span>' + inline(it['文']) + '</span>' : '') + '</li>';
        }).join('') + '</ol></div>';
    },
    '案内': function (b) {
      var f = b.f;
      return '<div class="cta"><div>' + (f['見出し'] ? '<h2>' + inline(f['見出し']) + '</h2>' : '') +
        (f['文'] ? '<p>' + inline(f['文']) + '</p>' : '') + '</div>' + buttons(f['ボタン'], ' orange') + '</div>';
    },
    '文章': function (b, narrow) {
      var h = head(b.f, narrow), t = bodyHtml(b.f['本文'] || '');
      return narrow ? h + t : h + '<div class="prose">' + t + '</div>';
    },
    'メール': function (b) {
      var f = b.f, to = fill(f['宛先'] || '').trim() || ctx.site['メール'] || '';
      var sub = fill(f['件名'] || '').trim();
      return '<div class="mailbox"><span class="addr">' + esc(to) + '</span>' +
        '<a class="btn orange" href="mailto:' + esc(to) + (sub ? '?subject=' + encodeURIComponent(sub) : '') + '">' + plain(fill(f['ボタンの文字'] || 'メールアプリで書く')) + '</a>' +
        (f['注意'] ? '<span class="note">' + inline(f['注意']) + '</span>' : '') + '</div>';
    },
    '画像': function (b) {
      var f = b.f, size = { '小': 's', '大': 'l' }[f['大きさ']] || 'm', pic = img(f['ファイル'], f['説明']);
      if (f['リンク'] && href(f['リンク'])) pic = '<a' + linkAttrs(f['リンク']) + '>' + pic + '</a>';
      return '<figure class="pic ' + size + '">' + pic + (f['ひとこと'] ? '<figcaption>' + inline(f['ひとこと']) + '</figcaption>' : '') + '</figure>';
    },
    '画像と文': function (b) {
      var f = b.f;
      return '<div class="split' + (f['位置'] === '右' ? ' rev' : '') + '"><div class="ph">' + img(f['ファイル'], f['説明']) + '</div><div class="tx">' +
        (f['見出し'] ? '<h2>' + inline(f['見出し']) + '</h2>' : '') +
        (f['文'] ? '<p>' + inline(f['文']) + '</p>' : '') +
        ((f['ボタン'] || []).length ? '<div class="actions">' + buttons(f['ボタン']) + '</div>' : '') +
        '</div></div>';
    },
    'ボタン': function (b) {
      return '<div class="actions' + (b.f['位置'] === '中央' ? ' center' : '') + '">' + buttons(b.f['ボタン']) + '</div>';
    }
  };

  function pageInfo(doc) {
    for (var i = 0; i < doc.blocks.length; i++) if (doc.blocks[i].type === 'ページ') return doc.blocks[i].f;
    return {};
  }
  function mainHtml(doc) {
    var P = pageInfo(doc), narrow = P['形'] === '読みもの', out = '';
    if (narrow) {
      if (P['見出し']) out += '<h1>' + inline(P['見出し']) + '</h1>';
      if (P['ひとこと']) out += '<p class="updated">' + inline(P['ひとこと']) + '</p>';
    }
    doc.blocks.forEach(function (b, i) {
      var r = RENDER[b.type];
      if (!r) return;
      var id = anchor(b.f['目印']), a = (id ? ' id="' + id + '"' : '') + ' data-b="' + i + '"';
      var inner = r(b, narrow);
      if (narrow) out += '<div class="blk"' + a + '>' + inner + '</div>';
      else if (b.type === 'ヒーロー') out += '<section class="hero"' + a + '><div class="wrap">' + inner + '</div></section>';
      else out += '<section' + a + '><div class="wrap">' + inner + '</div></section>';
    });
    return { html: out, narrow: narrow, page: P };
  }

  function samePath(h) {
    var a = document.createElement('a');
    a.href = h;
    if (a.hash) return false;
    return a.host === location.host && a.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');
  }
  function navHtml(rows, keepCol) {
    return (rows || []).map(function (r) {
      if (!r[0]) return '';
      var h = href(r[1] || '');
      return '<a' + (keepCol && /スマホ/.test(r[2] || '') ? ' class="keep"' : '') + linkAttrs(r[1] || '') +
        (h && samePath(h) ? ' aria-current="page"' : '') + '>' + esc(fill(r[0])) + '</a>';
    }).join('');
  }
  function readCommon(doc) {
    var C = { site: {}, top: null, bottom: null };
    doc.blocks.forEach(function (b) {
      if (b.type === 'サイト') C.site = b.f;
      if (b.type === '上のメニュー') C.top = b.rows;
      if (b.type === '下のメニュー') C.bottom = b.rows;
    });
    return C;
  }
  function brand(size) {
    return '<a class="brand" href="/"><img class="mark" src="/assets/mark.svg" alt="" width="' + size + '" height="' + size + '">' + esc(ctx.site['屋号'] || '') + '</a>';
  }

  function setMeta(sel, make, value) {
    var el = document.head.querySelector(sel);
    if (value == null || value === '') { return; }
    if (!el) { el = document.createElement('meta'); make(el); document.head.appendChild(el); }
    el.setAttribute('content', value);
  }

  /* 共通（メニューなど）とページの .txt から、画面を組み立てる。どちらかが null なら、その部分は今のままにする */
  function renderAll(commonText, pageText) {
    var warn = [];
    if (commonText != null) {
      var cd = parse(commonText), C = readCommon(cd);
      cd.warn.forEach(function (w) { warn.push('共通 ' + w); });
      if (C.site['屋号']) ctx.site['屋号'] = C.site['屋号'].trim();
      if (C.site['メール']) ctx.site['メール'] = C.site['メール'].trim();
      ctx.nb = buildNb(String(C.site['改行しない言葉'] || '').split(/[、\n]/).map(function (x) { return x.trim(); }));
      var hd = document.querySelector('header.top'), ft = document.querySelector('body > footer');
      if (hd && C.top) hd.innerHTML = '<div class="in">' + brand(34) + '<nav>' + navHtml(C.top, true) + '</nav></div>';
      if (ft && C.bottom) ft.innerHTML = '<div class="in">' + brand(28) + '<nav>' + navHtml(C.bottom, false) + '</nav><span>' + esc(fill(C.site['下の一言'] || '')) + '</span></div>';
    }
    if (pageText != null) {
      var pd = parse(pageText), r = mainHtml(pd), main = document.querySelector('main');
      pd.warn.forEach(function (w) { warn.push(w); });
      if (main && (r.html || pd.blocks.length)) {
        main.className = r.narrow ? 'page' : '';
        main.innerHTML = r.html;
      }
      var P = r.page, title = fill(P['題名'] || '').trim(), desc = fill(P['説明'] || '').replace(/\s*\n\s*/g, '').trim();
      if (title) document.title = title;
      setMeta('meta[name="description"]', function (e) { e.setAttribute('name', 'description'); }, desc);
      setMeta('meta[property="og:title"]', function (e) { e.setAttribute('property', 'og:title'); }, title);
      setMeta('meta[property="og:description"]', function (e) { e.setAttribute('property', 'og:description'); }, desc);
      var rb = document.head.querySelector('meta[name="robots"]');
      if (P['検索'] === '出さない') {
        if (!rb) { rb = document.createElement('meta'); rb.setAttribute('name', 'robots'); document.head.appendChild(rb); }
        rb.setAttribute('content', 'noindex');
      } else if (rb) rb.parentNode.removeChild(rb);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-badlink]'), function (a) {
      warn.push('リンク「' + a.getAttribute('data-badlink') + '」の書き方が正しくありません（例：/contact/、/#works、https://example.com）');
    });
    return warn;
  }

  /* ---------- 起動 ---------- */
  function pageKey(path) {
    var forced = document.documentElement.getAttribute('data-page');
    if (forced) return forced;
    var p = String(path).replace(/index\.html$/, '').replace(/^\/+|\/+$/g, '');
    return p ? p.replace(/\//g, '-') : 'home';
  }
  function get(u) {
    return fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(u + ' ' + r.status);
      return r.text();
    });
  }
  function done() { document.documentElement.classList.remove('pending'); }
  function banner(warn) {
    var d = document.createElement('div');
    d.className = 'checkbar';
    d.innerHTML = warn.length
      ? '<b>書き方の確認：' + warn.length + '件</b><ul>' + warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>'
      : '<b>書き方の確認：問題は見つかりませんでした</b>';
    document.body.appendChild(d);
  }
  function markMissingImages() {
    Array.prototype.forEach.call(document.querySelectorAll('main img[data-file]'), function (im) {
      im.addEventListener('error', function () {
        var d = document.createElement('div');
        d.className = 'noimg';
        d.textContent = '画像「' + im.getAttribute('data-file') + '」が見つかりません（assets/img にアップロードすると出ます）';
        if (im.parentNode) im.parentNode.replaceChild(d, im);
      });
    });
  }

  function startPreview() {
    done();
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.toco !== 'preview') return;
      ctx.images = e.data.images || null; /* まだサイトに入れていない画像を、下見にだけ出す */
      var warn = renderAll(e.data.common, e.data.page);
      markMissingImages();
      if (e.data.focus != null) {
        var el = document.querySelector('[data-b="' + e.data.focus + '"]');
        Array.prototype.forEach.call(document.querySelectorAll('.picked'), function (x) { x.classList.remove('picked'); });
        if (el) { el.classList.add('picked'); if (e.data.scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
      window.parent.postMessage({ toco: 'rendered', warn: warn }, location.origin);
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      var blk = e.target.closest ? e.target.closest('[data-b]') : null;
      if (a) e.preventDefault();
      window.parent.postMessage({ toco: 'pick', index: blk ? Number(blk.getAttribute('data-b')) : null, href: a ? a.getAttribute('href') : null }, location.origin);
    }, true);
    window.parent.postMessage({ toco: 'ready' }, location.origin);
  }

  function start() {
    var q = location.search;
    if (/[?&]preview\b/.test(q) && window.parent !== window) { startPreview(); return; }
    var key = pageKey(location.pathname), check = /[?&]check\b/.test(q);
    var noText = document.documentElement.hasAttribute('data-no-text');
    Promise.all([
      get('/text/common.txt').catch(function () { return null; }),
      noText ? Promise.resolve(null) : get('/text/' + key + '.txt').catch(function () { return null; })
    ]).then(function (r) {
      var warn = renderAll(r[0], r[1]);
      if (r[0] == null) warn.unshift('text/common.txt を読み込めませんでした');
      if (r[1] == null && !noText) warn.unshift('text/' + key + '.txt を読み込めませんでした');
      if (check) { markMissingImages(); banner(warn); }
      done();
      if (location.hash && r[1] != null) {
        var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t) t.scrollIntoView();
      }
      document.documentElement.setAttribute('data-ready', '1');
    }).catch(function () { done(); document.documentElement.setAttribute('data-ready', '1'); });
  }

  window.Toco = {
    SCHEMA: SCHEMA, ICON_NAMES: ICON_NAMES, parse: parse, splitBar: splitBar, href: href,
    renderAll: renderAll, pageKey: pageKey, get: get
  };
  if (!document.documentElement.hasAttribute('data-editor')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
