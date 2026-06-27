import type { LearningMapContent, LearningNode } from '../../types/learningMap';

const L = (zh: string, en: string, es: string) => ({ zh, en, es });
const node = (
  id: string,
  titleZh: string,
  titleEn: string,
  titleEs: string,
  type: LearningNode['type'],
  children: LearningNode[] = [],
  tags: string[] = [],
  descriptionZh = '',
): LearningNode => ({
  id,
  level: 'A1',
  title: L(titleZh, titleEn, titleEs),
  description: L(descriptionZh || titleZh, titleEn, titleEs),
  type,
  children,
  tags,
});

const lesson = (id: string, zh: string, en: string, es: string, tags: string[] = []) =>
  node(id, zh, en, es, 'lesson', [], tags);

export const a1LearningMap: LearningMapContent = {
  level: 'A1',
  levelId: 'a1',
  title: L('A1 学习地图', 'A1 learning map', 'Mapa de aprendizaje A1'),
  description: L('从发音、核心词汇、基础语法、常用句式到听说读写训练，按知识树管理你的入门路线。', 'Manage pronunciation, vocabulary, grammar, sentence patterns, and skills as a structured beginner path.', 'Organiza pronunciación, vocabulario, gramática, frases y habilidades como una ruta inicial.'),
  nodes: [
    node('a1-pronunciation', '发音与字母', 'Pronunciation and alphabet', 'Pronunciación y alfabeto', 'section', [
      node('a1-pronunciation-vowels', '元音', 'Vowels', 'Vocales', 'topic', [
        lesson('a1-pronunciation-vowels-aeiou', 'a / e / i / o / u 稳定发音', 'Stable a/e/i/o/u sounds', 'Sonidos estables a/e/i/o/u'),
        lesson('a1-pronunciation-vowels-syllables', '开音节与清晰吐字', 'Open syllables and clear articulation', 'Sílabas abiertas y articulación clara'),
      ], ['sound']),
      node('a1-pronunciation-consonants', '辅音', 'Consonants', 'Consonantes', 'topic', [
        lesson('a1-pronunciation-bv-cg', 'b/v 与 c/g 的常见读法', 'Common b/v and c/g sounds', 'Sonidos frecuentes de b/v y c/g'),
        lesson('a1-pronunciation-h-silent', 'h 不发音', 'Silent h', 'H muda'),
      ], ['sound']),
      node('a1-pronunciation-special', '特殊字母组合', 'Special letters', 'Letras especiales', 'topic', [
        lesson('a1-pronunciation-rr-r', 'rr / r 弹舌差异', 'rr/r trill contrast', 'Contraste rr/r'),
        lesson('a1-pronunciation-j-ll-n', 'j / ll / ñ', 'j, ll, and ñ', 'j, ll y ñ'),
      ], ['sound']),
      node('a1-pronunciation-stress', '重音与标点', 'Stress and punctuation', 'Acento y puntuación', 'topic', [
        lesson('a1-pronunciation-stress-rules', '基础重音规则', 'Basic stress rules', 'Reglas básicas de acento'),
        lesson('a1-pronunciation-inverted-punctuation', '¿? / ¡! 倒置标点', 'Inverted question and exclamation marks', 'Signos invertidos ¿? / ¡!'),
      ], ['writing']),
    ], ['foundation'], '先建立稳定读音，后面的听说训练会轻很多。'),
    node('a1-vocabulary', '基础词汇', 'Basic vocabulary', 'Vocabulario básico', 'section', [
      node('a1-vocabulary-social', '问候与礼貌', 'Greetings and politeness', 'Saludos y cortesía', 'topic', [
        lesson('a1-vocabulary-greetings', '问候、告别、感谢', 'Greetings, farewells, thanks', 'Saludos, despedidas y gracias'),
        lesson('a1-vocabulary-politeness', '请、对不起、没关系', 'Please, sorry, no problem', 'Por favor, perdón, no pasa nada'),
      ]),
      node('a1-vocabulary-time', '数字与时间', 'Numbers and time', 'Números y tiempo', 'topic', [
        lesson('a1-vocabulary-numbers', '0-100 数字与数量', 'Numbers 0-100 and quantities', 'Números 0-100 y cantidades'),
        lesson('a1-vocabulary-days-months', '星期、月份、日期', 'Days, months, dates', 'Días, meses y fechas'),
      ]),
      node('a1-vocabulary-people', '人物与身份', 'People and identity', 'Personas e identidad', 'topic', [
        lesson('a1-vocabulary-family', '家庭成员', 'Family members', 'Familia'),
        lesson('a1-vocabulary-countries-jobs', '国家、国籍、职业', 'Countries, nationalities, jobs', 'Países, nacionalidades y profesiones'),
      ]),
      node('a1-vocabulary-life', '生活场景', 'Daily-life scenes', 'Escenas cotidianas', 'topic', [
        lesson('a1-vocabulary-food', '食物饮料', 'Food and drinks', 'Comida y bebida'),
        lesson('a1-vocabulary-home-city', '家居房间与城市地点', 'Home, rooms, and city places', 'Casa, habitaciones y lugares'),
        lesson('a1-vocabulary-transport-weather', '交通与天气', 'Transport and weather', 'Transporte y tiempo'),
      ]),
      node('a1-vocabulary-core-words', '高频功能词', 'High-frequency function words', 'Palabras funcionales frecuentes', 'topic', [
        lesson('a1-vocabulary-common-verbs', '常用动词', 'Common verbs', 'Verbos frecuentes'),
        lesson('a1-vocabulary-adjectives-adverbs', '常用形容词与副词', 'Common adjectives and adverbs', 'Adjetivos y adverbios frecuentes'),
        lesson('a1-vocabulary-prepositions-connectors', '基础介词与连接词', 'Basic prepositions and connectors', 'Preposiciones y conectores básicos'),
      ]),
    ], ['words'], '按主题积累高频词，并尽量放进真实句子里记。'),
    node('a1-grammar', 'A1 语法', 'A1 grammar', 'Gramática A1', 'section', [
      node('a1-grammar-nouns', '名词与冠词', 'Nouns and articles', 'Sustantivos y artículos', 'topic', [
        lesson('a1-grammar-gender', '名词阴阳性', 'Noun gender', 'Género del sustantivo'),
        lesson('a1-grammar-number', '单复数', 'Singular and plural', 'Singular y plural'),
        lesson('a1-grammar-articles', '定冠词 / 不定冠词', 'Definite and indefinite articles', 'Artículos definidos e indefinidos'),
      ]),
      node('a1-grammar-verbs-basic', 'ser / estar / tener / hay', 'ser, estar, tener, hay', 'ser, estar, tener, hay', 'topic', [
        lesson('a1-grammar-ser-estar', 'ser 与 estar 基础区别', 'Basic ser vs estar', 'Diferencia básica entre ser y estar'),
        lesson('a1-grammar-tener-hay', 'tener 与 hay', 'tener and hay', 'tener y hay'),
      ]),
      node('a1-grammar-present', '现在时动词', 'Present tense verbs', 'Verbos en presente', 'topic', [
        lesson('a1-grammar-regular-present', '规则动词 -ar / -er / -ir', 'Regular -ar/-er/-ir verbs', 'Verbos regulares -ar/-er/-ir'),
        lesson('a1-grammar-irregular-present', '常用不规则动词', 'Common irregular verbs', 'Verbos irregulares frecuentes'),
      ]),
      node('a1-grammar-sentence-tools', '句子工具', 'Sentence tools', 'Herramientas de frase', 'topic', [
        lesson('a1-grammar-adjective-agreement', '形容词性数配合', 'Adjective agreement', 'Concordancia del adjetivo'),
        lesson('a1-grammar-questions', '基础疑问词与疑问句', 'Question words and questions', 'Interrogativos y preguntas'),
        lesson('a1-grammar-gustar-prepositions', 'gustar 入门与基础介词', 'Intro to gustar and prepositions', 'Introducción a gustar y preposiciones'),
      ]),
    ], ['grammar'], '把最小语法系统搭起来，让你能自己造句。'),
    node('a1-sentences', 'A1 句式', 'A1 sentence patterns', 'Frases A1', 'section', [
      node('a1-sentences-identity', '身份与介绍', 'Identity and introductions', 'Identidad y presentación', 'topic', [
        lesson('a1-sentences-self-intro', '自我介绍', 'Self-introduction', 'Presentación personal'),
        lesson('a1-sentences-personal-info', '问名字、年龄、国籍、职业', 'Name, age, nationality, job', 'Nombre, edad, nacionalidad, profesión'),
      ]),
      node('a1-sentences-public', '公共生活场景', 'Public-life scenes', 'Escenas públicas', 'topic', [
        lesson('a1-sentences-restaurant', '点餐', 'Ordering food', 'Pedir comida'),
        lesson('a1-sentences-shopping', '购物', 'Compras', 'Compras'),
        lesson('a1-sentences-directions-time', '问路与询问时间', 'Directions and time', 'Direcciones y hora'),
      ]),
      node('a1-sentences-description', '描述与表达', 'Description and expression', 'Descripción y expresión', 'topic', [
        lesson('a1-sentences-people-room', '描述人物与房间', 'Describe people and rooms', 'Describir personas y habitaciones'),
        lesson('a1-sentences-likes-routine', '喜欢、不喜欢与日常安排', 'Likes, dislikes, and routines', 'Gustos y rutina diaria'),
      ]),
    ], ['patterns'], '把词汇和语法压成可替换的口语模板。'),
    node('a1-communicative-path', 'A1 交际任务路径', 'A1 communicative task path', 'Ruta comunicativa A1', 'section', [
      node('a1-distilled-identity-starter', '身份、姓名与来源', 'Identity, name, and origin', 'Identidad, nombre y origen', 'topic', [
        lesson('a1-distilled-identity-goal', '用 4-6 句介绍自己', 'Introduce yourself in four to six sentences', 'Presentarte en cuatro a seis frases', ['speaking', 'identity']),
        lesson('a1-distilled-identity-questions', '询问姓名、来源和学习目的', 'Ask about name, origin, and learning goals', 'Preguntar nombre, origen y objetivo de aprendizaje', ['questions', 'identity']),
        lesson('a1-distilled-identity-output', '把 ser / vivir / estudiar 连接成自我介绍', 'Connect ser, vivir, and estudiar in a self-introduction', 'Conectar ser, vivir y estudiar en una presentación', ['grammar', 'output']),
      ], ['distilled', 'speaking', 'identity'], '先把“我是谁、从哪里来、为什么学”变成能开口的最小表达。'),
      node('a1-distilled-classroom-survival', '课堂求助与学习动作', 'Classroom help and study actions', 'Ayuda en clase y acciones de estudio', 'topic', [
        lesson('a1-distilled-classroom-repeat', '请求重复、慢一点和解释', 'Ask for repetition, slower speech, and explanation', 'Pedir repetición, habla lenta y explicación', ['classroom', 'speaking']),
        lesson('a1-distilled-classroom-negative', '用 no entiendo 说明没听懂', 'Use no entiendo to say you do not understand', 'Usar no entiendo para decir que no entiendes', ['negative', 'classroom']),
        lesson('a1-distilled-classroom-question', '用 tengo una pregunta 发起提问', 'Use tengo una pregunta to start a question', 'Usar tengo una pregunta para preguntar', ['grammar', 'classroom']),
      ], ['distilled', 'classroom', 'survival'], '把课堂里的卡壳时刻变成可训练的西语求助句。'),
      node('a1-distilled-cafe-ordering', '咖啡馆点单与基础需求', 'Cafe ordering and basic needs', 'Pedir en una cafetería y necesidades básicas', 'topic', [
        lesson('a1-distilled-cafe-request', '用 quiero 点饮品和食物', 'Order drinks and food with quiero', 'Pedir bebidas y comida con quiero', ['restaurant', 'speaking']),
        lesson('a1-distilled-cafe-articles', '用 un / una 配合点单名词', 'Use un and una with order nouns', 'Usar un y una con sustantivos de pedido', ['articles', 'food']),
        lesson('a1-distilled-cafe-payment', '询价、结账和刷卡付款', 'Ask prices, request the bill, and pay by card', 'Preguntar precios, pedir la cuenta y pagar con tarjeta', ['shopping', 'restaurant']),
      ], ['distilled', 'restaurant', 'ordering'], '把饮品、数量、礼貌请求和付款连成一个完整小场景。'),
    ], ['distilled', 'tasks'], '把词汇和语法压缩成真实生活里可以直接使用的 A1 小任务。'),
    node('a1-skills', '听说读写训练', 'Listening, speaking, reading, writing', 'Escuchar, hablar, leer y escribir', 'section', [
      node('a1-skills-input', '输入训练', 'Input practice', 'Práctica de entrada', 'topic', [
        lesson('a1-skills-listening', '听力短句', 'Short listening texts', 'Textos breves de escucha'),
        lesson('a1-skills-reading', '阅读短文', 'Short readings', 'Lecturas breves'),
      ]),
      node('a1-skills-output', '输出训练', 'Output practice', 'Práctica de salida', 'topic', [
        lesson('a1-skills-speaking', '跟读与口语任务', 'Shadowing and speaking tasks', 'Repetición y tareas orales'),
        lesson('a1-skills-writing', '5 句自我介绍写作', 'Five-sentence self introduction', 'Presentación escrita de cinco frases'),
      ]),
      node('a1-skills-review', '复习闭环', 'Review loop', 'Ciclo de repaso', 'topic', [
        lesson('a1-skills-mixed', '混合训练', 'Mixed practice', 'Práctica mixta'),
        lesson('a1-skills-errors', '错题复习', 'Error review', 'Repaso de errores'),
      ]),
    ], ['skills'], '把输入、输出和复习连成一个小循环。'),
  ],
};
