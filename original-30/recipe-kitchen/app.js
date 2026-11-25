import { recipes, recipeById } from './recipes.js';
import { KitchenCounter } from './scene.js';

const DEFAULT_RECIPE_ID = 'lemon-herb-chicken';
const PROGRESS_KEY = 'weeknight-kitchen:cook-progress:v1';
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  search: $('#recipe-search'),
  searchClear: $('#search-clear'),
  vegFilter: $('#veg-filter'),
  prepFilter: $('#prep-filter'),
  clearFilters: $('#clear-filters'),
  emptyReset: $('#empty-reset'),
  resultSummary: $('#result-summary'),
  mobileCount: $('#mobile-count'),
  recipeList: $('#recipe-list'),
  mainEmpty: $('#main-empty'),
  recipeContent: $('#recipe-content'),
  cookView: $('#cook-view'),
  cookClose: $('#cook-close'),
  cookPrev: $('#cook-prev'),
  cookNext: $('#cook-next'),
  cookNextLabel: $('#cook-next span'),
  cookReset: $('#cook-reset'),
  cookStepCopy: $('#cook-step-copy'),
  cookStepTitle: $('#cook-step-title'),
  cookStepBody: $('#cook-step-body'),
  cookStepCount: $('#cook-step-count'),
  cookProgressLabel: $('#cook-progress-label'),
  cookProgressBar: $('#cook-progress-bar'),
  cookRecipeName: $('#cook-recipe-name'),
  cookIngredients: $('#cook-ingredient-list'),
  cookCheckedSummary: $('#cook-checked-summary'),
  cookServingsNote: $('#cook-servings-note'),
  cookDots: $('#cook-dots'),
  cookTip: $('#cook-tip'),
  cookTipText: $('#cook-tip p'),
  browseToggle: $('#browse-toggle'),
  browserPanel: $('#browser-panel'),
  drawerClose: $('#drawer-close'),
  drawerBackdrop: $('#drawer-backdrop'),
  randomButton: $('#random-button'),
  recipeNumber: $('#recipe-number'),
  recipeTitle: $('#recipe-title'),
  recipeCategory: $('#recipe-category'),
  recipeKicker: $('#recipe-kicker'),
  recipeDescription: $('#recipe-description'),
  recipeFacts: $('#recipe-facts'),
  ingredientList: $('#ingredient-list'),
  stepList: $('#step-list'),
  recipeTip: $('#recipe-tip'),
  servingsMinus: $('#servings-minus'),
  servingsPlus: $('#servings-plus'),
  servingsValue: $('#servings-value'),
  servingsLabel: $('#servings-label'),
  scaledNote: $('#scaled-note'),
  stageCount: $('#stage-count'),
  stageIngredients: $('#stage-ingredients'),
  callout: $('#ingredient-callout'),
  calloutOrb: $('#callout-orb'),
  calloutName: $('#callout-name'),
  calloutQty: $('#callout-qty'),
  cookButton: $('#cook-button'),
  methodCookButton: $('#method-cook-button'),
  sceneCanvas: $('#scene-canvas'),
  sceneWrap: $('#scene-wrap'),
  sceneFallback: $('#scene-fallback'),
  toast: $('#toast')
};

const state = {
  selectedId: null,
  selectedIngredientId: null,
  servings: new Map(recipes.map((recipe) => [recipe.id, recipe.baseServings])),
  query: '',
  vegetarianOnly: false,
  maxPrep: 'any',
  scene: null,
  sceneReady: false,
  cookOpen: false,
  cook: null,
  drawerOpen: false,
  lastFocus: null,
  toastTimer: null,
  mobileQuery: window.matchMedia('(max-width: 780px)')
};

