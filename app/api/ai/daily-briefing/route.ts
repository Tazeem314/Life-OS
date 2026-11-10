import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithRetryAndFallback } from '@/lib/gemini-server';
import { AIDailyBriefing } from '@/lib/notification-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || 'local_user';
    const dateKey = body.dateKey || body.date || new Date().toISOString().split('T')[0];
    const name = body.userName || 'Champion';
    const desiredTone = body.tone || 'executive';

    const rawStats = body.stats || {};
    const tasksDueCount = rawStats.tasksDueCount ?? body.pendingTasksCount ?? 0;
    const tasksCompletedCount = rawStats.tasksCompletedCount ?? 0;
    const habitsScheduledCount = rawStats.habitsScheduledCount ?? body.habitsDueCount ?? 0;
    const habitsCompletedCount = rawStats.habitsCompletedCount ?? body.habitsCompletedCount ?? 0;
    const streakDays = rawStats.streakDays ?? 0;
    const upcomingGoalsCount = rawStats.upcomingGoalsCount ?? body.activeGoalsCount ?? 0;

    const stats = {
      tasksDueCount,
      tasksCompletedCount,
      habitsScheduledCount,
      habitsCompletedCount,
      streakDays,
      upcomingGoalsCount,
    };

    const todayTasks = body.todayTasks || (body.highPriorityTasks ? body.highPriorityTasks.map((t: string) => ({ title: t, priority: 'high', completed: false })) : []);
    const todayHabits = body.todayHabits || [];

    let summary = '';
    let keyPriorities: string[] = [];

    // Check for Gemini API key
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the executive life assistant inside Life OS. Generate a calm, concise, professional daily briefing for ${name}.
Current Date: ${dateKey}
Tone: ${desiredTone}
Deterministic User Data:
- Tasks planned today: ${stats.tasksDueCount} (${stats.tasksCompletedCount} already completed)
- Scheduled habits today: ${stats.habitsScheduledCount} (${stats.habitsCompletedCount} completed)
- Active daily streak: ${stats.streakDays} days
- Upcoming goals: ${stats.upcomingGoalsCount}
- Top tasks: ${JSON.stringify(todayTasks.slice(0, 5))}
- Top habits: ${JSON.stringify(todayHabits.slice(0, 5))}

Instructions:
1. Provide a 2 to 3 sentence executive summary of today's focus and momentum.
2. Provide 2 or 3 short actionable priority bullets (each under 10 words).
3. Strictly DO NOT hallucinate, invent fake tasks, or calculate different numbers. Base all comments exclusively on the provided data.

Respond with strict JSON format:
{
  "summary": "2-3 sentences here",
  "keyPriorities": ["Priority 1", "Priority 2"]
}`;

        const response = await generateContentWithRetryAndFallback({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        if (response?.text) {
          const parsed = JSON.parse(response.text);
          summary = parsed.summary || '';
          keyPriorities = Array.isArray(parsed.keyPriorities) ? parsed.keyPriorities : [];
        }
      } catch (geminiError) {
        console.warn('Gemini briefing generation fallback due to error:', geminiError);
      }
    }

    // Deterministic fallback if Gemini is offline or did not return summary
    if (!summary) {
      const remainingTasks = Math.max(0, stats.tasksDueCount - stats.tasksCompletedCount);
      const remainingHabits = Math.max(0, stats.habitsScheduledCount - stats.habitsCompletedCount);

      summary = `Good morning, ${name}. You have ${stats.tasksDueCount} task${
        stats.tasksDueCount === 1 ? '' : 's'
      } scheduled today (${remainingTasks} remaining) and ${stats.habitsScheduledCount} habit${
        stats.habitsScheduledCount === 1 ? '' : 's'
      } on your routine. Maintain your ${stats.streakDays}-day streak by tackling your highest priority task early.`;

      keyPriorities = [];
      if (todayTasks && todayTasks.length > 0) {
        const topTask = todayTasks.find((t: any) => !t.completed);
        if (topTask) keyPriorities.push(`Focus: ${topTask.title}`);
      }
      if (remainingHabits > 0) {
        keyPriorities.push(`Complete ${remainingHabits} scheduled habit${remainingHabits === 1 ? '' : 's'}`);
      }
      keyPriorities.push(`Review goals and log evening reflection`);
    }

    const briefing: AIDailyBriefing = {
      id: `briefing_${userId}_${dateKey}`,
      userId,
      date: dateKey,
      dateKey,
      headline: `Daily Briefing • ${dateKey}`,
      summary,
      keyPriorities,
      stats,
      tone: desiredTone,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      briefing,
    });
  } catch (error: any) {
    console.error('AI briefing route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate AI daily briefing' },
      { status: 500 }
    );
  }
}
