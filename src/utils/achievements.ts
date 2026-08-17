import { Achievement, TrainingDailyLog, FavoriteSentence, TrainerStats } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_speech',
    title: '初试啼声',
    description: '完成首次口语练说或输入逐字稿',
    category: 'mastery',
    icon: 'Mic',
    color: 'indigo',
    unlocked: false,
    progress: 0,
    targetValue: 1,
    currentValue: 0,
    unit: '次',
  },
  {
    id: 'streak_3',
    title: '三日渐入',
    description: '保持连续 3 天日常口语刻意练习',
    category: 'streak',
    icon: 'Flame',
    color: 'amber',
    unlocked: false,
    progress: 0,
    targetValue: 3,
    currentValue: 0,
    unit: '天',
  },
  {
    id: 'streak_7',
    title: '七日成习',
    description: '保持连续 7 天日常口语刻意练习',
    category: 'streak',
    icon: 'Flame',
    color: 'orange',
    unlocked: false,
    progress: 0,
    targetValue: 7,
    currentValue: 0,
    unit: '天',
  },
  {
    id: 'streak_21',
    title: '廿一日蜕变',
    description: '连续打卡 21 天，完成表达思维重塑',
    category: 'streak',
    icon: 'Crown',
    color: 'rose',
    unlocked: false,
    progress: 0,
    targetValue: 21,
    currentValue: 0,
    unit: '天',
  },
  {
    id: 'words_1000',
    title: '初见规模',
    description: '累计练说字数突破 1,000 字',
    category: 'volume',
    icon: 'Type',
    color: 'sky',
    unlocked: false,
    progress: 0,
    targetValue: 1000,
    currentValue: 0,
    unit: '字',
  },
  {
    id: 'words_10000',
    title: '万字突破',
    description: '累计练说字数突破 10,000 字',
    category: 'volume',
    icon: 'Award',
    color: 'emerald',
    unlocked: false,
    progress: 0,
    targetValue: 10000,
    currentValue: 0,
    unit: '字',
  },
  {
    id: 'fluency_90',
    title: '行云流水',
    description: '单次训练流利度指数达到 90 分以上',
    category: 'fluency',
    icon: 'TrendingUp',
    color: 'cyan',
    unlocked: false,
    progress: 0,
    targetValue: 90,
    currentValue: 0,
    unit: '分',
  },
  {
    id: 'logic_85',
    title: '逻辑缜密',
    description: '单次训练逻辑表达密度达到 85% 以上',
    category: 'fluency',
    icon: 'Zap',
    color: 'purple',
    unlocked: false,
    progress: 0,
    targetValue: 85,
    currentValue: 0,
    unit: '%',
  },
  {
    id: 'quotes_5',
    title: '金句采撷',
    description: '在金句库中收藏 5 条以上精彩表达',
    category: 'quotes',
    icon: 'Star',
    color: 'amber',
    unlocked: false,
    progress: 0,
    targetValue: 5,
    currentValue: 0,
    unit: '条',
  },
  {
    id: 'quotes_20',
    title: '金句大师',
    description: '在金句库中收藏 20 条以上精彩表达',
    category: 'quotes',
    icon: 'Sparkles',
    color: 'yellow',
    unlocked: false,
    progress: 0,
    targetValue: 20,
    currentValue: 0,
    unit: '条',
  },
  {
    id: 'duration_300',
    title: '长篇沉浸',
    description: '单次专注练说时长超过 5 分钟',
    category: 'mastery',
    icon: 'Clock',
    color: 'blue',
    unlocked: false,
    progress: 0,
    targetValue: 300,
    currentValue: 0,
    unit: '秒',
  },
];

export function calculateAchievements(
  dailyLogs: Record<string, TrainingDailyLog>,
  favorites: FavoriteSentence[],
  stats: TrainerStats,
  currentFluency: number = 85,
  currentDensity: number = 70
): Achievement[] {
  // Aggregate stats from daily logs
  let totalWords = 0;
  let totalSeconds = 0;
  let totalSessions = 0;

  Object.values(dailyLogs).forEach((log) => {
    totalWords += log.wordCount || 0;
    totalSeconds += log.durationSeconds || 0;
    totalSessions += log.sessionsCount || 0;
  });

  // Calculate current streak
  let currentStreak = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (dailyLogs[dateStr] && (dailyLogs[dateStr].durationSeconds > 0 || dailyLogs[dateStr].wordCount > 0)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (currentStreak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().slice(0, 10);
        if (dailyLogs[yesterdayStr]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  // Include current active session if not fully flushed
  const effectiveWords = Math.max(totalWords, stats.totalWords);
  const effectiveDuration = Math.max(totalSeconds, stats.duration);
  const hasEverTrained = totalSessions > 0 || stats.duration > 3 || stats.totalWords > 5;

  return ALL_ACHIEVEMENTS.map((ach) => {
    let curr = 0;
    switch (ach.id) {
      case 'first_speech':
        curr = hasEverTrained ? 1 : 0;
        break;
      case 'streak_3':
      case 'streak_7':
      case 'streak_21':
        curr = currentStreak;
        break;
      case 'words_1000':
      case 'words_10000':
        curr = effectiveWords;
        break;
      case 'fluency_90':
        curr = currentFluency;
        break;
      case 'logic_85':
        curr = currentDensity;
        break;
      case 'quotes_5':
      case 'quotes_20':
        curr = favorites.length;
        break;
      case 'duration_300':
        curr = stats.duration;
        break;
      default:
        curr = 0;
    }

    const unlocked = curr >= ach.targetValue;
    const progress = Math.min(100, Math.round((curr / ach.targetValue) * 100));

    return {
      ...ach,
      currentValue: curr,
      unlocked,
      progress,
      unlockedAt: unlocked ? Date.now() : undefined,
    };
  });
}
