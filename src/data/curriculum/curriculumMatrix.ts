export type CurriculumLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type CurriculumSkill = 'listening' | 'speaking' | 'reading' | 'writing';
export type IntegrationStatus = 'planned' | 'drafted' | 'integrated' | 'needs_review';
export type ExerciseMode = 'word-recognition' | 'sentence-fill-choice' | 'typing' | 'pattern-substitution' | 'conjugation' | 'scenario-dialogue' | 'error-review';

export type CurriculumMatrixItem = {
  id: string;
  level: CurriculumLevel;
  unit: string;
  theme: string;
  communicativeGoal: string;
  grammarFocus: string[];
  vocabularyThemes: string[];
  sentencePatterns: string[];
  skills: CurriculumSkill[];
  trainingTypes: ExerciseMode[];
  sourceNote?: string;
  integrationStatus: IntegrationStatus;
  learningMapNodeId: string;
};

export type DistilledExercise = {
  id: string;
  mode: ExerciseMode;
  instructionZh: string;
  prompt: string;
  answer: string;
  explanationZh: string;
  neuralLinks: string[];
};

export type DistilledA1Topic = {
  id: string;
  level: 'A1';
  titleZh: string;
  learningMapNodeId: string;
  learningGoalZh: string;
  grammarPoints: string[];
  vocabularyThemes: string[];
  sentencePatterns: string[];
  originalExamples: Array<{ spanish: string; zh: string; noteZh: string }>;
  exercises: DistilledExercise[];
  neuralConnectionSuggestions: string[];
};

