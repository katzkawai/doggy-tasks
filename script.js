const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const filters = document.querySelectorAll('.filter');
const progressFill = document.getElementById('progressFill');
const completedCount = document.getElementById('completedCount');
const totalCount = document.getElementById('totalCount');
const quickAdd = document.getElementById('quickAdd');
const categorySelect = document.getElementById('category');
const customCategoryField = document.getElementById('customCategoryField');
const customCategoryInput = document.getElementById('customCategory');
const moodEl = document.getElementById('mood');

const STORAGE_KEY = 'doggyTasks';
let tasks = loadTasks();
let activeFilter = 'all';

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('failed to parse storage', err);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function resetForm() {
  taskForm.reset();
  customCategoryField.hidden = true;
}

function createTask(data) {
  const now = new Date();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: data.title,
    category: data.category,
    priority: data.priority || '中',
    date: data.date || '',
    time: data.time || '',
    reward: data.reward || '',
    notes: data.notes || '',
    done: false,
    createdAt: now.toISOString(),
  };
}

function renderEmptyState() {
  taskList.innerHTML = '<div class="empty">まだタスクがありません。上のフォームでワンコの予定を追加してね🐶</div>';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日(${['日','月','火','水','木','金','土'][date.getDay()]})`;
}

function buildBadges(task) {
  const badges = [];
  if (task.priority === '高') badges.push(`<span class="badge badge--important">たいせつ</span>`);
  if (task.reward) badges.push(`<span class="badge">🍖 ${task.reward}</span>`);
  if (task.done) badges.push(`<span class="badge badge--done">完了</span>`);
  return badges.join('');
}

function inToday(task) {
  if (!task.date) return false;
  const today = new Date();
  const taskDate = new Date(task.date + 'T00:00:00');
  return today.toDateString() === taskDate.toDateString();
}

function filteredTasks() {
  switch (activeFilter) {
    case 'pending':
      return tasks.filter((t) => !t.done);
    case 'done':
      return tasks.filter((t) => t.done);
    case 'today':
      return tasks.filter((t) => inToday(t));
    case 'high':
      return tasks.filter((t) => t.priority === '高');
    default:
      return tasks;
  }
}

function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  totalCount.textContent = total;
  completedCount.textContent = done;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = `${percentage}%`;
  moodEl.textContent = `${Math.min(100, 70 + percentage / 1.2).toFixed(0)}%`;
}

function renderList() {
  const visible = filteredTasks();
  if (!visible.length) {
    renderEmptyState();
    updateProgress();
    return;
  }

  taskList.innerHTML = '';
  const template = document.getElementById('taskTemplate');

  visible
    .sort((a, b) => Number(b.priority === '高') - Number(a.priority === '高'))
    .forEach((task) => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('.card');
      card.dataset.id = task.id;

      card.querySelector('.card__category').textContent = task.category;
      card.querySelector('.card__title').textContent = task.title;

      const metaParts = [];
      if (task.date) metaParts.push(`${formatDate(task.date)}`);
      if (task.time) metaParts.push(`${task.time}`);
      card.querySelector('.card__meta').textContent = metaParts.join(' / ') || 'いつでもOK';

      card.querySelector('.card__notes').textContent = task.notes || 'メモはありません。';
      card.querySelector('.card__badges').innerHTML = buildBadges(task);

      const checkbox = card.querySelector('.task-check');
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        saveTasks();
        updateProgress();
        renderList();
      });

      card.querySelector('.delete').addEventListener('click', () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        saveTasks();
        renderList();
      });

      card.querySelector('.mark-today').addEventListener('click', () => {
        const today = new Date();
        task.date = today.toISOString().slice(0, 10);
        saveTasks();
        renderList();
      });

      taskList.appendChild(clone);
    });

  updateProgress();
}

function applyFilter(target) {
  filters.forEach((btn) => btn.classList.remove('is-active'));
  target.classList.add('is-active');
  activeFilter = target.dataset.filter;
  renderList();
}

function hydrateQuickAdd() {
  quickAdd.addEventListener('click', (event) => {
    const template = event.target.dataset.template;
    if (!template) return;
    const data = JSON.parse(template);
    taskForm.title.value = data.title || '';
    categorySelect.value = data.category || 'お散歩';
    taskForm.priority.value = data.priority || '中';
    taskForm.notes.value = data.notes || '';
  });
}

function handleCategoryToggle() {
  categorySelect.addEventListener('change', () => {
    customCategoryField.hidden = categorySelect.value !== 'カスタム';
    if (!customCategoryField.hidden) customCategoryInput.focus();
  });
}

function initForm() {
  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(taskForm);
    let category = data.get('category');
    if (category === 'カスタム') category = customCategoryInput.value || 'カスタム';

    const task = createTask({
      title: data.get('title').trim(),
      category,
      priority: data.get('priority'),
      date: data.get('date'),
      time: data.get('time'),
      reward: data.get('reward'),
      notes: data.get('notes').trim(),
    });

    tasks.unshift(task);
    saveTasks();
    resetForm();
    renderList();
  });
}

function bootstrapFilters() {
  filters.forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn));
  });
}

function preloadExamples() {
  if (tasks.length) return;
  tasks = [
    createTask({
      title: '朝のお散歩（20分）',
      category: 'お散歩',
      priority: '高',
      time: '07:30',
      reward: 'おやつ半分',
      notes: 'リードは柔らかい方で。公園で水分補給。',
    }),
    createTask({
      title: 'ブラッシング + 肉球ケア',
      category: 'ケア',
      priority: '中',
      date: new Date().toISOString().slice(0, 10),
      reward: 'ごほうびクッキー',
      notes: 'お腹側も丁寧に。終わったら褒めタイム。',
    }),
    createTask({
      title: '知育トイで遊ぶ',
      category: '遊び',
      priority: '低',
      time: '18:00',
      notes: 'ピーナッツバターを少しだけ入れる。',
    }),
  ];
  saveTasks();
}

function init() {
  preloadExamples();
  hydrateQuickAdd();
  handleCategoryToggle();
  initForm();
  bootstrapFilters();
  renderList();
}

init();
