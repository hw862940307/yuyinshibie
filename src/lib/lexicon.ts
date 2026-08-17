import emotionLexiconData from '../data/emotion-lexicon.json';
import tieredLexiconData from '../data/tiered-lexicon.json';
import { TextAnalysisResult, VagueWordMatch, WordMatch, Suggestion } from '../types';

// 填充词列表（语气词/口头禅）
export const FILLER_WORDS: string[] = [
  '嗯', '啊', '呃', '额', '那个', '就是', '然后',
  '这个', '对吧', '是吧', '你知道', '怎么说呢',
  '反正', '基本上', '总之', '所以说', '就是说',
  '其实吧', '说实话', '对对对', '是是是', 'emmm', '啧', '哎', '唔'
];

// 犹豫词列表（弱化表达）
export const HEDGE_WORDS: string[] = [
  '可能', '也许', '大概', '应该', '我觉得', '好像',
  '似乎', '或许', '不一定', '差不多', '算是',
  '某种程度上', '一般来说', '感觉', '可能吧', '我不确定',
  '大概率', '不排除', '也有可能'
];

// 笼统词 → 精准替代映射
export const VAGUE_TO_PRECISE: Record<string, string[]> = {
  '开心': ['欣喜', '雀跃', '兴奋', '欣慰', '畅快', '满足'],
  '难过': ['心酸', '失落', '委屈', '心疼', '沮丧', '低落'],
  '害怕': ['恐惧', '焦虑', '不安', '慌张', '胆怯', '忐忑'],
  '生气': ['愤怒', '恼火', '窝火', '气愤', '不满', '暴躁'],
  '不舒服': ['压抑', '烦躁', '憋屈', '窒息', '煎熬', '疲惫'],
  '很好': ['出色', '精彩', '优秀', '惊艳', '完美', '理想'],
  '很多': ['大量', '海量', '充裕', '丰富', '密集', '可观'],
  '很快': ['迅速', '飞速', '立刻', '瞬间', '即刻', '火速'],
  '很大': ['巨大', '庞大', '显著', '惊人', '可观', '壮观'],
  '很小': ['微小', '细微', '轻微', '渺小', '微不足道', '些许'],
  '好看': ['精致', '优雅', '绚丽', '惊艳', '别致', '夺目'],
  '不好': ['糟糕', '恶劣', '拙劣', '不堪', '惨淡', '低劣'],
  '喜欢': ['热爱', '痴迷', '着迷', '钟爱', '倾心', '沉醉'],
  '讨厌': ['厌恶', '反感', '排斥', '憎恨', '鄙视', '嫌弃'],
  '觉得': ['认为', '判断', '确信', '推断', '意识到', '发现'],
  '想': ['渴望', '期待', '向往', '盼望', '企图', '打算'],
  '做': ['执行', '落实', '推进', '完成', '实施', '操作'],
  '看': ['审视', '观察', '注视', '打量', '端详', '凝视'],
  '说': ['表达', '阐述', '强调', '指出', '坦言', '声明'],
  '想想': ['反思', '回顾', '审视', '复盘', '琢磨', '斟酌'],
  '搞': ['整', '操办', '折腾', '捣鼓', '攻克', '推进'],
  '弄': ['调整', '修改', '搞定', '拿下', '处理', '整改'],
  '非常': ['极其', '万分', '无比', '异常', '空前', '格外'],
  '特别': ['格外', '尤其', '出奇', '罕见地', '超乎寻常'],
  '超级': ['极度', '爆炸级', '现象级', '史诗级', '顶尖'],
  '不错': ['精彩', '到位', '有水准', '超出预期', '可圈可点'],
  '还行': ['过得去', '中规中矩', '差强人意', '不功不过'],
  '有意思': ['有趣', '引人入胜', '耐人寻味', '新鲜', '别出心裁'],
  '无聊': ['乏味', '索然无味', '味同嚼蜡', '一潭死水'],
  '奇怪': ['反常', '蹊跷', '诡异', '不对劲', '匪夷所思'],
  '麻烦': ['棘手', '头疼', '费劲', '耗精力', '繁琐'],
  '方便': ['省事', '顺手', '一步到位', '丝滑', '无缝'],
  '合适': ['恰当', '到位', '匹配', '契合', '天衣无缝'],
  '试试': ['尝试', '探索', '实验', '挑战', '冲一下']
};

export const CATEGORY_NAMES: Record<string, string> = {
  'emotions_positive': '正面情绪',
  'emotions_negative': '负面情绪',
  'states': '身体状态',
  'vague_descriptors': '万能形容词',
  'vague_verbs': '万能动词',
  'intensity_markers': '程度词',
  'social_expressions': '社交用语',
  'evaluation_words': '评价用语',
  'action_words': '动作用语'
};

export interface TierItemInfo {
  alternatives: string[];
  category: string;
}

export const TIERED_MAP: Record<string, TierItemInfo> = {};

