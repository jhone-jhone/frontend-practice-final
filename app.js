/* ============================================================
 * app.js —— 校园公共信息与数据展示中心 首页逻辑脚本
 * 功能：
 *   1. 加载本地 data.json 数据集
 *   2. 渲染概览统计卡片
 *   3. 渲染各自习室空余座位柱状图（ECharts）
 *   4. 渲染各楼栋自习室数量占比饼图（ECharts）
 *   5. 数据更新时间展示与加载失败提示
 * ============================================================ */

(function () {
  'use strict';

  // 全局数据缓存，供渲染函数共用
  let dataset = null;

  /**
   * 页面入口：等待 DOM 与依赖库就绪后加载数据
   */
  document.addEventListener('DOMContentLoaded', init);

  /**
   * 初始化流程：加载数据 → 渲染概览 → 渲染图表
   */
  async function init() {
    try {
      dataset = await loadData();   // ① 异步获取 data.json
      renderSummary(dataset);       // ② 渲染概览卡片
      renderCharts(dataset);        // ③ 渲染 ECharts 图表
      renderMeta(dataset);          // ④ 展示数据来源与更新时间
      showAlert(false);             // ⑤ 隐藏"加载中"提示
    } catch (err) {
      console.error('数据加载失败：', err);
      showAlert(true, '数据加载失败，请使用本地静态服务器运行（详见"运行说明"）。');
    }
  }

  /**
   * ① 加载 data.json 数据
   * @returns {Promise<Object>} 解析后的 JSON 数据
   */
  async function loadData() {
    const resp = await fetch('data.json');
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status);
    }
    return resp.json();
  }

  /**
   * ② 渲染概览统计卡片
   * 统计指标：自习室总数、总座位数、开放中自习室数、平均占用率
   * @param {Object} data - 数据集
   */
  function renderSummary(data) {
    const rooms = data.rooms || [];

    // 计算各项统计指标
    const totalRooms = rooms.length;                                        // 自习室总数
    const totalSeats = rooms.reduce((sum, r) => sum + r.seats, 0);          // 所有自习室座位总和
    const openRooms = rooms.filter(r => r.status === '开放').length;        // 状态为"开放"的数量
    const totalOccupied = rooms.reduce((sum, r) => sum + r.occupied, 0);    // 已占用座位总数
    const avgRate = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 0; // 平均占用率

    // 卡片配置：标题、数值、单位、Bootstrap 图标（用 emoji 代替，避免引入图标库）
    const cards = [
      { title: '自习室总数', value: totalRooms, unit: '间', icon: '🏫' },
      { title: '总座位数', value: totalSeats.toLocaleString(), unit: '个', icon: '💺' },
      { title: '开放中', value: openRooms, unit: '间', icon: '✅' },
      { title: '平均占用率', value: avgRate, unit: '%', icon: '📊' },
    ];

    // 拼接卡片 HTML 并插入页面
    const html = cards.map(c => `
      <div class="col-6 col-md-3">
        <div class="card h-100">
          <div class="card-body text-center">
            <div class="mb-2" style="font-size:1.6rem">${c.icon}</div>
            <h6 class="card-title">${c.title}</h6>
            <p class="card-text mb-0">${c.value}<span class="fs-6 fw-normal ms-1">${c.unit}</span></p>
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('summary-cards').innerHTML = html;
  }

  /**
   * ③ 渲染两个 ECharts 图表
   * @param {Object} data - 数据集
   */
  function renderCharts(data) {
    // 确保 echarts 库已加载
    if (typeof echarts === 'undefined') {
      console.warn('ECharts 未加载，跳过图表渲染');
      return;
    }

    renderUsageChart(data);   // 柱状图：各自习室空余座位
    renderBuildingChart(data); // 饼图：各楼栋自习室数量占比
  }

  /**
   * ③-1 柱状图：各自习室空余座位数
   * 空余座位 = 总座位 - 已占用
   */
  function renderUsageChart(data) {
    const chart = echarts.init(document.getElementById('usage-chart'));

    // 提取自习室名称与空余座位数
    const names = data.rooms.map(r => r.name);
    const freeSeats = data.rooms.map(r => r.seats - r.occupied);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          // 自定义提示：显示名称 + 空余/总数
          const p = params[0];
          const room = data.rooms[p.dataIndex];
          return `${room.name}<br/>空余座位：<b>${p.value}</b> / ${room.seats}`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          interval: 0,
          rotate: 30, // 名称较长，旋转 30 度避免重叠
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: '空余座位数'
      },
      series: [{
        type: 'bar',
        data: freeSeats,
        itemStyle: {
          // 柱状图颜色：空余越少越偏红，越多越偏绿
          color: (params) => {
            const ratio = params.value / (data.rooms[params.dataIndex].seats || 1);
            if (ratio < 0.2) return '#dc3545';
            if (ratio < 0.4) return '#fd7e14';
            return '#198754';
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', fontSize: 10 }
      }]
    });

    // 窗口尺寸变化时自适应
    window.addEventListener('resize', () => chart.resize());
  }

  /**
   * ③-2 饼图：各楼栋自习室数量占比
   */
  function renderBuildingChart(data) {
    const chart = echarts.init(document.getElementById('building-chart'));

    // 按楼栋分组统计自习室数量
    const buildingMap = {};
    data.rooms.forEach(r => {
      buildingMap[r.building] = (buildingMap[r.building] || 0) + 1;
    });
    // 转换为 ECharts 需要的 [{name, value}, ...] 格式
    const pieData = Object.entries(buildingMap).map(([name, value]) => ({ name, value }));

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 间 ({d}%)' // 名称: 数量 (百分比)
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'], // 环形图
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: pieData
      }]
    });

    window.addEventListener('resize', () => chart.resize());
  }

  /**
   * ④ 展示数据来源与更新时间
   */
  function renderMeta(data) {
    const sourceEl = document.getElementById('stats-source');
    const updatedEl = document.getElementById('data-updated');

    if (sourceEl) sourceEl.textContent = `数据来源：${data.source}`;
    if (updatedEl && data.updated) updatedEl.textContent = `数据更新时间：${data.updated}`;
  }

  /**
   * ⑤ 控制页面顶部提示条的显示
   * @param {boolean} show - 是否显示提示
   * @param {string} [msg] - 提示内容
   */
  function showAlert(show, msg) {
    const el = document.getElementById('page-alert');
    if (!el) return;
    if (show) {
      el.textContent = msg || '数据加载中...';
      el.classList.remove('d-none');
    } else {
      el.classList.add('d-none'); // 用 Bootstrap 的 d-none 隐藏
    }
  }
})();
