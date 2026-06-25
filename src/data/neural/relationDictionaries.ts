export const synonymGroups = [
  {
    groupId: 'beautiful',
    words: ['bonito', 'hermoso', 'lindo', 'guapo'],
    explanationZh: '都可以表达好看，但使用对象和语气不同：bonito 常用，hermoso 更书面，guapo 多用于人，lindo 在拉美更常见。',
  },
  {
    groupId: 'school',
    words: ['la escuela', 'el colegio', 'la clase', 'la universidad'],
    explanationZh: '都和学校学习相关，但范围不同：escuela 泛指学校，colegio 多指中小学或私校，clase 是课/班级，universidad 是大学。',
  },
  {
    groupId: 'ask',
    words: ['pedir', 'preguntar', 'solicitar', 'ordenar'],
    explanationZh: '都和“提出要求”有关：pedir 是请求或点餐，preguntar 是提问，solicitar 更正式，ordenar 可表示点餐或命令。',
  },
  {
    groupId: 'know',
    words: ['saber', 'conocer'],
    explanationZh: 'saber 表示知道事实或会做某事，conocer 表示认识人或熟悉地点。',
  },
  {
    groupId: 'want-need',
    words: ['querer', 'necesitar', 'preferir'],
    explanationZh: 'querer 表示想要，necesitar 表示需要，preferir 表示更喜欢。',
  },
];

export const antonymPairs = [
  ['grande', 'pequeño', 'grande 表示大的，pequeño 表示小的。'],
  ['bueno', 'malo', 'bueno 表示好的，malo 表示坏的。'],
  ['bien', 'mal', 'bien 表示好，mal 表示不好。'],
  ['nuevo', 'viejo', 'nuevo 表示新的，viejo 表示旧的或年老的。'],
  ['alto', 'bajo', 'alto 表示高的，bajo 表示矮的或低的。'],
  ['caro', 'barato', 'caro 表示贵的，barato 表示便宜的。'],
] as const;

export const confusableGroups = [
  {
    words: ['ser', 'estar'],
    explanationZh: 'ser 表达身份、职业、国籍等相对稳定信息；estar 表达位置、状态和临时情况。',
  },
  {
    words: ['pedir', 'preguntar'],
    explanationZh: 'pedir 是请求得到某物或服务；preguntar 是提出问题。',
  },
  {
    words: ['saber', 'conocer'],
    explanationZh: 'saber 是知道信息或技能；conocer 是认识人或熟悉地点。',
  },
  {
    words: ['por', 'para'],
    explanationZh: 'por 常表示原因、经过、交换；para 常表示目的、对象、截止时间。',
  },
];

export const commonCollocations: Record<string, string[]> = {
  pedir: ['pedir ayuda', 'pedir comida', 'pedir permiso', 'pedir la cuenta'],
  comer: ['comer arroz', 'comer pan', 'comer con amigos'],
  beber: ['beber agua', 'beber café', 'beber leche'],
  vivir: ['vivir en Madrid', 'vivir con la familia', 'vivir cerca'],
  estudiar: ['estudiar español', 'estudiar en casa', 'estudiar todos los días'],
  hablar: ['hablar español', 'hablar con un amigo', 'hablar por teléfono'],
  reservar: ['reservar una mesa', 'reservar una habitación', 'reservar un billete'],
  cancelar: ['cancelar una cita', 'cancelar una reserva', 'cancelar un vuelo'],
  buscar: ['buscar una farmacia', 'buscar trabajo', 'buscar información'],
  comprar: ['comprar pan', 'comprar un billete', 'comprar ropa'],
};
