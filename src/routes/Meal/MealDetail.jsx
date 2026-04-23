import "./MealDetail.css";

import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CalendarDays, ChevronLeft, Cloud, Clock3, Moon, Plus, Star, Sun, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_IMAGE = "/images/meal-mock/placeholder.svg";
const MEAL_SELECTIONS_STORAGE_KEY = "nutrihelp_add_meal_selections_by_date_v1";

const NUTRITION_PRESETS = {
  breakfast: { calories: 280, carbs: 45, protein: 10, fiber: 8, fat: 9, sodium: 140 },
  lunch: { calories: 460, carbs: 54, protein: 28, fiber: 10, fat: 14, sodium: 420 },
  dinner: { calories: 520, carbs: 44, protein: 34, fiber: 8, fat: 18, sodium: 470 },
  others: { calories: 210, carbs: 24, protein: 9, fiber: 6, fat: 8, sodium: 160 },
};

const TAGS_BY_TYPE = {
  breakfast: ["Low GI", "High Fiber", "Heart-Healthy", "Energy Boosting"],
  lunch: ["Balanced", "High Protein", "Vitamin-Rich", "Satiating"],
  dinner: ["Muscle Recovery", "Nutrient Dense", "Balanced", "High Protein"],
  others: ["Light Meal", "Smart Snack", "High Fiber", "Gut-Friendly"],
};

const ADD_TO_MEAL_OPTIONS = [
  { key: "breakfast", icon: Sun, label: "Breakfast", iconClass: "icon-breakfast" },
  { key: "lunch", icon: Cloud, label: "Lunch", iconClass: "icon-lunch" },
  { key: "dinner", icon: Moon, label: "Dinner", iconClass: "icon-dinner" },
];

const TAB_ITEMS = [
  { key: "nutrition", label: "Nutritional Info" },
  { key: "benefits", label: "Health Benefits" },
  { key: "allergens", label: "Allergens & Dietary Info" },
];

const INGREDIENT_RULES = [
  {
    keywords: ["oatmeal", "oat", "porridge"],
    ingredients: ["Rolled Oats", "Blueberries", "Flaxseed", "Whole Grain"],
  },
  {
    keywords: ["yogurt", "parfait", "chia"],
    ingredients: ["Greek Yogurt", "Chia Seeds", "Fresh Berries", "Honey"],
  },
  {
    keywords: ["avocado", "toast"],
    ingredients: ["Avocado", "Whole Grain Bread", "Egg", "Black Pepper"],
  },
  {
    keywords: ["salmon", "tuna"],
    ingredients: ["Salmon", "Lemon", "Leafy Greens", "Olive Oil"],
  },
  {
    keywords: ["omelette", "egg"],
    ingredients: ["Eggs", "Mushroom", "Spinach", "Sea Salt"],
  },
  {
    keywords: ["smoothie", "juice"],
    ingredients: ["Banana", "Berries", "Milk", "Oats"],
  },
  {
    keywords: ["wrap", "sandwich", "bagel"],
    ingredients: ["Whole Wheat Wrap", "Lean Protein", "Lettuce", "Tomato"],
  },
  {
    keywords: ["pasta", "ramen", "pad thai"],
    ingredients: ["Whole Grain Noodles", "Garlic", "Herbs", "Protein"],
  },
  {
    keywords: ["curry", "masala", "lentil"],
    ingredients: ["Lentils", "Turmeric", "Tomato", "Coconut Milk"],
  },
  {
    keywords: ["steak", "meat"],
    ingredients: ["Lean Beef", "Mixed Vegetables", "Garlic", "Olive Oil"],
  },
];

const BENEFIT_RULES = [
  { keywords: ["oat", "whole grain"], text: "Supports healthy digestion and stable blood sugar." },
  { keywords: ["salmon", "tuna"], text: "Rich in omega-3 fats that support heart and brain health." },
  { keywords: ["vegetable", "veggie", "salad"], text: "Provides antioxidant vitamins for immune support." },
  { keywords: ["egg", "chicken", "protein", "steak"], text: "Helps muscle recovery and keeps you full longer." },
  { keywords: ["yogurt", "chia"], text: "Supports gut health and improves satiety." },
];

const ALLERGEN_RULES = [
  { keywords: ["egg", "omelette"], label: "Eggs" },
  { keywords: ["salmon", "tuna"], label: "Fish" },
  { keywords: ["shrimp", "pad thai"], label: "Shellfish" },
  { keywords: ["milk", "yogurt", "cheese"], label: "Dairy" },
  { keywords: ["oat", "bread", "bagel", "pasta", "wrap", "pancake"], label: "Gluten (possible)" },
  { keywords: ["nut", "almond"], label: "Tree Nuts" },
];

function getTodayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMealType(value) {
  const normalized = normalize(value);
  if (normalized === "breakfast" || normalized === "lunch" || normalized === "dinner") return normalized;
  if (normalized === "snack" || normalized === "snacks" || normalized === "other") return "others";
  return "others";
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
    // Ignore storage write issues and keep UX responsive.
  }
}

function includesKeyword(source, keywords) {
  return keywords.some((keyword) => source.includes(keyword));
}

function getIngredients(title) {
  const normalized = String(title || "").toLowerCase();
  const matched = INGREDIENT_RULES.find((rule) => includesKeyword(normalized, rule.keywords));
  return matched?.ingredients || ["Fresh Ingredients", "Herbs", "Lean Protein", "Whole Foods"];
}

function getBenefits(title) {
  const normalized = String(title || "").toLowerCase();
  const matched = BENEFIT_RULES
    .filter((rule) => includesKeyword(normalized, rule.keywords))
    .map((rule) => rule.text);

  if (matched.length > 0) return matched;

  return [
    "Built with balanced macros for sustained daily energy.",
    "Supports a healthy and practical meal planning routine.",
  ];
}

function getAllergens(title) {
  const normalized = String(title || "").toLowerCase();
  const matched = ALLERGEN_RULES
    .filter((rule) => includesKeyword(normalized, rule.keywords))
    .map((rule) => rule.label);

  if (matched.length === 0) return ["No major allergens identified from current mock data."];

  return Array.from(new Set(matched));
}

function getDietaryFlags(mealType, title) {
  const normalized = String(title || "").toLowerCase();
  const flags = new Set(["Balanced"]);

  if (mealType === "breakfast") flags.add("Breakfast-Friendly");
  if (mealType === "others") flags.add("Snack Option");
  if (includesKeyword(normalized, ["vegetable", "veggie", "lentil", "hummus"])) flags.add("Plant-Focused");
  if (includesKeyword(normalized, ["salmon", "tuna", "egg", "chicken", "steak", "shrimp"])) flags.add("High Protein");
  if (includesKeyword(normalized, ["salad", "bowl"])) flags.add("Fresh Ingredients");

  return Array.from(flags);
}

