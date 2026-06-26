import type { LocalizedText, VocabCategory } from '../../types';
import type { AdjectiveTerm, NounTerm, Term, VerbTerm, VocabularyItem, VocabularyLevel, VocabularySource } from './types';

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const articleless = (value: string) => value.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');

const withId = (level: VocabularyLevel, category: string, item: VocabularySource, index: number): VocabularyItem => ({
  ...item,
  level,
  category,
  id: `${level.toLowerCase()}-${slug(category)}-${slug(item.spanish)}-${index}`,
});

export function simple(level: VocabularyLevel, category: string, terms: Term[], template?: (spanish: string, zh: string, partOfSpeech: string, term: Term) => [string, string]): VocabularyItem[] {
  return terms.map(([spanish, zh, en, partOfSpeech], index) => {
    const [example, exampleZh] = template
      ? template(spanish, zh, partOfSpeech, [spanish, zh, en, partOfSpeech])
      : [`Aprendo la palabra "${spanish}".`, `我学习“${zh}”这个词。`];
    return withId(level, category, { spanish, zh, en, partOfSpeech, example, exampleZh }, index);
  });
}

export function numberEntries(level: VocabularyLevel, category: string, from: number, to: number): VocabularyItem[] {
  return Array.from({ length: to - from + 1 }, (_, offset) => {
    const value = from + offset;
    const spanish = numberToSpanish(value);
    return withId(level, category, {
      spanish,
      zh: `数字 ${value}`,
      en: `number ${value}`,
      partOfSpeech: '数词',
      example: `Tengo ${spanish} euros.`,
      exampleZh: `我有 ${value} 欧元。`,
    }, offset);
  });
}

export function adjectivePhrases(
  level: VocabularyLevel,
  category: string,
  nouns: NounTerm[],
  adjectives: AdjectiveTerm[],
  limit: number,
): VocabularyItem[] {
  const items: VocabularyItem[] = [];
  for (const noun of nouns) {
    for (const adjective of adjectives) {
      if (items.length >= limit) return items;
      const [nounEs, nounZh, nounEn, gender] = noun;
      const adjEs = gender === 'f' ? adjective[1] : adjective[0];
      const spanish = `${nounEs} ${adjEs}`;
      const adjectiveZh = adjective[2].replace(/的$/, '');
      const zh = `${adjectiveZh}的${nounZh}`;
      const en = `${adjective[3]} ${nounEn}`;
      items.push(withId(level, category, {
        spanish,
        zh,
        en,
        partOfSpeech: '短语',
        example: `Busco ${spanish}.`,
        exampleZh: `我在找${zh}。`,
      }, items.length));
    }
  }
  return items;
}

export function verbObjectPhrases(
  level: VocabularyLevel,
  category: string,
  verbs: VerbTerm[],
  objects: Term[],
  limit: number,
): VocabularyItem[] {
  const items: VocabularyItem[] = [];
  for (const verb of verbs) {
    for (const object of objects) {
      if (items.length >= limit) return items;
      if (!isCompatibleVerbObject(verb[0], object[0])) continue;
      const spanish = `${verb[0]} ${object[0]}`;
      const zh = `${verb[1]}${object[1]}`;
      const en = `${verb[2]} ${object[2]}`;
      items.push(withId(level, category, {
        spanish,
        zh,
        en,
        partOfSpeech: '动词短语',
        example: `Voy a ${spanish}.`,
        exampleZh: `我要${zh}。`,
      }, items.length));
    }
  }
  return items;
}

export function mergeUnique(items: VocabularyItem[]) {
  const seen = new Set<string>();
  const unique: VocabularyItem[] = [];
  const duplicates: string[] = [];

  items.forEach((item) => {
    const key = `${item.level}:${item.spanish.toLocaleLowerCase('es')}`;
    if (seen.has(key)) {
      duplicates.push(item.spanish);
      return;
    }
    seen.add(key);
    unique.push(item);
  });

  return { items: unique, duplicates };
}

export function toCategories(items: VocabularyItem[]): VocabCategory[] {
  const groups = new Map<string, VocabularyItem[]>();
  items.forEach((item) => groups.set(item.category, [...(groups.get(item.category) || []), item]));
  return Array.from(groups.entries()).map(([category, group]) => ({
    title: { zh: category, en: category, es: category } satisfies LocalizedText,
    items: group,
  }));
}

export function categoryStats(items: VocabularyItem[]) {
  return Array.from(items.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries());
}

export function exampleForNoun(spanish: string, zh: string): [string, string] {
  return [`Veo ${spanish}.`, `我看见${zh}。`];
}

