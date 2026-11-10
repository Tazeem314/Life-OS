'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { SavingsGoal, SavingsGoalCategory } from '@/lib/types';
import {
  GOAL_CATEGORIES,
  GOAL_COLORS,
} from '@/lib/savings-service';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Target,
  PiggyBank,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  TrendingUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  PiggyBank,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  TrendingUp,
  Sparkles,
  Target,
};

const AVAILABLE_ICONS = [
  'PiggyBank',
  'Shield',
  'Plane',
  'Laptop',
  'Car',
  'Home',
  'GraduationCap',
  'TrendingUp',
  'Sparkles',
  'Target',
];

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: SavingsGoal | null;
}

interface GoalFormProps {
  goalToEdit?: SavingsGoal | null;
  onClose: () => void;
}

function GoalForm({ goalToEdit, onClose }: GoalFormProps) {
  const { createSavingsGoal, updateSavingsGoal, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  const [name, setName] = useState(goalToEdit ? goalToEdit.name : '');
  const [description, setDescription] = useState(goalToEdit?.description || '');
  const [targetAmount, setTargetAmount] = useState<string>(goalToEdit ? goalToEdit.targetAmount.toString() : '');
  const [initialAmount, setInitialAmount] = useState<string>(goalToEdit ? goalToEdit.currentAmount.toString() : '');
  const [targetDate, setTargetDate] = useState(goalToEdit?.targetDate || '');
  const [category, setCategory] = useState<SavingsGoalCategory>(goalToEdit?.category || 'tech');
  const [color, setColor] = useState(goalToEdit?.color || 'emerald');
  const [icon, setIcon] = useState(goalToEdit?.icon || 'PiggyBank');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(goalToEdit?.priority || 'medium');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a goal title.');
      return;
    }

    const targetNum = parseFloat(targetAmount);
    if (isNaN(targetNum) || targetNum <= 0) {
      setError('Target amount must be a positive number.');
      return;
    }

    const initialNum = parseFloat(initialAmount) || 0;
    if (initialNum < 0) {
      setError('Initial saved amount cannot be negative.');
      return;
    }

    if (goalToEdit) {
      const res = updateSavingsGoal(goalToEdit.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: targetNum,
        currentAmount: initialNum,
        targetDate: targetDate || undefined,
        category,
        color,
        icon,
        priority,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update goal');
        return;
      }
    } else {
      const res = createSavingsGoal({
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: targetNum,
        initialDeposit: initialNum,
        targetDate: targetDate || undefined,
        category,
        color,
        icon,
        priority,
        status: 'active',
      });

      if (!res.success) {
        setError(res.error || 'Failed to create goal');
        return;
      }
    }

    onClose();
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Goal Name */}
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Wishlist / Jar Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. New Wireless Earbuds, Trip with Friends, Birthday Gift..."
            className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400 text-xs"
          />
        </div>

        {/* Target Amount & Initial Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Target Amount ({cur}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold">
                {cur}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="1000"
                className="w-full pl-7 pr-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {goalToEdit ? 'Current Balance' : 'Initial Starting Funds'} ({cur})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">
                {cur}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Category & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SavingsGoalCategory)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Target Deadline (Optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Color & Icon Theme Selection */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Color Theme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {GOAL_COLORS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-xl ${c.bg} transition-all flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Icon
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVAILABLE_ICONS.map((iconKey) => {
                const IconComp = ICON_COMPONENTS[iconKey] || PiggyBank;
                const isSelected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 ring-2 ring-sky-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                    title={iconKey}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Description & Notes */}
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Description / Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why is this goal important? What strategies are you following?"
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400 resize-none text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs transition-colors"
          >
            {goalToEdit ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </form>
    </>
  );
}

export function SavingsGoalModal({
  isOpen,
  onClose,
  goalToEdit,
}: SavingsGoalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Framer Motion Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Framer Motion Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar z-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {goalToEdit ? 'Edit Wishlist / Jar' : 'New Wishlist / Jar'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Set a target and keep your savings separated
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <GoalForm
              key={goalToEdit ? goalToEdit.id : 'new-savings-goal'}
              goalToEdit={goalToEdit}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