export const curriculumMatrix: CurriculumMatrixItem[] = [
  {
    id: 'a1-identity-starter',
    level: 'A1',
    unit: 'A1-01',
    theme: '身份、姓名与来源',
    communicativeGoal: '能用 4-6 句介绍自己，并询问对方姓名、来源和学习目标。',
    grammarFocus: ['ser 的身份/来源用法', 'llamarse 的固定自我介绍结构', '主格代词可省略', '疑问词 cómo / de dónde / por qué'],
    vocabularyThemes: ['姓名', '国家与城市', '语言', '学习身份'],
    sentencePatterns: ['Me llamo ...', 'Soy de ...', 'Vivo en ...', 'Estudio español para ...'],
    skills: ['listening', 'speaking', 'reading', 'writing'],
    trainingTypes: ['sentence-fill-choice', 'typing', 'scenario-dialogue'],
    sourceNote: '参考入门教材常见开篇顺序后重组为本站自我介绍路径。',
    integrationStatus: 'integrated',
    learningMapNodeId: 'a1-distilled-identity-starter',
  },
  {
    id: 'a1-classroom-survival',
    level: 'A1',
    unit: 'A1-02',
    theme: '课堂求助与学习动作',
    communicativeGoal: '能在课堂或自学场景中请求重复、说明不懂、提出简单问题。',
    grammarFocus: ['poder + infinitivo', '祈使用语 por favor', 'no + 动词否定', '疑问句语调与倒置问号'],
    vocabularyThemes: ['课堂动作', '学习工具', '理解状态', '礼貌表达'],
    sentencePatterns: ['¿Puedes repetir?', 'No entiendo ...', 'Tengo una pregunta.', '¿Cómo se dice ... en español?'],
    skills: ['listening', 'speaking', 'reading'],
    trainingTypes: ['sentence-fill-choice', 'typing', 'pattern-substitution', 'error-review'],
    sourceNote: '参考课堂任务型教材的 survival Spanish 思路，改写为中文母语者的即时求助模块。',
    integrationStatus: 'integrated',
    learningMapNodeId: 'a1-distilled-classroom-survival',
  },
  {
    id: 'a1-cafe-ordering',
    level: 'A1',
    unit: 'A1-03',
    theme: '咖啡馆点单与基础需求',
    communicativeGoal: '能在咖啡馆表达想要什么、数量、是否外带以及如何礼貌结账。',
    grammarFocus: ['querer + 名词/infinitivo', '不定冠词 un/una', '数量 + 名词', 'para + 目的'],
    vocabularyThemes: ['饮品', '简单食物', '数量', '付款与礼貌请求'],
    sentencePatterns: ['Quiero un café.', 'Para mí, ...', '¿Cuánto cuesta?', 'La cuenta, por favor.'],
    skills: ['listening', 'speaking', 'reading'],
    trainingTypes: ['word-recognition', 'sentence-fill-choice', 'typing', 'scenario-dialogue'],
    sourceNote: '参考餐饮主题教材单元的交际目标，重写为 A1 可执行点单路径。',
    integrationStatus: 'integrated',
    learningMapNodeId: 'a1-distilled-cafe-ordering',
  },
  {
    id: 'a2-daily-routine-bridge',
    level: 'A2',
    unit: 'A2-01',
    theme: '日常作息与时间顺序',
    communicativeGoal: '能讲述一天安排，连接时间、地点和习惯动作。',
    grammarFocus: ['反身动词', '频率副词', '先后顺序连接词', 'ir a + infinitivo'],
    vocabularyThemes: ['作息', '家务', '通勤', '时间表达'],
    sentencePatterns: ['Me levanto a ...', 'Después, ...', 'Voy a ...', 'Normalmente ...'],
    skills: ['listening', 'speaking', 'reading', 'writing'],
    trainingTypes: ['typing', 'pattern-substitution', 'conjugation', 'scenario-dialogue'],
    sourceNote: '暂作 A2 扩展预留，不在本阶段硬编完整内容。',
    integrationStatus: 'planned',
    learningMapNodeId: 'a2-skills-output',
  },
  {
    id: 'b1-opinion-bridge',
    level: 'B1',
    unit: 'B1-Reserve',
    theme: '观点表达与原因说明',
    communicativeGoal: '能围绕熟悉话题表达观点、给出原因和简单例证。',
    grammarFocus: ['porque / por eso', 'creo que', '比较结构', '过去经历回顾'],
    vocabularyThemes: ['学习', '工作', '城市生活', '个人偏好'],
    sentencePatterns: ['Creo que ...', 'Para mí, ...', 'Porque ...', 'Por ejemplo, ...'],
    skills: ['speaking', 'reading', 'writing'],
    trainingTypes: ['typing', 'scenario-dialogue', 'error-review'],
    sourceNote: '仅为 B1 能力结构预留。',
    integrationStatus: 'planned',
    learningMapNodeId: 'b1-structure',
  },
  {
    id: 'b2-argument-bridge',
    level: 'B2',
    unit: 'B2-Reserve',
    theme: '论证、让步与复杂表达',
    communicativeGoal: '能组织较长观点，处理对比、让步和抽象话题。',
    grammarFocus: ['aunque', 'sin embargo', 'subjuntivo reserve', '复合句'],
    vocabularyThemes: ['社会议题', '职业发展', '文化比较', '抽象名词'],
    sentencePatterns: ['Aunque ..., ...', 'Sin embargo, ...', 'Desde mi punto de vista, ...'],
    skills: ['speaking', 'reading', 'writing'],
    trainingTypes: ['typing', 'scenario-dialogue', 'error-review'],
    sourceNote: '仅为 B2 能力结构预留。',
    integrationStatus: 'planned',
    learningMapNodeId: 'b2-structure',
  },
];

