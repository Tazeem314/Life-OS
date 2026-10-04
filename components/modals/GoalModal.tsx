'use client';

import React, { useState, useEffect } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Goal,
  GoalTimeHorizon,
  GoalType,
  GoalStatus,
  GoalPriority,
  Milestone,
  GoalTracker,
} from '@/lib/types';
import {
  TIME_HORIZONS,
  GOAL_CATEGORIES,
  GOAL_TYPES,
  calculateGoalProgress,
} from '@/lib/goal-service';
import { getTodayKey, addDays } from '@/lib/date-utils';
import {
  X,
  Target,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Flag,
  ListTodo,
  TrendingUp,
} from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  goalToEdit: Goal | null;
  onClose: () => void;
  onSave: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => { success: boolean; error?: string };
  onDelete?: (goal: Goal) => void;
}

interface GoalFormInnerProps {
  goalToEdit: Goal | null;
  onClose: () => void;
  onSave: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => { success: boolean; error?: string };
  onDelete?: (goal: Goal) => void;
}

function GoalFormInner({ goalToEdit, onClose, onSave, onDelete }: GoalFormInnerProps) {
  const { habits, todos, goals } = useLifeOS();

  const [title, setTitle] = useState(goalToEdit?.title || '');
  const [description, setDescription] = useState(goalToEdit?.description || '');
  const [category, setCategory] = useState(goalToEdit?.category || GOAL_CATEGORIES[0]);
  const [priority, setPriority] = useState<GoalPriority>(goalToEdit?.priority || 'medium');
  const [startDate, setStartDate] = useState(goalToEdit?.startDate || getTodayKey());
  const [targetDate, setTargetDate] = useState(goalToEdit?.targetDate || addDays(getTodayKey(), 90));
  const [timeHorizon, setTimeHorizon] = useState<GoalTimeHorizon>(goalToEdit?.timeHorizon || '3_months');
  const [measurementType, setMeasurementType] = useState<GoalType>(goalToEdit?.measurementType || 'milestones');
  const [targetValue, setTargetValue] = useState<number>(goalToEdit?.targetValue ?? 100);
  const [currentValue, setCurrentValue] = useState<number>(goalToEdit?.currentValue ?? 0);
  const [unit, setUnit] = useState(goalToEdit?.unit || '');
  const [parentGoalId, setParentGoalId] = useState<string>(goalToEdit?.parentGoalId || '');
  const [notes, setNotes] = useState(goalToEdit?.notes || '');
  const [milestones, setMilestones] = useState<Milestone[]>(goalToEdit?.milestones || []);
  const [relatedHabits, setRelatedHabits] = useState<string[]>(goalToEdit?.relatedHabits || []);
  const [relatedTasks, setRelatedTasks] = useState<string[]>(goalToEdit?.relatedTasks || []);
  const [relatedTrackers, setRelatedTrackers] = useState<GoalTracker[]>(goalToEdit?.relatedTrackers || []);

  // Academic specific fields
  const isInitialStudy = Boolean(
    goalToEdit?.academicMetadata ||
      goalToEdit?.category.toLowerCase().includes('academic') ||
      goalToEdit?.category.toLowerCase().includes('study')
  );
  const [isStudyGoal, setIsStudyGoal] = useState(isInitialStudy);
  const [totalChapters, setTotalChapters] = useState<number | ''>(
    goalToEdit?.academicMetadata?.totalChapters ?? ''
  );
  const [targetQuestions, setTargetQuestions] = useState<number | ''>(
    goalToEdit?.academicMetadata?.targetQuestions ?? ''
  );
  const [revisionSessions, setRevisionSessions] = useState<number | ''>(
    goalToEdit?.academicMetadata?.revisionSessions ?? ''
  );
  const [samplePapersTarget, setSamplePapersTarget] = useState<number | ''>(
    goalToEdit?.academicMetadata?.samplePapersTarget ?? ''
  );
  const [mockTestTargetScore, setMockTestTargetScore] = useState<number | ''>(
    goalToEdit?.academicMetadata?.mockTestTargetScore ?? ''
  );

  const [errorMessage, setErrorMessage] = useState('');

  // Milestone management
  const handleAddMilestone = () => {
    const newM: Milestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: `Milestone ${milestones.length + 1}`,
      deadline: targetDate,
      status: 'not_started',
      progress: 0,
    };
    setMilestones([...milestones, newM]);
  };

  const handleUpdateMilestone = (idx: number, updates: Partial<Milestone>) => {
    const next = [...milestones];
    next[idx] = { ...next[idx], ...updates };
    setMilestones(next);
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  // Add study tracker preset
  const handleAddStudyTracker = (type: 'chapter' | 'question' | 'paper' | 'revision') => {
    const config = {
      chapter: { name: 'Chapters Completed', unit: 'chapters', target: 6 },
      question: { name: 'Practice Questions', unit: 'questions', target: 500 },
      paper: { name: 'Sample Papers', unit: 'papers', target: 10 },
      revision: { name: 'Revision Sessions', unit: 'sessions', target: 20 },
    }[type];

    const newTr: GoalTracker = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'study',
      name: config.name,
      unit: config.unit,
      target: config.target,
      current: 0,
    };
    setRelatedTrackers([...relatedTrackers, newTr]);
  };

  const handleRemoveTracker = (id: string) => {
    setRelatedTrackers(relatedTrackers.filter((t) => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Goal title is required.');
      return;
    }

    const academicData = isStudyGoal
      ? {
          isStudyGoal: true,
          totalChapters: totalChapters !== '' ? Number(totalChapters) : undefined,
          targetQuestions: targetQuestions !== '' ? Number(targetQuestions) : undefined,
          revisionSessions: revisionSessions !== '' ? Number(revisionSessions) : undefined,
          samplePapersTarget: samplePapersTarget !== '' ? Number(samplePapersTarget) : undefined,
          mockTestTargetScore: mockTestTargetScore !== '' ? Number(mockTestTargetScore) : undefined,
        }
      : undefined;

    const res = onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      startDate,
      targetDate,
      timeHorizon,
      measurementType,
      targetValue: Number(targetValue) || 100,
      currentValue: Number(currentValue) || 0,
      unit: unit.trim() || undefined,
      parentGoalId: parentGoalId || undefined,
      notes: notes.trim() || undefined,
      status: goalToEdit ? goalToEdit.status : 'active',
      milestones,
      relatedHabits,
      relatedTasks,
      relatedTrackers,
      academicMetadata: academicData,
    });

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to save goal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                {goalToEdit ? 'Edit Goal & Roadmap' : 'Create New Goal'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Break down high-level objectives into measurable milestones & actions
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Goal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Full-Stack Web Dev or Complete 6 Science Chapters"
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Why this matters (Description & Purpose)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific motivations, end results, and success criteria..."
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Category, Priority, and Hierarchy Parent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value.toLowerCase().includes('academic') || e.target.value.toLowerCase().includes('study')) {
                    setIsStudyGoal(true);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100"
              >
                {GOAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Parent Goal (Hierarchy)
              </label>
              <select
                value={parentGoalId}
                onChange={(e) => setParentGoalId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 truncate"
              >
                <option value="">None (Top-Level Goal)</option>
                {goals
                  .filter((g) => !goalToEdit || g.id !== goalToEdit.id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.timeHorizon})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Time Horizon Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Time Horizon
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {TIME_HORIZONS.map((h) => {
                const isSelected = timeHorizon === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setTimeHorizon(h.id);
                      if (h.id === 'today') setTargetDate(getTodayKey());
                      else if (h.id === 'this_week') setTargetDate(addDays(getTodayKey(), 7));
                      else if (h.id === 'this_month') setTargetDate(addDays(getTodayKey(), 30));
                      else if (h.id === '3_months') setTargetDate(addDays(getTodayKey(), 90));
                      else if (h.id === '6_months') setTargetDate(addDays(getTodayKey(), 180));
                      else if (h.id === 'this_year') setTargetDate(addDays(getTodayKey(), 365));
                      else if (h.id === 'long_term') setTargetDate(addDays(getTodayKey(), 730));
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center border transition ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 text-sky-700 dark:text-sky-300 font-semibold'
                        : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    <div>{h.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Target Deadline
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Measurement Type & Values */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                Measurement Type
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOAL_TYPES.map((gt) => {
                const isSelected = measurementType === gt.id;
                return (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => setMeasurementType(gt.id)}
                    className={`p-2 rounded-lg text-left border transition text-xs ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-800 dark:text-sky-200'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className="font-semibold">{gt.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{gt.description}</div>
                  </button>
                );
              })}
            </div>

            {measurementType !== 'checkbox' && measurementType !== 'milestones' && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Current Progress
                  </label>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Target Total
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Unit (optional)
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="questions, pages, $"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Academic / Study Planning Toggle & Presets */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Study & Academic Goal Support
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsStudyGoal(!isStudyGoal)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                  isStudyGoal
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {isStudyGoal ? 'Enabled' : 'Enable'}
              </button>
            </div>

            {isStudyGoal && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] text-zinc-500">
                  Set academic benchmarks for chapters, revision sessions, solved questions, and mock tests.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 mb-1 truncate">
                      Chapters Target
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 6"
                      value={totalChapters}
                      onChange={(e) => setTotalChapters(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 mb-1 truncate">
                      Questions Target
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={targetQuestions}
                      onChange={(e) => setTargetQuestions(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 mb-1 truncate">
                      Revisions Target
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      value={revisionSessions}
                      onChange={(e) => setRevisionSessions(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 mb-1 truncate">
                      Sample Papers
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={samplePapersTarget}
                      onChange={(e) => setSamplePapersTarget(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-500 mb-1 truncate">
                      Mock Test %
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 90"
                      value={mockTestTargetScore}
                      onChange={(e) => setMockTestTargetScore(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-zinc-400 self-center">Add quick trackers:</span>
                  <button
                    type="button"
                    onClick={() => handleAddStudyTracker('chapter')}
                    className="px-2 py-1 text-[11px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-amber-400 text-zinc-700 dark:text-zinc-200"
                  >
                    + Chapters Tracker
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStudyTracker('question')}
                    className="px-2 py-1 text-[11px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-amber-400 text-zinc-700 dark:text-zinc-200"
                  >
                    + Questions Tracker
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStudyTracker('paper')}
                    className="px-2 py-1 text-[11px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-amber-400 text-zinc-700 dark:text-zinc-200"
                  >
                    + Sample Papers Tracker
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Milestones Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-sky-500" />
                  Milestones ({milestones.length})
                </h3>
                <p className="text-[11px] text-zinc-400">Divide long-term goals into smaller sequential milestones</p>
              </div>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 rounded-lg hover:bg-sky-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2 italic text-center">
                No milestones added yet. Click &quot;Add Milestone&quot; to break down your roadmap.
              </p>
            ) : (
              <div className="space-y-2">
                {milestones.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => handleUpdateMilestone(idx, { title: e.target.value })}
                        placeholder="Milestone title"
                        className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                      />
                      <input
                        type="date"
                        value={m.deadline || ''}
                        onChange={(e) => handleUpdateMilestone(idx, { deadline: e.target.value })}
                        className="px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trackers List if any */}
          {relatedTrackers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Active Trackers ({relatedTrackers.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedTrackers.map((tr) => (
                  <div
                    key={tr.id}
                    className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{tr.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        Target: {tr.target} {tr.unit} (Current: {tr.current})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTracker(tr.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal Integrations (Habits & Tasks) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Linked Habits
              </label>
              <p className="text-[11px] text-zinc-400 mb-1.5">Completing linked habits updates goal progress</p>
              {habits.length === 0 ? (
                <p className="text-[11px] text-zinc-400 italic">No habits created yet.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
                  {habits.map((h) => {
                    const isChecked = relatedHabits.includes(h.id);
                    return (
                      <label key={h.id} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setRelatedHabits([...relatedHabits, h.id]);
                            else setRelatedHabits(relatedHabits.filter((id) => id !== h.id));
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="truncate">{h.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Linked Tasks
              </label>
              <p className="text-[11px] text-zinc-400 mb-1.5">Checking off tasks advances milestone completion</p>
              {todos.length === 0 ? (
                <p className="text-[11px] text-zinc-400 italic">No tasks created yet.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
                  {todos.slice(0, 10).map((t) => {
                    const isChecked = relatedTasks.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setRelatedTasks([...relatedTasks, t.id]);
                            else setRelatedTasks(relatedTasks.filter((id) => id !== t.id));
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="truncate">{t.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Strategy & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Milestone checkpoints, resources, books, links, or tips..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            {goalToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(goalToEdit)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-xs transition"
              >
                {goalToEdit ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GoalModal({ isOpen, goalToEdit, onClose, onSave, onDelete }: GoalModalProps) {
  if (!isOpen) return null;
  return (
    <GoalFormInner
      key={goalToEdit ? goalToEdit.id : 'new'}
      goalToEdit={goalToEdit}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}