const fractionParts = [
  { value: 0, label: '', spoken: '' },
  { value: 1 / 8, label: '⅛', spoken: 'one eighth' },
  { value: 1 / 4, label: '¼', spoken: 'one quarter' },
  { value: 1 / 3, label: '⅓', spoken: 'one third' },
  { value: 3 / 8, label: '⅜', spoken: 'three eighths' },
  { value: 1 / 2, label: '½', spoken: 'one half' },
  { value: 5 / 8, label: '⅝', spoken: 'five eighths' },
  { value: 2 / 3, label: '⅔', spoken: 'two thirds' },
  { value: 3 / 4, label: '¾', spoken: 'three quarters' },
  { value: 7 / 8, label: '⅞', spoken: 'seven eighths' },
  { value: 1, label: '', spoken: '' }
];

const unitWords = {
  '': { singular: '', plural: '', spoken: '' },
  tsp: { singular: 'tsp', plural: 'tsp', spoken: 'teaspoon' },
  tbsp: { singular: 'tbsp', plural: 'tbsp', spoken: 'tablespoon' },
  cup: { singular: 'cup', plural: 'cups', spoken: 'cup' },
  lb: { singular: 'lb', plural: 'lb', spoken: 'pound' },
  oz: { singular: 'oz', plural: 'oz', spoken: 'ounce' },
  g: { singular: 'g', plural: 'g', spoken: 'gram' },
  ml: { singular: 'ml', plural: 'ml', spoken: 'milliliter' },
  clove: { singular: 'clove', plural: 'cloves', spoken: 'clove' },
  sprig: { singular: 'sprig', plural: 'sprigs', spoken: 'sprig' },
  bunch: { singular: 'bunch', plural: 'bunches', spoken: 'bunch' },
  can: { singular: 'can', plural: 'cans', spoken: 'can' },
  stalk: { singular: 'stalk', plural: 'stalks', spoken: 'stalk' },
  ear: { singular: 'ear', plural: 'ears', spoken: 'ear' },
  slice: { singular: 'slice', plural: 'slices', spoken: 'slice' },
  pinch: { singular: 'pinch', plural: 'pinches', spoken: 'pinch' }
};

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function scaledIngredients(recipe, servings = state.servings.get(recipe.id) ?? recipe.baseServings) {
  const ratio = servings / recipe.baseServings;
  return recipe.ingredients.map((ingredient) => {
    const quantity = formatQuantity(ingredient.amount * ratio, ingredient.unit);
    return {
      ...ingredient,
      scaledAmount: ingredient.amount * ratio,
      quantity
    };
  });
}

function formatQuantity(rawValue, unit) {
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  if (unit === 'g' || unit === 'ml') {
    const rounded = value < 10 ? Math.round(value * 2) / 2 : value < 100 ? Math.round(value / 5) * 5 : Math.round(value / 10) * 10;
    const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.0', '');
    return {
      number: display,
      unit: getUnitLabel(unit, rounded),
      combined: `${display} ${getUnitLabel(unit, rounded)}`.trim()
    };
  }

  const snapped = snapToCommonFraction(value);
  const whole = Math.floor(snapped + 1e-8);
  const fraction = snapped - whole;
  let closest = fractionParts[0];
  let closestDistance = Math.abs(fraction - closest.value);
  fractionParts.slice(1).forEach((part) => {
    const distance = Math.abs(fraction - part.value);
    if (distance < closestDistance) {
      closest = part;
      closestDistance = distance;
    }
  });

  let finalWhole = whole;
  let fractionLabel = closest.label;
  if (closest.value === 1) {
    finalWhole += 1;
    fractionLabel = '';
  }

  const number = `${finalWhole > 0 ? finalWhole : ''}${fractionLabel}` || '0';
  const unitLabel = getUnitLabel(unit, snapped);
  return {
    number,
    unit: unitLabel,
    combined: `${number}${unitLabel ? ` ${unitLabel}` : ''}`
  };
}

