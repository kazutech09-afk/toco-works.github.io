/*
 * ライバルコードの受け口ページ（/eisei2/r/#c=<コード>）
 * - コードの形は shikaku-apps/04_app/src/rpg/rival.ts と同じ読み方をする（版1・版2の両方を読む。2026-10-22 版2）。
 *   版2：[0]版 [1-2]作った日（2026-01-01 からの日数） [3]ジョブ番号 [4]Lv [5-6]HP [7]ATK [8]DEF [9]INT [10]SPD
 *        [11]素体 [12]武器 [13]防具 [14]飾り [15]二つ名の番号（0＝なし） [16]ニックネームのバイト数 n [17..]ニックネーム（UTF-8）
 *   版1：[15]がニックネームのバイト数、[16..]ニックネーム（二つ名なし。得意科目の札で代わりにする）
 *   最後の6バイト＝チェックサム
 * - このページは表示だけ。チェックサム（署名）が正しいかは確かめない（鍵はページに置かない。判定はアプリがする）
 * - コードは「#」の後ろから読む。サーバーにも外部にも送らない。ニックネームは文字として出すだけ（HTML として扱わない）
 * - ジョブ・二つ名・数値の上限は shikaku-apps/04_app/content/eisei2/balance.json と合わせる（変えたらここも直す）
 */
