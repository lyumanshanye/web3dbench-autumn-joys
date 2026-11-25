import { recipes, recipeById } from './data.js';
import { KitchenScene, modelSwatchColors } from './scene.js';

const PROGRESS_KEY = 'weeknight-kitchen-progress-v1';
const HASH_PREFIX = '#/recipe/';
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 8;

const dom = {
  appShell: document.getElementById('appShell'),
  searchInput: document.getElementById('searchInput'),
  vegFilter: document.getElementById('vegFilter'),
  resetFilters: document.getElementById('resetFilters'),
  timeFilters: document.getElementById('timeFilters'),
  recipeList: document.getElementById('recipeList'),
  libraryEmpty: document.getElementById('libraryEmpty'),
  resultCount: document.getElementById('resultCount'),
  recipeStage: document.getElementById('recipeStage'),
  cookPanel: document.querySelector('.cook-panel'),
  emptyResults: document.getElementById('emptyResults'),
  emptyResetBtn: document.getElementById('emptyResetBtn'),
  recipeNumber: document.getElementById('recipeNumber'),
  recipeCuisine: document.getElementById('recipeCuisine'),
  vegetarianBadge: document.getElementById('vegetarianBadge'),
  recipeTitle: document.getElementById('recipeTitle'),
  recipeDescription: document.getElementById('recipeDescription'),
  recipeTime: document.getElementById('recipeTime'),
  servingCount: document.getElementById('servingCount'),
  servingMinus: document.getElementById('servingMinus'),
  servingPlus: document.getElementById('servingPlus'),
  servingNote: document.getElementById('servingNote'),
  recipeTip: document.getElementById('recipeTip'),
  noteIndex: document.getElementById('noteIndex'),
  sceneCanvas: document.getElementById('sceneCanvas'),
  sceneSelection: document.getElementById('sceneSelection'),
  selectionSwatch: document.getElementById('selectionSwatch'),
  selectionEyebrow: document.getElementById('selectionEyebrow'),
  selectionName: document.getElementById('selectionName'),
  selectionAmount: document.getElementById('selectionAmount'),
  counterChips: document.getElementById('counterChips'),
  counterHint: document.getElementById('counterHint'),
  sceneDragNote: document.getElementById('sceneDragNote'),
  cookRecipeName: document.getElementById('cookRecipeName'),
  stepFraction: document.getElementById('stepFraction'),
  stepProgressBar: document.getElementById('stepProgressBar'),
  stepNumber: document.getElementById('stepNumber'),
  stepTimer: document.getElementById('stepTimer'),
  stepTitle: document.getElementById('stepTitle'),
  stepBody: document.getElementById('stepBody'),
  prevStepBtn: document.getElementById('prevStepBtn'),
  nextStepBtn: document.getElementById('nextStepBtn'),
  stepDots: document.getElementById('stepDots'),
  checkedCount: document.getElementById('checkedCount'),
  ingredientChecklist: document.getElementById('ingredientChecklist'),
  resetProgressBtn: document.getElementById('resetProgressBtn'),
  surpriseBtn: document.getElementById('surpriseBtn'),
  toast: document.getElementById('toast')
};

const state = {
  currentId: null,
  query: '',
  vegetarianOnly: false,
  maxMinutes: 0,
  servingsByRecipe: {},
  selectedIngredientId: null
};

let progressByRecipe = readProgress();
let toastTimer = null;
let kitchenScene = null;

const unitForms = {
  cup: ['cup', 'cups'],
  tbsp: ['tbsp', 'tbsp'],
  tsp: ['tsp', 'tsp'],
  g: ['g', 'g'],
  ml: ['ml', 'ml'],
  clove: ['clove', 'cloves'],
  fillet: ['fillet', 'fillets'],
  thigh: ['thigh', 'thighs'],
  head: ['head', 'heads'],
  sprig: ['sprig', 'sprigs'],
  stalk: ['stalk', 'stalks'],
  slice: ['slice', 'slices'],
  tortilla: ['tortilla', 'tortillas']
};

