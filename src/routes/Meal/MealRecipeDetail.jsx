import "./MealRecipeDetail.css";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Cloud,
  Heart,
  Moon,
  Pencil,
  Printer,
  Share2,
  ShoppingCart,
  Star,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import recipeApi from "../../services/recepieApi";
import { getRecipes } from "../CreateRecipe/data/db/db";

const MEAL_SELECTIONS_STORAGE_KEY = "nutrihelp_add_meal_selections_by_date_v1";
const DEFAULT_IMAGE = "/images/meal-mock/placeholder.svg";

const MEAL_SLOT_OPTIONS = [
  { key: "breakfast", label: "Breakfast", icon: Sun, iconClass: "slot-breakfast" },
  { key: "lunch", label: "Lunch", icon: Cloud, iconClass: "slot-lunch" },
  { key: "dinner", label: "Dinner", icon: Moon, iconClass: "slot-dinner" },
];

const NUTRITION_PRESETS = {
  breakfast: { calories: 285, carbs: 42, protein: 14, fat: 10, fiber: 8, sodium: 180 },
  lunch: { calories: 465, carbs: 53, protein: 29, fat: 14, fiber: 10, sodium: 430 },
  dinner: { calories: 535, carbs: 46, protein: 34, fat: 18, fiber: 9, sodium: 500 },
  others: { calories: 225, carbs: 25, protein: 10, fat: 8, fiber: 6, sodium: 165 },
};

const TAGS_BY_TYPE = {
  breakfast: ["Light", "Morning Energy", "Balanced"],
  lunch: ["Balanced", "High Protein", "Satisfying"],
  dinner: ["Rich Flavor", "Recovery", "Nutrient Dense"],
  others: ["Quick", "Snack", "Easy Prep"],
};

const IMAGE_RULES = [
  { keywords: ["oat", "porridge"], src: "/images/meal-mock/oatmeal-bowl.jpg" },
  { keywords: ["yogurt", "parfait", "chia"], src: "/images/symptom_assessment/chia_seeds_yogurt.jpg" },
  { keywords: ["quinoa", "buddha"], src: "/images/meal-mock/quinoa.jpg" },
  { keywords: ["salmon", "tuna"], src: "/images/symptom_assessment/grilled_salmon.jpg" },
  { keywords: ["egg", "omelette"], src: "/images/meal-mock/omelette.jpg" },
  { keywords: ["smoothie", "juice"], src: "/images/meal-mock/smoothie.jpg" },
  { keywords: ["chicken", "teriyaki", "wrap"], src: "/images/meal-mock/chicken.jpg" },
  { keywords: ["curry", "masala", "lentil"], src: "/images/meal-mock/indian.jpg" },
  { keywords: ["steak", "beef"], src: "/images/meal-mock/meat.jpg" },
  { keywords: ["avocado", "toast", "bagel"], src: "/images/meal-mock/avocado.jpg" },
  { keywords: ["pasta", "ramen", "thai"], src: "/images/meal-mock/italian.jpg" },
  { keywords: ["salad", "veggie", "vegetable"], src: "/images/meal-mock/salad.jpg" },
];

const IMAGE_ROTATION = [
  "/images/meal-mock/oatmeal.jpg",
  "/images/meal-mock/salad.jpg",
  "/images/meal-mock/salmon.jpg",
  "/images/meal-mock/vegetables.jpg",
  "/images/meal-mock/rice.jpg",
  "/images/meal-mock/chicken.jpg",
];

const INGREDIENT_RULES = [
  { keywords: ["oat", "porridge"], list: ["Granola", "Fresh blueberries", "Greek yogurt or milk", "Honey", "Chia seeds"] },
  { keywords: ["yogurt", "parfait"], list: ["Greek Yogurt", "Fresh Berries", "Granola", "Chia Seeds"] },
  { keywords: ["quinoa", "bowl"], list: ["Quinoa", "Leafy Greens", "Cherry Tomato", "Olive Oil"] },
  { keywords: ["salmon", "tuna"], list: ["Salmon", "Lemon", "Herbs", "Mixed Greens"] },
  { keywords: ["egg", "omelette"], list: ["Eggs", "Spinach", "Mushroom", "Black Pepper"] },
  { keywords: ["curry", "lentil"], list: ["Lentils", "Tomato", "Coconut Milk", "Turmeric"] },
  { keywords: ["wrap", "sandwich"], list: ["Whole Grain Wrap", "Lean Protein", "Lettuce", "Tomato"] },
  { keywords: ["steak", "beef"], list: ["Lean Beef", "Garlic", "Bell Pepper", "Olive Oil"] },
];