// 初始化分级映射表
const rawTiered = tieredLexiconData as Record<string, any>;
for (const [cat, words] of Object.entries(rawTiered)) {
  if (cat === '_meta') continue;
  if (typeof words === 'object' && words !== null) {
    for (const [word, alts] of Object.entries(words as Record<string, string[]>)) {
      TIERED_MAP[word] = {
        alternatives: Array.isArray(alts) ? alts : [],
        category: CATEGORY_NAMES[cat] || cat
      };
    }
  }
}

// 合并 VAGUE_TO_PRECISE 到 TIERED_MAP
for (const [word, alts] of Object.entries(VAGUE_TO_PRECISE)) {
  if (!TIERED_MAP[word]) {
    TIERED_MAP[word] = {
      alternatives: alts,
      category: '笼统词'
    };
  }
}

const emotionsData = (emotionLexiconData as any).emotions || {};

/**
 * 中文分词（基于最大正向匹配 + 词库字典）
 */
export function segmentText(text: string, customWordsStr = ''): string[] {
  const customWords = customWordsStr
    ? customWordsStr.split(/[,，、\s\n]+/).filter(Boolean)
    : [];

  const dict = new Set<string>([
    ...FILLER_WORDS,
    ...HEDGE_WORDS,
    ...Object.keys(VAGUE_TO_PRECISE),
    ...Object.keys(TIERED_MAP),
    ...Object.keys(emotionsData),
    ...customWords
  ]);

  const words: string[] = [];
  let i = 0;
  const maxLen = 8;

  while (i < text.length) {
    let matched = false;
    for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
      const word = text.substring(i, i + len);
      if (dict.has(word)) {
        words.push(word);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      words.push(text[i]);
      i++;
    }
  }
  return words;
}

/**
 * 文本深度词库分析
 */
export function analyzeText(text: string, customWordsStr = ''): TextAnalysisResult | null {
  if (!text || !text.trim()) {
    return null;
  }

  const customWords = customWordsStr
    ? customWordsStr.split(/[,，、\s\n]+/).filter(Boolean)
    : [];
  const effectiveFillers = [...FILLER_WORDS, ...customWords];

  const words = segmentText(text, customWordsStr);
  const totalWords = words.length;

  const fillers: WordMatch[] = [];
  const hedges: WordMatch[] = [];
  const vagueWords: VagueWordMatch[] = [];
  const emotionWords: WordMatch[] = [];

  words.forEach((word, idx) => {
    if (effectiveFillers.includes(word)) {
      fillers.push({ word, position: idx });
    } else if (HEDGE_WORDS.includes(word)) {
      hedges.push({ word, position: idx });
    }

    if (TIERED_MAP[word]) {
      vagueWords.push({
        word,
        position: idx,
        alternatives: TIERED_MAP[word].alternatives
      });
    } else if (VAGUE_TO_PRECISE[word]) {
      vagueWords.push({
        word,
        position: idx,
        alternatives: VAGUE_TO_PRECISE[word]
      });
    }

    if (emotionsData[word]) {
      const emo = emotionsData[word];
      emotionWords.push({
        word,
        position: idx,
        category: emo.category,
        intensity: emo.intensity,
        polarity: emo.polarity
      });
    }
  });

  const meaningfulWords = Math.max(0, totalWords - fillers.length - hedges.length);
  const density = totalWords > 0 ? Math.round((meaningfulWords / totalWords) * 100) : 100;

  return {
    totalWords,
    fillers,
    hedges,
    vagueWords,
    emotionWords,
    density,
    suggestions: generateSuggestions(vagueWords, fillers, hedges)
  };
}

/**
 * 生成替代及优化建议
 */
export function generateSuggestions(
  vagueWords: VagueWordMatch[],
  fillers: WordMatch[],
  hedges: WordMatch[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const seenVague = new Set<string>();

  vagueWords.forEach((item) => {
    if (!seenVague.has(item.word) && item.alternatives && item.alternatives.length > 0) {
      seenVague.add(item.word);
      suggestions.push({
        type: 'vague',
        original: item.word,
        alternatives: item.alternatives.slice(0, 4),
        message: `「${item.word}」→ 试试更精准的：${item.alternatives.slice(0, 4).join('、')}`
      });
    }
  });

  if (fillers.length >= 2) {
    const topFillers = [...new Set(fillers.map((f) => f.word))].slice(0, 3);
    suggestions.push({
      type: 'filler',
      message: `填充词出现${fillers.length}次（${topFillers.join('、')}）。建议使用自然停顿代替语气词`
    });
  }

  if (hedges.length >= 2) {
    const topHedges = [...new Set(hedges.map((h) => h.word))].slice(0, 2);
    suggestions.push({
      type: 'hedge',
      message: `犹豫弱化词较多（${topHedges.join('、')}）。建议把「我觉得」改成直接陈述句，增加说服力`
    });
  }

  return suggestions;
}

export { emotionLexiconData, tieredLexiconData };
