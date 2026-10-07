// ── 信息首页：概览卡片 + ECharts 两类图表 ──
// 数据统一来自 data.json；三维场景见 three-d/campus.html（A-Frame 声明式实现）

const pageAlert = document.querySelector('#page-alert');
const summaryCards = document.querySelector('#summary-cards');
const statsSource = document.querySelector('#stats-source');

let rooms = [];
let barChart = null;
let pieChart = null;

// 页面级状态提示：加载中 / 网络失败 / 数据为空
const showPageAlert = (msg, type) => {
  pageAlert.textContent = msg;
  pageAlert.className = `alert alert-${type}`;
  pageAlert.style.display = 'block';
};

const hidePageAlert = () => {
  pageAlert.style.display = 'none';
};

// ── 概览卡片 ──
const renderSummary = () => {
  const open = rooms.filter(r => r.status === '开放').length;
  const seats = rooms.reduce((sum, r) => sum + r.seats, 0);
  const free = rooms.reduce((sum, r) => sum + (r.seats - r.occupied), 0);
  const cards = [
    { label: '自习室总数', value: rooms.length },
    { label: '当前开放', value: open },
    { label: '总座位数', value: seats },
    { label: '空余座位', value: free }
  ];
  summaryCards.innerHTML = '';
  cards.forEach(c => {
    summaryCards.insertAdjacentHTML('beforeend', `
      <div class="col-6 col-md-3">
        <div class="card shadow-sm">
          <div class="card-body text-center">
            <h3 class="card-title h6 text-muted">${c.label}</h3>
            <p class="card-text fs-3 fw-bold text-primary">${c.value}</p>
          </div>
        </div>
      </div>
    `);
  });
};

// ── 使用统计：图表一柱状图 + 图表二饼图 ──
const renderCharts = () => {
  if (!barChart) {
    barChart = echarts.init(document.querySelector('#usage-chart'));
  }
  barChart.setOption({
    title: { text: '空余座位', left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: rooms.map(r => r.name),
      axisLabel: { rotate: 38, interval: 0, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '座' },
    series: [{
      name: '空余座位',
      type: 'bar',
      data: rooms.map(r => r.seats - r.occupied),
      itemStyle: { color: '#0d6efd' }
    }]
  });

  // 饼图数据由自习室列表按楼栋聚合得到
  const buildings = {};
  rooms.forEach(r => {
    buildings[r.building] = (buildings[r.building] || 0) + 1;
  });
  const pieData = Object.entries(buildings).map(([name, value]) => ({ name, value }));
  if (!pieChart) {
    pieChart = echarts.init(document.querySelector('#building-chart'));
  }
  pieChart.setOption({
    title: { text: '楼栋分布', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 个 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['30%', '65%'],
      data: pieData,
      label: { formatter: '{b}\n{c} 个' }
    }]
  });
};

// ── 数据加载：加载中 / 成功 / 数据为空 / 网络失败 四状态 ──
const loadData = async () => {
  console.log('[调试] 开始加载 data.json 数据...');
  showPageAlert('数据加载中...', 'warning');
  try {
    const response = await fetch('data.json');
    console.log('[调试] fetch 响应状态码：', response.status);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    const data = await response.json();
    console.log('[调试] 数据解析成功，标题：', data.title, '，共', data.rooms?.length || 0, '条自习室记录');
    if (!data.rooms || data.rooms.length === 0) {
      showPageAlert('数据为空：data.json 中没有自习室数据，无法绘制图表', 'warning');
      return;
    }
    hidePageAlert();
    rooms = data.rooms;
    renderSummary();
    renderCharts();
    statsSource.textContent = `${data.title} · ${data.source}`;
    console.log('[调试] 概览卡片与图表渲染完成');
  } catch (error) {
    console.error('[调试] 数据加载失败：', error);
    showPageAlert('数据加载失败：' + error.message + '（请通过本地服务器方式打开页面，见下方运行说明）', 'danger');
  }
};

window.addEventListener('resize', () => {
  if (barChart) barChart.resize();
  if (pieChart) pieChart.resize();
});

loadData();