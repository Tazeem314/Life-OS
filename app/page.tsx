'use client';

import React, { useState } from 'react';
import { LifeOSProvider, useLifeOS } from '@/context/LifeOSContext';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { ToastContainer } from '@/components/ToastContainer';
import { DashboardView } from '@/components/DashboardView';
import { HabitsView } from '@/components/HabitsView';
import { TodoView } from '@/components/TodoView';
import { CalendarView } from '@/components/CalendarView';
import { ProgressView } from '@/components/ProgressView';
import { SettingsView } from '@/components/SettingsView';
import { HabitModal } from '@/components/modals/HabitModal';
import { TodoModal } from '@/components/modals/TodoModal';
import { HabitHistoryModal } from '@/components/modals/HabitHistoryModal';
import { HabitDetailAnalyticsModal } from '@/components/modals/HabitDetailAnalyticsModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { GoalsDashboard } from '@/components/goals/GoalsDashboard';
import { GoalDetailView } from '@/components/goals/GoalDetailView';
import { GoalCreateWizard } from '@/components/goals/GoalCreateWizard';
import { GoalAIModal } from '@/components/goals/GoalAIModal';
import { GoalWeeklyReviewModal } from '@/components/goals/GoalWeeklyReviewModal';
import { Habit, Todo, Goal, GoalWeeklyReview } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';