function snapToCommonFraction(value) {
  if (value <= 0) return 0;
  const whole = Math.floor(value);
  const fraction = value - whole;
  if (fraction < 0.045) return whole;
  if (fraction > 0.955) return whole + 1;
  let closest = fractionParts[1];
  let distance = Math.abs(fraction - closest.value);
  fractionParts.slice(1, -1).forEach((part) => {
    const candidateDistance = Math.abs(fraction - part.value);
    if (candidateDistance < distance) {
      closest = part;
      distance = candidateDistance;
    }
  });
  return Math.max(1 / 8, whole + closest.value);
}

function getUnitLabel(unit, value) {
  const words = unitWords[unit] ?? unitWords[''];
  const isSingular = Math.abs(value - 1) < 0.001;
  return isSingular ? words.singular : words.plural;
}

function getSpokenUnit(unit, value) {
  const words = unitWords[unit] ?? unitWords[''];
  if (!words.spoken) return '';
  return Math.abs(value - 1) < 0.001 ? words.spoken : `${words.spoken}s`;
}

function loadProgressStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeProgressStore(store) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch (error) {
    // Cooking still works in the current tab when storage is unavailable.
  }
}

function getRecipeProgress(recipe) {
  const store = loadProgressStore();
  const entry = store[recipe.id];
  const validIds = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
  const checked = Array.isArray(entry?.checked) ? entry.checked.filter((id) => validIds.has(id)) : [];
  const step = Number.isInteger(entry?.step) ? Math.max(0, Math.min(entry.step, recipe.steps.length - 1)) : 0;
  return { step, checked };
}

function saveRecipeProgress(recipeId, step, checked) {
  const store = loadProgressStore();
  store[recipeId] = { step, checked };
  writeProgressStore(store);
}

function resetRecipeProgress(recipeId) {
  const store = loadProgressStore();
  delete store[recipeId];
  writeProgressStore(store);
}

function getActiveRecipe() {
  return recipeById.get(state.selectedId) ?? recipes[0];
}

function getCurrentServings(recipe) {
  return state.servings.get(recipe.id) ?? recipe.baseServings;
}

function parseRoute() {
  const hash = window.location.hash || '';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'recipe' || !recipeById.has(parts[1])) return null;
  return {
    recipeId: parts[1],
    cook: parts[2] === 'cook'
  };
}

function navigateTo(hash, { replace = false } = {}) {
  if (window.location.hash === hash) {
    applyRoute();
    return;
  }
  if (replace) {
    window.history.replaceState(null, '', hash);
    applyRoute();
  } else {
    window.location.hash = hash;
  }
}

function applyRoute() {
  let route = parseRoute();
  if (!route) {
    route = { recipeId: DEFAULT_RECIPE_ID, cook: false };
    window.history.replaceState(null, '', `#/recipe/${route.recipeId}`);
  }

  const recipe = recipeById.get(route.recipeId);
  const recipeChanged = state.selectedId !== route.recipeId;

  if (recipeChanged) {
    state.selectedId = route.recipeId;
    state.selectedIngredientId = recipe.ingredients[0]?.id ?? null;
    if (!state.servings.has(recipe.id)) state.servings.set(recipe.id, recipe.baseServings);
  }

  renderRecipe(recipe);
  updateActiveRecipeCards();

  if (route.cook) {
    openCookView();
  } else if (state.cookOpen) {
    closeCookView({ restoreFocus: true, updateRoute: false });
  }
}

function filteredRecipes() {
  const query = normalizeText(state.query);
  const prepLimit = state.maxPrep === 'any' ? null : Number(state.maxPrep);
  return recipes.filter((recipe) => {
    if (state.vegetarianOnly && !recipe.vegetarian) return false;
    if (prepLimit !== null && recipe.prep > prepLimit) return false;
    if (!query) return true;
    const searchable = [
      recipe.title,
      recipe.kicker,
      recipe.category,
      ...recipe.ingredients.map((ingredient) => ingredient.name)
    ]
      .map(normalizeText)
      .join(' ');
    return searchable.includes(query);
  });
}