const fractionSymbols = [
  { value: 0, symbol: '' },
  { value: 1 / 8, symbol: '⅛' },
  { value: 1 / 4, symbol: '¼' },
  { value: 1 / 3, symbol: '⅓' },
  { value: 3 / 8, symbol: '⅜' },
  { value: 1 / 2, symbol: '½' },
  { value: 5 / 8, symbol: '⅝' },
  { value: 2 / 3, symbol: '⅔' },
  { value: 3 / 4, symbol: '¾' },
  { value: 7 / 8, symbol: '⅞' },
  { value: 1, symbol: '' }
];

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressByRecipe));
  } catch {
    // The site still works when storage is unavailable; progress just will not persist.
  }
}

function getRecipeProgress(recipe) {
  const stored = progressByRecipe[recipe.id] || {};
  const ingredientIds = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
  const checked = new Set(Array.isArray(stored.checked) ? stored.checked.filter((id) => ingredientIds.has(id)) : []);
  const rawStep = Number.isInteger(stored.step) ? stored.step : 0;
  return {
    checked,
    step: Math.max(0, Math.min(rawStep, recipe.steps.length - 1))
  };
}

function saveRecipeProgress(recipe, progress) {
  progressByRecipe[recipe.id] = {
    checked: [...progress.checked],
    step: progress.step
  };
  writeProgress();
}

function getCurrentRecipe() {
  return recipeById.get(state.currentId) || recipes[0];
}

function getCurrentServings(recipe = getCurrentRecipe()) {
  return state.servingsByRecipe[recipe.id] || recipe.baseServings;
}

function formatFraction(value) {
  const safeValue = Math.max(0, value);
  const whole = Math.floor(safeValue + 1e-8);
  let remainder = safeValue - whole;
  if (remainder < 0.015) return String(whole);
  if (remainder > 0.985) return String(whole + 1);

  let closest = fractionSymbols[0];
  for (const candidate of fractionSymbols) {
    if (Math.abs(candidate.value - remainder) < Math.abs(closest.value - remainder)) {
      closest = candidate;
    }
  }
  if (closest.value === 1) return String(whole + 1);
  return `${whole || ''}${closest.symbol}`;
}

function scaledAmount(value, unit) {
  if (unit === 'g' || unit === 'ml') {
    if (value >= 100) return Math.round(value / 10) * 10;
    if (value >= 20) return Math.round(value / 5) * 5;
    return Math.round(value);
  }
  return Math.round(value * 8) / 8;
}

function unitLabel(unit, value) {
  if (!unit) return '';
  const forms = unitForms[unit] || [unit, unit];
  return value > 1 ? forms[1] : forms[0];
}

function formatQuantity(ingredient, recipe, servings) {
  const raw = ingredient.qty * (servings / recipe.baseServings);
  const value = scaledAmount(raw, ingredient.unit);
  const amount = formatFraction(value);
  const unit = unitLabel(ingredient.unit, value);
  return unit ? `${amount} ${unit}` : amount;
}

function pluralizeCount(value, noun) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function filteredRecipes() {
  const query = state.query.trim().toLowerCase();
  return recipes.filter((recipe) => {
    if (state.vegetarianOnly && !recipe.vegetarian) return false;
    if (state.maxMinutes && recipe.minutes > state.maxMinutes) return false;
    if (!query) return true;
    const inTitle = recipe.title.toLowerCase().includes(query);
    const inIngredients = recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(query));
    return inTitle || inIngredients;
  });
}

function routeFromHash() {
  const raw = window.location.hash || '';
  if (!raw.startsWith(HASH_PREFIX)) return null;
  const id = decodeURIComponent(raw.slice(HASH_PREFIX.length));
  return recipeById.has(id) ? id : null;
}

function recipeHash(id) {
  return `${HASH_PREFIX}${encodeURIComponent(id)}`;
}

