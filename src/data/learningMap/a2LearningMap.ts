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
  level: 'A2',
  title: L(titleZh, titleEn, titleEs),
  description: L(descriptionZh || titleZh, titleEn, titleEs),
  type,
  children,
  tags,
});

const lesson = (id: string, zh: string, en: string, es: string, tags: string[] = []) =>
  node(id, zh, en, es, 'lesson', [], tags);

export const a2LearningMap: LearningMapContent = {
  level: 'A2',
  levelId: 'a2',
  title: L('A2 学习地图', 'A2 learning map', 'Mapa de aprendizaje A2'),
  description: L('围绕过去经历、计划、比较、预约、旅行和更自然的日常表达继续扩展。', 'Expand into past experiences, plans, comparisons, appointments, travel, and richer daily communication.', 'Amplía hacia experiencias pasadas, planes, comparaciones, citas, viajes y comunicación cotidiana.'),
  nodes: [
    node('a2-vocabulary', 'A2 词汇', 'A2 vocabulary', 'Vocabulario A2', 'section', [
      node('a2-vocabulary-life-health', '日常与健康', 'Daily life and health', 'Vida diaria y salud', 'topic', [
        lesson('a2-vocabulary-daily-life', '日常生活与家务', 'Daily life and housework', 'Vida diaria y tareas domésticas'),
        lesson('a2-vocabulary-health', '健康看病', 'Health and doctor visits', 'Salud y médico'),
      ]),
      node('a2-vocabulary-travel-public', '旅行与公共服务', 'Travel and public services', 'Viajes y servicios públicos', 'topic', [
        lesson('a2-vocabulary-travel-hotel', '旅行酒店', 'Travel and hotels', 'Viajes y hotel'),
        lesson('a2-vocabulary-restaurant-shopping', '餐厅购物', 'Restaurants and shopping', 'Restaurante y compras'),
        lesson('a2-vocabulary-public-services', '公共服务与预约', 'Public services and appointments', 'Servicios públicos y citas'),
      ]),
      node('a2-vocabulary-social-work', '学习、工作与社交', 'Study, work, and social life', 'Estudio, trabajo y vida social', 'topic', [
        lesson('a2-vocabulary-school-work', '学校工作', 'School and work', 'Escuela y trabajo'),
        lesson('a2-vocabulary-hobbies-culture', '爱好运动与节日文化', 'Hobbies, sports, festivals', 'Aficiones, deportes y fiestas'),
        lesson('a2-vocabulary-emotions-relations', '情绪性格与社交关系', 'Emotions, personality, relations', 'Emociones, personalidad y relaciones'),
      ]),
      node('a2-vocabulary-time-abstract', '经历与计划', 'Experiences and plans', 'Experiencias y planes', 'topic', [
        lesson('a2-vocabulary-past', '过去经历', 'Past experiences', 'Experiencias pasadas'),
        lesson('a2-vocabulary-future', '未来计划', 'Future plans', 'Planes futuros'),
        lesson('a2-vocabulary-abstract-verbs', '抽象词与进阶动词', 'Abstract words and advanced verbs', 'Palabras abstractas y verbos avanzados'),
      ]),
    ], ['words'], '词汇开始服务于更完整的故事、计划和真实沟通。'),
    node('a2-grammar', 'A2 语法', 'A2 grammar', 'Gramática A2', 'section', [
      node('a2-grammar-pronouns-verbs', '代词与动词结构', 'Pronouns and verb structures', 'Pronombres y estructuras verbales', 'topic', [
        lesson('a2-grammar-reflexive-verbs', '反身动词', 'Reflexive verbs', 'Verbos reflexivos'),
        lesson('a2-grammar-object-pronouns', '直接 / 间接宾语代词', 'Direct and indirect object pronouns', 'Pronombres de objeto directo e indirecto'),
        lesson('a2-grammar-modal-structures', 'tener que / poder / querer / deber', 'tener que, poder, querer, deber', 'tener que, poder, querer, deber'),
      ]),
      node('a2-grammar-comparison', '比较与描述', 'Comparison and description', 'Comparación y descripción', 'topic', [
        lesson('a2-grammar-comparatives', '比较级 más / menos / tan', 'Comparatives más/menos/tan', 'Comparativos más/menos/tan'),
        lesson('a2-grammar-superlatives', '最高级 el/la más', 'Superlatives el/la más', 'Superlativos el/la más'),
        lesson('a2-grammar-ser-estar-advanced', 'ser / estar 进阶区别', 'Advanced ser vs estar', 'ser / estar avanzado'),
      ]),
      node('a2-grammar-time', '过去、现在、将来', 'Past, present, future', 'Pasado, presente, futuro', 'topic', [
        lesson('a2-grammar-perfect', '现在完成时', 'Present perfect', 'Pretérito perfecto'),
        lesson('a2-grammar-indefinido', '简单过去时', 'Simple past', 'Pretérito indefinido'),
        lesson('a2-grammar-imperfecto', '未完成过去时入门', 'Intro to imperfect', 'Introducción al imperfecto'),
        lesson('a2-grammar-ir-a', 'ir a + infinitivo 表将来', 'Future with ir a + infinitive', 'Futuro con ir a + infinitivo'),
        lesson('a2-grammar-progressive', 'estar + gerundio', 'estar + gerund', 'estar + gerundio'),
      ]),
      node('a2-grammar-communication', '连接与表达策略', 'Connectors and expression strategies', 'Conectores y estrategias', 'topic', [
        lesson('a2-grammar-imperative', '命令式入门', 'Intro to imperative', 'Introducción al imperativo'),
        lesson('a2-grammar-por-para', 'por / para 基础区别', 'Basic por vs para', 'Diferencia básica por / para'),
        lesson('a2-grammar-saber-conocer', 'saber / conocer 区别', 'saber vs conocer', 'saber / conocer'),
        lesson('a2-grammar-gustar-family', 'gustar 类动词', 'gustar-like verbs', 'Verbos tipo gustar'),
        lesson('a2-grammar-connectors', 'porque / pero / aunque / entonces / además', 'Common connectors', 'Conectores frecuentes'),
      ]),
    ], ['grammar'], 'A2 的语法重点是让句子能讲经历、计划、原因和关系。'),
    node('a2-sentences', 'A2 句式', 'A2 sentence patterns', 'Frases A2', 'section', [
      node('a2-sentences-past-plan', '经历与计划', 'Experiences and plans', 'Experiencias y planes', 'topic', [
        lesson('a2-sentences-past-experience', '讲述过去经历', 'Talking about past experiences', 'Contar experiencias pasadas'),
        lesson('a2-sentences-future-plan', '表达计划', 'Expressing plans', 'Expresar planes'),
      ]),
      node('a2-sentences-services', '服务场景', 'Service situations', 'Situaciones de servicio', 'topic', [
        lesson('a2-sentences-travel', '描述旅行', 'Describing travel', 'Describir viajes'),
        lesson('a2-sentences-doctor', '看病', 'At the doctor', 'En el médico'),
        lesson('a2-sentences-appointments', '预约与改期', 'Appointments and rescheduling', 'Citas y cambios'),
      ]),
      node('a2-sentences-ideas', '观点与组织', 'Ideas and organization', 'Ideas y organización', 'topic', [
        lesson('a2-sentences-advice-obligation', '建议、义务、能力', 'Advice, obligation, ability', 'Consejo, obligación y capacidad'),
        lesson('a2-sentences-comparison-habit', '比较、习惯、正在发生', 'Comparison, habits, ongoing actions', 'Comparación, hábitos y acciones en progreso'),
        lesson('a2-sentences-email', '简单邮件或留言', 'Simple email or note', 'Correo o mensaje simple'),
      ]),
    ], ['patterns'], '把 A2 语法放进真实场景里反复替换。'),
    node('a2-dialogues', '场景对话', 'Scenario dialogues', 'Diálogos por situación', 'section', [
      node('a2-dialogues-travel', '旅行酒店', 'Travel and hotel', 'Viaje y hotel', 'topic', [
        lesson('a2-dialogues-checkin', '酒店入住', 'Hotel check-in', 'Registro en hotel'),
        lesson('a2-dialogues-ticket', '买票与问交通', 'Tickets and transport questions', 'Billetes y transporte'),
      ]),
      node('a2-dialogues-service', '医疗与餐厅', 'Medical and restaurant', 'Médico y restaurante', 'topic', [
        lesson('a2-dialogues-doctor', '描述症状', 'Describing symptoms', 'Describir síntomas'),
        lesson('a2-dialogues-restaurant', '点餐、结账、投诉', 'Ordering, paying, complaining', 'Pedir, pagar y reclamar'),
      ]),
    ], ['dialogue'], '用角色扮演把句式练成能开口的对话。'),
    node('a2-skills', '听说读写训练', 'Listening, speaking, reading, writing', 'Escuchar, hablar, leer y escribir', 'section', [
      node('a2-skills-input', '听读输入', 'Listening and reading input', 'Entrada de escucha y lectura', 'topic', [
        lesson('a2-skills-listening-dialogues', '酒店、看病、点餐短对话', 'Short hotel, doctor, restaurant dialogues', 'Diálogos breves de hotel, médico y restaurante'),
        lesson('a2-skills-reading-texts', '旅行日记、邮件、通知', 'Travel diary, email, notice', 'Diario de viaje, correo y aviso'),
      ]),
      node('a2-skills-output', '说写输出', 'Speaking and writing output', 'Salida oral y escrita', 'topic', [
        lesson('a2-skills-roleplay', '角色扮演任务', 'Role-play tasks', 'Tareas de rol'),
        lesson('a2-skills-writing', '短邮件、日记、计划说明', 'Short email, diary, plan note', 'Correo breve, diario y plan'),
      ]),
    ], ['skills'], 'A2 要把“会选答案”推进到“能表达一段话”。'),
    node('a2-review', '复习与测试', 'Review and tests', 'Repaso y pruebas', 'section', [
      node('a2-review-vocabulary', '词汇掌握度', 'Vocabulary mastery', 'Dominio del vocabulario', 'topic', [
        lesson('a2-review-vocab-test', '随机词汇训练', 'Random vocabulary training', 'Entrenamiento aleatorio de vocabulario', ['test']),
        lesson('a2-review-wrong-words', '错题词复习', 'Wrong-word review', 'Repaso de errores'),
      ]),
      node('a2-review-mixed', '混合复习', 'Mixed review', 'Repaso mixto', 'topic', [
        lesson('a2-review-grammar-patterns', '语法句式混合', 'Grammar and patterns mixed', 'Gramática y frases mezcladas'),
        lesson('a2-review-weekly', '每周小测', 'Weekly mini test', 'Mini prueba semanal'),
      ]),
    ], ['review'], '把 A2 内容按周回收，避免学过就散。'),
  ],
};