(function () {
  'use strict';

  var SCHEME = 'shikaku-eisei2';
  var PKG = 'com.tocoworks.eisei2';
  var PAGE = 'https://toco-works.com/eisei2/r/';
  var VERSION = 2, MAC = 6, NICK_MAX_BYTES = 48;
  var HEADER = { 1: 16, 2: 17 };
  var STAT_MAX = 100, HP_MIN = 100, HP_MAX = 300, NICK_MAX_CHARS = 10;
  var ART = '/eisei2/r/art/';

  // ジョブ番号 → 名前と絵（balance.json の jobs・rpg-app/catalog.ts の JOB_ART）
  var JOBS = {
    0: { name: '見習い灯守り', art: 'apprentice' },
    1: { name: '律剣士', art: 'char_fighter_t1' },
    2: { name: '衛盾士', art: 'char_shieldguard_t1' },
    3: { name: '理術士', art: 'char_mage_t1' },
    4: { name: '律騎士', art: 'char_fighter_t2' },
    5: { name: '守環騎士', art: 'char_shieldguard_t2' },
    6: { name: '脈理の賢者', art: 'char_mage_t2' },
    7: { name: '護術士', art: 'char_guardmage_t2' },
    8: { name: 'グランドマスター', art: 'char_grandmaster' }
  };
  // 二つ名の番号 → 名前（balance.json の titles の code。版2のコードから）
  var TITLES = {
    1: '初陣を終えた者', 2: '試練を越えし見習い', 3: '早朝の', 4: '夜更けの', 5: '旅慣れた',
    6: '歴戦の', 7: '七日の灯をともす', 8: '不断の学徒', 9: '法典を読み尽くした', 10: '衛生を見通した',
    11: '生理をひもといた', 12: '錆を払う者', 13: '好敵手', 14: '全土を踏破せし者', 15: '三科を極めし者（目安）'
  };
  // レーダーの軸（上から時計回り）と、いちばん高い科目の色（アプリのダークの stat 色）
  var AXES = [
    { k: 'hp', label: 'HP', mean: '体力' },
    { k: 'atk', label: 'ATK', mean: '関係法令の力' },
    { k: 'def', label: 'DEF', mean: '労働衛生の力' },
    { k: 'int', label: 'INT', mean: '労働生理の力' },
    { k: 'spd', label: 'SPD', mean: '答える速さ' }
  ];
  var SUBJECT = { atk: { name: '関係法令', color: '#F0946A' }, def: { name: '労働衛生', color: '#5CC2B6' }, int: { name: '労働生理', color: '#B4A2F0' } };

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- コードを読む ---------- */
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function fromBase64Url(s) {
    s = s.replace(/=+$/, '');
    if (!/^[A-Za-z0-9\-_+/]*$/.test(s) || s.length % 4 === 1) return null;
    var out = [], buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i] === '+' ? 62 : s[i] === '/' ? 63 : ALPHA.indexOf(s[i]);
      buf = (buf << 6) | c; bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return out;
  }
  function utf8(bytes) {
    try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); }
    catch (e) { return String.fromCharCode.apply(null, bytes.filter(function (b) { return b < 128; })); }
  }
  // アプリの sanitizeNickname と同じ：制御文字・メール・電話番号らしい所を消し、10文字まで
  function cleanNick(s) {
    s = String(s || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, '').replace(/\S+@\S+/g, '')
      .replace(/[0-9０-９][0-9０-９\-－ ()（）]{5,}[0-9０-９]/g, '').replace(/\s+/g, ' ').trim();
    var ch = Array.from(s);
    if (ch.length > NICK_MAX_CHARS) s = ch.slice(0, NICK_MAX_CHARS).join('');
    return s || '旅人';
  }
  function rawCode() {
    var h = location.hash.replace(/^#/, '');
    var m = h.match(/(?:^|&)c=([^&]*)/) || location.search.match(/[?&]c=([^&#]*)/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]).replace(/\s/g, ''); } catch (e) { return ''; }
  }
  function decode(code) {
    if (code == null || code === '') return { state: 'empty' };
    // ボタンやコピーに渡してよいのは、コードに使う文字だけ・長さも常識の範囲だけ
    var safe = /^[A-Za-z0-9\-_+/=]{1,200}$/.test(code) ? code : '';
    var bad = { state: 'bad', code: safe };
    var b = fromBase64Url(code);
    if (!b || b.length < 1) return bad;
    if (b[0] > VERSION) return { state: 'version', code: safe };
    if (b[0] < 1) return bad;
    var head = HEADER[b[0]];
    if (b.length < head + MAC) return bad;
    var n = b[head - 1];
    if (n > NICK_MAX_BYTES || b.length !== head + n + MAC) return bad;
    var card = {
      day: (b[1] << 8) | b[2], job: b[3], level: b[4], hp: (b[5] << 8) | b[6],
      atk: b[7], def: b[8], int: b[9], spd: b[10], body: b[11],
      title: b[0] >= 2 ? (TITLES[b[15]] || null) : null,
      nick: cleanNick(utf8(b.slice(head, head + n)))
    };
    var ok = [card.atk, card.def, card.int, card.spd].every(function (v) { return v <= STAT_MAX; }) && card.hp <= HP_MAX * 2 && card.level >= 1;
    if (!ok) return bad;
    return { state: 'ok', code: safe, card: card };
  }

  /* ---------- 描く ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function artFile(c) {
    var j = JOBS[c.job] || JOBS[0];
    if (j.art !== 'apprentice') return j.art;
    return (c.level >= 5 ? 'char_lv5_apprentice' : 'char_lv1_apprentice') + (c.body === 1 ? '_b' : '');
  }
  function dateText(day) {
    var d = new Date(Date.UTC(2026, 0, 1) + day * 86400000);
    return d.getUTCFullYear() + '年' + (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日';
  }
  function bestSubject(c) {
    var ks = ['atk', 'def', 'int'], max = Math.max(c.atk, c.def, c.int);
    var top = ks.filter(function (k) { return c[k] === max; });
    if (max === 0) return null;
    return top.length === 3 ? 'all' : top[0];
  }
  function radar(c) {
    var W = 240, H = 214, cx = 120, cy = 104, r = 66;
    var pct = {
      hp: Math.max(0, Math.min(100, (c.hp - HP_MIN) / (HP_MAX - HP_MIN) * 100)),
      atk: c.atk, def: c.def, int: c.int, spd: c.spd
    };
    function pt(i, v) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / AXES.length;
      return [cx + Math.cos(a) * r * v / 100, cy + Math.sin(a) * r * v / 100];
    }
    function ring(v) { return AXES.map(function (_, i) { return pt(i, v).map(function (x) { return x.toFixed(1); }).join(','); }).join(' '); }
    var best = bestSubject(c), color = best && best !== 'all' ? SUBJECT[best].color : '#D9B25A';
    var label = '相手のステータス。' + AXES.map(function (a) { return a.mean + '（' + a.label + '）' + c[a.k]; }).join('、') + '。点線は足切りの目安（40）';
    var s = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'r-radar', role: 'img', 'aria-label': label, width: '230', height: '205' });
    [25, 50, 75, 100].forEach(function (v) { s.appendChild(sv('polygon', { points: ring(v), fill: 'none', stroke: 'rgba(255,255,255,' + (v === 100 ? .25 : .15) + ')' })); });
    AXES.forEach(function (_, i) { var p = pt(i, 100); s.appendChild(sv('line', { x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1), stroke: 'rgba(255,255,255,.12)' })); });
    s.appendChild(sv('polygon', { points: ring(40), fill: 'none', stroke: '#D9B25A', 'stroke-dasharray': '3 3' }));
    var shape = sv('g', { class: 'r-shape' });
    shape.appendChild(sv('polygon', { points: AXES.map(function (a, i) { return pt(i, pct[a.k]).map(function (x) { return x.toFixed(1); }).join(','); }).join(' '), fill: color, 'fill-opacity': '.35', stroke: color, 'stroke-width': '2', 'stroke-linejoin': 'round' }));
    s.appendChild(shape);
    AXES.forEach(function (a, i) {
      var p = pt(i, 100), dx = p[0] - cx, dy = p[1] - cy;
      var x = cx + dx * 1.3, y = cy + dy * 1.3 + 4;
      var anchor = Math.abs(dx) < 4 ? 'middle' : dx > 0 ? 'start' : 'end';
      if (i === 0) y -= 4;
      var t = sv('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor });
      t.appendChild(sv('tspan', { 'font-weight': '700' }, a.label + ' '));
      t.appendChild(sv('tspan', {}, String(c[a.k])));
      s.appendChild(t);
    });
    return s;
  }
  function cardView(c) {
    var job = JOBS[c.job] || JOBS[0];
    var box = el('div', 'r-card');
    var top = el('div', 'r-top');
    var fig = el('div', 'r-fig');
    var img = el('img');
    img.src = ART + artFile(c) + '.svg';
    img.alt = '相手のキャラクター（' + job.name + '）';
    img.width = 125; img.height = 160; img.decoding = 'async';
    fig.appendChild(img);
    var who = el('div', 'r-who');
    var best = bestSubject(c);
    // 二つ名（版2のコード）。無い・古い版のコードは得意科目の札で代わりにする
    who.appendChild(el('span', 'r-rib r-serif', c.title || (best === 'all' ? '3科目そろった者' : best ? '得意：' + SUBJECT[best].name : '旅のはじまり')));
    who.appendChild(el('div', 'r-nm r-serif', c.nick));
    var jb = el('div', 'r-jb r-serif', job.name + '　');
    jb.appendChild(el('span', 'r-num', 'Lv.' + c.level));
    who.appendChild(jb);
    top.appendChild(fig); top.appendChild(who);
    box.appendChild(top);
    box.appendChild(radar(c));
    box.appendChild(el('p', 'r-legend', 'ATK＝関係法令の力・DEF＝労働衛生の力・INT＝労働生理の力・SPD＝答える速さ・HP＝体力'));
    box.appendChild(el('p', 'r-from', '表示だけ（コードから描いています。本名・メールは入っていません）・コードを作った日 ' + dateText(c.day)));
    return box;
  }
  function plain(title, lines) {
    var d = el('div', 'r-plain');
    d.appendChild(el('b', null, title));
    lines.forEach(function (t) { d.appendChild(el('p', null, t)); });
    return d;
  }

  /* ---------- 端末ごとのボタン ---------- */
  function platform() {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
    return 'other';
  }
  function openUrl(code, pf) {
    if (pf === 'android') {
      // アプリが無いときは、このページに「アプリが無かった」印を付けて戻す（Google Play の公開後は Play の URL＋referrer に替える。Q2・Q6）
      var back = PAGE + '#c=' + code + '&noapp=1';
      return 'intent://rival?c=' + code + '#Intent;scheme=' + SCHEME + ';package=' + PKG + ';S.browser_fallback_url=' + encodeURIComponent(back) + ';end';
    }
    return SCHEME + '://rival?c=' + code;
  }

  /* ---------- トースト・コピー ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('r-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); setTimeout(function () { if (!t.classList.contains('show')) t.textContent = ''; }, 250); }, 2400);
  }
  function copyText(text) {
    function fallback() {
      var ta = el('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? 'コピーしました' : 'コピーできませんでした。コードを長押しして選んでください');
      if (!ok) { var c = $('r-code'); c.style.whiteSpace = 'normal'; c.style.wordBreak = 'break-all'; }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('コピーしました'); }, fallback);
    } else fallback();
  }

  /* ---------- 組み立て ---------- */
  var current = null;
  function render() {
    var raw = rawCode(), r = decode(raw), slot = $('r-slot'), pf = platform();
    var noapp = /(?:^|&)noapp=1/.test(location.hash.replace(/^#/, ''));
    current = r;
    slot.textContent = '';
    if (r.state === 'ok') {
      $('r-title').textContent = 'ライバルから早解き対決の誘いが届きました';
      var card = cardView(r.card);
      slot.appendChild(card);
      if (!reduce) requestAnimationFrame(function () { card.classList.add('r-in'); });
      $('r-open-note').textContent = 'アプリが入っていれば、' + r.card.nick + 'さんが模擬戦の相手に登録されます。';
    } else if (r.state === 'empty') {
      $('r-title').textContent = 'ライバルコードの受け取りページ';
      slot.appendChild(plain('コードが付いていません', ['このページは、友だちのギルドカード（成績カード）の QR やリンクから開くページです。リンクの「#c=」の後ろにコードが入ります。', '友だちに、リンクをもう一度送ってもらってください。']));
    } else {
      $('r-title').textContent = 'コードを受け取りました';
      $('r-open-note').textContent = 'アプリで読めれば、相手が模擬戦の相手に登録されます。';
      slot.appendChild(plain(r.state === 'version' ? '新しい版のコードです' : 'このコードは読めませんでした',
        r.state === 'version'
          ? ['このページではまだ描けない、新しい版のコードです。アプリで開いてください（アプリを最新にしてください）。']
          : ['コードの一部が欠けているか、別の文字が混ざっているようです。このコードはアプリで開いてください。アプリでも読めないときは、友だちにリンクをもう一度送ってもらってください。']));
    }
    var has = !!r.code;
    $('r-open').hidden = !has;
    $('r-codebox').hidden = !has;
    if (has) {
      var btn = $('r-open-btn');
      btn.href = openUrl(r.code, pf);
      $('r-code').textContent = r.code;
      $('r-pc').hidden = pf !== 'other';
      $('r-noapp').hidden = !noapp;
      $('r-opening').hidden = true;
    }
  }

  function start() {
    render();
    window.addEventListener('hashchange', render);
    $('r-copy').addEventListener('click', function () { if (current && current.code) copyText(current.code); });
    $('r-open-btn').addEventListener('click', function () {
      var pf = platform();
      $('r-opening').hidden = false;
      if (pf === 'ios') {
        // アプリが開けばページは裏に回る。1.6 秒たっても前にあるなら「開かなかった」ときの説明を出す（自動で別の所へは飛ばさない）
        setTimeout(function () {
          $('r-opening').hidden = true;
          if (!document.hidden) $('r-noapp').hidden = false;
        }, 1600);
      } else if (pf === 'other') {
        setTimeout(function () { $('r-opening').hidden = true; }, 1600);
      }
    });
    // スクロール連動：紹介が順に出る（動きを減らす設定・古いブラウザでは最初から出す）
    var items = document.querySelectorAll('.rv');
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (x) { x.classList.add('on'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      Array.prototype.forEach.call(items, function (x) { io.observe(x); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