export function exampleForTerm(spanish: string, zh: string, partOfSpeech: string): [string, string] {
  if (partOfSpeech.includes('动词') || partOfSpeech.includes('鍔ㄨ瘝') || /(?:arse|erse|irse|ar|er|ir)$/.test(spanish)) {
    return exampleForVerb(spanish, zh);
  }
  if (partOfSpeech.includes('形容词') || partOfSpeech.includes('褰㈠')) {
    return exampleForAdjective(spanish, zh);
  }
  if (partOfSpeech.includes('副词') || partOfSpeech.includes('短语') || partOfSpeech.includes('鍓') || partOfSpeech.includes('鐭')) {
    return [`Practico la expresión "${spanish}".`, `我练习“${zh}”这个表达。`];
  }
  return exampleForNoun(spanish, zh);
}

export function exampleForVerb(spanish: string, zh: string): [string, string] {
  const examples: Record<string, [string, string]> = {
    pedir: ['Quiero pedir un café.', '我想点一杯咖啡。'],
    levantarse: ['Me levanto a las siete.', '我七点起床。'],
    ducharse: ['Me ducho por la mañana.', '我早上洗澡。'],
    acostarse: ['Me acuesto temprano.', '我早睡。'],
    despertarse: ['Me despierto a las siete.', '我七点醒来。'],
    vestirse: ['Me visto después de ducharme.', '我洗澡后穿衣服。'],
    peinarse: ['Me peino antes de salir.', '我出门前梳头。'],
    afeitarse: ['Me afeito por la mañana.', '我早上刮胡子。'],
    maquillarse: ['Me maquillo para la fiesta.', '我为了聚会化妆。'],
    conectarse: ['Me conecto al wifi.', '我连接无线网络。'],
    despedirse: ['Me despido de mis amigos.', '我和朋友们告别。'],
    presentarse: ['Me presento en clase.', '我在课堂上做自我介绍。'],
    devolver: ['Quiero devolver esta camisa.', '我想退回这件衬衫。'],
    aprobar: ['Espero aprobar el examen.', '我希望通过考试。'],
    suspender: ['No quiero suspender el examen.', '我不想考试不及格。'],
    entregar: ['Voy a entregar la tarea hoy.', '我今天要交作业。'],
    entrenar: ['Entreno tres veces por semana.', '我每周训练三次。'],
    ganar: ['Queremos ganar el partido.', '我们想赢得比赛。'],
    perder: ['No quiero perder el tren.', '我不想错过火车。'],
    dibujar: ['Me gusta dibujar en casa.', '我喜欢在家画画。'],
    pintar: ['Pinto una pared blanca.', '我粉刷一面白墙。'],
    celebrar: ['Vamos a celebrar mi cumpleaños.', '我们要庆祝我的生日。'],
    invitar: ['Voy a invitar a mis amigos.', '我要邀请我的朋友们。'],
    regalar: ['Quiero regalar un libro.', '我想送一本书。'],
    planchar: ['Plancho la camisa.', '我熨衬衫。'],
    ordenar: ['Ordeno mi habitación.', '我整理我的房间。'],
    descargar: ['Descargo una aplicación.', '我下载一个应用。'],
    subir: ['Subo una foto.', '我上传一张照片。'],
    guardar: ['Guardo el archivo.', '我保存文件。'],
    borrar: ['Borro el mensaje.', '我删除消息。'],
    pensar: ['Pienso viajar mañana.', '我打算明天旅行。'],
    intentar: ['Intento hablar español.', '我试着说西班牙语。'],
    quedar: ['Quedo con Ana a las seis.', '我六点和 Ana 见面。'],
    discutir: ['No quiero discutir ahora.', '我现在不想争论。'],
    saludar: ['Saludo a mi vecino.', '我向邻居问好。'],
    denunciar: ['Voy a denunciar el problema.', '我要报告这个问题。'],
    solicitar: ['Necesito solicitar un permiso.', '我需要申请许可。'],
    ser: ['Soy estudiante.', '我是学生。'],
    estar: ['Estoy en casa.', '我在家。'],
    tener: ['Tengo una pregunta.', '我有一个问题。'],
    haber: ['Hay una farmacia cerca.', '附近有一家药店。'],
    ir: ['Voy a la escuela.', '我去学校。'],
    venir: ['Vengo de la oficina.', '我从办公室来。'],
    hacer: ['Hago la tarea.', '我做作业。'],
    decir: ['Digo la verdad.', '我说实话。'],
    hablar: ['Hablo español.', '我说西班牙语。'],
    escuchar: ['Escucho música.', '我听音乐。'],
    leer: ['Leo un libro.', '我读一本书。'],
    escribir: ['Escribo un correo.', '我写一封邮件。'],
    comer: ['Voy a comer arroz.', '我要吃米饭。'],
    beber: ['Voy a beber agua.', '我要喝水。'],
    vivir: ['Vivo en Madrid.', '我住在马德里。'],
    trabajar: ['Trabajo por la mañana.', '我上午工作。'],
    estudiar: ['Estudio español.', '我学习西班牙语。'],
    comprar: ['Compro un libro.', '我买一本书。'],
    pagar: ['Pago con tarjeta.', '我用卡付款。'],
    abrir: ['Abro la puerta.', '我打开门。'],
    cerrar: ['Cierro la ventana.', '我关窗。'],
    entrar: ['Entro en la clase.', '我进入教室。'],
    salir: ['Salgo a las ocho.', '我八点出门。'],
    tomar: ['Tomo un café.', '我喝一杯咖啡。'],
    querer: ['Quiero aprender español.', '我想学习西班牙语。'],
    poder: ['Puedo ayudar.', '我可以帮忙。'],
    necesitar: ['Necesito agua.', '我需要水。'],
    gustar: ['Me gusta el café.', '我喜欢咖啡。'],
    mirar: ['Miro el mapa.', '我看地图。'],
    ver: ['Veo una farmacia.', '我看到一家药店。'],
    llamar: ['Llamo a mi madre.', '我给妈妈打电话。'],
    ayudar: ['Ayudo a mi amigo.', '我帮助我的朋友。'],
    esperar: ['Espero el autobús.', '我等公交车。'],
    llegar: ['Llego a casa.', '我到家。'],
    llevar: ['Llevo una mochila.', '我背一个背包。'],
    poner: ['Pongo el libro aquí.', '我把书放这里。'],
    buscar: ['Busco una farmacia.', '我找一家药店。'],
    encontrar: ['Encuentro la respuesta.', '我找到答案。'],
    conocer: ['Conozco a Ana.', '我认识安娜。'],
    saber: ['Sé la respuesta.', '我知道答案。'],
    aprender: ['Aprendo español.', '我学习西班牙语。'],
    practicar: ['Practico la pronunciación.', '我练习发音。'],
    repetir: ['Repito la frase.', '我重复这个句子。'],
    preguntar: ['Pregunto la hora.', '我询问时间。'],
    responder: ['Respondo la pregunta.', '我回答问题。'],
    cocinar: ['Cocino arroz.', '我做米饭。'],
    limpiar: ['Limpio la cocina.', '我打扫厨房。'],
    descansar: ['Descanso en casa.', '我在家休息。'],
    caminar: ['Camino al parque.', '我走路去公园。'],
    viajar: ['Viajo a España.', '我去西班牙旅行。'],
    bailar: ['Bailo salsa.', '我跳萨尔萨舞。'],
    cantar: ['Canto una canción.', '我唱一首歌。'],
    jugar: ['Juego al fútbol.', '我踢足球。'],
    dormir: ['Duermo ocho horas.', '我睡八小时。'],
    desayunar: ['Desayuno pan.', '我早餐吃面包。'],
    almorzar: ['Almuerzo con amigos.', '我和朋友吃午饭。'],
    cenar: ['Ceno en casa.', '我在家吃晚饭。'],
    lavar: ['Lavo la ropa.', '我洗衣服。'],
    usar: ['Uso el móvil.', '我使用手机。'],
    contar: ['Cuento hasta diez.', '我数到十。'],
  };
  if (examples[spanish]) return examples[spanish];
  if (/(?:arse|erse|irse)$/.test(spanish)) {
    return [`Quiero ${spanish.replace(/se$/, 'me')} hoy.`, `我今天想${zh}。`];
  }
  return [`Quiero ${spanish} hoy.`, `我今天想${zh}。`];
}

