/* ==============================
   market-api.js
   집찾GO 시장동향 API 화면 연결
============================== */

(function () {
  const DEFAULT_REGION = '41117';

  document.addEventListener('DOMContentLoaded', () => {
    loadMarketSummary();
  });

  async function loadMarketSummary() {
    const region = getSelectedRegion();
    const month = getTargetMonth();

    try {
      setLoadingState();

      const res = await fetch(`/api/market/summary?region=${region}&month=${month}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || '시장동향 데이터를 불러오지 못했습니다.');
      }

      renderMarketSummary(data);
    } catch (error) {
      console.error(error);
      renderErrorState();
    }
  }

  function renderMarketSummary(data) {
    setText('marketSource', data.source === 'demo' ? '데모 데이터' : '국토교통부 실거래가 API');
    setText('marketMonth', formatMonth(data.dealYmd));
    setText('regionName', data.regionName);

    setText('saleStatus', data.saleStatus);
    setText('saleText', data.saleText);
    setText('saleAvg', formatMoney(data.saleAvg));
    setText('saleRate', formatRate(data.saleChangeRate));

    setText('jeonseStatus', data.jeonseStatus);
    setText('jeonseText', data.jeonseText);
    setText('jeonseAvg', formatMoney(data.jeonseAvgDeposit));
    setText('jeonseRate', formatRate(data.jeonseChangeRate));

    setText('volumeStatus', data.volumeStatus);
    setText('volumeText', data.volumeText);
    setText('tradeCount', `${data.tradeCount || 0}건`);
    setText('volumeRate', formatRate(data.volumeChangeRate));

    setText('hotRegion', data.hotRegion);
    setText('aiText', data.aiText);

    renderTradeList(data.sampleTradeList || []);
    renderRentList(data.sampleRentList || []);
  }

  function renderTradeList(list) {
    const el = document.querySelector('[data-market-list="trade"]');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = '<li>표시할 매매 실거래 예시가 없습니다.</li>';
      return;
    }

    el.innerHTML = list.map(item => `
      <li>
        <strong>${escapeHtml(item.aptName)}</strong>
        <span>${escapeHtml(item.dong)} · ${escapeHtml(item.area)}㎡ · ${escapeHtml(item.floor)}층 · ${formatMoney(item.amount)}</span>
      </li>
    `).join('');
  }

  function renderRentList(list) {
    const el = document.querySelector('[data-market-list="rent"]');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = '<li>표시할 전월세 실거래 예시가 없습니다.</li>';
      return;
    }

    el.innerHTML = list.map(item => `
      <li>
        <strong>${escapeHtml(item.aptName)}</strong>
        <span>${escapeHtml(item.dong)} · ${escapeHtml(item.area)}㎡ · 보증금 ${formatMoney(item.deposit)} · 월세 ${Number(item.monthlyRent || 0).toLocaleString()}만원</span>
      </li>
    `).join('');
  }

  function setLoadingState() {
    ['saleStatus', 'jeonseStatus', 'volumeStatus', 'hotRegion'].forEach(key => {
      setText(key, '불러오는 중');
    });
  }

  function renderErrorState() {
    setText('marketSource', '연결 오류');
    setText('saleStatus', '확인 필요');
    setText('jeonseStatus', '확인 필요');
    setText('volumeStatus', '확인 필요');
    setText('hotRegion', '확인 필요');
    setText('aiText', 'API 서버 또는 인증키 상태를 확인해 주세요.');
  }

  function setText(key, value) {
    document.querySelectorAll(`[data-market="${key}"]`).forEach(el => {
      el.textContent = value ?? '-';
    });
  }

  function getSelectedRegion() {
    const params = new URLSearchParams(window.location.search);
    return params.get('region') || document.body.dataset.region || DEFAULT_REGION;
  }

  function getTargetMonth() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('month')) return params.get('month');

    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  function formatRate(rate) {
    if (rate === undefined || rate === null) return '-';
    const sign = Number(rate) > 0 ? '+' : '';
    return `${sign}${rate}%`;
  }

  function formatMoney(value) {
    const num = Number(value || 0);
    if (!num) return '-';
    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${num.toLocaleString()}만원`;
  }

  function formatMonth(ymd) {
    if (!ymd || ymd.length !== 6) return '-';
    return `${ymd.slice(0, 4)}년 ${Number(ymd.slice(4, 6))}월`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
