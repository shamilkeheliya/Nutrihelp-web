import AIBaseApi from "./aiApi";

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

class MealLogApi extends AIBaseApi {
  async saveScannedMeal(payload) {
    const response = await fetch(`${this.baseURL}/ai-model/meals/log-scan`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...payload,
        user_id: payload.user_id || this.getCurrentUserId() || undefined,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to save meal log.");
    }
    return data;
  }

  async fetchDailyMealSummary(date) {
    const response = await fetch(
      `${this.baseURL}/ai-model/meals/daily-summary${buildQuery({
        date,
        user_id: this.getCurrentUserId() || undefined,
      })}`
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to fetch daily summary.");
    }
    return data;
  }

  async fetchMealLogs(date) {
    const response = await fetch(
      `${this.baseURL}/ai-model/meals/logs${buildQuery({
        date,
        user_id: this.getCurrentUserId() || undefined,
      })}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to fetch meal logs.");
    }
    return data;
  }

  async deleteMealLog(entryId) {
    const response = await fetch(
      `${this.baseURL}/ai-model/meals/logs/${entryId}${buildQuery({
        user_id: this.getCurrentUserId() || undefined,
      })}`,
      {
        method: "DELETE",
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to delete meal log.");
    }
    return data;
  }

  async fetchMealPlanContext({ dateTo, days = 7 } = {}) {
    const response = await fetch(
      `${this.baseURL}/ai-model/meals/plan-context${buildQuery({
        date_to: dateTo,
        days,
        user_id: this.getCurrentUserId() || undefined,
      })}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to fetch meal plan context.");
    }
    return data;
  }

  async fetchNutritionPreview(label) {
    const response = await fetch(
      `${this.baseURL}/ai-model/meals/nutrition-preview${buildQuery({ label })}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "Failed to preview calories.");
    }
    return data;
  }
}

export const mealLogApi = new MealLogApi();
export const saveScannedMeal = (...args) => mealLogApi.saveScannedMeal(...args);
export const fetchDailyMealSummary = (...args) => mealLogApi.fetchDailyMealSummary(...args);
export const fetchMealLogs = (...args) => mealLogApi.fetchMealLogs(...args);
export const deleteMealLog = (...args) => mealLogApi.deleteMealLog(...args);
export const fetchMealPlanContext = (...args) => mealLogApi.fetchMealPlanContext(...args);
export const fetchNutritionPreview = (...args) => mealLogApi.fetchNutritionPreview(...args);
