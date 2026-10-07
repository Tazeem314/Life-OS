'use client';

import React, { useState, useMemo } from 'react';
import {
  Goal,
  GoalDurationType,
  GoalMeasurementType,
  GoalPriority,
  GoalBufferPreference,
  ChapterItem,
  ChapterDifficulty,
} from '@/lib/types';
import {
  calculateAvailableDays,
  computeDeadlineFromDuration,
  analyzeCapacityAndAllocation,
  generateChaptersPlan,
  BUILT_IN_CATEGORIES,
  GOAL_TEMPLATES,
} from '@/lib/goal-service';
import { getTodayKey, addDays } from '@/lib/date-utils';
import {
  Target,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface GoalCreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Goal) => void;
  initialTemplateId?: string;
}

export function GoalCreateWizard({
  isOpen,
  onClose,
  onSaveGoal,
  initialTemplateId,
}: GoalCreateWizardProps) {
  const todayKey = getTodayKey();

  const initialTmpl = useMemo(
    () => (initialTemplateId ? GOAL_TEMPLATES.find((t) => t.id === initialTemplateId) : undefined),
    [initialTemplateId]
  );

  // Wizard Step (1, 2, 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Information
  const [title, setTitle] = useState(initialTmpl?.title || '');
  const [category, setCategory] = useState<string>(initialTmpl?.category || 'Study');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState(initialTmpl?.description || '');
  const [why, setWhy] = useState(initialTmpl?.why || '');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [startDate, setStartDate] = useState(todayKey);
  const [deadline, setDeadline] = useState(
    initialTmpl ? addDays(todayKey, initialTmpl.defaultDays) : addDays(todayKey, 90)
  );
  const [durationType, setDurationType] = useState<GoalDurationType>(
    initialTmpl?.durationType || '3_months'
  );

  // Step 2: Measurement
  const [measurementType, setMeasurementType] = useState<GoalMeasurementType>(
    initialTmpl?.measurementType || 'curriculum'
  );
  const [targetValue, setTargetValue] = useState<number>(100);
  const [unit, setUnit] = useState<string>('');

  // Step 3: Planning Method & Chapters
  const [planningMethod, setPlanningMethod] = useState<'hybrid' | 'ai' | 'manual'>('hybrid');
  const [bufferPreference, setBufferPreference] = useState<GoalBufferPreference>('normal');
  const [bufferDays, setBufferDays] = useState<number>(initialTmpl?.bufferDays || 3);
  const [chapters, setChapters] = useState<ChapterItem[]>(() => {
    const tmplToUse = initialTmpl || GOAL_TEMPLATES[0];
    if (tmplToUse?.chapters && tmplToUse.chapters.length > 0) {
      return tmplToUse.chapters.map((c, idx) => ({
        id: `ch_tmpl_${idx + 1}`,
        number: idx + 1,
        title: c.title,
        assignedDays: c.assignedDays,
        estimatedDays: c.assignedDays,
        difficulty: c.difficulty,
        status: idx === 0 ? 'in_progress' : 'not_started',
        completed: false,
        progress: 0,
        subtopics: c.subtopics?.map((st, sIdx) => ({
          id: `st_${idx}_${sIdx}`,
          title: st.title,
          assignedDays: st.assignedDays,
          completed: false,
          progress: 0,
        })),
      }));
    }
    return [];
  });
  const [batchText, setBatchText] = useState('');
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Recalculate deadline when durationType changes
  const handleDurationChange = (type: GoalDurationType) => {
    setDurationType(type);
    if (type !== 'custom') {
      setDeadline(computeDeadlineFromDuration(startDate, type));
    }
  };

  // Available days calculated dynamically based on dates (Section 2, 3)
  const availableDays = useMemo(() => {
    return calculateAvailableDays(startDate, deadline);
  }, [startDate, deadline]);

  // Allocation analysis (Section 11, 12)
  const allocation = useMemo(() => {
    return analyzeCapacityAndAllocation(startDate, deadline, chapters, bufferDays);
  }, [startDate, deadline, chapters, bufferDays]);

  // AI Plan Generator (Section 6, 23)
  const handleGenerateAIPlan = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/goals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_plan',
          goalData: {
            title,
            category: category === 'Custom' ? customCategory : category,
            measurementType,
            startDate,
            deadline,
            availableDays,
            why,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI plan generation failed');
      }

      const plan = data.plan;
      if (plan.chapters && plan.chapters.length > 0) {
        const enriched: ChapterItem[] = plan.chapters.map((c: any, idx: number) => ({
          id: `ch_ai_${Date.now()}_${idx + 1}`,
          number: idx + 1,
          title: c.title,
          assignedDays: Number(c.assignedDays) || 4,
          estimatedDays: Number(c.assignedDays) || 4,
          difficulty: c.difficulty || 'medium',
          status: idx === 0 ? 'in_progress' : 'not_started',
          completed: false,
          progress: 0,
          notes: c.notes || '',
          subtopics: (c.subtopics || []).map((st: any, sIdx: number) => ({
            id: `st_${idx}_${sIdx}`,
            title: st.title,
            assignedDays: st.assignedDays || 1,
            completed: false,
            progress: 0,
          })),
        }));
        setChapters(enriched);
      }

      if (plan.bufferDaysRecommendation) {
        setBufferDays(plan.bufferDaysRecommendation);
      }
    } catch (err: any) {
      console.warn('AI planning failed, fallback to local distribution:', err);
      setAiError(err.message || 'Could not reach AI copilot; manual editing active.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Chapter editing helpers
  const handleUpdateChapterDays = (index: number, newDays: number) => {
    const safeDays = Math.max(1, Math.min(30, newDays));
    setChapters((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          const diff: ChapterDifficulty =
            safeDays <= 3 ? 'easy' : safeDays <= 5 ? 'medium' : safeDays <= 7 ? 'hard' : 'very_hard';
          return { ...c, assignedDays: safeDays, difficulty: diff };
        }
        return c;
      })
    );
  };

  const handleUpdateChapterTitle = (index: number, newTitle: string) => {
    setChapters((prev) => prev.map((c, i) => (i === index ? { ...c, title: newTitle } : c)));
  };

  const handleRemoveChapter = (index: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddChapter = () => {
    const nextNumber = chapters.length + 1;
    setChapters((prev) => [
      ...prev,
      {
        id: `ch_new_${Date.now()}_${nextNumber}`,
        number: nextNumber,
        title: `Chapter ${nextNumber}`,
        assignedDays: 4,
        estimatedDays: 4,
        difficulty: 'medium',
        status: 'not_started',
        completed: false,
        progress: 0,
      },
    ]);
  };

  const handleApplyBatchText = () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const newChapters: ChapterItem[] = lines.map((line, idx) => ({
      id: `ch_batch_${Date.now()}_${idx + 1}`,
      number: idx + 1,
      title: line.replace(/^[0-9]+[\.\-\:]\s*/, ''),
      assignedDays: idx % 5 === 0 ? 7 : idx % 3 === 0 ? 5 : 3,
      estimatedDays: idx % 5 === 0 ? 7 : idx % 3 === 0 ? 5 : 3,
      difficulty: idx % 5 === 0 ? 'hard' : idx % 3 === 0 ? 'medium' : 'easy',
      status: idx === 0 ? 'in_progress' : 'not_started',
      completed: false,
      progress: 0,
    }));

    setChapters(newChapters);
    setShowBatchInput(false);
  };

  // Submit complete goal
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Run scheduling engine
    const scheduleResult = generateChaptersPlan(chapters, startDate, bufferDays);

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      title: title.trim(),
      category: category === 'Custom' ? customCategory || 'Custom' : category,
      description: description.trim() || undefined,
      why: why.trim() || undefined,
      priority,
      startDate,
      deadline,
      targetDate: deadline,
      durationType,
      measurementType,
      planningMethod,
      targetValue: measurementType === 'curriculum' ? chapters.length : targetValue,
      currentValue: 0,
      unit: unit || undefined,
      bufferPreference,
      bufferDays,
      status: 'not_started',
      progress: 0,
      plannedProgress: 0,
      actualProgress: 0,
      progressDifference: 0,
      isStudyGoal: measurementType === 'curriculum',
      chapters: measurementType === 'curriculum' ? scheduleResult.chapters : [],
      milestones: scheduleResult.milestones,
      reviews: [],
      history: [
        {
          id: `hist_init_${Date.now()}`,
          goalId: `goal_${Date.now()}`,
          changeType: 'status_changed',
          description: `Goal created with ${chapters.length} chapter(s) and ${availableDays} available days.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveGoal(newGoal);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header with Step Indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  {step === 1
                    ? 'Step 1: Goal Essentials'
                    : step === 2
                    ? 'Step 2: Measurement Method'
                    : 'Step 3: Chapter Effort & Timeline'}
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Step {step} of 3
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {step === 1
                  ? 'Define the objective, duration, deadline, and why it matters.'
                  : step === 2
                  ? 'Choose how progress is quantified (curriculum, quantity, time, etc.).'
                  : 'Assign days per chapter, manage buffer, and check capacity.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Form Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ============================================================== */}
          {/* STEP 1: BASIC INFORMATION */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Goal Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete Class 10 Maths Syllabus, Launch Web Product, Save ₹20,000..."
                  className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 font-medium"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BUILT_IN_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        category === cat
                          ? 'bg-sky-500 text-white border-sky-500 shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {category === 'Custom' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="mt-2 w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                )}
              </div>

              {/* Why This Goal Matters (Section 2 & 3) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Why This Goal Matters (Core Purpose)
                </label>
                <input
                  type="text"
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="e.g. Secure high grades for board exams, build financial independence..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Priority & Duration Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['low', 'medium', 'high', 'critical'] as GoalPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 text-xs font-bold uppercase rounded-lg border transition ${
                          priority === p
                            ? p === 'critical'
                              ? 'bg-rose-500 text-white border-rose-500'
                              : p === 'high'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : p === 'medium'
                              ? 'bg-sky-500 text-white border-sky-500'
                              : 'bg-zinc-600 text-white border-zinc-600'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Duration Horizon
                  </label>
                  <select
                    value={durationType}
                    onChange={(e) => handleDurationChange(e.target.value as GoalDurationType)}
                    className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  >
                    <option value="1_week">1 Week</option>
                    <option value="1_month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="1_year">1 Year</option>
                    <option value="long_term">Long Term</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>
              </div>

              {/* Start Date & Deadline (Section 2, 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      setDurationType('custom');
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-zinc-500">Available Calendar Time:</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                    {availableDays} Days Available
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: MEASUREMENT TYPE (Section 4) */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                  How should progress be measured?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  The UI adapts automatically depending on the selected measurement type.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Study / Curriculum */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('curriculum')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'curriculum'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Study / Curriculum-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Chapters, topics, and custom days per chapter (e.g. Real Numbers 3d, Triangles 7d).
                    </span>
                  </div>
                </button>

                {/* 2. Quantity */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('quantity')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'quantity'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Target className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Quantity-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Target amount with units (e.g. Save ₹20,000, Write 50,000 words).
                    </span>
                  </div>
                </button>

                {/* 3. Count-based */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('count')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'count'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Layers className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Count-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Discrete items to finish (e.g. Read 20 books, Solve 200 questions).
                    </span>
                  </div>
                </button>

                {/* 4. Time-based */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('time')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'time'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Time-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Accumulate study/work hours (e.g. Study 100 hours).
                    </span>
                  </div>
                </button>

                {/* 5. Consistency */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('consistency')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'consistency'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Consistency-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Habitual repetition (e.g. Exercise 4 times per week).
                    </span>
                  </div>
                </button>

                {/* 6. Completion */}
                <button
                  type="button"
                  onClick={() => setMeasurementType('completion')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                    measurementType === 'completion'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Target className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block">Completion-Based</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Single project state: Not Started $\rightarrow$ In Progress $\rightarrow$ Completed.
                    </span>
                  </div>
                </button>
              </div>

              {/* Target value inputs if quantity/count/time */}
              {measurementType !== 'curriculum' && measurementType !== 'completion' && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                      Target Target Value
                    </label>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                      Unit (Optional)
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. ₹, hours, books, sessions"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: CHAPTER EFFORT & PLANNING ENGINE (Sections 8, 9, 10, 11, 12) */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Planning Method Selector (Section 5) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Planning Method: {planningMethod === 'hybrid' ? 'Hybrid (Recommended)' : planningMethod.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    AI suggests a realistic roadmap $\rightarrow$ you review and edit $\rightarrow$ you confirm.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateAIPlan}
                    disabled={isAiLoading}
                    className="px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 hover:bg-sky-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>{isAiLoading ? 'Analyzing...' : 'Generate with AI'}</span>
                  </button>
                </div>
              </div>

              {aiError && (
                <div className="p-3 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl">
                  {aiError}
                </div>
              )}

              {/* OVER-ALLOCATION / EXTRA DAYS WARNING BAR (Section 11, 12) */}
              {allocation.isOverAllocated ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">
                        Over-Allocated Schedule Warning
                      </h4>
                      <p className="text-xs text-rose-800 dark:text-rose-300">
                        &quot;Your current plan requires <span className="font-bold underline">{allocation.totalRequiredDays} days</span>, but you only have <span className="font-bold underline">{allocation.availableDays} days</span> available.&quot;
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-900 dark:text-rose-200">
                    <span className="font-bold block mb-1">Recommended Adjustments:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Reduce assigned days for lengthy chapters (e.g. from 7d to 5d)</li>
                      <li>Extend deadline by {allocation.overAllocatedBy} days</li>
                      <li>Reduce buffer preference days</li>
                    </ul>
                  </div>
                </div>
              ) : allocation.hasExtraDays ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Schedule Fits Comfortably ({allocation.extraDaysCount} Extra Days Available)
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Recommended allocation: {allocation.suggestedAllocation.revisionDays}d Revision · {allocation.suggestedAllocation.pyqPracticeDays}d PYQs · {allocation.suggestedAllocation.bufferDays}d Buffer
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Buffer Days Selector (Section 30) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-xs">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                    Buffer Days Allocation
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Safeguard for unexpected delays, difficult topics, and rest.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 2, 3, 5, 7].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBufferDays(b);
                        setBufferPreference(b === 0 ? 'none' : b <= 2 ? 'small' : b <= 5 ? 'normal' : 'large');
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                        bufferDays === b
                          ? 'bg-sky-500 text-white'
                          : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {b}d
                    </button>
                  ))}
                </div>
              </div>

              {/* CHAPTERS ACCORDION / LIST (Section 8, 9, 10) */}
              {measurementType === 'curriculum' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                        <span>Chapter Duration &amp; Effort Customizer</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Assign how many days each chapter deserves (Never divided equally!).
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowBatchInput(!showBatchInput)}
                        className="px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 cursor-pointer"
                      >
                        {showBatchInput ? 'Hide Paste' : '📋 Paste Titles'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddChapter}
                        className="px-2.5 py-1 text-xs font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 cursor-pointer"
                      >
                        + Add Chapter
                      </button>
                    </div>
                  </div>

                  {/* Batch Paste Box */}
                  {showBatchInput && (
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                        Paste Chapter Titles (One per line)
                      </span>
                      <textarea
                        rows={3}
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        placeholder="Real Numbers&#10;Polynomials&#10;Pair of Linear Equations&#10;Triangles..."
                        className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleApplyBatchText}
                          className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 cursor-pointer"
                        >
                          Apply Titles
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chapters List */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {chapters.map((ch, idx) => {
                      const days = ch.assignedDays || 3;
                      const isLengthy = days >= 7;

                      return (
                        <div
                          key={ch.id || idx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                            isLengthy
                              ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                              : days <= 3
                              ? 'bg-sky-50/30 dark:bg-sky-950/20 border-sky-200/70 dark:border-sky-900/50'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-mono font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center text-xs shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={ch.title}
                              onChange={(e) => handleUpdateChapterTitle(idx, e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-700"
                            />
                          </div>

                          {/* Stepper & Preset */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                              <button
                                type="button"
                                onClick={() => handleUpdateChapterDays(idx, days - 1)}
                                className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold px-1"
                              >
                                -
                              </button>
                              <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 min-w-8 text-center">
                                {days}d
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateChapterDays(idx, days + 1)}
                                className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold px-1"
                              >
                                +
                              </button>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isLengthy
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : days <= 3
                                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                              }`}
                            >
                              {isLengthy ? 'Lengthy' : days <= 3 ? 'Easy' : 'Medium'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveChapter(idx)}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !title.trim()) return;
                  setStep((prev) => (prev + 1) as any);
                }}
                disabled={step === 1 && !title.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!title.trim()}
                className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create &amp; Launch Goal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