function LifeOSAppContent() {
  const {
    activeTab,
    goals,
    createGoal,
    updateGoal,
    deleteGoal,
    createHabit,
    updateHabit,
    deleteHabit,
    createTodo,
    updateTodo,
    deleteTodo,
    resetDataToDefaults,
    clearData,
  } = useLifeOS();

  // Habit Modal State
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  // Todo Modal State
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const [defaultTodoDate, setDefaultTodoDate] = useState<string | undefined>(undefined);

  // Goals State
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [createGoalTemplateId, setCreateGoalTemplateId] = useState<string | undefined>(undefined);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [aiCopilotGoal, setAiCopilotGoal] = useState<Goal | null>(null);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [weeklyReviewGoal, setWeeklyReviewGoal] = useState<Goal | null>(null);

  // Habit History & Analytics Modal State
  const [selectedHistoryHabit, setSelectedHistoryHabit] = useState<Habit | null>(null);
  const [selectedAnalyticsHabit, setSelectedAnalyticsHabit] = useState<Habit | null>(null);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Modal Triggers
  const handleOpenNewHabit = () => {
    setHabitToEdit(null);
    setIsHabitModalOpen(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsHabitModalOpen(true);
  };

  const handleDeleteHabitPrompt = (habit: Habit) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Habit?',
      message: `Are you sure you want to delete "${habit.name}"? Past completion records will be archived.`,
      confirmText: 'Delete Habit',
      isDestructive: true,
      onConfirm: () => {
        deleteHabit(habit.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleOpenNewTodo = (date?: string) => {
    setTodoToEdit(null);
    setDefaultTodoDate(date);
    setIsTodoModalOpen(true);
  };

  const handleEditTodo = (todo: Todo) => {
    setTodoToEdit(todo);
    setDefaultTodoDate(todo.date);
    setIsTodoModalOpen(true);
  };

  const handleDeleteTodoPrompt = (todo: Todo) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete To-Do?',
      message: `Are you sure you want to remove "${todo.title}"?`,
      confirmText: 'Delete Task',
      isDestructive: true,
      onConfirm: () => {
        deleteTodo(todo.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteGoalPrompt = (goal: Goal) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Goal?',
      message: `Are you sure you want to delete "${goal.title}" and its roadmaps?`,
      confirmText: 'Delete Goal',
      isDestructive: true,
      onConfirm: () => {
        deleteGoal(goal.id);
        if (selectedGoal?.id === goal.id) {
          setSelectedGoal(null);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handlePromptResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Starter Sample Data?',
      message: 'This will reset habits and tasks to the default sample routine.',
      confirmText: 'Reset to Sample Data',
      isDestructive: false,
      onConfirm: () => {
        resetDataToDefaults();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handlePromptClearData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Wipe All Data?',
      message: 'This action will permanently delete all habits, to-dos, and streaks from this browser.',
      confirmText: 'Wipe Everything',
      isDestructive: true,
      onConfirm: () => {
        clearData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Dynamic Page Views */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <DashboardView
                  onOpenNewHabit={handleOpenNewHabit}
                  onOpenNewTodo={() => handleOpenNewTodo()}
                  onEditHabit={handleEditHabit}
                  onEditTodo={handleEditTodo}
                  onViewHabitHistory={(habit) => setSelectedHistoryHabit(habit)}
                />
              </motion.div>
            )}

            {activeTab === 'habits' && (
              <motion.div
                key="habits"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <HabitsView
                  onOpenNewHabit={handleOpenNewHabit}
                  onEditHabit={handleEditHabit}
                  onDeleteHabit={handleDeleteHabitPrompt}
                  onViewHabitHistory={(habit) => setSelectedHistoryHabit(habit)}
                  onViewHabitAnalytics={(habit) => setSelectedAnalyticsHabit(habit)}
                />
              </motion.div>
            )}

            {activeTab === 'todos' && (
              <motion.div
                key="todos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <TodoView
                  onOpenNewTodo={(date) => handleOpenNewTodo(date)}
                  onEditTodo={handleEditTodo}
                  onDeleteTodo={handleDeleteTodoPrompt}
                />
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {selectedGoal ? (
                  <GoalDetailView
                    goal={goals.find((g) => g.id === selectedGoal.id) || selectedGoal}
                    onBack={() => setSelectedGoal(null)}
                    onUpdateGoal={(updatedGoal) => {
                      updateGoal(updatedGoal.id, updatedGoal);
                      setSelectedGoal(updatedGoal);
                    }}
                    onDeleteGoal={handleDeleteGoalPrompt}
                    onOpenAICopilot={(g) => {
                      setAiCopilotGoal(g);
                      setIsAICopilotOpen(true);
                    }}
                    onOpenWeeklyReview={(g) => {
                      setWeeklyReviewGoal(g);
                      setIsWeeklyReviewOpen(true);
                    }}
                    onAddLinkedTodo={(title, dueDate) => {
                      createTodo({
                        title,
                        date: dueDate,
                        priority: 'high',
                        completed: false,
                      });
                    }}
                  />
                ) : (
                  <GoalsDashboard
                    goals={goals}
                    onOpenCreateGoal={(templateId) => {
                      setCreateGoalTemplateId(templateId);
                      setIsCreateGoalOpen(true);
                    }}
                    onSelectGoal={(goal) => setSelectedGoal(goal)}
                    onOpenAICopilot={(goal) => {
                      setAiCopilotGoal(goal || null);
                      setIsAICopilotOpen(true);
                    }}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <CalendarView
                  onOpenNewTodo={(date) => handleOpenNewTodo(date)}
                  onOpenNewHabit={handleOpenNewHabit}
                  onEditTodo={handleEditTodo}
                  onDeleteTodo={handleDeleteTodoPrompt}
                  onEditHabit={handleEditHabit}
                  onDeleteHabit={handleDeleteHabitPrompt}
                  onViewHabitHistory={(habit) => setSelectedHistoryHabit(habit)}
                />
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ProgressView />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <SettingsView
                  onConfirmReset={handlePromptResetData}
                  onConfirmClear={handlePromptClearData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Dock */}
      <MobileNav />

      {/* Floating Notifications */}
      <ToastContainer />

      {/* Modals & Dialogs */}
      <HabitModal
        isOpen={isHabitModalOpen}
        habitToEdit={habitToEdit}
        onClose={() => setIsHabitModalOpen(false)}
        onSave={(data) => {
          if (habitToEdit) {
            return updateHabit(habitToEdit.id, data);
          } else {
            return createHabit(data);
          }
        }}
        onDelete={handleDeleteHabitPrompt}
      />

      <TodoModal
        isOpen={isTodoModalOpen}
        todoToEdit={todoToEdit}
        defaultDate={defaultTodoDate}
        onClose={() => setIsTodoModalOpen(false)}
        onSave={(data) => {
          if (todoToEdit) {
            return updateTodo(todoToEdit.id, data);
          } else {
            return createTodo(data);
          }
        }}
      />

      <HabitHistoryModal
        isOpen={!!selectedHistoryHabit}
        habit={selectedHistoryHabit}
        onClose={() => setSelectedHistoryHabit(null)}
      />

      <HabitDetailAnalyticsModal
        isOpen={!!selectedAnalyticsHabit}
        habit={selectedAnalyticsHabit}
        onClose={() => setSelectedAnalyticsHabit(null)}
      />

      {/* Goal Modals & Wizards */}
      <GoalCreateWizard
        key={createGoalTemplateId || (isCreateGoalOpen ? 'open' : 'closed')}
        isOpen={isCreateGoalOpen}
        onClose={() => setIsCreateGoalOpen(false)}
        initialTemplateId={createGoalTemplateId}
        onSaveGoal={(newGoal) => {
          createGoal(newGoal);
          setIsCreateGoalOpen(false);
          setSelectedGoal(newGoal);
        }}
      />

      <GoalAIModal
        isOpen={isAICopilotOpen}
        goal={aiCopilotGoal || selectedGoal || (goals.length > 0 ? goals[0] : null)}
        onClose={() => setIsAICopilotOpen(false)}
        onApplyPlanChanges={(goalId, changes) => {
          updateGoal(goalId, changes);
          if (selectedGoal && selectedGoal.id === goalId) {
            setSelectedGoal({ ...selectedGoal, ...changes });
          }
        }}
      />

      <GoalWeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        goal={weeklyReviewGoal}
        onClose={() => setIsWeeklyReviewOpen(false)}
        onSaveReview={(review: GoalWeeklyReview) => {
          if (weeklyReviewGoal) {
            const existingReviews = weeklyReviewGoal.reviews || [];
            const updated = {
              ...weeklyReviewGoal,
              reviews: [review, ...existingReviews],
            };
            updateGoal(weeklyReviewGoal.id, updated);
            setSelectedGoal(updated);
          }
          setIsWeeklyReviewOpen(false);
        }}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <LifeOSProvider>
      <LifeOSAppContent />
    </LifeOSProvider>
  );
}
