import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithRetryAndFallback } from '@/lib/gemini-server';
import { generateLocalReplanProposal } from '@/lib/goal-service';
import { getTodayKey, addDays } from '@/lib/date-utils';
import { ChapterDifficulty, Goal } from '@/lib/types';

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function getTopicSubjectLabel(category: string, chapterIndex: number): string {
  const topics: Record<string, string[]> = {
    study: [
      'Foundational Principles & Key Definitions',
      'Core Theoretical Framework',
      'Analytical Methods & Formulas',
      'Comprehensive Problem Sets & Worked Examples',
      'Advanced Applications & Deep Concepts',
      'Integrated Case Studies & Practice',
      'Error Analysis & High-Yield Revisions',
      'Mock Diagnostic & Assessment Drill',
    ],
    fitness: [
      'Baseline Assessment & Movement Mechanics',
      'Hypertrophy & Aerobic Conditioning Base',
      'Progressive Overload & Strength Cycles',
      'Metabolic Conditioning & Recovery Protocols',
      'Peak Power & Performance Testing',
    ],
    career: [
      'Market Mapping & Core Skill Audits',
      'Portfolio & Key Deliverables Construction',
      'Networking & Stakeholder Outreach',
      'Interview Preparation & Case Drills',
      'Offer Negotiation & Onboarding Strategy',
    ],
    finance: [
      'Budget Audit & Cash Flow Optimization',
      'High-Interest Debt Elimination Plan',
      'Emergency Buffer & High-Yield Reserve',
      'Asset Allocation & Index Investing Strategy',
      'Long-Term Net Worth Compounding Review',
    ],
  };

  const catLower = (category || 'study').toLowerCase();
  const matched = topics[catLower] || topics.study;
  return matched[(chapterIndex - 1) % matched.length] || `Core Module ${chapterIndex}`;
}

function generateLocalFallbackPlan(goalData: any, userPrompt?: string) {
  const title = goalData?.title || 'Goal Roadmap';
  const category = goalData?.category || 'Study';
  const availableDays = Math.max(14, Number(goalData?.availableDays) || 90);
  const deadline = goalData?.deadline || addDays(getTodayKey(), availableDays);
  const why = goalData?.why || 'Achieve focused mastery and structured progression.';

  const chapterCount = Math.max(4, Math.min(12, Math.round(availableDays / 8)));
  const bufferDays = Math.max(2, Math.min(7, Math.round(availableDays * 0.08)));

  const chapters = Array.from({ length: chapterCount }).map((_, idx) => {
    const num = idx + 1;
    const isHard = num === 3 || num === 5 || num === 7;
    const isMedium = num % 2 === 0;
    const assignedDays = isHard ? 7 : isMedium ? 5 : 4;
    const diff: ChapterDifficulty = isHard ? 'hard' : isMedium ? 'medium' : 'easy';
    const topic = getTopicSubjectLabel(category, num);

    return {
      number: num,
      title: `${topic}`,
      difficulty: diff,
      assignedDays,
      notes: `Focus on core exercises, practice problem sets, and key takeaways for Chapter ${num}.`,
      subtopics: [
        { title: `Core Conceptual Foundations`, assignedDays: Math.max(1, Math.floor(assignedDays / 2)) },
        { title: `Applied Drills & Self-Testing`, assignedDays: Math.max(1, Math.ceil(assignedDays / 2)) },
      ],
    };
  });

  return {
    title,
    description: `Structured multi-phase execution roadmap for ${title}`,
    why,
    category,
    durationType: goalData?.durationType || '3_months',
    measurementType: goalData?.measurementType || 'curriculum',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    deadline,
    bufferDaysRecommendation: bufferDays,
    strategicAdvice: `Execute chapters sequentially. Finish Chapter 1 to establish solid habits, leaving ${bufferDays} buffer days at the end for final revision.`,
    chapters,
    monthlyTargets: [
      `Month 1: Complete Chapters 1-${Math.ceil(chapterCount * 0.4)} foundation`,
      `Month 2: Complete Chapters ${Math.ceil(chapterCount * 0.4) + 1}-${Math.ceil(chapterCount * 0.8)} intermediate mastery`,
      `Month 3: Finish remaining chapters and comprehensive review`,
    ],
    weeklyTargets: [
      `Week 1: Foundations and core concepts for Chapter 1`,
      `Week 2: Practice sets and Chapter 2 kickoff`,
      `Week 3: Deep dive into Chapter 3`,
      `Week 4: Review and consolidation checkpoint`,
    ],
    suggestedTasks: [
      `Organize resources and workspace for ${title}`,
      `Complete Chapter 1 notes and formula sheet`,
      `Complete self-assessment checkpoints weekly`,
      `Conduct Sunday weekly review`,
    ],
    suggestedHabits: [
      { name: `Daily Focus Block on ${title}`, frequency: 'daily', category, icon: 'BookOpen', color: '#0284c7' },
      { name: 'Weekly Progress Review', frequency: 'weekly', category, icon: 'TrendingUp', color: '#10b981' },
    ],
  };
}