export function exampleForAdjective(spanish: string, zh: string): [string, string] {
  return [`Es ${spanish}.`, `它是${zh}的。`];
}

function numberToSpanish(n: number): string {
  const units = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens: Record<number, string> = {
    10: 'diez',
    11: 'once',
    12: 'doce',
    13: 'trece',
    14: 'catorce',
    15: 'quince',
    16: 'dieciséis',
    17: 'diecisiete',
    18: 'dieciocho',
    19: 'diecinueve',
    20: 'veinte',
    21: 'veintiuno',
    22: 'veintidós',
    23: 'veintitrés',
    24: 'veinticuatro',
    25: 'veinticinco',
    26: 'veintiséis',
    27: 'veintisiete',
    28: 'veintiocho',
    29: 'veintinueve',
  };
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  if (n < 10) return units[n];
  if (n <= 29) return teens[n];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return unit === 0 ? tens[ten] : `${tens[ten]} y ${units[unit]}`;
  }
  if (n === 100) return 'cien';
  if (n < 200) return `ciento ${numberToSpanish(n - 100)}`;
  if (n === 200) return 'doscientos';
  return String(n);
}

export function nounTerms(terms: Array<[string, string, string, 'm' | 'f']>) {
  return terms;
}

export function objectTerms(terms: Array<[string, string, string, string]>) {
  return terms;
}