function navigateToRecipe(id, options = {}) {
  if (!recipeById.has(id)) return;
  const { historyMode = 'push', scroll = false } = options;
  if (historyMode === 'push' && window.location.hash !== recipeHash(id)) {
    window.history.pushState({ recipeId: id }, '', recipeHash(id));
  } else if (historyMode === 'replace' && window.location.hash !== recipeHash(id)) {
    window.history.replaceState({ recipeId: id }, '', recipeHash(id));
  }
  selectRecipe(id);
  if (scroll && window.matchMedia('(max-width: 980px)').matches) {
    dom.recipeStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function selectRecipe(id) {
  const recipe = recipeById.get(id);
  if (!recipe) return;
  if (!state.servingsByRecipe[id]) state.servingsByRecipe[id] = recipe.baseServings;
  state.currentId = id;
  state.selectedIngredientId = null;
  renderRecipe(recipe);
  updateActiveRecipeItem();
  document.title = `${recipe.title} — Weeknight Kitchen`;
}

function renderRecipe(recipe) {
  const index = recipes.findIndex((item) => item.id === recipe.id);
  dom.recipeNumber.textContent = `Recipe No. ${String(index + 1).padStart(2, '0')}`;
  dom.recipeCuisine.textContent = recipe.cuisine;
  dom.recipeTitle.textContent = recipe.title;
  dom.recipeDescription.textContent = recipe.description;
  dom.recipeTime.textContent = `${recipe.minutes} min`;
  dom.vegetarianBadge.classList.toggle('is-visible', recipe.vegetarian);
  dom.recipeTip.textContent = recipe.tip;
  dom.noteIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(recipes.length).padStart(2, '0')}`;
  dom.cookRecipeName.textContent = recipe.title;

  const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.name).join(', ');
  dom.sceneCanvas.setAttribute('aria-label', `Interactive three-dimensional kitchen counter with ${ingredientNames} arranged on a wooden board.`);

  renderServings(recipe);
  renderCounterChips(recipe);
  renderSelection(recipe);
  renderCookPanel(recipe);
  renderCounterHint();

  if (kitchenScene && !kitchenScene.failed) {
    kitchenScene.setRecipe(recipe);
    kitchenScene.setSelected(null);
  }
}

function renderServings(recipe) {
  const servings = getCurrentServings(recipe);
  dom.servingCount.textContent = String(servings);
  dom.servingMinus.disabled = servings <= MIN_SERVINGS;
  dom.servingPlus.disabled = servings >= MAX_SERVINGS;
  dom.servingNote.textContent = servings === recipe.baseServings
    ? 'Quantities scale automatically'
    : `Scaled from ${pluralizeCount(recipe.baseServings, 'serving')}`;
}

function renderCounterHint() {
  if (!dom.counterHint) return;
  const label = dom.counterHint.querySelector('span');
  if (window.matchMedia('(max-width: 760px), (pointer: coarse)').matches) {
    if (label) label.textContent = 'Tap an ingredient';
    if (dom.sceneDragNote) dom.sceneDragNote.hidden = true;
  } else if (label) {
    label.textContent = 'Click an ingredient';
  }
}

function renderCounterChips(recipe) {
  const servings = getCurrentServings(recipe);
  dom.counterChips.replaceChildren();
  recipe.ingredients.forEach((ingredient) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'counter-chip';
    button.dataset.ingredientId = ingredient.id;
    button.style.setProperty('--chip-color', modelSwatchColors[ingredient.model] || recipe.accent);
    button.setAttribute('aria-pressed', String(ingredient.id === state.selectedIngredientId));
    button.setAttribute('aria-label', `${ingredient.name}, ${formatQuantity(ingredient, recipe, servings)}`);

    const dot = document.createElement('span');
    dot.className = 'chip-dot';
    dot.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.textContent = ingredient.name;

    const amount = document.createElement('span');
    amount.className = 'chip-amount';
    amount.textContent = formatQuantity(ingredient, recipe, servings);

    button.append(dot, name, amount);
    if (ingredient.id === state.selectedIngredientId) button.classList.add('is-active');
    dom.counterChips.append(button);
  });
}

function renderSelection(recipe) {
  const ingredient = recipe.ingredients.find((item) => item.id === state.selectedIngredientId);
  if (!ingredient) {
    dom.sceneSelection.classList.add('is-empty');
    dom.selectionSwatch.style.setProperty('--swatch', recipe.accentSoft);
    dom.selectionEyebrow.textContent = 'On the counter';
    dom.selectionName.textContent = 'Choose an ingredient';
    dom.selectionAmount.textContent = '';
    dom.selectionAmount.hidden = true;
    return;
  }
  dom.sceneSelection.classList.remove('is-empty');
  dom.selectionSwatch.style.setProperty('--swatch', modelSwatchColors[ingredient.model] || recipe.accent);
  dom.selectionEyebrow.textContent = ingredient.note || 'On the counter';
  dom.selectionName.textContent = ingredient.name;
  dom.selectionAmount.textContent = formatQuantity(ingredient, recipe, getCurrentServings(recipe));
  dom.selectionAmount.hidden = false;
}

function selectIngredient(ingredientId) {
  const recipe = getCurrentRecipe();
  if (!recipe.ingredients.some((ingredient) => ingredient.id === ingredientId)) return;
  state.selectedIngredientId = state.selectedIngredientId === ingredientId ? null : ingredientId;
  kitchenScene?.setSelected(state.selectedIngredientId);
  renderSelection(recipe);
  renderCounterChips(recipe);
}

function renderCookPanel(recipe) {
  const progress = getRecipeProgress(recipe);
  renderStep(recipe, progress);
  renderChecklist(recipe, progress);
}

function renderStep(recipe, progress) {
  const step = recipe.steps[progress.step];
  const stepCount = recipe.steps.length;
  dom.stepNumber.textContent = String(progress.step + 1).padStart(2, '0');
  dom.stepTitle.textContent = step.title;
  dom.stepBody.textContent = step.body;
  dom.stepTimer.textContent = step.timer || '';
  dom.stepFraction.textContent = `Step ${progress.step + 1} of ${stepCount}`;
  dom.stepProgressBar.style.width = `${((progress.step + 1) / stepCount) * 100}%`;
  dom.prevStepBtn.disabled = progress.step === 0;
  dom.nextStepBtn.disabled = progress.step === stepCount - 1;
  dom.nextStepBtn.setAttribute('aria-label', progress.step === stepCount - 1 ? 'Final step' : 'Next step');

  dom.stepDots.replaceChildren();
  recipe.steps.forEach((recipeStep, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'step-dot';
    if (index === progress.step) dot.classList.add('is-active');
    if (index < progress.step) dot.classList.add('is-complete');
    dot.dataset.step = String(index);
    dot.setAttribute('aria-label', `Go to step ${index + 1}: ${recipeStep.title}`);
    dot.setAttribute('aria-current', index === progress.step ? 'step' : 'false');
    dom.stepDots.append(dot);
  });
}

function renderChecklist(recipe, progress) {
  const servings = getCurrentServings(recipe);
  dom.ingredientChecklist.replaceChildren();
  recipe.ingredients.forEach((ingredient) => {
    const checked = progress.checked.has(ingredient.id);
    const label = document.createElement('label');
    label.className = `check-item${checked ? ' is-checked' : ''}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.dataset.ingredientId = ingredient.id;
    input.setAttribute('aria-label', `Check off ${ingredient.name}`);

    const box = document.createElement('span');
    box.className = 'check-box';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<svg viewBox="0 0 12 12"><path d="m2.2 6.1 2.3 2.3 5.3-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const copy = document.createElement('span');
    copy.className = 'check-copy';
    const name = document.createElement('span');
    name.className = 'check-name';
    name.textContent = ingredient.name;
    copy.append(name);
    if (ingredient.note) {
      const note = document.createElement('span');
      note.className = 'check-note';
      note.textContent = ingredient.note;
      copy.append(note);
    }

    const amount = document.createElement('span');
    amount.className = 'check-amount';
    amount.textContent = formatQuantity(ingredient, recipe, servings);
    amount.dataset.amountFor = ingredient.id;

    label.append(input, box, copy, amount);
    dom.ingredientChecklist.append(label);
  });
  updateCheckedCount(recipe, progress);
}