function refreshFilters({ redirect = true } = {}) {
  const results = filteredRecipes();
  renderRecipeList(results);
  elements.resultSummary.textContent = `${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}`;
  elements.mobileCount.textContent = String(results.length);
  elements.clearFilters.hidden = !state.query && !state.vegetarianOnly && state.maxPrep === 'any';
  elements.searchClear.hidden = !state.query;
  elements.vegFilter.setAttribute('aria-pressed', String(state.vegetarianOnly));
  elements.prepFilter.value = state.maxPrep;

  const empty = results.length === 0;
  elements.mainEmpty.hidden = !empty;
  elements.recipeContent.hidden = empty;

  if (redirect && !empty && !results.some((recipe) => recipe.id === state.selectedId)) {
    navigateTo(`#/recipe/${results[0].id}`, { replace: true });
  }
}

function renderRecipeList(results) {
  elements.recipeList.innerHTML = results
    .map((recipe) => {
      const selected = recipe.id === state.selectedId;
      return `
        <button class="recipe-card" type="button" data-recipe-id="${recipe.id}" aria-current="${selected}" style="--accent: ${recipe.accent}">
          <span class="recipe-card-accent" aria-hidden="true"></span>
          <span class="recipe-card-copy">
            <span class="recipe-card-meta">${escapeHtml(recipe.category)} · ${recipe.prep} min prep ${recipe.vegetarian ? '<span class="veg-dot" aria-label="Vegetarian"></span>' : ''}</span>
            <strong class="recipe-card-title">${escapeHtml(recipe.title)}</strong>
            <span class="recipe-card-subtitle">${escapeHtml(recipe.kicker)}</span>
          </span>
          <span class="recipe-card-arrow" aria-hidden="true">
            <svg viewBox="0 0 12 12" fill="none"><path d="M3 9 9 3M4 3h5v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
        </button>
      `;
    })
    .join('');
}

function updateActiveRecipeCards() {
  $$('.recipe-card', elements.recipeList).forEach((card) => {
    card.setAttribute('aria-current', String(card.dataset.recipeId === state.selectedId));
  });
}

const factIcons = {
  clock: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-width="1.2"/><path d="M8 5.2v3l2 1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  flame: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8.5 2.2c.2 2.1-1.6 2.9-1.6 4.6 0 .8.5 1.3 1.1 1.3.9 0 1.4-.9 1.3-1.9 1.5 1.1 2.3 2.5 2.2 4 0 2-1.6 3.5-4.5 3.5s-4.4-1.5-4.3-3.7c0-1.5.8-2.7 2.4-3.7-.1 1 .4 1.6 1 1.6.8 0 1.2-.8 1.3-1.8.1-.8.2-1.9 1.1-3.9Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  servings: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="5" r="2.3" stroke="currentColor" stroke-width="1.2"/><path d="M3.5 13c.2-2.4 1.9-4 4.5-4s4.3 1.6 4.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
};

function renderFacts(recipe, servings) {
  elements.recipeFacts.innerHTML = `
    <span class="fact-pill">${factIcons.clock}${recipe.prep} min prep</span>
    <span class="fact-pill">${factIcons.flame}${recipe.cook} min cook</span>
    <span class="fact-pill">${factIcons.servings}Serves ${servings}</span>
    ${recipe.vegetarian ? '<span class="fact-pill veg-fact">Vegetarian</span>' : ''}
  `;
}