export const distilledA1Topics: DistilledA1Topic[] = [
  {
    id: 'a1-identity-starter',
    level: 'A1',
    titleZh: '身份、姓名与来源',
    learningMapNodeId: 'a1-distilled-identity-starter',
    learningGoalZh: '学完后能自然说出“我是谁、从哪里来、住在哪里、为什么学西语”，并能反问对方。',
    grammarPoints: ['ser 表身份和来源', 'llamarse 用于姓名', 'vivir en 表居住地', '疑问词 cómo / de dónde / por qué'],
    vocabularyThemes: ['姓名', '国家', '城市', '语言', '学生/老师/朋友等身份词'],
    sentencePatterns: ['Me llamo [nombre].', 'Soy de [país/ciudad].', 'Vivo en [ciudad].', 'Estudio español para [objetivo].'],
    originalExamples: [
      { spanish: 'Me llamo Lin y soy de China.', zh: '我叫 Lin，来自中国。', noteZh: '把姓名和来源合成一个短句，适合第一次自我介绍。' },
      { spanish: 'Vivo en Barcelona, cerca del metro.', zh: '我住在巴塞罗那，离地铁很近。', noteZh: 'vivir en 后接城市或地点；cerca de 用来补充位置。' },
      { spanish: 'Estudio español para hablar con mis vecinos.', zh: '我学西语是为了和邻居交流。', noteZh: 'para 后面接动词原形，说明目的。' },
    ],
    exercises: [
      {
        id: 'a1-identity-fill-01',
        mode: 'sentence-fill-choice',
        instructionZh: '选择最自然的动词形式补全句子。',
        prompt: 'Yo ______ de China.',
        answer: 'soy',
        explanationZh: '表达来源和身份时用 ser；yo 的现在时形式是 soy。',
        neuralLinks: ['ser', 'soy', 'de China', '身份来源场景'],
      },
      {
        id: 'a1-identity-typing-01',
        mode: 'typing',
        instructionZh: '根据中文写出西语句子。',
        prompt: '我住在马德里。',
        answer: 'Vivo en Madrid.',
        explanationZh: '“住在某地”用 vivir en；第一人称是 vivo。',
        neuralLinks: ['vivir', 'en', 'Madrid', '居住地场景'],
      },
      {
        id: 'a1-identity-dialogue-01',
        mode: 'scenario-dialogue',
        instructionZh: '你第一次见到同学，请用一句话问对方来自哪里。',
        prompt: 'Ask: Where are you from?',
        answer: '¿De dónde eres?',
        explanationZh: 'de dónde 问来源；和同学说话可用 tú，因此 ser 变为 eres。',
        neuralLinks: ['de dónde', 'ser', 'eres', '个人信息问答'],
      },
    ],
    neuralConnectionSuggestions: [
      'ser -> Soy de China. -> 来源身份 -> ¿De dónde eres? -> 自我介绍训练',
      'vivir -> Vivo en Madrid. -> en + 地点 -> 城市/住所词汇 -> 输入题',
      'para -> Estudio español para viajar. -> 目的表达 -> 学习动机场景 -> 口语替换',
    ],
  },
  {
    id: 'a1-classroom-survival',
    level: 'A1',
    titleZh: '课堂求助与学习动作',
    learningMapNodeId: 'a1-distilled-classroom-survival',
    learningGoalZh: '能在听不懂、没听清、不会表达时用短句求助，而不是切回中文。',
    grammarPoints: ['poder + infinitivo 表请求能力', 'no 放在变位动词前', 'tener + 名词表达“有问题”', '疑问句倒置问号'],
    vocabularyThemes: ['听、说、重复、写、问题、答案、慢一点、请'],
    sentencePatterns: ['¿Puedes repetir, por favor?', 'No entiendo la frase.', 'Tengo una pregunta.', '¿Cómo se dice [palabra] en español?'],
    originalExamples: [
      { spanish: '¿Puedes hablar más despacio, por favor?', zh: '你可以说慢一点吗？', noteZh: 'poder + 动词原形，用来礼貌请求对方做某事。' },
      { spanish: 'No entiendo esta palabra.', zh: '我不懂这个词。', noteZh: '否定词 no 放在变位动词 entiendo 前面。' },
      { spanish: 'Tengo una pregunta sobre la tarea.', zh: '我有一个关于作业的问题。', noteZh: 'tener una pregunta 是课堂里很高频的求助句块。' },
    ],
    exercises: [
      {
        id: 'a1-classroom-fill-01',
        mode: 'sentence-fill-choice',
        instructionZh: '补全课堂求助句。',
        prompt: '¿Puedes ______ la frase, por favor?',
        answer: 'repetir',
        explanationZh: 'poder 后面接动词原形；repetir 表示“重复”。',
        neuralLinks: ['poder', 'repetir', 'por favor', '课堂求助场景'],
      },
      {
        id: 'a1-classroom-typing-01',
        mode: 'typing',
        instructionZh: '根据中文写出西语句子。',
        prompt: '我不懂这个问题。',
        answer: 'No entiendo esta pregunta.',
        explanationZh: 'no + entiendo 构成否定；esta pregunta 是“这个问题”。',
        neuralLinks: ['no', 'entender', 'pregunta', '否定句'],
      },
      {
        id: 'a1-classroom-substitution-01',
        mode: 'pattern-substitution',
        instructionZh: '把“repeat”替换成“write”，保持句型不变。',
        prompt: '¿Puedes repetir la palabra?',
        answer: '¿Puedes escribir la palabra?',
        explanationZh: 'poder + infinitivo 的框架不变，只替换后面的动词原形。',
        neuralLinks: ['poder + infinitivo', 'repetir', 'escribir', '句型替换'],
      },
    ],
    neuralConnectionSuggestions: [
      'poder -> ¿Puedes repetir? -> 礼貌请求 -> 课堂求助 -> 替换题',
      'no -> No entiendo. -> 否定句 -> 理解状态 -> 错题复习',
      'pregunta -> Tengo una pregunta. -> tener + 名词 -> 课堂任务 -> 输入题',
    ],
  },
  {
    id: 'a1-cafe-ordering',
    level: 'A1',
    titleZh: '咖啡馆点单与基础需求',
    learningMapNodeId: 'a1-distilled-cafe-ordering',
    learningGoalZh: '能在咖啡馆完成点单、数量表达、询价和结账四个动作。',
    grammarPoints: ['querer 表想要', 'un/una 与名词性别配合', '数量词 + 名词', 'cuánto cuesta 问价格'],
    vocabularyThemes: ['咖啡、茶、水、面包、三明治、账单、价格、卡/现金'],
    sentencePatterns: ['Quiero [bebida/comida].', 'Para mí, [pedido].', '¿Cuánto cuesta?', 'Pago con [método].'],
    originalExamples: [
      { spanish: 'Quiero un café con leche, por favor.', zh: '请给我一杯牛奶咖啡。', noteZh: 'querer 直接接想要的东西；por favor 放句尾让语气更自然。' },
      { spanish: 'Para mí, una tostada y un té.', zh: '我要一份吐司和一杯茶。', noteZh: '点单时 para mí 可以表示“我这边要”。' },
      { spanish: '¿Puedo pagar con tarjeta?', zh: '我可以刷卡付款吗？', noteZh: 'poder + infinitivo 也可用于询问许可。' },
    ],
    exercises: [
      {
        id: 'a1-cafe-fill-01',
        mode: 'sentence-fill-choice',
        instructionZh: '选择正确冠词。',
        prompt: 'Quiero ______ café.',
        answer: 'un',
        explanationZh: 'café 是阳性单数名词，表示“一杯/一个咖啡”时用 un café。',
        neuralLinks: ['café', 'un', '冠词性数', '点单场景'],
      },
      {
        id: 'a1-cafe-typing-01',
        mode: 'typing',
        instructionZh: '根据中文写出西语句子。',
        prompt: '请给我账单。',
        answer: 'La cuenta, por favor.',
        explanationZh: '餐饮结账常用固定礼貌句 La cuenta, por favor.',
        neuralLinks: ['cuenta', 'por favor', '餐厅结账', '礼貌表达'],
      },
      {
        id: 'a1-cafe-dialogue-01',
        mode: 'scenario-dialogue',
        instructionZh: '你想问价格，用一句 A1 西语表达。',
        prompt: 'Ask how much it costs.',
        answer: '¿Cuánto cuesta?',
        explanationZh: 'cuánto 问数量或价格；cuesta 来自 costar，A1 先作为整句掌握。',
        neuralLinks: ['cuánto', 'cuesta', '价格场景', '购物/点单迁移'],
      },
    ],
    neuralConnectionSuggestions: [
      'querer -> Quiero un café. -> 不定冠词 -> 饮品词汇 -> 填空题',
      'cuenta -> La cuenta, por favor. -> 礼貌请求 -> 结账场景 -> 情景对话',
      'tarjeta -> pagar con tarjeta -> con + 工具/方式 -> 支付场景 -> 输入题',
    ],
  },
];