function updateCheckedCount(recipe, progress = getRecipeProgress(recipe)) {
  dom.checkedCount.textContent = `${progress.checked.size} / ${recipe.ingredients.length} checked`;
}

function updateAmountsOnly() {
  const recipe = getCurrentRecipe();
  const servings = getCurrentServings(recipe);
  dom.ingredientChecklist.querySelectorAll('[data-amount-for]').forEach((node) => {
    const ingredient = recipe.ingredients.find((item) => item.id === node.dataset.amountFor);
    if (ingredient) node.textContent = formatQuantity(ingredient, recipe, servings);
  });
  renderCounterChips(recipe);
  renderSelection(recipe);
}

function changeServings(delta) {
  const recipe = getCurrentRecipe();
  const next = Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, getCurrentServings(recipe) + delta));
  if (next === getCurrentServings(recipe)) return;
  state.servingsByRecipe[recipe.id] = next;
  renderServings(recipe);
  updateAmountsOnly();
}

function changeStep(nextStep) {
  const recipe = getCurrentRecipe();
  const progress = getRecipeProgress(recipe);
  const clamped = Math.max(0, Math.min(recipe.steps.length - 1, nextStep));
  progress.step = clamped;
  saveRecipeProgress(recipe, progress);
  renderStep(recipe, progress);
}