const INGREDIENT_COST_RULES = [
  { keywords: ["granola"], quantity: "1/2 cup", cost: 0.5 },
  { keywords: ["blueberr", "berries"], quantity: "1/2 cup", cost: 1.2 },
  { keywords: ["yogurt", "milk"], quantity: "1/2 cup", cost: 0.6 },
  { keywords: ["honey"], quantity: "1 tsp", cost: 0.1 },
  { keywords: ["chia", "seed"], quantity: "1 tbsp", cost: 0.2 },
  { keywords: ["salmon"], quantity: "150g", cost: 3.5 },
  { keywords: ["quinoa"], quantity: "3/4 cup", cost: 0.9 },
  { keywords: ["egg"], quantity: "2 pcs", cost: 0.8 },
  { keywords: ["olive oil"], quantity: "1 tbsp", cost: 0.25 },
  { keywords: ["greens", "lettuce", "spinach"], quantity: "1 cup", cost: 0.7 },
  { keywords: ["tomato"], quantity: "1/2 cup", cost: 0.55 },
  { keywords: ["mushroom"], quantity: "1/2 cup", cost: 0.85 },
];

const ALLERGEN_WARNING_RULES = [
  {
    keywords: ["nut", "almond", "cashew", "walnut", "peanut"],
    label: "Nuts",
    detail: "May contain almonds, cashews, walnuts, or mixed nut blends.",
  },
  {
    keywords: ["seed", "chia", "sesame", "sunflower"],
    label: "Seeds",
    detail: "Can include chia, sesame, or sunflower seeds in some blends.",
  },
  {
    keywords: ["yogurt", "milk", "cheese", "dairy"],
    label: "Dairy",
    detail: "Contains or may be prepared with milk-based ingredients.",
  },
  {
    keywords: ["oat", "bread", "pasta", "flour", "granola", "gluten"],
    label: "Gluten",
    detail: "Some ingredients may include gluten or traces from processing.",
  },
  {
    keywords: ["egg", "omelette"],
    label: "Egg",
    detail: "Includes egg-based ingredients in preparation.",
  },
  {
    keywords: ["salmon", "tuna", "fish", "shrimp", "shellfish"],
    label: "Seafood",
    detail: "May include fish or shellfish-based ingredients.",
  },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatMealTypeLabel(mealType) {
  const normalized = normalize(mealType);
  if (!normalized) return "Meal";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeMealType(value) {
  const normalized = normalize(value);
  if (["breakfast", "lunch", "dinner", "others"].includes(normalized)) return normalized;
  if (["morning"].some((keyword) => normalized.includes(keyword))) return "breakfast";
  if (["noon"].some((keyword) => normalized.includes(keyword))) return "lunch";
  if (["night", "supper"].some((keyword) => normalized.includes(keyword))) return "dinner";
  return "breakfast";
}

function normalizePlanMealType(value) {
  const normalized = normalizeMealType(value);
  return ["breakfast", "lunch", "dinner"].includes(normalized) ? normalized : "breakfast";
}

function getTodayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTitleFromId(value) {
  const normalized = String(value || "recipe")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "Recipe";
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(value) {
  if (value === null || value === undefined || value === "") return "20 Mins";
  if (typeof value === "number" && Number.isFinite(value)) return `${value} Mins`;
  const text = String(value).trim();
  if (!text) return "20 Mins";
  if (/\d/.test(text) && /(min|hr|hour)/i.test(text)) return text;
  if (/^\d+$/.test(text)) return `${text} Mins`;
  return text;
}

function formatServings(value) {
  if (value === null || value === undefined || value === "") return "1 Serving";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value === 1 ? "1 Serving" : `${value} Servings`;
  }
  const text = String(value).trim();
  if (!text) return "1 Serving";
  if (/serv/i.test(text)) return text;
  return `${text} Serving`;
}

function resolveImage(title, seed = 0) {
  const normalized = normalize(title);
  const matched = IMAGE_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  if (matched?.src) return matched.src;
  return IMAGE_ROTATION[Math.abs(seed) % IMAGE_ROTATION.length];
}

function parseIngredients(rawIngredients, title) {
  if (Array.isArray(rawIngredients) && rawIngredients.length > 0) {
    const normalizedList = rawIngredients
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || typeof item !== "object") return "";
        return String(
          item.ingredientCategory ||
            item.ingredient_name ||
            item.ingredient ||
            item.name ||
            item.label ||
            "",
        ).trim();
      })
      .filter(Boolean);

    if (normalizedList.length > 0) {
      return Array.from(new Set(normalizedList)).slice(0, 8);
    }
  }

  if (typeof rawIngredients === "string" && rawIngredients.trim()) {
    const list = rawIngredients
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (list.length > 0) return Array.from(new Set(list)).slice(0, 8);
  }

  const normalizedTitle = normalize(title);
  const matched = INGREDIENT_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedTitle.includes(keyword)),
  );
  return matched?.list || ["Fresh Produce", "Whole Foods", "Healthy Protein", "Natural Seasoning"];
}