export function displayNoun(noun: string) {
  return articleless(noun);
}

function isCompatibleVerbObject(verb: string, object: string) {
  const v = verb.toLowerCase();
  const o = object.toLowerCase();
  const has = (...parts: string[]) => parts.some((part) => o.includes(part));

  if (v === 'comer') return has('arroz', 'pan', 'pollo', 'pescado', 'queso', 'huevo', 'sopa', 'ensalada', 'manzana', 'naranja', 'tortilla', 'postre');
  if (v === 'beber' || v === 'tomar') return has('agua', 'café', 'té', 'leche', 'cerveza');
  if (v === 'leer') return has('libro', 'correo', 'mensaje', 'menú', 'carta', 'documento', 'formulario');
  if (v === 'escribir') return has('correo', 'mensaje', 'respuesta', 'nombre', 'dirección', 'tarea');
  if (v === 'hablar' || v === 'estudiar' || v === 'aprender' || v === 'practicar') return has('español', 'inglés', 'pronunciación', 'frase', 'verbo');
  if (v === 'escuchar') return has('música', 'audio', 'canción');
  if (v === 'mirar' || v === 'ver') return has('mapa', 'libro', 'menú', 'carta', 'museo', 'película', 'pantalla', 'foto', 'salida', 'farmacia');
  if (v === 'abrir' || v === 'cerrar') return has('puerta', 'ventana', 'libro', 'archivo', 'aplicación');
  if (v === 'entrar') return has('clase', 'casa', 'tienda', 'hotel', 'museo', 'hospital');
  if (v === 'salir') return has('casa', 'hotel', 'oficina', 'escuela');
  if (v === 'llevar') return has('mochila', 'maleta', 'libro', 'abrigo', 'camisa', 'vestido', 'zapatos');
  if (v === 'poner') return has('libro', 'mesa', 'vaso', 'dirección', 'música', 'maleta');
  if (v === 'llamar') return has('médico', 'madre', 'padre', 'amigo', 'profesor');
  if (v === 'ayudar') return has('amigo', 'madre', 'padre', 'profesor', 'cliente', 'persona');
  if (v === 'esperar') return has('autobús', 'tren', 'taxi', 'amigo', 'respuesta');
  if (v === 'llegar') return has('casa', 'hotel', 'escuela', 'oficina');
  if (v === 'cocinar') return has('arroz', 'pollo', 'pescado', 'sopa', 'comida');
  if (v === 'limpiar') return has('casa', 'cocina', 'baño', 'habitación', 'mesa');
  if (v === 'lavar') return has('ropa', 'plato', 'mano', 'coche');
  if (v === 'usar') return has('móvil', 'aplicación', 'tarjeta', 'contraseña', 'mapa');
  if (v === 'contar') return has('historia', 'número', 'personas');
  if (v === 'vivir') return has('madrid', 'barcelona', 'casa', 'ciudad', 'barrio');
  if (v === 'pagar') return has('precio', 'cuenta', 'recibo', 'billete', 'entrada');
  if (v === 'reservar' || v === 'cancelar' || v === 'confirmar' || v === 'cambiar') return has('reserva', 'cita', 'mesa', 'hotel', 'habitación', 'billete', 'hora', 'reunión', 'vuelo');
  if (v === 'visitar') return has('museo', 'parque', 'ciudad', 'hospital', 'biblioteca', 'hotel', 'catedral');
  if (v === 'probar') return has('comida', 'tapas', 'postre', 'camisa', 'vestido', 'zapato');
  if (v === 'enviar' || v === 'recibir') return has('mensaje', 'correo', 'archivo', 'documento');
  if (v === 'explicar') return has('problema', 'idea', 'respuesta', 'razón', 'ejercicio');
  if (v === 'recordar' || v === 'olvidar') return has('cita', 'contraseña', 'nombre', 'dirección', 'fecha', 'tarea');
  if (v === 'preparar') return has('examen', 'viaje', 'comida', 'reunión', 'proyecto', 'maleta');
  if (v === 'buscar' || v === 'encontrar' || v === 'necesitar' || v === 'comprar' || v === 'querer') return !has('verdad', 'realidad');
  return false;
}