function formatMealTypeLabel(mealType) {
  const normalized = String(mealType || "").trim().toLowerCase();
  if (!normalized) return "Meal";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildDetailFromMeal(meal) {
  const type = meal?.mealType || "breakfast";
  const baseNutrition = NUTRITION_PRESETS[type] || NUTRITION_PRESETS.breakfast;
  const title = meal?.title || "Dish Detail";

  return {
    id: meal?.id || "meal-detail",
    title,
    image: meal?.image || DEFAULT_IMAGE,
    mealType: type,
    time: meal?.time || "N/A",
    servings: meal?.servings || "N/A",
    description:
      `${title} is a nutritious ${type} option designed to support daily wellness and balanced energy.`,
    tags: TAGS_BY_TYPE[type] || TAGS_BY_TYPE.breakfast,
    nutrition: baseNutrition,
    ingredients: getIngredients(title),
    benefits: getBenefits(title),
    allergens: getAllergens(title),
    dietaryFlags: getDietaryFlags(type, title),
    vitamins: ["Vitamin B1: Good", "Vitamin B6: Moderate", "Vitamin C: Good", "Vitamin K: Moderate"],
    recipeId: meal?.recipeId || null,
  };
}

function toSelectedMealPayload(detail, selectedMealType, sourceMeal) {
  const normalizedMealType = normalizeMealType(selectedMealType || detail?.mealType || sourceMeal?.mealType);
  const recipeIdKey = normalize(detail?.recipeId || sourceMeal?.recipeId);
  const titleKey = normalize(detail?.title || sourceMeal?.title || sourceMeal?.name);
  const idKey = normalize(detail?.id || sourceMeal?.id);
  const identityKey =
    (recipeIdKey && recipeIdKey !== "null" && `recipe:${recipeIdKey}`) ||
    (titleKey && `title:${titleKey}`) ||
    (idKey && `id:${idKey}`) ||
    `legacy:${Date.now()}`;
  const selectedId = `slot:${identityKey}|${normalizedMealType}`;

  return {
    id: selectedId,
    name: detail?.title || sourceMeal?.title || "Meal",
    recipeId: detail?.recipeId || sourceMeal?.recipeId || sourceMeal?.id || null,
    title: detail?.title || sourceMeal?.title || "Meal",
    image: detail?.image || sourceMeal?.image || DEFAULT_IMAGE,
    time: detail?.time || sourceMeal?.time || "N/A",
    servings: detail?.servings || sourceMeal?.servings || "N/A",
    level: sourceMeal?.level || "Easy",
    mealType: normalizedMealType,
    tags: Array.isArray(detail?.tags) ? detail.tags : [],
    description: detail?.description || "",
    nutrition: detail?.nutrition || {},
    ingredients: Array.isArray(detail?.ingredients) ? detail.ingredients : [],
  };
}

const MealDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("nutrition");
  const [favorite, setFavorite] = useState(false);
  const todayIso = useMemo(() => getTodayISO(), []);

  const mealFromState = location.state?.meal;
  const savedMeal = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("selectedMealDetail");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const meal = mealFromState || savedMeal;
  const detail = useMemo(() => buildDetailFromMeal(meal), [meal]);

  const [selectedAddTo, setSelectedAddTo] = useState(detail.mealType || "breakfast");
  const [specificDate, setSpecificDate] = useState(todayIso);
  const [isSpecificDayPickerOpen, setIsSpecificDayPickerOpen] = useState(false);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_IMAGE;
  };

  const handleAddToday = () => {
    const payload = toSelectedMealPayload(detail, selectedAddTo, meal);
    const nextSelectionByDate = readStoredSelections();
    const currentDateSelections = nextSelectionByDate[todayIso] || {};

    nextSelectionByDate[todayIso] = {
      ...currentDateSelections,
      [payload.id]: payload,
    };

    writeStoredSelections(nextSelectionByDate);

    try {
      sessionStorage.setItem("selectedMealDetail", JSON.stringify(payload));
    } catch {
      // Ignore storage write issues and keep success flow.
    }

    toast.success(`Added ${detail.title} to today's ${selectedAddTo}.`);
  };

  const handleSpecificDateChange = (event) => {
    const nextDate = event.target.value;
    if (!nextDate || nextDate < todayIso) return;
    setSpecificDate(nextDate);
  };

  const handleAddToSpecificDate = () => {
    if (!specificDate || specificDate < todayIso) return;

    const payload = toSelectedMealPayload(detail, selectedAddTo, meal);
    const nextSelectionByDate = readStoredSelections();
    const currentDateSelections = nextSelectionByDate[specificDate] || {};

    nextSelectionByDate[specificDate] = {
      ...currentDateSelections,
      [payload.id]: payload,
    };

    writeStoredSelections(nextSelectionByDate);

    try {
      sessionStorage.setItem("selectedMealDetail", JSON.stringify(payload));
    } catch {
      // Ignore storage write issues and keep success flow.
    }

    toast.success(`Added ${detail.title} to ${selectedAddTo} on ${specificDate}.`);
    setIsSpecificDayPickerOpen(false);
  };

  const handleViewRecipe = () => {
    const mealPayload = {
      id: detail.id,
      recipeId: detail.recipeId,
      title: detail.title,
      image: detail.image,
      time: detail.time,
      servings: detail.servings,
      level: meal?.level || "Easy",
      mealType: selectedAddTo || detail.mealType || "breakfast",
      tags: detail.tags,
      nutrition: detail.nutrition,
      ingredients: detail.ingredients,
      description: detail.description,
    };

    try {
      sessionStorage.setItem("selectedMealDetail", JSON.stringify(mealPayload));
    } catch {
      // Ignore storage write errors and continue navigation.
    }

    const targetRecipeId = detail.recipeId || detail.id || "recipe";
    navigate(`/recipe/${encodeURIComponent(String(targetRecipeId))}`, {
      state: { meal: mealPayload },
    });
  };

  return (
    <div className="meal-detail-page">
      <div className="meal-detail-shell">
        <div className="meal-detail-breadcrumb" aria-label="breadcrumb">
          <button type="button" className="meal-detail-back" onClick={() => navigate(-1)}>
            <ChevronLeft size={14} />
            Back
          </button>
          <span className="meal-detail-divider">/</span>
          <span className="meal-detail-muted">Meal Planning</span>
          <span className="meal-detail-divider">/</span>
          <span className="meal-detail-current">Dish Detail</span>
        </div>

        <div className="meal-detail-hero">
          <section className="meal-detail-left">
            <div className="meal-detail-image-card">
              <img src={detail.image} alt={detail.title} loading="lazy" onError={handleImageError} />
              <span className={`meal-detail-type-badge type-${String(detail.mealType || "").toLowerCase()}`}>
                {formatMealTypeLabel(detail.mealType)}
              </span>
              <button
                type="button"
                className={`meal-detail-favorite ${favorite ? "active" : ""}`}
                onClick={() => setFavorite((prev) => !prev)}
                aria-label="Save meal"
              >
                <Star size={18} />
              </button>
            </div>

            <div className="meal-detail-tag-row">
              {detail.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="meal-detail-add-card">
              <h3>Add to</h3>
              <div className="meal-detail-add-grid">
                {ADD_TO_MEAL_OPTIONS.map((option) => {
                  const isActive = selectedAddTo === option.key;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`meal-detail-add-option ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedAddTo(option.key)}
                    >
                      <span className={`icon ${option.iconClass}`}>
                        <Icon size={16} strokeWidth={2.3} />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="meal-detail-right">
            <h1>{detail.title}</h1>
            <p>{detail.description}</p>

            <article className="info-card">
              <h2>Nutrition Facts</h2>
              <div className="nutrition-grid">
                <div>
                  <span>Calories</span>
                  <strong>{detail.nutrition.calories} kcal</strong>
                </div>
                <div>
                  <span>Carbs</span>
                  <strong>{detail.nutrition.carbs}g</strong>
                </div>
                <div>
                  <span>Protein</span>
                  <strong>{detail.nutrition.protein}g</strong>
                </div>
                <div>
                  <span>Fiber</span>
                  <strong>{detail.nutrition.fiber}g</strong>
                </div>
                <div>
                  <span>Fat</span>
                  <strong>{detail.nutrition.fat}g</strong>
                </div>
                <div>
                  <span>Sodium</span>
                  <strong>{detail.nutrition.sodium}mg</strong>
                </div>
              </div>
            </article>

            <article className="info-card">
              <h2>Key Ingredients</h2>
              <div className="ingredients-chip-row">
                {detail.ingredients.map((ingredient) => (
                  <span key={ingredient}>{ingredient}</span>
                ))}
              </div>

              <div className="meal-summary-meta">
                <span>
                  <Clock3 size={16} />
                  {detail.time}
                </span>
                <span>
                  <Users size={16} />
                  {detail.servings}
                </span>
              </div>
            </article>

          </section>

          <div className="meal-detail-bottom-actions">
            <div className="meal-detail-actions">
              <button type="button" className="meal-detail-action-btn primary" onClick={handleAddToday}>
                <Plus size={16} />
                Add to Today's Plan
              </button>
              <div className="meal-detail-specific-day-wrap">
                <button
                  type="button"
                  className="meal-detail-action-btn secondary meal-detail-specific-day-trigger"
                  onClick={() => setIsSpecificDayPickerOpen((previous) => !previous)}
                >
                  <CalendarDays size={16} />
                  Add to a Specific Day
                </button>

                {isSpecificDayPickerOpen ? (
                  <div className="meal-detail-specific-day-popover">
                    <label htmlFor="meal-detail-specific-date">Select date</label>
                    <input
                      id="meal-detail-specific-date"
                      type="date"
                      value={specificDate}
                      min={todayIso}
                      onChange={handleSpecificDateChange}
                    />
                    <div className="meal-detail-specific-day-actions">
                      <button type="button" className="specific-day-add" onClick={handleAddToSpecificDate}>
                        Add
                      </button>
                      <button
                        type="button"
                        className="specific-day-close"
                        onClick={() => setIsSpecificDayPickerOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <button type="button" className="meal-detail-view-recipe-btn" onClick={handleViewRecipe}>
              View Recipe
            </button>
          </div>
        </div>

        <section className="meal-detail-tabs-wrap">
          <div className="meal-detail-tab-head">
            {TAB_ITEMS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={isActive ? "active" : ""}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="meal-detail-tab-body">
            {activeTab === "nutrition" && (
              <div className="tab-panel">
                <h3>Complete Nutritional Information</h3>
                <ul className="nutrition-list">
                  <li>
                    <span>Calories</span>
                    <strong>{detail.nutrition.calories} kcal</strong>
                  </li>
                  <li>
                    <span>Protein</span>
                    <strong>{detail.nutrition.protein} g</strong>
                  </li>
                  <li>
                    <span>Carbohydrates</span>
                    <strong>{detail.nutrition.carbs} g</strong>
                  </li>
                  <li>
                    <span>Fiber</span>
                    <strong>{detail.nutrition.fiber} g</strong>
                  </li>
                  <li>
                    <span>Fat</span>
                    <strong>{detail.nutrition.fat} g</strong>
                  </li>
                  <li>
                    <span>Sodium</span>
                    <strong>{detail.nutrition.sodium} mg</strong>
                  </li>
                </ul>

                <h3>Vitamins & Minerals</h3>
                <ul className="dot-list">
                  {detail.vitamins.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "benefits" && (
              <div className="tab-panel">
                <h3>Health Benefits</h3>
                <ul className="dot-list">
                  {detail.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "allergens" && (
              <div className="tab-panel">
                <h3>Potential Allergens</h3>
                <div className="badge-row">
                  {detail.allergens.map((allergen) => (
                    <span key={allergen} className="warn">
                      {allergen}
                    </span>
                  ))}
                </div>

                <h3>Dietary Info</h3>
                <div className="badge-row">
                  {detail.dietaryFlags.map((item) => (
                    <span key={item} className="safe">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MealDetail;
