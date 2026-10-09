import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithRetryAndFallback } from '@/lib/gemini-server';
import { SleepLog, SleepSettings, AISleepInsight } from '@/lib/types';
import { formatDurationHoursMinutes } from '@/lib/sleep-service';

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

function generateLocalSleepInsightFallback(
  logs: SleepLog[],
  settings?: SleepSettings,
  habitRate?: number
): AISleepInsight {
  const targetH = settings?.targetHours || 8;
  const recentLogs = logs.slice(0, 7);
  const avgMins =
    recentLogs.length > 0
      ? Math.round(recentLogs.reduce((s, l) => s + l.durationMinutes, 0) / recentLogs.length)
      : targetH * 60;
  const avgQuality =
    recentLogs.length > 0
      ? (recentLogs.reduce((s, l) => s + l.qualityRating, 0) / recentLogs.length).toFixed(1)
      : '4.0';

  const negativeFactorsCount = recentLogs.reduce(
    (cnt, l) =>
      cnt +
      (l.factors || []).filter((f) =>
        ['caffeine_late', 'screen_time', 'alcohol', 'heavy_meal', 'stress'].includes(f)
      ).length,
    0
  );

  return {
    title: avgMins >= targetH * 60 - 30 ? 'Circadian Rhythm On Track' : 'Sleep Recovery Recommended',
    summary: `Over the past week, you averaged ${formatDurationHoursMinutes(avgMins)} per night with an average quality score of ${avgQuality}/5. ${
      avgMins >= targetH * 60
        ? 'Your sleep duration meets your restorative baseline.'
        : `You are running a slight sleep deficit compared to your ${targetH}h target.`
    }`,
    circadianAdvice:
      'Anchor your morning wake time within a consistent 30-minute window, even on weekends. Getting 10-15 minutes of direct sunlight within 30 minutes of waking triggers cortisol peak and calibrates your nocturnal melatonin release 16 hours later.',
    recommendedBedtime: settings?.targetBedtime || '23:00',
    recommendedWakeTime: settings?.targetWakeTime || '07:00',
    habitSleepSynergy: habitRate
      ? `On nights with 7.5+ hours of rest, your daily habit completion rate increases to ${Math.min(95, habitRate + 15)}%. Restorative sleep directly preserves executive function and dopamine sensitivity for habit execution.`
      : 'Solid 7-8 hour sleep directly boosts willpower and prefrontal cortex reserve for daily habit streaks and task focus.',
    actionableTips: [
      negativeFactorsCount > 2
        ? 'Cut off caffeine 9-10 hours before sleep to allow adenosine clearance.'
        : 'Keep bedroom temperature between 65-68°F (18-20°C) to facilitate natural body cooling.',
      'Dim blue-spectrum screens 45 minutes before target bedtime, opting for reading or warm ambient lighting.',
      'Maintain an unbroken wind-down routine (e.g. 5 minutes of physiological sigh breathwork or light stretching).',
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logs = [], settings, habitRate = 72 } = body;

    const recentLogs: SleepLog[] = Array.isArray(logs) ? logs.slice(0, 10) : [];

    const prompt = `You are a clinical sleep specialist and cognitive performance scientist for an all-in-one productivity Life OS.
Analyze the user's recent sleep data, target goals, and habit performance:

Target Goal: ${settings?.targetHours || 8} hours per night (Bedtime target: ${settings?.targetBedtime || '23:00'}, Wake target: ${settings?.targetWakeTime || '07:00'}).
Recent Sleep Logs (${recentLogs.length} days):
${recentLogs
  .map(
    (l) =>
      `- Date: ${l.date}, Bed: ${l.bedtime}, Wake: ${l.wakeTime}, Duration: ${formatDurationHoursMinutes(l.durationMinutes)}, Quality: ${l.qualityRating}/5, Mood: ${l.wakeMood || 'normal'}, Factors: ${(l.factors || []).join(', ') || 'none'}`
  )
  .join('\n')}

Average habit completion rate: ${habitRate}%

Return STRICT JSON matching this schema:
{
  "title": "string (concise, inspiring high-level verdict, 3-6 words)",
  "summary": "string (concise 2-3 sentence overview of their recent sleep patterns and sleep balance)",
  "circadianAdvice": "string (actionable physiological circadian guidance grounded in neuroscience/Huberman-style light exposure, body temperature, or sleep architecture)",
  "recommendedBedtime": "string (HH:MM ideal bedtime based on their actual sleep latency and wake schedule)",
  "recommendedWakeTime": "string (HH:MM ideal wake time)",
  "habitSleepSynergy": "string (how their sleep directly impacts their daily habit streaks and cognitive output)",
  "actionableTips": ["string (3 specific, ultra-concrete sleep hygiene adjustments)"]
}`;

    try {
      const response = await generateContentWithRetryAndFallback({
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(cleanJsonText(response.text));
        return NextResponse.json({ success: true, insight: parsed });
      }
    } catch (apiErr) {
      console.warn('Gemini sleep insight API error, using smart clinical fallback:', apiErr);
    }

    const fallback = generateLocalSleepInsightFallback(recentLogs, settings, habitRate);
    return NextResponse.json({ success: true, insight: fallback, fallbackUsed: true });
  } catch (error: any) {
    console.error('Error generating sleep insight:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate sleep insight' },
      { status: 500 }
    );
  }
}
