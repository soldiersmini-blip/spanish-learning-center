'use strict';
(() => {
  const root = document.querySelector('#pane-stats');
  if (!root) return;
  const cacheKey = 'linarchive-vocabulary-stats-last-valid-v1';
  const states = [
    ['published', '已上线完整词卡'],
    ['registered_unpublished', '已注册未上线'],
    ['unregistered', '入围未注册'],
    ['exceptions', '异常 / 待核对']
  ];
  const status = root.querySelector('#stats-status');
  const cards = root.querySelector('#stats-cards');
  const provenance = root.querySelector('#stats-provenance');
  const refreshButton = root.querySelector('#stats-refresh');
  let lastValid = null;
  let inFlight = null;
  let lastAttempt = 0;

  const number = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('zh-CN') : '—';
  const time = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN', {timeZone:'Europe/Paris', hour12:false}) + '（巴黎）' : '未知';
  };
  const validCount = value => Number.isSafeInteger(value) && value >= 0;
  function valid(payload) {
    const data = payload?.data;
    if (payload?.schemaVersion !== 1 || !/^[a-f0-9]{64}:[a-f0-9]{64}$/.test(payload.snapshotVersion || '')) return false;
    if (!data || !data.counts || !data.imageCounts || !data.freshness || !data.publication) return false;
    if (!states.every(([key]) => validCount(data.counts[key]) && ['present','absent','unknown'].every(image => validCount(data.imageCounts[key]?.[image])) && data.counts[key] === ['present','absent','unknown'].reduce((sum, image) => sum + data.imageCounts[key][image], 0))) return false;
    return validCount(data.counts.excluded) && typeof data.publication.version === 'string' && data.publication.version.length > 0 && ['fresh','stale','partial'].includes(data.freshness.status) && ['complete','partial'].includes(data.freshness.sourceStatus) && Number.isFinite(Date.parse(data.freshness.sourceObservedAt)) && Number.isFinite(Date.parse(data.freshness.lastHeartbeatAt));
  }
  function label(payload, fromCache, error) {
    if (!payload) return '统计不可用' + (error ? ' · ' + error : '');
    if (fromCache) return '上次有效统计 · ' + (error ? '当前连接不可用 · ' + error : '正在核对连接');
    const fresh = payload.data.freshness;
    if (fresh.status === 'partial' || fresh.sourceStatus !== 'complete') return '部分数据 · 请核对来源';
    if (fresh.status === 'stale' || Date.now() - Date.parse(fresh.lastHeartbeatAt) > (fresh.staleAfterSeconds || 120) * 1000) return '数据已迟滞 · 等待同步';
    return '实时统计 · 来源正常';
  }
  function render(payload, fromCache = false, error = '') {
    status.textContent = label(payload, fromCache, error);
    status.dataset.state = !payload ? 'unavailable' : fromCache ? 'stale' : payload.data.freshness.status;
    if (!payload) {
      cards.innerHTML = states.map(([, title]) => `<article class="stats-card"><h3>${title}</h3><strong>—</strong><p>有图 — · 无图 — · 未知 —</p></article>`).join('');
      provenance.textContent = '尚无经过校验的统计。请检查本机连接及线上统计接口。';
      return;
    }
    cards.innerHTML = states.map(([key, title]) => {
      const images = payload.data.imageCounts[key];
      return `<article class="stats-card"><h3>${title}</h3><strong>${number(payload.data.counts[key])}</strong><p>有图 ${number(images.present)} · 无图 ${number(images.absent)} · 未知 ${number(images.unknown)}</p></article>`;
    }).join('');
    const freshness = payload.data.freshness;
    provenance.innerHTML = `<dl><div><dt>源快照时间</dt><dd>${time(freshness.sourceObservedAt)}</dd></div><div><dt>最近同步</dt><dd>${time(freshness.lastSyncedAt)}</dd></div><div><dt>最近心跳</dt><dd>${time(freshness.lastHeartbeatAt)}</dd></div><div><dt>线上发布版本</dt><dd class="stats-version"></dd></div><div><dt>排除项</dt><dd>${number(payload.data.counts.excluded)}</dd></div></dl><p>按词卡 ID 统计。图片状态只表示是否有图，不代表图片通过审核。${fromCache ? '当前展示的是上次有效值。' : ''}</p>`;
    provenance.querySelector('.stats-version').textContent = payload.data.publication.version;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey));
    if (valid(saved?.payload)) lastValid = saved.payload;
  } catch {}
  render(lastValid, Boolean(lastValid));
  async function refresh(force = false) {
    if (inFlight) return inFlight;
    if (!force && (document.hidden || root.hidden || Date.now() - lastAttempt < 30000)) return;
    lastAttempt = Date.now();
    refreshButton.disabled = true;
    inFlight = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/vocabulary-stats/summary', {
          headers: {Authorization: 'Bearer ' + token},
          cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw Error(response.status === 401 ? '请重新连接本机' : `接口 ${response.status}`);
        const payload = await response.json();
        if (!valid(payload)) throw Error('统计版本或字段不完整');
        lastValid = payload;
        try { localStorage.setItem(cacheKey, JSON.stringify({payload, savedAt:Date.now()})); } catch {}
        render(payload);
      } catch (error) {
        render(lastValid, Boolean(lastValid), controller.signal.aborted ? '请求超时' : error.message);
      } finally {
        clearTimeout(timer);
        refreshButton.disabled = false;
        inFlight = null;
      }
    })();
    return inFlight;
  }
  refreshButton.addEventListener('click', () => refresh(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !root.hidden) refresh(); });
  setInterval(() => { if (!document.hidden && !root.hidden) refresh(); }, 30000);
  window.WorkbenchStats = {refresh};
})();