function parseInstructions(rawInstructions, title) {
  const normalizeStep = (step) =>
    String(step || "")
      .replace(/^\d+[\).\s-]*/, "")
      .trim();

  if (Array.isArray(rawInstructions) && rawInstructions.length > 0) {
    const steps = rawInstructions.map(normalizeStep).filter(Boolean);
    if (steps.length > 0) return steps;
  }

  if (typeof rawInstructions === "string" && rawInstructions.trim()) {
    const steps = rawInstructions
      .split(/\n|(?=\d+\.)/)
      .map(normalizeStep)
      .filter(Boolean);
    if (steps.length > 0) return steps;
  }

  const dishName = String(title || "the dish").trim();
  return [
    `Prepare the ingredients for ${dishName} and measure each portion.`,
    "Cook the base ingredients first until aromatic and evenly heated.",
    "Add remaining components in sequence and adjust seasoning to taste.",
    "Plate the dish and garnish before serving fresh.",
  ];
}

function formatLevel(value) {
  const normalized = normalize(value);
  if (!normalized) return "Easy";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function createNutrition(mealType) {
  return NUTRITION_PRESETS[mealType] || NUTRITION_PRESETS.breakfast;
}

function createDescription(title, mealType) {
  return `${title} is a ${mealType} recipe designed to support your daily wellness with balanced nutrition.`;
}

function createRating(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(5, Math.max(1, Number(numeric.toFixed(1))));
  }
  return 4.5;
}

function readStoredSelections() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEAL_SELECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredSelections(nextValue) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEAL_SELECTIONS_STORAGE_KEY, JSON.stringify(nextValue));
  } catch {
    // Ignore storage write issues for this optional UX feature.
  }
}

function doesIdMatch(item, routeId) {
  const candidateIds = [item?.id, item?.recipeId, item?.recipe_id]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value));
  return candidateIds.includes(String(routeId));
}

function buildRecipeData(source, routeId) {
  const title =
    source?.title ||
    source?.recipe_name ||
    source?.name ||
    formatTitleFromId(routeId);
  const mealType = normalizeMealType(source?.mealType || source?.meal_type || "breakfast");
  const time = formatTime(source?.time || source?.preparation_time);
  const servings = formatServings(source?.servings || source?.total_servings);
  const level = formatLevel(source?.level || source?.difficulty || "Easy");

  const numericSeed = Number.parseInt(String(routeId).replace(/\D/g, ""), 10);
  const image = source?.image || resolveImage(title, Number.isNaN(numericSeed) ? 1 : numericSeed);

  return {
    id: source?.id || routeId || `recipe-${Date.now()}`,
    recipeId: source?.recipeId || source?.recipe_id || source?.id || routeId || null,
    title,
    image,
    mealType,
    time,
    servings,
    level,
    rating: createRating(source?.rating),
    tags: Array.isArray(source?.tags) && source.tags.length > 0 ? source.tags : TAGS_BY_TYPE[mealType],
    description: source?.description || createDescription(title, mealType),
    nutrition: source?.nutrition || createNutrition(mealType),
    ingredients: parseIngredients(source?.ingredients, title),
    instructions: parseInstructions(source?.instructions, title),
  };
}