function toggleIngredientCheckbox(input) {
  const recipe = getCurrentRecipe();
  const progress = getRecipeProgress(recipe);
  if (input.checked) {
    progress.checked.add(input.dataset.ingredientId);
  } else {
    progress.checked.delete(input.dataset.ingredientId);
  }
  saveRecipeProgress(recipe, progress);
  const item = input.closest('.check-item');
  item?.classList.toggle('is-checked', input.checked);
  updateCheckedCount(recipe, progress);
}

function resetCurrentProgress() {
  const recipe = getCurrentRecipe();
  delete progressByRecipe[recipe.id];
  writeProgress();
  renderCookPanel(recipe);
  showToast(`Cooking progress reset for ${recipe.title}.`);
}

function renderLibrary() {
  const visible = filteredRecipes();
  dom.recipeList.replaceChildren();
  dom.resultCount.textContent = String(visible.length).padStart(2, '0');
  dom.libraryEmpty.hidden = visible.length !== 0;

  visible.forEach((recipe) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recipe-item';
    button.dataset.recipeId = recipe.id;
    button.style.setProperty('--thumb', recipe.accent);
    button.style.setProperty('--thumb-2', recipe.accentSoft);
    if (recipe.id === state.currentId) button.classList.add('is-active');
    button.setAttribute('aria-pressed', String(recipe.id === state.currentId));

    const thumb = document.createElement('span');
    thumb.className = 'recipe-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    const herb = document.createElement('span');
    herb.className = 'thumb-herb';
    thumb.append(herb);

    const copy = document.createElement('span');
    copy.className = 'recipe-item-copy';
    const title = document.createElement('span');
    title.className = 'recipe-item-title';
    title.textContent = recipe.title;
    const meta = document.createElement('span');
    meta.className = 'recipe-item-meta';
    meta.textContent = `${recipe.minutes} min · ${recipe.vegetarian ? 'Vegetarian' : 'Omnivore'}`;
    copy.append(title, meta);

    const dot = document.createElement('span');
    dot.className = 'recipe-item-dot';
    dot.setAttribute('aria-hidden', 'true');

    button.append(thumb, copy, dot);
    dom.recipeList.append(button);
  });

  const noResults = visible.length === 0;
  dom.appShell.classList.toggle('is-empty', noResults);
  dom.recipeStage.hidden = noResults;
  dom.cookPanel.hidden = noResults;
  dom.emptyResults.hidden = !noResults;

  const hasFilters = Boolean(state.query.trim() || state.vegetarianOnly || state.maxMinutes);
  dom.resetFilters.hidden = !hasFilters;
}

