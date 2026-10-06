// ── 自习室查询页：楼栋 + 楼层 + 状态筛选 + 关键词搜索 + 非法输入校验 ──
const badgeClass = { '开放': 'text-bg-success', '闭馆': 'text-bg-secondary', '维修': 'text-bg-warning' };
const MAX_KEYWORD_LEN = 20;

const alertEl = document.querySelector('#rooms-alert');
const roomList = document.querySelector('#room-list');
const roomCount = document.querySelector('#room-count');
const buildingFilter = document.querySelector('#building-filter');
const floorFilter = document.querySelector('#floor-filter');
const statusFilter = document.querySelector('#status-filter');
const searchInput = document.querySelector('#search-input');
const clearSearch = document.querySelector('#clear-search');

let rooms = [];

const showAlert = (msg, type) => {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type}`;
  alertEl.style.display = 'block';
};

const hideAlert = () => {
  alertEl.style.display = 'none';
};

const renderRooms = () => {
  hideAlert();
  const building = buildingFilter.value;
  const floor = floorFilter.value;
  const status = statusFilter.value;
  const keyword = searchInput.value.trim();

  const shown = rooms.filter(r =>
    (building === 'all' || r.building === building) &&
    (floor === 'all' || r.floor === Number(floor)) &&
    (status === 'all' || r.status === status) &&
    (keyword === '' || r.name.includes(keyword) || r.building.includes(keyword))
  );

  roomCount.textContent = `共 ${shown.length} 个自习室符合条件`;
  roomList.innerHTML = '';
  if (shown.length === 0) {
    roomList.innerHTML = '<li class="list-group-item">没有符合条件的自习室，请调整筛选条件或搜索词</li>';
    return;
  }
  shown.forEach(r => {
    roomList.insertAdjacentHTML('beforeend', `
      <li class="list-group-item">
        <div>
          <strong>${r.name}</strong>
          <span class="text-muted small">${r.building}${r.floor}层 · 空余 ${r.seats - r.occupied} / ${r.seats} 座</span>
        </div>
        <span class="badge ${badgeClass[r.status]}">${r.status} · ${r.hours}</span>
      </li>
    `);
  });
};

// 非法输入校验：包含 HTML 特殊字符或超过长度限制时给出错误提示
const hasIllegalChar = (kw) => /[<>"'`/\\]/.test(kw);

searchInput.addEventListener('input', () => {
  const kw = searchInput.value;
  if (hasIllegalChar(kw)) {
    showAlert('输入的搜索内容包含非法字符（< > " / \\ 等），请修改后再试', 'danger');
    return;
  }
  if (kw.trim().length > MAX_KEYWORD_LEN) {
    showAlert(`搜索关键词过长（最多 ${MAX_KEYWORD_LEN} 个字符）`, 'danger');
    return;
  }
  renderRooms();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  renderRooms();
});

buildingFilter.addEventListener('change', renderRooms);
floorFilter.addEventListener('change', renderRooms);
statusFilter.addEventListener('change', renderRooms);

// ── 数据加载：加载中 / 成功 / 数据为空 / 网络失败 四状态 ──
const loadRooms = async () => {
  showAlert('数据加载中...', 'warning');
  try {
    const response = await fetch('data.json');
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    const data = await response.json();
    if (!data.rooms || data.rooms.length === 0) {
      showAlert('数据为空：data.json 中没有自习室数据', 'danger');
      return;
    }
    rooms = data.rooms;
    // 楼栋筛选项由数据动态生成，保证与数据集一致
    [...new Set(rooms.map(r => r.building))].forEach(b => {
      buildingFilter.insertAdjacentHTML('beforeend', `<option value="${b}">${b}</option>`);
    });
    renderRooms();
  } catch (error) {
    showAlert('数据加载失败：' + error.message + '（请通过本地服务器方式打开页面）', 'danger');
  }
};

loadRooms();