function toSelectedMealPayload(recipe, selectedMealType) {
  const mealType = normalizePlanMealType(selectedMealType);
  const selectedId = String(recipe.id || recipe.recipeId || recipe.title || Date.now());

  return {
    id: selectedId,
    name: recipe.title,
    recipeId: recipe.recipeId || recipe.id || null,
    title: recipe.title,
    image: recipe.image,
    time: recipe.time,
    servings: recipe.servings,
    level: recipe.level,
    mealType,
    tags: recipe.tags,
    description: recipe.description,
    nutrition: recipe.nutrition,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

function buildIngredientCostItems(ingredients) {
  const fallbackCost = (name) => {
    const hash = Array.from(String(name || ""))
      .reduce((total, char) => total + char.charCodeAt(0), 0);
    return 0.35 + (hash % 120) / 100;
  };

  return (ingredients || []).slice(0, 8).map((name, index) => {
    const normalizedName = normalize(name);
    const matchedRule = INGREDIENT_COST_RULES.find((rule) =>
      rule.keywords.some((keyword) => normalizedName.includes(keyword)),
    );

    const quantity = matchedRule?.quantity || "1 portion";
    const cost = matchedRule?.cost || fallbackCost(`${name}-${index}`);

    return {
      name,
      quantity,
      cost: Number(cost.toFixed(2)),
    };
  });
}

function buildAllergenWarnings(recipe) {
  const source = normalize(`${recipe.title} ${recipe.ingredients.join(" ")}`);

  const matched = ALLERGEN_WARNING_RULES.filter((rule) =>
    rule.keywords.some((keyword) => source.includes(keyword)),
  ).map((rule) => ({
    label: rule.label,
    detail: rule.detail,
  }));

  if (matched.length > 0) {
    return matched.filter((item, index, array) =>
      array.findIndex((nextItem) => nextItem.label === item.label) === index,
    );
  }

  return [
    {
      label: "General Notice",
      detail: "Please verify ingredient labels if you have food allergies or dietary restrictions.",
    },
  ];
}

function formatCost(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

const MealRecipeDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: rawId } = useParams();

  const routeId = useMemo(() => decodeURIComponent(String(rawId || "recipe")), [rawId]);
  const todayIso = useMemo(() => getTodayISO(), []);
  const stateMeal = useMemo(() => location.state?.meal || location.state?.recipe || null, [location.state]);

  const [recipe, setRecipe] = useState(() => buildRecipeData(stateMeal, routeId));
  const [isLoading, setIsLoading] = useState(true);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedMealType, setSelectedMealType] = useState(() =>
    normalizePlanMealType(stateMeal?.mealType || stateMeal?.meal_type || "breakfast"),
  );

  useEffect(() => {
    let isMounted = true;

    const loadRecipe = async () => {
      setIsLoading(true);

      let resolved = stateMeal ? buildRecipeData(stateMeal, routeId) : null;

      if (!resolved) {
        try {
          const raw = sessionStorage.getItem("selectedMealDetail");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (doesIdMatch(parsed, routeId)) {
              resolved = buildRecipeData(parsed, routeId);
            }
          }
        } catch {
          // Ignore invalid session data.
        }
      }

      if (!resolved) {
        try {
          const idbRecipes = await getRecipes();
          const matched = Array.isArray(idbRecipes)
            ? idbRecipes.find((item) => doesIdMatch(item, routeId))
            : null;
          if (matched) {
            resolved = buildRecipeData(matched, routeId);
          }
        } catch {
          // Ignore IndexedDB issues and keep fallback strategy.
        }
      }

      if (!resolved) {
        try {
          const apiRecipes = await recipeApi.getRecepie();
          const matched = Array.isArray(apiRecipes)
            ? apiRecipes.find((item) => doesIdMatch(item, routeId))
            : null;
          if (matched) {
            resolved = buildRecipeData(matched, routeId);
          }
        } catch {
          // Ignore API failures and keep fallback recipe.
        }
      }

      if (!resolved) {
        resolved = buildRecipeData({ id: routeId }, routeId);
      }

      if (!isMounted) return;

      setRecipe(resolved);
      setSelectedMealType(normalizePlanMealType(resolved.mealType));
      setIsLoading(false);
    };

    loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [routeId, stateMeal]);

  const ingredientCostItems = useMemo(
    () => buildIngredientCostItems(recipe.ingredients),
    [recipe.ingredients],
  );

  const estimatedTotalCost = useMemo(
    () => ingredientCostItems.reduce((total, item) => total + item.cost, 0),
    [ingredientCostItems],
  );

  const allergenWarnings = useMemo(() => buildAllergenWarnings(recipe), [recipe]);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_IMAGE;
  };

  const handleAddToMealPlan = () => {
    if (!selectedDate || selectedDate < todayIso) {
      toast.error("Please choose a valid date from today onward.");
      return;
    }

    const nextSelectionByDate = readStoredSelections();
    const currentDateSelections = nextSelectionByDate[selectedDate] || {};
    const payload = toSelectedMealPayload(recipe, selectedMealType);

    nextSelectionByDate[selectedDate] = {
      ...currentDateSelections,
      [payload.id]: payload,
    };

    writeStoredSelections(nextSelectionByDate);

    try {
      sessionStorage.setItem("selectedMealDetail", JSON.stringify(payload));
    } catch {
      // Ignore storage write issues and keep the success path.
    }

    toast.success(
      `Added ${recipe.title} to ${formatMealTypeLabel(selectedMealType)} on ${selectedDate}.`,
    );
    setIsPlannerOpen(false);
  };

  const handleToggleFavourite = () => {
    setIsFavourite((previous) => {
      const next = !previous;
      toast.info(next ? `${recipe.title} added to favourites.` : `${recipe.title} removed from favourites.`);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: recipe.title,
      text: `Check this recipe: ${recipe.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Recipe link copied to clipboard.");
    } catch {
      toast.info("Sharing is not available on this browser.");
    }
  };

  const handleEdit = () => {
    toast.info("Edit recipe feature is coming soon.");
  };

  const handleDelete = () => {
    toast.info("Delete recipe feature is coming soon.");
  };

  const handleShopIngredients = () => {
    const payload = toSelectedMealPayload(recipe, selectedMealType);
    navigate("/shopping-list", {
      state: {
        selectedItems: [payload],
        totalNutrition: {
          calories: recipe.nutrition.calories,
          proteins: recipe.nutrition.protein,
          fats: recipe.nutrition.fat,
          vitamins: recipe.nutrition.fiber,
          sodium: recipe.nutrition.sodium,
        },
      },
    });
  };

  return (
    <div className="meal-recipe-page">
      <div className="meal-recipe-shell">
        <div className="meal-recipe-breadcrumb" aria-label="breadcrumb">
          <button type="button" className="meal-recipe-back" onClick={() => navigate(-1)}>
            <ChevronLeft size={14} />
            Back
          </button>
          <span>/</span>
          <span className="meal-recipe-muted">Recipes</span>
          <span>/</span>
          <span className="meal-recipe-current">{recipe.title}</span>
        </div>

        <section className="meal-recipe-hero">
          <img src={recipe.image} alt={recipe.title} loading="lazy" onError={handleImageError} />
          <div className="meal-recipe-hero-scrim" aria-hidden="true" />
          <div className="meal-recipe-hero-panel">
            <h1>{recipe.title}</h1>
            <div className="meal-recipe-meta-row">
              <span className="recipe-rating">
                <Star size={16} fill="currentColor" />
                {recipe.rating.toFixed(1)}
              </span>
              <span>
                <Clock3 size={16} />
                {recipe.time}
              </span>
              <span>
                <Users size={16} />
                {recipe.servings}
              </span>
              <span>
                <BarChart3 size={16} />
                {recipe.level}
              </span>
            </div>
          </div>
        </section>

        <section className="meal-recipe-actions-row">
          <div className="meal-recipe-actions-left">
            <div className="meal-recipe-plan-wrap">
              <button
                type="button"
                className="meal-recipe-pill-btn"
                onClick={() => setIsPlannerOpen((previous) => !previous)}
              >
                Add to Meal Plan
                <CalendarDays size={16} />
              </button>

              {isPlannerOpen ? (
                <div className="meal-recipe-planner-panel">
                  <label htmlFor="recipe-plan-date">Select date</label>
                  <div className="meal-recipe-date-input-wrap">
                    <CalendarDays size={16} />
                    <input
                      id="recipe-plan-date"
                      type="date"
                      min={todayIso}
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                    />
                  </div>

                  <div className="meal-recipe-slot-grid" role="tablist" aria-label="Meal slot selection">
                    {MEAL_SLOT_OPTIONS.map((slot) => {
                      const Icon = slot.icon;
                      const isActive = selectedMealType === slot.key;
                      return (
                        <button
                          key={slot.key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`meal-recipe-slot-btn ${slot.iconClass} ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedMealType(slot.key)}
                        >
                          <Icon size={15} />
                          <span>{slot.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="meal-recipe-plan-actions">
                    <button type="button" className="confirm" onClick={handleAddToMealPlan}>
                      Confirm
                    </button>
                    <button type="button" className="close" onClick={() => setIsPlannerOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={`meal-recipe-pill-btn ${isFavourite ? "is-favourite" : ""}`}
              onClick={handleToggleFavourite}
            >
              Add to Favourites
              <Heart size={16} fill={isFavourite ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="meal-recipe-actions-right">
            <button type="button" className="meal-recipe-pill-btn small" onClick={handlePrint}>
              Print PDF
              <Printer size={16} />
            </button>
            <button type="button" className="meal-recipe-pill-btn small" onClick={handleShare}>
              Share
              <Share2 size={16} />
            </button>
            <button type="button" className="meal-recipe-pill-btn small" onClick={handleEdit}>
              Edit
              <Pencil size={16} />
            </button>
            <button type="button" className="meal-recipe-pill-btn small danger" onClick={handleDelete}>
              Delete
              <Trash2 size={16} />
            </button>
          </div>
        </section>

        <section className="meal-recipe-main-grid">
          <article className="meal-recipe-card meal-recipe-cost-card">
            <h2>Ingredients & Estimated Cost</h2>
            <p className="meal-recipe-ai-note">(AI-Generated)</p>

            <ul className="meal-recipe-cost-list">
              {ingredientCostItems.map((item) => (
                <li key={`${item.name}-${item.quantity}`}>
                  <span className="item-name-wrap">
                    <span className="item-dot" aria-hidden="true" />
                    <span className="item-name">{item.name}</span>
                    <span className="item-qty">({item.quantity})</span>
                  </span>
                  <strong>{formatCost(item.cost)}</strong>
                </li>
              ))}
            </ul>

            <div className="meal-recipe-total-row">
              <span>Estimated Total Cost</span>
              <strong>{formatCost(estimatedTotalCost)} AUD</strong>
            </div>

            <button type="button" className="meal-recipe-shop-btn" onClick={handleShopIngredients}>
              <ShoppingCart size={17} />
              Shop Ingredients
            </button>
          </article>

          <article className="meal-recipe-card meal-recipe-instruction-card">
            <h2>Instructions</h2>
            <ol className="meal-recipe-instruction-list">
              {recipe.instructions.map((step, index) => (
                <li key={`${step}-${index}`}>
                  <span className="step-badge">{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="meal-recipe-allergy-card">
          <h2>
            <AlertTriangle size={22} />
            Allergy & Dietary Warnings
          </h2>
          <p className="allergy-highlight">Contains Possible Allergens</p>
          <p className="allergy-description">
            This recipe may include ingredients that can trigger allergies. Please review before consuming.
          </p>

          <ul className="meal-recipe-allergy-list">
            {allergenWarnings.map((item) => (
              <li key={item.label}>
                <span className="allergy-dot" aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <span> — {item.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {isLoading ? <p className="meal-recipe-loading">Loading recipe details...</p> : null}
      </div>
    </div>
  );
};

export default MealRecipeDetail;