function renderRecipe(recipe) {
  const servings = getCurrentServings(recipe);
  const scaled = scaledIngredients(recipe, servings);
  const recipeIndex = recipes.findIndex((candidate) => candidate.id === recipe.id) + 1;
  const selectedIngredient = scaled.find((ingredient) => ingredient.id === state.selectedIngredientId) ?? scaled[0];

  if (selectedIngredient) state.selectedIngredientId = selectedIngredient.id;

  elements.recipeNumber.textContent = String(recipeIndex).padStart(2, '0');
  elements.recipeTitle.textContent = recipe.title;
  elements.recipeCategory.textContent = recipe.category;
  elements.recipeKicker.textContent = recipe.kicker;
  elements.recipeDescription.textContent = recipe.description;
  elements.servingsValue.textContent = String(servings);
  elements.servingsLabel.textContent = servings === 1 ? 'serving' : 'servings';
  elements.servingsMinus.disabled = servings <= MIN_SERVINGS;
  elements.servingsPlus.disabled = servings >= MAX_SERVINGS;
  elements.scaledNote.textContent =
    servings === recipe.baseServings
      ? `Quantities shown for ${servings} ${servings === 1 ? 'serving' : 'servings'}.`
      : `Scaled from the ${recipe.baseServings}-serving original. Units stay in the original measure.`;
  renderFacts(recipe, servings);
  renderIngredientList(scaled);
  renderStepList(recipe);
  renderStageIngredients(scaled);
  updateIngredientSelectionUI(scaled);

  elements.recipeTip.textContent = recipe.tip;
  elements.sceneCanvas.setAttribute('aria-label', `Stylized 3D models of the ingredients for ${recipe.title} on a kitchen counter`);
  document.title = `${recipe.title} | Weeknight Kitchen`;

  if (state.scene && state.sceneReady) {
    state.scene.setRecipe(recipe);
    state.scene.setSelectedIngredient(state.selectedIngredientId);
  }
}

function renderIngredientList(ingredients) {
  elements.ingredientList.innerHTML = ingredients
    .map((ingredient) => {
      const spokenAmount = ingredient.quantity.combined;
      return `
        <div class="ingredient-row" aria-label="${escapeHtml(`${spokenAmount} ${ingredient.name}`)}">
          <span class="ingredient-qty">${escapeHtml(ingredient.quantity.number)}${ingredient.quantity.unit ? `<small>${escapeHtml(ingredient.quantity.unit)}</small>` : ''}</span>
          <span class="ingredient-name">${escapeHtml(ingredient.name)}</span>
        </div>
      `;
    })
    .join('');
}

function renderStepList(recipe) {
  elements.stepList.innerHTML = recipe.steps
    .map(
      (step, index) => `
        <li class="step-item">
          <span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="step-copy">
            <h4>${escapeHtml(step.title)}</h4>
            <p>${escapeHtml(step.body)}</p>
          </div>
        </li>
      `
    )
    .join('');
}

function renderStageIngredients(ingredients) {
  elements.stageCount.textContent = `${ingredients.length} ${ingredients.length === 1 ? 'item' : 'items'}`;
  elements.stageIngredients.innerHTML = ingredients
    .map(
      (ingredient) => `
        <button class="stage-chip" type="button" data-ingredient-id="${ingredient.id}" aria-pressed="${ingredient.id === state.selectedIngredientId}" title="${escapeHtml(`${ingredient.quantity.combined} ${ingredient.name}`)}" style="--chip-color: ${ingredient.color}">
          <span class="stage-chip-dot" aria-hidden="true"></span>
          ${escapeHtml(ingredient.name)}
        </button>
      `
    )
    .join('');
}

function updateIngredientSelectionUI(ingredients = null) {
  const recipe = getActiveRecipe();
  const scaled = ingredients ?? scaledIngredients(recipe);
  const selected = scaled.find((ingredient) => ingredient.id === state.selectedIngredientId) ?? scaled[0];
  if (!selected) return;
  if (selected.id !== state.selectedIngredientId) {
    state.selectedIngredientId = selected.id;
  }
  elements.calloutName.textContent = selected.name;
  elements.calloutQty.textContent = selected.quantity.combined;
  elements.calloutOrb.style.background = selected.color;
  $$('.stage-chip', elements.stageIngredients).forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.ingredientId === selected.id));
  });
}