function updateActiveRecipeItem() {
  dom.recipeList.querySelectorAll('.recipe-item').forEach((button) => {
    const isActive = button.dataset.recipeId === state.currentId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function resetFilters() {
  state.query = '';
  state.vegetarianOnly = false;
  state.maxMinutes = 0;
  dom.searchInput.value = '';
  dom.vegFilter.setAttribute('aria-checked', 'false');
  dom.timeFilters.querySelectorAll('.time-chip').forEach((button) => {
    const isActive = button.dataset.time === '0';
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  renderLibrary();
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('is-visible'), 2600);
}

function initializeEvents() {
  dom.recipeList.addEventListener('click', (event) => {
    const button = event.target.closest('.recipe-item');
    if (!button) return;
    navigateToRecipe(button.dataset.recipeId, { scroll: false });
  });

  dom.searchInput.addEventListener('input', () => {
    state.query = dom.searchInput.value;
    renderLibrary();
  });

  dom.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dom.searchInput.value = '';
      state.query = '';
      renderLibrary();
      dom.searchInput.blur();
    }
  });

  dom.vegFilter.addEventListener('click', () => {
    state.vegetarianOnly = !state.vegetarianOnly;
    dom.vegFilter.setAttribute('aria-checked', String(state.vegetarianOnly));
    renderLibrary();
  });

  dom.timeFilters.addEventListener('click', (event) => {
    const button = event.target.closest('.time-chip');
    if (!button) return;
    state.maxMinutes = Number(button.dataset.time) || 0;
    dom.timeFilters.querySelectorAll('.time-chip').forEach((chip) => {
      const isActive = chip === button;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
    renderLibrary();
  });

  dom.resetFilters.addEventListener('click', resetFilters);
  dom.libraryEmpty.querySelector('[data-reset-filters]').addEventListener('click', resetFilters);
  dom.emptyResetBtn.addEventListener('click', resetFilters);

  dom.servingMinus.addEventListener('click', () => changeServings(-1));
  dom.servingPlus.addEventListener('click', () => changeServings(1));

  dom.counterChips.addEventListener('click', (event) => {
    const chip = event.target.closest('.counter-chip');
    if (chip) selectIngredient(chip.dataset.ingredientId);
  });

  dom.prevStepBtn.addEventListener('click', () => {
    const recipe = getCurrentRecipe();
    changeStep(getRecipeProgress(recipe).step - 1);
  });

  dom.nextStepBtn.addEventListener('click', () => {
    const recipe = getCurrentRecipe();
    changeStep(getRecipeProgress(recipe).step + 1);
  });

  dom.stepDots.addEventListener('click', (event) => {
    const dot = event.target.closest('.step-dot');
    if (dot) changeStep(Number(dot.dataset.step));
  });

  dom.ingredientChecklist.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-ingredient-id]');
    if (input) toggleIngredientCheckbox(input);
  });

  dom.resetProgressBtn.addEventListener('click', resetCurrentProgress);

  dom.surpriseBtn.addEventListener('click', () => {
    const options = recipes.filter((recipe) => recipe.id !== state.currentId);
    const recipe = options[Math.floor(Math.random() * options.length)] || recipes[0];
    resetFilters();
    navigateToRecipe(recipe.id, { scroll: false });
    showToast(`Tonight’s pick: ${recipe.title}`);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) {
      event.preventDefault();
      dom.searchInput.focus();
    }
  });

  const routeHandler = () => {
    const id = routeFromHash();
    if (id) {
      if (id !== state.currentId) selectRecipe(id);
    } else {
      const fallback = state.currentId || recipes[0].id;
      window.history.replaceState({ recipeId: fallback }, '', recipeHash(fallback));
      if (fallback !== state.currentId) selectRecipe(fallback);
    }
  };

  window.addEventListener('hashchange', routeHandler);
  window.addEventListener('popstate', routeHandler);
  window.addEventListener('resize', renderCounterHint);
}

function initialize() {
  kitchenScene = new KitchenScene(dom.sceneCanvas, selectIngredient);
  if (kitchenScene.failed) {
    dom.sceneCanvas.innerHTML = '<div class="scene-fallback"><span>3D counter unavailable</span><small>You can still choose ingredients below.</small></div>';
  }

  initializeEvents();

  const initialId = routeFromHash() || recipes[0].id;
  if (window.location.hash !== recipeHash(initialId)) {
    window.history.replaceState({ recipeId: initialId }, '', recipeHash(initialId));
  }
  selectRecipe(initialId);
  renderLibrary();
}

initialize();
