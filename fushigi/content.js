(function () {
  'use strict';

  const siteBase = new URL('.', document.currentScript.src);
  const contentUrl = new URL('data/content.json', siteBase);
  const gameList = document.querySelector('.g-list');
  const guideList = document.querySelector('.gd-list');
  const statusText = document.getElementById('contentStatus');
  const retryButton = document.getElementById('contentRetry');
  const fixedCrcs = new Set(Array.from(gameList.querySelectorAll('.g-e em'), el => el.textContent.trim()));
  const fixedCount = gameList.querySelectorAll('.g-item').length;
  const service = window.FushigiContent = {
    state: 'idle', data: null, targets: Object.create(null), error: null, ready: null, load
  };

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function object(value, path) {
    assert(value && typeof value === 'object' && !Array.isArray(value), path + ' 必须是对象');
  }
  function text(value, path, optional) {
    if (optional && (value === undefined || value === null)) return '';
    assert(typeof value === 'string' && (optional || value.trim()), path + ' 必须是' + (optional ? '文字' : '非空文字'));
    return value;
  }
  function list(value, path, nonempty) {
    assert(Array.isArray(value) && (!nonempty || value.length), path + ' 必须是' + (nonempty ? '非空数组' : '数组'));
    return value;
  }
  function url(value, path, optional) {
    if (optional && (value === undefined || value === null || value === '')) return null;
    text(value, path);
    let result;
    try { result = new URL(value, siteBase); } catch (_) { throw new Error(path + ' 地址无效'); }
    assert(result.protocol === 'https:' || result.protocol === 'http:', path + ' 只支持 HTTP/HTTPS 地址');
    return result.href;
  }
  function entry(value, path, registry) {
    object(value, path);
    const id = text(value.id, path + '.id');
    assert(/^[a-z0-9][a-z0-9_-]*$/i.test(id), path + '.id 只能包含英文字母、数字、下划线和连字符');
    assert(!registry.has(id), path + '.id 重复：' + id);
    assert(value.enabled === undefined || typeof value.enabled === 'boolean', path + '.enabled 必须是 true 或 false');
    assert(value.order === undefined || Number.isFinite(value.order), path + '.order 必须是数字');
    registry.set(id, value);
  }
  function date(value, path) {
    if (value === undefined || value === null || value === '') return '';
    text(value, path);
    const parsed = new Date(value + 'T00:00:00Z');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value,
      path + ' 必须是有效日期，格式为 YYYY-MM-DD');
    return value;
  }
  function ordered(items) {
    return items.toSorted((a, b) => (a.order || 0) - (b.order || 0));
  }

  function compile(data) {
    object(data, 'content');
    assert(data.schemaVersion === 1, 'schemaVersion 必须为 1');
    const patches = new Map(), games = new Map(), guides = new Map();
    const targets = Object.create(null), seenCrcs = new Set(fixedCrcs);
    const news = data.news === undefined ? [] : list(data.news, 'news');
    news.forEach((item, i) => {
      object(item, 'news[' + i + ']');
      assert(date(item.date, 'news[' + i + '].date'), '公告需要日期');
      text(item.text, 'news[' + i + '].text');
    });
    list(data.patches, 'patches').forEach((patch, i) => {
      const path = 'patches[' + i + ']';
      entry(patch, path, patches);
      text(patch.outputName, path + '.outputName');
      assert(!/[\\/]/.test(patch.outputName), path + '.outputName 只能填写文件名');
      text(patch.version, path + '.version', true);
      date(patch.releasedAt, path + '.releasedAt');
      text(patch.notes, path + '.notes', true);
      list(patch.files, path + '.files', true).forEach((file, j) => {
        object(file, path + '.files[' + j + ']');
        url(file.url, path + '.files[' + j + '].url');
        url(file.fallbackUrl, path + '.files[' + j + '].fallbackUrl', true);
      });
    });
    list(data.games, 'games').forEach((game, i) => {
      const path = 'games[' + i + ']';
      entry(game, path, games);
      text(game.title, path + '.title');
      text(game.platform, path + '.platform');
      url(game.cover, path + '.cover', true);
      text(game.description, path + '.description', true);
      list(game.versions, path + '.versions', true).forEach((version, j) => {
        const vpath = path + '.versions[' + j + ']';
        object(version, vpath);
        const crc = text(version.crc32, vpath + '.crc32').toUpperCase();
        assert(/^[0-9A-F]{8}$/.test(crc), vpath + '.crc32 必须是 8 位十六进制文字');
        assert(!seenCrcs.has(crc), vpath + '.crc32 重复或与原有不思议游戏冲突：' + crc);
        seenCrcs.add(crc);
        text(version.label, vpath + '.label', true);
        text(version.serial, vpath + '.serial', true);
        text(version.romName, vpath + '.romName');
        const patch = patches.get(text(version.patchId, vpath + '.patchId'));
        assert(patch, vpath + '.patchId 找不到对应补丁');
        if (game.enabled !== false) {
          targets[crc] = {
            key: game.platform.toLowerCase(), label: game.platform, game: game.title,
            out: patch.outputName,
            src: patch.files.map(file => url(file.url, '补丁主源')),
            back: patch.files.map(file => url(file.fallbackUrl, '补丁备用源', true))
          };
        }
      });
    });
    list(data.guides, 'guides').forEach((guide, i) => {
      const path = 'guides[' + i + ']';
      entry(guide, path, guides);
      list(guide.gameIds, path + '.gameIds', true).forEach(id => assert(games.has(id), path + '.gameIds 找不到游戏：' + id));
      url(guide.url, path + '.url');
      text(guide.title, path + '.title', true);
      text(guide.highlight, path + '.highlight', true);
      text(guide.platform, path + '.platform', true);
      text(guide.description, path + '.description', true);
      url(guide.cover, path + '.cover', true);
      assert(guide.cover || games.get(guide.gameIds[0]).cover, path + ' 需要攻略封面或关联游戏的 cover');
    });
    return { data, games, patches, targets, news };
  }

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function gameCard(game, number, patches) {
    const card = element('article', 'g-item');
    card.dataset.jsonGame = game.id;
    const index = element('span', 'g-no', String(number).padStart(2, '0'));
    index.setAttribute('aria-hidden', 'true');
    const body = element('div', 'g-body'), top = element('div', 'g-top');
    top.append(element('span', 'g-plat', game.platform), element('b', '', game.title));
    const editions = element('div', 'g-ed'), roms = element('div', 'g-rom');
    game.versions.forEach((version, i) => {
      const edition = element('span', 'g-e' + (i ? ' alt' : ''));
      if (version.serial) edition.append(element('i', '', version.serial));
      if (version.label) edition.append(document.createTextNode(version.label));
      edition.append(element('em', '', version.crc32.toUpperCase()));
      editions.append(edition);
    });
    new Set(game.versions.map(version => version.romName)).forEach(name => roms.append(element('span', '', name)));
    body.append(top, editions, roms);
    new Set(game.versions.map(version => version.patchId)).forEach(id => {
      const patch = patches.get(id);
      const info = [patch.version ? '补丁版本：' + patch.version : '', patch.releasedAt ? '发布：' + patch.releasedAt : '', patch.notes || ''].filter(Boolean);
      if (info.length) body.append(element('p', 'g-patch-info', info.join(' · ')));
    });
    card.append(index, body);
    return card;
  }
  function guideCard(guide, games) {
    const related = guide.gameIds.map(id => games.get(id)).filter(game => game.enabled !== false);
    if (!related.length || guide.enabled === false) return null;
    const game = related[0], title = guide.title || game.title;
    const card = element('a', 'gd-item');
    card.dataset.jsonGuide = guide.id;
    card.href = url(guide.url, '攻略地址');
    card.target = '_blank'; card.rel = 'noopener';
    const picture = element('div', 'gd-pic'), image = element('img');
    image.src = url(guide.cover || games.get(guide.gameIds[0]).cover, '攻略封面');
    image.alt = title; image.loading = 'lazy';
    picture.append(image, element('span', 'gd-tag', guide.platform || Array.from(new Set(related.map(item => item.platform))).join(' / ')));
    const body = element('div', 'gd-txt'), heading = element('h3', 'gd-title');
    const highlightAt = guide.highlight ? title.indexOf(guide.highlight) : -1;
    if (highlightAt < 0) heading.textContent = title;
    else heading.append(document.createTextNode(title.slice(0, highlightAt)), element('b', '', guide.highlight), document.createTextNode(title.slice(highlightAt + guide.highlight.length)));
    const go = element('span', 'gd-go', '查看攻略');
    go.append(element('i', '', '→'));
    body.append(heading, element('p', 'gd-desc', guide.description === undefined ? (game.description || '') : guide.description), go);
    card.append(picture, body);
    return card;
  }
  function render(content) {
    const gameFragment = document.createDocumentFragment(), guideFragment = document.createDocumentFragment();
    ordered(content.data.games).filter(game => game.enabled !== false).forEach((game, i) => gameFragment.append(gameCard(game, fixedCount + i + 1, content.patches)));
    ordered(content.data.guides).forEach(guide => {
      const card = guideCard(guide, content.games);
      if (card) guideFragment.append(card);
    });
    gameList.querySelectorAll('[data-json-game]').forEach(node => node.remove());
    guideList.querySelectorAll('[data-json-guide]').forEach(node => node.remove());
    gameList.append(gameFragment); guideList.append(guideFragment);
    const news = document.querySelector('#news .tn-in');
    const latest = content.news.toSorted((a, b) => b.date.localeCompare(a.date))[0];
    if (news) {
      if (latest) news.replaceChildren(element('b', '', latest.date.replace(/-/g, '.')), document.createTextNode(' ' + latest.text));
      else news.replaceChildren('不思议汉化组');
    }
  }
  function showStatus(message, retry) {
    statusText.textContent = message;
    statusText.parentElement.hidden = !message;
    retryButton.hidden = !retry;
  }
  function load() {
    if (service.state === 'loading') return service.ready;
    service.state = 'loading'; service.error = null;
    showStatus('正在加载更多游戏和攻略…', false);
    document.dispatchEvent(new CustomEvent('fushigi:content-loading'));
    service.ready = (async () => {
      try {
        assert(location.protocol !== 'file:', '请通过本地 HTTP 服务预览，或在 GitHub Pages 打开页面');
        const response = await fetch(contentUrl.href, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        assert(response.ok, '读取 content.json 失败：HTTP ' + response.status);
        const content = compile(await response.json());
        render(content);
        service.data = content.data; service.targets = content.targets; service.state = 'ready';
        showStatus('', false);
        document.dispatchEvent(new CustomEvent('fushigi:content-ready'));
        return content.data;
      } catch (error) {
        service.state = 'error'; service.error = error;
        const reason = error.name === 'TimeoutError' ? '请求超时' : error.message;
        showStatus('更多游戏和攻略加载失败：' + reason + '。原有不思议游戏仍可使用。', true);
        const news = document.querySelector('#news .tn-in');
        if (news) news.replaceChildren('不思议汉化组');
        document.dispatchEvent(new CustomEvent('fushigi:content-error'));
        return null;
      }
    })();
    return service.ready;
  }
  retryButton.addEventListener('click', load);
  load();
})();