function selectIngredient(ingredientId, { fromScene = false } = {}) {
  const recipe = getActiveRecipe();
  if (!recipe.ingredients.some((ingredient) => ingredient.id === ingredientId)) return;
  state.selectedIngredientId = ingredientId;
  if (state.scene && state.sceneReady && !fromScene) {
    state.scene.setSelectedIngredient(ingredientId);
  }
  updateIngredientSelectionUI();
}

function changeServings(delta) {
  const recipe = getActiveRecipe();
  const current = getCurrentServings(recipe);
  const next = Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, current + delta));
  if (next === current) return;
  state.servings.set(recipe.id, next);
  renderRecipe(recipe);
  showToast(`Quantities updated for ${next} ${next === 1 ? 'serving' : 'servings'}.`);
}

function resetFilters() {
  state.query = '';
  state.vegetarianOnly = false;
  state.maxPrep = 'any';
  elements.search.value = '';
  elements.prepFilter.value = 'any';
  refreshFilters();
}

function openDrawer() {
  if (!state.mobileQuery.matches) return;
  state.drawerOpen = true;
  document.body.classList.add('library-open');
  elements.browseToggle.setAttribute('aria-expanded', 'true');
  elements.browserPanel.inert = false;
  window.setTimeout(() => elements.search.focus({ preventScroll: true }), 180);
}

function closeDrawer({ restoreFocus = true } = {}) {
  if (!state.drawerOpen && !document.body.classList.contains('library-open')) return;
  state.drawerOpen = false;
  document.body.classList.remove('library-open');
  elements.browseToggle.setAttribute('aria-expanded', 'false');
  elements.browserPanel.inert = state.mobileQuery.matches;
  if (restoreFocus && state.mobileQuery.matches) elements.browseToggle.focus({ preventScroll: true });
}

function syncDrawerAccessibility() {
  if (state.mobileQuery.matches) {
    elements.browserPanel.inert = !state.drawerOpen;
  } else {
    state.drawerOpen = false;
    document.body.classList.remove('library-open');
    elements.browserPanel.inert = false;
    elements.browseToggle.setAttribute('aria-expanded', 'false');
  }
}

function openCookView() {
  const recipe = getActiveRecipe();
  if (!state.cookOpen) state.lastFocus = document.activeElement;
  const progress = getRecipeProgress(recipe);
  state.cook = {
    recipeId: recipe.id,
    step: progress.step,
    checked: new Set(progress.checked)
  };
  state.cookOpen = true;
  elements.cookView.hidden = false;
  document.body.classList.add('cook-open');
  renderCookView();
  window.setTimeout(() => {
    const stage = $('.cook-stage', elements.cookView);
    if (stage) {
      stage.tabIndex = -1;
      stage.focus({ preventScroll: true });
    }
  }, 30);
}

function closeCookView({ restoreFocus = true, updateRoute = true } = {}) {
  const recipe = getActiveRecipe();
  if (updateRoute) {
    navigateTo(`#/recipe/${recipe.id}`, { replace: true });
    return;
  }
  elements.cookView.hidden = true;
  document.body.classList.remove('cook-open');
  state.cookOpen = false;
  state.cook = null;
  if (restoreFocus && state.lastFocus && state.lastFocus.isConnected) {
    state.lastFocus.focus({ preventScroll: true });
  }
}

