import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ScanProducts.css";
import { scanSingleImage } from "../../../services/imageScanApi";
import {
  deleteMealLog,
  fetchDailyMealSummary,
  fetchNutritionPreview,
  saveScannedMeal,
} from "../../../services/mealLogApi";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function humanizeLabel(label) {
  return String(label || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function percent(score) {
  return `${Math.round(Number(score || 0) * 100)}%`;
}

function normalizeNutritionPreview(label, nutrition) {
  return {
    label,
    display_name: nutrition?.display_name || humanizeLabel(label),
    about: nutrition?.about || null,
    cuisine: nutrition?.cuisine || null,
    estimated_calories: nutrition?.estimated_calories ?? null,
    serving_description: nutrition?.serving_description ?? null,
    source: nutrition?.source || "scan_result",
    available: Boolean(
      nutrition?.available ?? nutrition?.estimated_calories != null
    ),
  };
}

function nutritionKey(label) {
  return String(label || "").trim().toLowerCase();
}

function hasBlockingPhotoIssue(issues = []) {
  return issues.some((issue) =>
    /resolution|blurry|large face|clear food photo/i.test(issue)
  );
}

function ScanProducts() {
  const fileInputRef = useRef(null);
  const activeLabelRef = useRef("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState("Lunch");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [manualLabelInput, setManualLabelInput] = useState("");
  const [nutritionPreview, setNutritionPreview] = useState(null);
  const [suggestedNutrition, setSuggestedNutrition] = useState({});
  const [editedCaloriesInput, setEditedCaloriesInput] = useState("");
  const [todaySummary, setTodaySummary] = useState(null);
  const [scanError, setScanError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);

  const requiresConfirmation = Boolean(scanResult?.is_unclear);
  const hasConfidentScanLabel = Boolean(scanResult?.label && !requiresConfirmation);
  const activeLabel =
    manualLabelInput.trim() || selectedLabel || (hasConfidentScanLabel ? scanResult?.label : "");
  const isManualOverride = Boolean(
    manualLabelInput.trim() &&
      manualLabelInput.trim() !== selectedLabel &&
      manualLabelInput.trim() !== scanResult?.label
  );
  const canSave = Boolean(scanResult && activeLabel && !isLoadingNutrition && !isSaving);
  const hasSuggestedMatches = Boolean(scanResult?.topk?.length);
  const hasPhotoIssue = hasBlockingPhotoIssue(scanResult?.quality?.issues || []);

  const selectedCandidate = useMemo(() => {
    if (!scanResult || !activeLabel) return null;
    const activeKey = nutritionKey(activeLabel);
    return (
      scanResult.topk?.find((item) => nutritionKey(item.label) === activeKey) ||
      scanResult.matches?.find((item) => nutritionKey(item.label) === activeKey) ||
      null
    );
  }, [activeLabel, scanResult]);

  const parsedCalories =
    editedCaloriesInput.trim() === "" ? null : Math.max(0, Math.round(Number(editedCaloriesInput)));
  const confidenceText =
    requiresConfirmation
      ? hasSuggestedMatches
        ? "Review needed"
        : "Not confident"
      : isManualOverride && !selectedCandidate
      ? "Edited by you"
      : percent(selectedCandidate?.score ?? scanResult?.confidence);
  const photoQualityText = hasPhotoIssue ? "Try another photo" : "Good enough";
  const hasNutritionEstimate = nutritionPreview?.estimated_calories != null;
  const displayMealName =
    nutritionPreview?.display_name || humanizeLabel(activeLabel) || "Choose a meal";
  const scanReviewTitle = hasConfidentScanLabel
    ? humanizeLabel(scanResult.label)
    : hasSuggestedMatches
    ? "Review suggested matches"
    : "No confident food match";
  const mealAboutText =
    nutritionPreview?.about ||
    (activeLabel
      ? "Detailed dish information is not available yet for this selection. You can still review the meal name and calories before saving."
      : "AI is not confident enough to choose a dish from this image. Pick one of the suggestions only if it looks right, or type the meal name yourself.");
  const servingHint = nutritionPreview
    ? nutritionPreview.available
      ? nutritionPreview.serving_description
        ? `Based on ${nutritionPreview.serving_description}. Calories are still only a rough estimate.`
        : "Calories are only a rough estimate."
      : "No estimate yet for this dish. You can type your own calories before saving."
    : "Calories are only a rough estimate.";

  useEffect(() => {
    activeLabelRef.current = activeLabel;
  }, [activeLabel]);

  useEffect(() => {
    loadTodaySummary();
  }, []);

  useEffect(() => {
    if (!uploadedImage) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(uploadedImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadedImage]);

  useEffect(() => {
    if (!scanResult || !activeLabel) {
      return undefined;
    }

    const cachedPreview = suggestedNutrition[nutritionKey(activeLabel)];
    if (cachedPreview) {
      setNutritionPreview(cachedPreview);
      setEditedCaloriesInput(
        cachedPreview?.estimated_calories != null
          ? String(cachedPreview.estimated_calories)
          : ""
      );
      return undefined;
    }

    if (activeLabel === scanResult.label && scanResult.nutrition) {
      const preview = normalizeNutritionPreview(activeLabel, scanResult.nutrition);
      setSuggestedNutrition((current) => ({
        ...current,
        [nutritionKey(activeLabel)]: preview,
      }));
      setNutritionPreview(preview);
      setEditedCaloriesInput(
        scanResult.nutrition?.estimated_calories != null
          ? String(scanResult.nutrition.estimated_calories)
          : ""
      );
      return undefined;
    }

    const timer = setTimeout(() => {
      void loadNutritionForLabel(activeLabel);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeLabel, scanResult, suggestedNutrition]);

  async function loadTodaySummary() {
    setIsRefreshing(true);
    try {
      const summary = await fetchDailyMealSummary(todayString());
      setTodaySummary(summary);
    } catch (error) {
      console.error("Failed to load meal summary:", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleFileUploadChange(event) {
    const file = event.target.files?.[0];
    setUploadedImage(file || null);
    setScanResult(null);
    setSelectedLabel("");
    setManualLabelInput("");
    setNutritionPreview(null);
    setSuggestedNutrition({});
    setEditedCaloriesInput("");
    setScanError("");
    setSaveMessage("");
  }

  async function loadNutritionForLabel(label, { applyResult = true } = {}) {
    const requestKey = nutritionKey(label);
    if (applyResult) {
      setIsLoadingNutrition(true);
    }
    try {
      const preview = await fetchNutritionPreview(label);
      setSuggestedNutrition((current) => ({
        ...current,
        [requestKey]: preview,
      }));
      if (applyResult && nutritionKey(activeLabelRef.current) === requestKey) {
        setNutritionPreview(preview);
        setEditedCaloriesInput(
          preview?.estimated_calories != null ? String(preview.estimated_calories) : ""
        );
      }
      return preview;
    } catch (error) {
      if (applyResult) {
        setNutritionPreview(null);
        setEditedCaloriesInput("");
        setScanError(error.message || "Failed to estimate calories.");
      }
      return null;
    } finally {
      if (applyResult) {
        setIsLoadingNutrition(false);
      }
    }
  }

  async function handleImageUpload() {
    if (!uploadedImage) {
      setScanError("Choose an image before scanning.");
      return;
    }

    setIsScanning(true);
    setScanError("");
    setSaveMessage("");

    try {
      const data = await scanSingleImage(uploadedImage, { topk: 3 });
      const defaultLabel = data.is_unclear ? "" : data.label || data.topk?.[0]?.label || "";
      const defaultPreview = defaultLabel
        ? normalizeNutritionPreview(defaultLabel, data.nutrition)
        : null;
      setScanResult(data);
      setSelectedLabel(defaultLabel);
      setManualLabelInput(defaultLabel);
      setSuggestedNutrition(
        defaultLabel
          ? {
              [nutritionKey(defaultLabel)]: defaultPreview,
            }
          : {}
      );
      setNutritionPreview(defaultPreview);
      setEditedCaloriesInput(
        defaultPreview?.estimated_calories != null ? String(defaultPreview.estimated_calories) : ""
      );

      const suggestionLabels = (data.topk || [])
        .map((item) => item.label)
        .filter((label, index, array) => label && array.indexOf(label) === index);

      suggestionLabels.forEach((label) => {
        void loadNutritionForLabel(label, {
          applyResult: Boolean(defaultLabel) && nutritionKey(label) === nutritionKey(defaultLabel),
        });
      });
    } catch (error) {
      setScanResult(null);
      setSelectedLabel("");
      setManualLabelInput("");
      setNutritionPreview(null);
      setSuggestedNutrition({});
      setEditedCaloriesInput("");
      setScanError(error.message || "Failed to analyze image.");
    } finally {
      setIsScanning(false);
    }
  }

  function handleCandidateSelect(label) {
    setSelectedLabel(label);
    setManualLabelInput(label);
    setSaveMessage("");
    setScanError("");

    const preview = suggestedNutrition[nutritionKey(label)];
    if (preview) {
      setNutritionPreview(preview);
      setEditedCaloriesInput(
        preview?.estimated_calories != null ? String(preview.estimated_calories) : ""
      );
    } else {
      setEditedCaloriesInput("");
      void loadNutritionForLabel(label);
    }
  }

  async function handleSaveMeal() {
    if (!scanResult) {
      setScanError("Scan an image before saving a meal.");
      return;
    }
    if (!activeLabel) {
      setScanError("Choose or edit a dish name before saving.");
      return;
    }
    if (editedCaloriesInput.trim() !== "" && !Number.isFinite(Number(editedCaloriesInput))) {
      setScanError("Enter a valid calorie number or leave it blank.");
      return;
    }

    setIsSaving(true);
    setScanError("");
    setSaveMessage("");

    try {
      const payload = {
        date: todayString(),
        meal_type: selectedMealType,
        label: activeLabel,
        confidence:
          activeLabel === scanResult.label
            ? scanResult.confidence ?? 0
            : selectedCandidate?.score ?? 0,
        estimated_calories: parsedCalories,
        serving_description: nutritionPreview?.serving_description ?? null,
        recommendation: scanResult.recommendation || "",
        is_unclear: scanResult.is_unclear,
        quality_issues: scanResult.quality?.issues || [],
        source: requiresConfirmation
          ? isManualOverride
            ? "scan_manual_reviewed"
            : "scan_user_reviewed"
          : "scan",
      };

      const response = await saveScannedMeal(payload);
      setTodaySummary(response.daily_summary);
      setSaveMessage(
        `Saved ${humanizeLabel(response.entry.label)} to ${response.entry.meal_type}.`
      );
    } catch (error) {
      setScanError(error.message || "Failed to save meal log.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEntry(entryId) {
    try {
      await deleteMealLog(entryId);
      await loadTodaySummary();
    } catch (error) {
      setScanError(error.message || "Failed to delete meal log entry.");
    }
  }

  return (
    <div className="scan-products-page">
      <div className="scan-products-container">
        <h1>Scan a Meal</h1>
        <p className="scan-muted">
          Upload a food photo to detect the dish, estimate rough calories, and save
          it into today&apos;s meal log.
        </p>

        <div className="scan-products-form">
          <label className="scan-products-label">Food Image</label>
          <div
            className="upload-section"
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <div>
              <p>Click to Upload Image</p>
              {uploadedImage ? <p className="file-name">Image added: {uploadedImage.name}</p> : null}
            </div>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUploadChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {previewUrl ? (
          <div className="scan-image-preview">
            <img src={previewUrl} alt="Uploaded preview" className="scan-preview-img" />
          </div>
        ) : null}

        <div className="scan-actions-row">
          <select
            className="scan-inline-select"
            value={selectedMealType}
            onChange={(event) => setSelectedMealType(event.target.value)}
          >
            {MEAL_TYPES.map((mealType) => (
              <option key={mealType} value={mealType}>
                {mealType}
              </option>
            ))}
          </select>

          <button className="upload-button" onClick={handleImageUpload} disabled={isScanning}>
            {isScanning ? "Scanning..." : "Analyze Image"}
          </button>
        </div>

        {scanError ? <p className="scan-error">{scanError}</p> : null}
        {saveMessage ? <p className="scan-success">{saveMessage}</p> : null}
      </div>

      {scanResult ? (
        <div className="scan-products-container scan-result-card">
          <div className="scan-status-row">
            <h2>Scan Result</h2>
            <span className={`scan-pill ${requiresConfirmation ? "warn" : "ok"}`}>
              {requiresConfirmation ? "Needs Review" : "Looks Good"}
            </span>
          </div>

          <div className="scan-review-banner">
            <div>
              <span className="scan-review-kicker">AI suggestion</span>
              <h3>{scanReviewTitle}</h3>
              <p>
                {requiresConfirmation
                  ? hasSuggestedMatches
                    ? "AI found possible matches but is not confident enough to confirm one automatically. Pick a suggestion if it looks right, or type the meal name yourself."
                    : "AI is not confident enough to confirm a dish from this image. Try another photo or type the meal name yourself."
                  : "This looks like a strong match. You can still adjust the meal name or calories if the serving looks different."}
              </p>
            </div>
            <div className="scan-review-meta">
              <div className="scan-meta-chip">
                <span>AI match</span>
                <strong>{confidenceText}</strong>
              </div>
              <div className="scan-meta-chip">
                <span>Photo quality</span>
                <strong>{photoQualityText}</strong>
              </div>
            </div>
          </div>

          <p className="scan-note friendly">
            {requiresConfirmation
              ? "Pick one of the similar matches below to start from that dish and its calorie estimate, or type the right meal name yourself. Nothing is locked. You can still review and edit everything before saving."
              : "Check the meal name, dish information, and estimated calories below. If the serving is larger or smaller than usual, update it before saving."}
          </p>

          <div className="scan-editable-grid">
            <label className="scan-edit-card">
              <span>Meal name</span>
              <input
                type="text"
                className="scan-edit-input"
                value={manualLabelInput}
                onChange={(event) => {
                  setManualLabelInput(event.target.value);
                  setSelectedLabel("");
                  setSaveMessage("");
                  setScanError("");
                }}
              />
              <small>
                Change this if the AI picked the wrong dish. Similar matches will also update the dish info and starting calorie estimate when available.
              </small>
            </label>

            <label className="scan-edit-card">
              <span>Estimated calories</span>
              <div className="scan-calorie-input-wrap">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="scan-edit-input"
                  value={editedCaloriesInput}
                  onChange={(event) => {
                    setEditedCaloriesInput(event.target.value);
                    setSaveMessage("");
                    setScanError("");
                  }}
                  placeholder={
                    isLoadingNutrition
                      ? "Loading estimate..."
                      : nutritionPreview?.available === false
                        ? "No estimate yet"
                        : "e.g. 380"
                  }
                />
                <span>kcal</span>
              </div>
              <small>{servingHint}</small>
            </label>
          </div>

          <div className="scan-meal-info-card">
            <div className="scan-meal-info-header">
              <div>
                <span className="scan-review-kicker">About this meal</span>
                <h3>{displayMealName}</h3>
              </div>
              {nutritionPreview?.cuisine ? (
                <span className="scan-pill info">{nutritionPreview.cuisine}</span>
              ) : null}
            </div>

            <p className="scan-meal-info-copy">{mealAboutText}</p>

            <div className="scan-meal-info-grid">
              <div className="scan-meal-info-stat">
                <span>Estimate</span>
                <strong>{hasNutritionEstimate ? `${nutritionPreview.estimated_calories} kcal` : "No estimate yet"}</strong>
              </div>
              <div className="scan-meal-info-stat">
                <span>Typical serve</span>
                <strong>{nutritionPreview?.serving_description || "Not set yet"}</strong>
              </div>
              <div className="scan-meal-info-stat">
                <span>Selection</span>
                <strong>{displayMealName}</strong>
              </div>
            </div>
          </div>

          {scanResult.topk?.length ? (
            <div className="scan-suggestions-block">
              <div className="scan-suggestions-header">
                <h3>Similar matches</h3>
                <p>Tap one to update the meal name, dish information, and starting calorie estimate for that match.</p>
              </div>
              <div className="scan-topk-list">
              {scanResult.topk.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`scan-topk-option ${selectedLabel === item.label ? "active" : ""}`}
                  onClick={() => handleCandidateSelect(item.label)}
                >
                  <span>{humanizeLabel(item.label)}</span>
                  <strong>{requiresConfirmation ? "Review" : percent(item.score)}</strong>
                </button>
              ))}
              </div>
            </div>
          ) : null}

          {scanResult.quality?.issues?.length ? (
            <ul className="scan-quality-list">
              {scanResult.quality.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}

          <div className="scan-actions-row">
            <button className="scan-button-selector" onClick={handleSaveMeal} disabled={!canSave}>
              {isSaving ? "Saving..." : `Save to ${selectedMealType}`}
            </button>
          </div>
        </div>
      ) : null}

      <div className="scan-products-container scan-summary-card">
        <div className="scan-status-row">
          <h2>Today&apos;s Meal Log</h2>
          <span className="scan-pill info">
            {isRefreshing ? "Refreshing..." : todayString()}
          </span>
        </div>

        <div className="scan-result-grid">
          <div className="scan-stat">
            <span>Total calories</span>
            <strong>{todaySummary?.total_calories ?? 0} kcal</strong>
          </div>
          <div className="scan-stat">
            <span>Logged meals</span>
            <strong>{todaySummary?.entry_count ?? 0}</strong>
          </div>
          <div className="scan-stat">
            <span>Breakfast/Lunch</span>
            <strong>
              {(todaySummary?.meal_type_breakdown?.Breakfast ?? 0)}/
              {(todaySummary?.meal_type_breakdown?.Lunch ?? 0)}
            </strong>
          </div>
          <div className="scan-stat">
            <span>Dinner/Snacks</span>
            <strong>
              {(todaySummary?.meal_type_breakdown?.Dinner ?? 0)}/
              {(todaySummary?.meal_type_breakdown?.Snacks ?? 0)}
            </strong>
          </div>
        </div>

        {!todaySummary?.meals?.length ? (
          <p className="scan-muted">No scanned meals have been saved for today yet.</p>
        ) : (
          <div className="scan-meal-log-list">
            {todaySummary.meals.map((meal) => (
              <div key={meal.id} className="scan-meal-log-item">
                <div>
                  <strong>{humanizeLabel(meal.label)}</strong>
                  <p>
                    {meal.meal_type} · {meal.estimated_calories ?? "?"} kcal · confidence{" "}
                    {percent(meal.confidence)}
                  </p>
                </div>
                <button
                  type="button"
                  className="scan-delete-btn"
                  onClick={() => handleDeleteEntry(meal.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="view-history-button" onClick={loadTodaySummary}>
        Refresh Today&apos;s Log
      </button>
    </div>
  );
}

export default ScanProducts;
