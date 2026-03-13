import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  LookupCategory,
  LookupHint,
  LookupInputValue,
  LookupService,
  LookupSubTarget,
  LookupTarget,
  LookupValueType
} from "../services/LookupService";

interface LookupInputProps {
  id: string;
  label: string;
  placeholder?: string;
  hint?: LookupHint;
  value: LookupInputValue;
  lookupService: LookupService;
  onChange: (next: LookupInputValue) => void;
}

function inputTypeFor(valueType?: LookupValueType): "text" | "number" | "password" {
  if (valueType === "number") {
    return "number";
  }
  if (valueType === "password") {
    return "password";
  }
  return "text";
}

export function LookupInput({
  id,
  label,
  placeholder,
  hint,
  value,
  lookupService,
  onChange
}: LookupInputProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categories, setCategories] = useState<LookupCategory[]>([]);
  const [targets, setTargets] = useState<LookupTarget[]>([]);
  const [subTargets, setSubTargets] = useState<LookupSubTarget[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedSubTargetId, setSelectedSubTargetId] = useState<string | null>(null);
  const [showSubTargets, setShowSubTargets] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{
    level: "category" | "target" | "subtarget";
    id: string;
  } | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [previousManualValue, setPreviousManualValue] = useState<string>("");
  const [showSelectionFeedback, setShowSelectionFeedback] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [isUsagePinned, setIsUsagePinned] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const usageContainerRef = useRef<HTMLDivElement>(null);
  const usageButtonRef = useRef<HTMLButtonElement>(null);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const targetRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const subTargetRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isLookupLocked = value.source === "lookup";

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) ?? null,
    [targets, selectedTargetId]
  );

  useEffect(() => {
    let active = true;

    async function loadCategoriesAndCounts() {
      const loadedCategories = await lookupService.getCategories();
      if (!active) {
        return;
      }

      setCategories(loadedCategories);

      const counts = await Promise.all(
        loadedCategories.map(async (category) => {
          const categoryTargets = await lookupService.getTargets(category.id);
          return [category.id, categoryTargets.length] as const;
        })
      );

      if (!active) {
        return;
      }

      setCategoryCounts(Object.fromEntries(counts));
    }

    void loadCategoriesAndCounts();
    return () => {
      active = false;
    };
  }, [lookupService]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 75);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setTargets([]);
      return;
    }

    lookupService.getTargets(selectedCategoryId).then((loadedTargets) => {
      setTargets(loadedTargets);
    });
  }, [lookupService, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId || !selectedTargetId) {
      setSubTargets([]);
      return;
    }

    lookupService.getSubTargets(selectedCategoryId, selectedTargetId).then((loadedSubTargets) => {
      setSubTargets(loadedSubTargets);
    });
  }, [lookupService, selectedCategoryId, selectedTargetId]);

  const filteredTargets = useMemo(() => {
    const normalized = debouncedSearch.trim().toLowerCase();
    if (!normalized) {
      return targets;
    }

    return targets.filter((target) => {
      return (
        target.label.toLowerCase().includes(normalized) ||
        target.description.toLowerCase().includes(normalized)
      );
    });
  }, [debouncedSearch, targets]);

  function getLikelyCategoryId(availableCategories: LookupCategory[]) {
    if (selectedCategoryId && availableCategories.some((category) => category.id === selectedCategoryId)) {
      return selectedCategoryId;
    }

    const preferred = hint?.categoryAllowList?.find((idValue) => {
      return availableCategories.some((category) => category.id === idValue);
    });

    return preferred ?? availableCategories[0]?.id ?? null;
  }

  function getLikelyTargetId(availableTargets: LookupTarget[]) {
    if (selectedTargetId && availableTargets.some((target) => target.id === selectedTargetId)) {
      return selectedTargetId;
    }

    const preferred = hint?.targetAllowList?.find((idValue) => {
      return availableTargets.some((target) => target.id === idValue);
    });

    return preferred ?? availableTargets[0]?.id ?? null;
  }

  function getLikelySubTargetId(availableSubTargets: LookupSubTarget[]) {
    if (selectedSubTargetId && availableSubTargets.some((subTarget) => subTarget.id === selectedSubTargetId)) {
      return selectedSubTargetId;
    }

    if (hint?.valueType) {
      const matchingType = availableSubTargets.find((subTarget) => subTarget.valueType === hint.valueType);
      if (matchingType) {
        return matchingType.id;
      }
    }

    return availableSubTargets[0]?.id ?? null;
  }

  function requestCategoryFocus(categoryId: string | null) {
    if (categoryId) {
      setFocusRequest({ level: "category", id: categoryId });
    }
  }

  function requestTargetFocus(targetId: string | null) {
    if (targetId) {
      setFocusRequest({ level: "target", id: targetId });
    }
  }

  function requestSubTargetFocus(subTargetId: string | null) {
    if (subTargetId) {
      setFocusRequest({ level: "subtarget", id: subTargetId });
    }
  }

  useEffect(() => {
    if (!isDialogOpen || !focusRequest) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (focusRequest.level === "category") {
        categoryRefs.current[focusRequest.id]?.focus();
      } else if (focusRequest.level === "target") {
        targetRefs.current[focusRequest.id]?.focus();
      } else {
        subTargetRefs.current[focusRequest.id]?.focus();
      }
      setFocusRequest(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [focusRequest, isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen || value.source === "lookup" || selectedCategoryId || categories.length === 0) {
      return;
    }

    const likelyCategoryId = getLikelyCategoryId(categories);
    if (!likelyCategoryId) {
      return;
    }

    setSelectedCategoryId(likelyCategoryId);
    setShowSubTargets(false);
    requestCategoryFocus(likelyCategoryId);
  }, [categories, isDialogOpen, selectedCategoryId, value.source]);

  useEffect(() => {
    if (!isDialogOpen || !showSubTargets || !selectedSubTargetId || subTargets.length === 0) {
      return;
    }

    requestSubTargetFocus(selectedSubTargetId);
  }, [isDialogOpen, selectedSubTargetId, showSubTargets, subTargets.length]);

  async function chooseCategory(categoryId: string, moveFocus = true) {
    setSelectedCategoryId(categoryId);
    setShowSubTargets(false);

    const loadedTargets = await lookupService.getTargets(categoryId);
    setTargets(loadedTargets);

    const likelyTargetId = getLikelyTargetId(loadedTargets);
    setSelectedTargetId(likelyTargetId);

    if (moveFocus) {
      requestTargetFocus(likelyTargetId);
    }
  }

  async function chooseTarget(targetId: string, moveFocus = true) {
    if (!selectedCategoryId) {
      return;
    }

    setSelectedTargetId(targetId);
    setShowSubTargets(true);

    const loadedSubTargets = await lookupService.getSubTargets(selectedCategoryId, targetId);
    setSubTargets(loadedSubTargets);

    const likelySubTargetId = getLikelySubTargetId(loadedSubTargets);
    setSelectedSubTargetId(likelySubTargetId);

    if (moveFocus) {
      requestSubTargetFocus(likelySubTargetId);
    }
  }

  async function chooseSubTarget(subTarget: LookupSubTarget) {
    if (!selectedCategoryId || !selectedTargetId) {
      return;
    }

    if (value.source === "manual") {
      setPreviousManualValue(value.value);
    }

    const resolved = await lookupService.resolveValue(selectedCategoryId, selectedTargetId, subTarget.id);
    setSelectedSubTargetId(subTarget.id);
    onChange({
      source: "lookup",
      value: resolved.value,
      lookupPath: resolved.lookupPath
    });

    setShowSelectionFeedback(true);
    setTimeout(() => setShowSelectionFeedback(false), 450);
    setIsDialogOpen(false);
  }

  function clearLookupSelection() {
    onChange({ source: "manual", value: previousManualValue, lookupPath: undefined });
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setIsUsageOpen(false);
    setIsUsagePinned(false);
  }

  function openDialog() {
    setSearchInput("");
    setDebouncedSearch("");

    if (value.source === "lookup" && selectedCategoryId && selectedTargetId && selectedSubTargetId) {
      setShowSubTargets(true);
      setIsDialogOpen(true);
      requestSubTargetFocus(selectedSubTargetId);
      return;
    }

    const likelyCategoryId = getLikelyCategoryId(categories);
    setSelectedCategoryId(likelyCategoryId);
    setShowSubTargets(false);
    setIsDialogOpen(true);
    requestCategoryFocus(likelyCategoryId);
  }

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const tabbables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );

      const orderedTabbables = tabbables.sort((a, b) => {
        const aOrder = Number(a.getAttribute("data-tab-order") ?? "100");
        const bOrder = Number(b.getAttribute("data-tab-order") ?? "100");
        return aOrder - bOrder;
      });

      if (orderedTabbables.length === 0) {
        return;
      }

      event.preventDefault();
      const activeElement = document.activeElement as HTMLElement | null;
      const currentIndex = orderedTabbables.findIndex((element) => element === activeElement);

      if (event.shiftKey) {
        const previousIndex = currentIndex <= 0 ? orderedTabbables.length - 1 : currentIndex - 1;
        orderedTabbables[previousIndex]?.focus();
        return;
      }

      const nextIndex = currentIndex === -1 || currentIndex >= orderedTabbables.length - 1 ? 0 : currentIndex + 1;
      orderedTabbables[nextIndex]?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen || !isUsagePinned) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (usageContainerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsUsagePinned(false);
      setIsUsageOpen(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isDialogOpen, isUsagePinned]);

  function handleArrowListNavigation(event: ReactKeyboardEvent<HTMLElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const list = event.currentTarget.closest("[data-nav-list='true']");
    if (!list) {
      return;
    }

    const items = Array.from(list.querySelectorAll<HTMLButtonElement>("[data-nav-item='true']"));
    if (items.length === 0) {
      return;
    }

    const currentIndex = items.findIndex((item) => item === event.currentTarget);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    event.preventDefault();
    items[nextIndex]?.focus();
  }

  function handleCategoryKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, categoryId: string) {
    if (event.key === "Enter" || event.key === "ArrowRight") {
      event.preventDefault();
      void chooseCategory(categoryId);
      return;
    }

    handleArrowListNavigation(event);
  }

  function handleTargetKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, targetId: string) {
    if (event.key === "Enter" || event.key === "ArrowRight") {
      event.preventDefault();
      void chooseTarget(targetId);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      requestCategoryFocus(selectedCategoryId);
      return;
    }

    handleArrowListNavigation(event);
  }

  function handleSubTargetKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, subTarget: LookupSubTarget) {
    if (event.key === "Enter" || event.key === "ArrowRight") {
      event.preventDefault();
      void chooseSubTarget(subTarget);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setShowSubTargets(false);
      requestTargetFocus(selectedTargetId);
      return;
    }

    handleArrowListNavigation(event);
  }

  const headerTitle = showSubTargets && selectedTarget
    ? `${selectedCategory?.label ?? ""} > ${selectedTarget.label}`
    : selectedCategory?.label ?? "Select a Category";

  const headerDescription = showSubTargets && selectedTarget
    ? "Select a sub-target to populate the field."
    : selectedCategory
      ? "Select a target to view its values."
      : "Choose a category to view available targets.";

  const usagePanelId = `${id}-usage-panel`;
  const usageHintId = `${id}-usage-hint`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative flex items-center overflow-hidden rounded-lg ring-1 ring-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
        <input
          id={id}
          type={inputTypeFor(hint?.valueType)}
          readOnly={isLookupLocked}
          value={value.value}
          onChange={(event) => {
            setPreviousManualValue(event.target.value);
            onChange({ source: "manual", value: event.target.value });
          }}
          placeholder={placeholder ?? "Enter value or use lookup"}
          className={`w-full border-none px-4 py-3 outline-none ${
            isLookupLocked ? "bg-slate-100" : "bg-white"
          } ${showSelectionFeedback ? "text-green-600 transition-colors" : ""}`}
        />

        {isLookupLocked ? (
          <button
            type="button"
            onClick={clearLookupSelection}
            aria-label={`Clear ${label} lookup value`}
            className="mx-2 rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            x
          </button>
        ) : null}

        <button
          type="button"
          onClick={openDialog}
          className="border-l border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
        >
          Lookup
        </button>
      </div>

      <p className={`h-4 text-xs text-slate-500 ${value.lookupPath ? "visible" : "invisible"}`}>
        {value.lookupPath ?? "\u00a0"}
      </p>

      {isDialogOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeDialog}
          data-testid={`${id}-dialog-backdrop`}
        >
          <div
            ref={dialogRef}
            className="flex h-[560px] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${label} lookup dialog`}
            onClick={(event) => event.stopPropagation()}
          >
            <aside className="w-64 border-r border-slate-200 bg-slate-50">
              <div className="border-b border-slate-200 bg-white p-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Categories
              </div>
              <ul className="space-y-1 p-2" data-nav-list="true">
                {categories.map((category) => {
                  const isActive = selectedCategoryId === category.id;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => {
                          void chooseCategory(category.id);
                        }}
                        onKeyDown={(event) => handleCategoryKeyDown(event, category.id)}
                        data-nav-item="true"
                        data-tab-order="1"
                        ref={(element) => {
                          categoryRefs.current[category.id] = element;
                        }}
                        className={`flex w-full items-center justify-between rounded px-3 py-2 text-left ${
                          isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{category.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {categoryCounts[category.id] ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="flex flex-1 flex-col">
              <header className="space-y-4 border-b border-slate-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    {showSubTargets && selectedTargetId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubTargets(false);
                          requestTargetFocus(selectedTargetId);
                        }}
                        data-tab-order="3"
                        className="mb-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Back to targets
                      </button>
                    ) : null}
                    <h3 className="text-lg font-bold text-slate-800">{headerTitle}</h3>
                    <p className="text-xs text-slate-500">{headerDescription}</p>
                  </div>

                  <div
                    ref={usageContainerRef}
                    className="relative flex items-center gap-2"
                    onMouseEnter={() => {
                      if (!isUsagePinned) {
                        setIsUsageOpen(true);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!isUsagePinned) {
                        setIsUsageOpen(false);
                      }
                    }}
                    onFocus={() => {
                      if (!isUsagePinned) {
                        setIsUsageOpen(true);
                      }
                    }}
                    onBlur={(event) => {
                      if (isUsagePinned) {
                        return;
                      }

                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setIsUsageOpen(false);
                      }
                    }}
                  >
                    <button
                      ref={usageButtonRef}
                      type="button"
                      onClick={() => {
                        if (isUsagePinned) {
                          setIsUsagePinned(false);
                          setIsUsageOpen(false);
                          return;
                        }

                        setIsUsagePinned(true);
                        setIsUsageOpen(true);
                      }}
                      aria-label="Usage and keyboard shortcuts"
                      aria-describedby={usageHintId}
                      aria-controls={usagePanelId}
                      aria-expanded={isUsageOpen}
                      data-tab-order="4"
                      className="text-xs font-semibold uppercase tracking-wide text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                    >
                      Usage
                    </button>

                    <p id={usageHintId} className="sr-only">
                      Open usage guidance for keyboard navigation and dialog controls.
                    </p>

                    {isUsageOpen ? (
                      <section
                        id={usagePanelId}
                        role="tooltip"
                        aria-label="Keyboard usage guidance"
                        className="absolute right-0 top-7 z-10 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg"
                      >
                        <h4 className="font-semibold uppercase tracking-wide text-slate-700">Keyboard shortcuts</h4>
                        <ul className="mt-2 space-y-1">
                          <li><span className="font-semibold text-slate-700">Right Arrow / Enter:</span> drill down level</li>
                          <li><span className="font-semibold text-slate-700">Left Arrow:</span> move up one level</li>
                          <li><span className="font-semibold text-slate-700">Up / Down:</span> navigate list items</li>
                          <li><span className="font-semibold text-slate-700">Home / End:</span> jump to first or last item</li>
                          <li><span className="font-semibold text-slate-700">Tab / Shift+Tab:</span> cycle dialog controls</li>
                          <li><span className="font-semibold text-slate-700">Escape:</span> close the lookup dialog</li>
                        </ul>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUsagePinned(false);
                            setIsUsageOpen(false);
                            usageButtonRef.current?.focus();
                          }}
                          aria-label="Close usage guidance"
                          data-tab-order="4.5"
                          className="mt-3 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Close
                        </button>
                      </section>
                    ) : null}

                    <button
                      type="button"
                      onClick={closeDialog}
                      aria-label="Close lookup dialog"
                      data-tab-order="5"
                      className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      x
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Filter targets..."
                  data-tab-order="2"
                  className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </header>

              <div className="flex-1 overflow-y-auto p-2">
                {!selectedCategoryId ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Select a category
                  </div>
                ) : showSubTargets && selectedTargetId ? (
                  <ul className="space-y-1" data-nav-list="true">
                    {subTargets.map((subTarget) => {
                      const isActive = subTarget.id === selectedSubTargetId;
                      return (
                        <li key={subTarget.id}>
                          <button
                            type="button"
                            onClick={() => {
                              void chooseSubTarget(subTarget);
                            }}
                            onKeyDown={(event) => handleSubTargetKeyDown(event, subTarget)}
                            data-nav-item="true"
                            data-tab-order="2"
                            ref={(element) => {
                              subTargetRefs.current[subTarget.id] = element;
                            }}
                            className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left ${
                              isActive
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-100 hover:border-blue-200 hover:bg-blue-50"
                            }`}
                          >
                            <span>
                              <span className="block font-medium text-slate-800">{subTarget.label}</span>
                              <span className="block text-xs text-slate-400">
                                {subTarget.masked ? "[Hidden]" : subTarget.valueType}
                              </span>
                            </span>
                            <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Use</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : filteredTargets.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No targets found matching your search
                  </div>
                ) : (
                  <ul className="space-y-1" data-nav-list="true">
                    {filteredTargets.map((target) => {
                      const isActive = target.id === selectedTargetId;
                      return (
                        <li key={target.id}>
                          <button
                            type="button"
                            onClick={() => {
                              void chooseTarget(target.id);
                            }}
                            onKeyDown={(event) => handleTargetKeyDown(event, target.id)}
                            data-nav-item="true"
                            data-tab-order="2"
                            ref={(element) => {
                              targetRefs.current[target.id] = element;
                            }}
                            className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left ${
                              isActive
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-100 hover:border-blue-200 hover:bg-blue-50"
                            }`}
                          >
                            <span>
                              <span className="block font-medium text-slate-800">{target.label}</span>
                              <span className="block text-xs text-slate-400">{target.description}</span>
                            </span>
                            <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Open</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