function generateLocalFallbackReview(goalData: any) {
  const completionRate = Number(goalData?.completionRate) || 80;
  const progressGained = Number(goalData?.progressGained) || 12;
  const plannedCount = Number(goalData?.plannedCount) || 10;
  const completedCount = Number(goalData?.completedCount) || 8;
  const whatWentWell = goalData?.whatWentWell || '';
  const whatWasMissed = goalData?.whatWasMissed || '';

  const praise = completionRate >= 80
    ? `Strong performance this week! You accomplished ${completedCount} out of ${plannedCount} planned actions (${completionRate}% rate).`
    : `Good persistence this week. You pushed your goal forward by +${progressGained}% progress.`;

  const riskWarning = completionRate < 70
    ? `Pacing is slightly below the 70% threshold. Reschedule incomplete actions into manageable increments.`
    : `Pacing is healthy and on schedule. Protect your daily routines to prevent end-of-month fatigue.`;

  return {
    briefing: `Weekly review for "${goalData?.title || 'Goal'}": ${completedCount}/${plannedCount} actions completed (+${progressGained}% progress gained).`,
    praise,
    riskWarning,
    nextWeekTactics: [
      'Prioritize the highest-leverage chapter actions in the morning',
      'Reserve planned buffer days so minor delays do not affect final review',
      whatWasMissed ? `Address root cause: "${whatWasMissed.slice(0, 80)}"` : 'Maintain consistent evening review routine',
    ],
    actionableTips: [
      'Work in 25-30 minute focused intervals',
      'Log daily checkpoints to maintain consistent streaks',
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, goalData, userPrompt } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'generate_plan') {
      const prompt = `You are an expert curriculum and strategic planning engine for Life OS.
The user wants to create a goal with:
Title: "${goalData?.title || 'Goal'}"
Category: "${goalData?.category || 'Study'}"
Measurement Type: "${goalData?.measurementType || 'curriculum'}"
Start Date: "${goalData?.startDate || 'today'}"
Deadline: "${goalData?.deadline || '3 months from now'}"
Available Days: ${goalData?.availableDays || 90}
Why this goal matters: "${goalData?.why || 'Personal growth'}"
Additional prompt/notes: "${userPrompt || ''}"

Return ONLY valid JSON matching this schema:
{
  "title": string,
  "description": string,
  "why": string,
  "category": string,
  "durationType": string,
  "measurementType": string,
  "targetValue": number,
  "currentValue": number,
  "unit": string,
  "deadline": string,
  "bufferDaysRecommendation": number,
  "strategicAdvice": string,
  "chapters": [
    {
      "number": number,
      "title": string,
      "difficulty": "easy" | "medium" | "hard" | "very_hard",
      "assignedDays": number,
      "notes": string,
      "subtopics": [
        { "title": string, "assignedDays": number }
      ]
    }
  ],
  "monthlyTargets": [string],
  "weeklyTargets": [string],
  "suggestedTasks": [string],
  "suggestedHabits": [
    { "name": string, "frequency": "daily" | "weekdays" | "weekly", "category": string, "icon": string, "color": string }
  ]
}

IMPORTANT:
- NEVER divide days equally between chapters! Assign realistic effort per chapter (e.g. 3-4 days easy, 5 days medium, 7-8 days hard/lengthy).
- Total chapter days plus buffer must not exceed available days (${goalData?.availableDays || 90}).
- Include subtopics with realistic days for key chapters.`;

      try {
        const response = await generateContentWithRetryAndFallback({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = cleanJsonText(response?.text || '{}');
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          return NextResponse.json({ success: true, plan: parsed });
        }
      } catch (genErr) {
        console.warn('Gemini plan generation unavailable, generating structured local fallback:', genErr);
      }

      // High-quality local fallback ensures user never gets blocked by network issues
      const fallbackPlan = generateLocalFallbackPlan(goalData, userPrompt);
      return NextResponse.json({ success: true, plan: fallbackPlan, isFallback: true });
    }

    if (action === 'replan_recovery') {
      const prompt = `You are an intelligent recovery and replanning assistant for Life OS.
Goal: "${goalData?.title}"
Current Progress: ${goalData?.progress || 0}%
Planned Progress: ${goalData?.plannedProgress || 0}%
Deadline: "${goalData?.deadline}"
Days Remaining: ${goalData?.daysRemaining || 30}
Pacing Context: "${userPrompt || 'Falling behind schedule'}"
Existing Chapters/Milestones: ${JSON.stringify((goalData?.chapters || []).slice(0, 10))}

Return ONLY valid JSON with this structure:
{
  "pacingSummary": string,
  "revisedStatus": "on_track" | "at_risk" | "behind",
  "workloadRedistribution": string,
  "proposedChanges": [
    {
      "id": string,
      "type": "extend_chapter" | "reduce_buffer" | "shift_deadline" | "add_practice_day" | "move_revision",
      "description": string,
      "impact": string
    }
  ],
  "recommendedPriorities": [string],
  "scheduleAdjustmentAdvice": string
}

Rule: Propose safe, realistic changes. Do not wipe out user progress. Always provide actionable adjustments the user can Apply, Edit, or Reject.`;

      try {
        const response = await generateContentWithRetryAndFallback({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = cleanJsonText(response?.text || '{}');
        const parsed = JSON.parse(text);
        if (parsed && parsed.pacingSummary) {
          return NextResponse.json({ success: true, replan: parsed });
        }
      } catch (genErr) {
        console.warn('Gemini replan recovery unavailable, using local replan proposal:', genErr);
      }

      // Safe local fallback
      const localReplan = generateLocalReplanProposal(goalData as Goal, userPrompt);
      return NextResponse.json({ success: true, replan: localReplan, isFallback: true });
    }

    if (action === 'weekly_review') {
      const prompt = `You are a productivity review analyst for Life OS.
Reviewing weekly progress for goal: "${goalData?.title}".
Planned actions: ${goalData?.plannedCount || 10}
Completed actions: ${goalData?.completedCount || 8}
Completion rate: ${goalData?.completionRate || 80}%
Progress gained: +${goalData?.progressGained || 12}%
User notes on what went well: "${goalData?.whatWentWell || ''}"
User notes on what was missed: "${goalData?.whatWasMissed || ''}"

Return ONLY valid JSON:
{
  "briefing": string,
  "praise": string,
  "riskWarning": string,
  "nextWeekTactics": [string],
  "actionableTips": [string]
}`;

      try {
        const response = await generateContentWithRetryAndFallback({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = cleanJsonText(response?.text || '{}');
        const parsed = JSON.parse(text);
        if (parsed && parsed.briefing) {
          return NextResponse.json({ success: true, review: parsed });
        }
      } catch (genErr) {
        console.warn('Gemini weekly review unavailable, using local review summary:', genErr);
      }

      const localReview = generateLocalFallbackReview(goalData);
      return NextResponse.json({ success: true, review: localReview, isFallback: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Error in /api/goals/ai route:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