function renderCookView({ animateStep = false } = {}) {
  if (!state.cook) return;
  const recipe = recipeById.get(state.cook.recipeId);
  if (!recipe) return;
  const stepCount = recipe.steps.length;
  const stepIndex = Math.max(0, Math.min(state.cook.step, stepCount - 1));
  state.cook.step = stepIndex;
  const step = recipe.steps[stepIndex];
  const servings = getCurrentServings(recipe);
  const ingredients = scaledIngredients(recipe, servings);

  elements.cookRecipeName.textContent = recipe.title;
  elements.cookStepTitle.textContent = step.title;
  elements.cookStepBody.textContent = step.body;
  elements.cookStepCount.textContent = `${String(stepIndex + 1).padStart(2, '0')} / ${String(stepCount).padStart(2, '0')}`;
  elements.cookProgressLabel.textContent = `Step ${stepIndex + 1} of ${stepCount}`;
  elements.cookProgressBar.style.width = `${((stepIndex + 1) / stepCount) * 100}%`;
  elements.cookPrev.disabled = stepIndex === 0;
  elements.cookNextLabel.textContent = stepIndex === stepCount - 1 ? 'Finish cooking' : 'Next step';
  elements.cookServingsNote.textContent = `Scaled for ${servings} ${servings === 1 ? 'serving' : 'servings'} · check items off as you go.`;

  elements.cookTip.hidden = stepIndex !== stepCount - 1 || !recipe.tip;
  elements.cookTipText.textContent = recipe.tip || '';

  elements.cookDots.innerHTML = recipe.steps
    .map((_, index) => `<span class="cook-dot ${index < stepIndex ? 'is-past' : ''} ${index === stepIndex ? 'is-current' : ''}"></span>`)
    .join('');

  elements.cookIngredients.innerHTML = ingredients
    .map(
      (ingredient) => `
        <label class="cook-check">
          <input type="checkbox" data-check-id="${ingredient.id}" ${state.cook.checked.has(ingredient.id) ? 'checked' : ''} />
          <span class="check-box" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="m2.2 6.3 2.4 2.4 5.2-5.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="cook-check-name">${escapeHtml(ingredient.name)}</span>
          <span class="cook-check-qty">${escapeHtml(ingredient.quantity.combined)}</span>
        </label>
      `
    )
    .join('');

  updateCookCheckedSummary(ingredients.length);

  if (animateStep) {
    elements.cookStepCopy.classList.remove('is-changing');
    void elements.cookStepCopy.offsetWidth;
    elements.cookStepCopy.classList.add('is-changing');
  }
}

function updateCookCheckedSummary(total) {
  if (!state.cook) return;
  const checked = [...state.cook.checked].filter((id) => {
    const recipe = recipeById.get(state.cook.recipeId);
    return recipe.ingredients.some((ingredient) => ingredient.id === id);
  }).length;
  elements.cookCheckedSummary.textContent = `${checked} of ${total} checked`;
}

function setCookStep(step) {
  if (!state.cook) return;
  const recipe = recipeById.get(state.cook.recipeId);
  const nextStep = Math.max(0, Math.min(step, recipe.steps.length - 1));
  if (nextStep === state.cook.step) return;
  state.cook.step = nextStep;
  saveRecipeProgress(state.cook.recipeId, nextStep, [...state.cook.checked]);
  renderCookView({ animateStep: true });
}

function handleCookNext() {
  if (!state.cook) return;
  const recipe = recipeById.get(state.cook.recipeId);
  if (state.cook.step >= recipe.steps.length - 1) {
    closeCookView();
    showToast('Cooking complete. Your progress is saved.');
    return;
  }
  setCookStep(state.cook.step + 1);
}

function handleCookPrevious() {
  if (!state.cook) return;
  setCookStep(state.cook.step - 1);
}

function resetCurrentCookRecipe() {
  if (!state.cook) return;
  const recipe = recipeById.get(state.cook.recipeId);
  resetRecipeProgress(state.cook.recipeId);
  state.cook.step = 0;
  state.cook.checked.clear();
  renderCookView({ animateStep: true });
  showToast(`Progress reset for ${recipe.title}.`);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2600);
}

function chooseRandomRecipe() {
  const pool = filteredRecipes().length ? filteredRecipes() : recipes;
  const candidates = pool.filter((recipe) => recipe.id !== state.selectedId);
  const recipe = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
  if (!recipe) return;
  closeDrawer({ restoreFocus: false });
  navigateTo(`#/recipe/${recipe.id}`);
}

function initializeScene() {
  const recipe = getActiveRecipe();
  try {
    state.scene = new KitchenCounter(elements.sceneCanvas, elements.sceneWrap, (ingredientId) => {
      selectIngredient(ingredientId, { fromScene: true });
    });
    state.scene.setRecipe(recipe);
    state.scene.setSelectedIngredient(state.selectedIngredientId);
    state.sceneReady = true;
  } catch (error) {
    console.error('Unable to initialize the 3D kitchen counter.', error);
    state.sceneReady = false;
    elements.sceneCanvas.hidden = true;
    elements.sceneFallback.hidden = false;
  }
}

function bindEvents() {
  elements.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    refreshFilters();
  });

  elements.searchClear.addEventListener('click', () => {
    state.query = '';
    elements.search.value = '';
    refreshFilters();
    elements.search.focus();
  });

  elements.vegFilter.addEventListener('click', () => {
    state.vegetarianOnly = !state.vegetarianOnly;
    refreshFilters();
  });

  elements.prepFilter.addEventListener('change', (event) => {
    state.maxPrep = event.target.value;
    refreshFilters();
  });

  elements.clearFilters.addEventListener('click', resetFilters);
  elements.emptyReset.addEventListener('click', resetFilters);

  elements.recipeList.addEventListener('click', (event) => {
    const card = event.target.closest('.recipe-card');
    if (!card) return;
    closeDrawer({ restoreFocus: false });
    navigateTo(`#/recipe/${card.dataset.recipeId}`);
  });

  elements.stageIngredients.addEventListener('click', (event) => {
    const chip = event.target.closest('.stage-chip');
    if (!chip) return;
    selectIngredient(chip.dataset.ingredientId);
  });

  elements.servingsMinus.addEventListener('click', () => changeServings(-1));
  elements.servingsPlus.addEventListener('click', () => changeServings(1));
  elements.cookButton.addEventListener('click', () => navigateTo(`#/recipe/${state.selectedId}/cook`));
  elements.methodCookButton.addEventListener('click', () => navigateTo(`#/recipe/${state.selectedId}/cook`));

  elements.cookClose.addEventListener('click', () => closeCookView());
  elements.cookPrev.addEventListener('click', handleCookPrevious);
  elements.cookNext.addEventListener('click', handleCookNext);
  elements.cookReset.addEventListener('click', resetCurrentCookRecipe);

  elements.cookIngredients.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-check-id]');
    if (!checkbox || !state.cook) return;
    if (checkbox.checked) {
      state.cook.checked.add(checkbox.dataset.checkId);
    } else {
      state.cook.checked.delete(checkbox.dataset.checkId);
    }
    saveRecipeProgress(state.cook.recipeId, state.cook.step, [...state.cook.checked]);
    const total = recipeById.get(state.cook.recipeId).ingredients.length;
    updateCookCheckedSummary(total);
  });

  elements.browseToggle.addEventListener('click', () => {
    if (state.drawerOpen) closeDrawer();
    else openDrawer();
  });
  elements.drawerClose.addEventListener('click', () => closeDrawer());
  elements.drawerBackdrop.addEventListener('click', () => closeDrawer());
  elements.randomButton.addEventListener('click', chooseRandomRecipe);

  state.mobileQuery.addEventListener('change', syncDrawerAccessibility);

  window.addEventListener('hashchange', applyRoute);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.cookOpen) {
        event.preventDefault();
        closeCookView();
        return;
      }
      if (state.drawerOpen) closeDrawer();
      return;
    }
    if (!state.cookOpen || event.target.closest('input, select, textarea, button')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleCookNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleCookPrevious();
    }
  });
}

function boot() {
  bindEvents();
  applyRoute();
  refreshFilters({ redirect: false });
  syncDrawerAccessibility();
  initializeScene();
}

boot();
