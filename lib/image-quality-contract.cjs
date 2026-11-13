'use strict';
// One frozen teaching target travels with the prompt and the review receipt.
// This describes expectations; it never assigns an image a passing decision.
const VERSION='teaching-image-v4',STYLE_VERSION='flat-vector-v1';
const STYLE='精细商业矢量风二维插画（flat vector illustration）：以轮廓清楚的封闭形状、纯色填充和硬边阴影绘制，每种材质用两到三档分离色块；协调配色、自然姿态、完整而精致的构图。细节用于辨认结构与动作，不靠密集写实纹理增加复杂度。';
const STYLE_PLANNING='商业矢量方案须把材质翻译成可画的平面形状：用少量线条表示树皮和翅脉，用大块色面表示泥水、岩石、雪和金属。保留物种识别特征及必要环境，勿改成空白背景小图标；不要新增自然主义纹理、摄影光照、景深虚化或渐层材质要求。用户明确指定其他画风时以用户要求为准。';
const STYLE_FINISH='绘制方式：主体和背景都采用硬边纯色色块与有节制的线条。保留识别词义所需的轮廓、翅脉、触须及空间关系；材质用少量形状概括，不逐粒描绘泥沙、树皮裂片、碎冰或岩石噪点。阴影为形状明确的色块，反光为简洁色片，透明物用统一透明色面；不使用连续渐变、喷枪明暗、镜头虚化、写实高光或绘画笔触。此约束只改变画法，不删改主体、关键结构、场景或原登记限制。用户明确指定其他画风时以用户要求为准。';
const COMPOSITION='一个地点、同一时刻，围绕一个主要动作或结果。禁止分格、前后对照、拼贴、画中画；不要复制同一人物表示多个时刻，不加解释箭头或漂浮图标。多个词义只呈现选定的一项。';
const MARKS='不添加标题、标签、对话文字、伪文字、品牌或水印。物件本身确有的功能图示只有必要且准确时才保留；不要额外添加徽章或象征标记来解释词义。词条与用户明确限制优先。';
function reviewTarget(item){
 const s=item.contentSnapshot||{},p=s.scenePlan;
 if(!item.contentSnapshot)return null;
 return {version:item.qualityContract?.version||p?.qualityVersion||'legacy-frozen-prompt',
  word:s.spanish||item.spanish||'',meaning:p?.meaningExcerpt||s.meaningZh||'',
  contextEs:p?.contextEs||s.context?.spanish||'',contextStatus:s.context?.spanish?'registered-context':p?.contextEs?'generated-draft':'missing',
  sceneZh:p?.sceneZh||s.illustrationPlan?.sceneZh||s.imageBrief||'',mustShow:p?.mustShow||[],avoid:p?.avoid||[],
  userRequirements:s.requestText||'',sourceRestrictions:[s.scope,s.imageBrief,s.illustrationPlan?.ambiguityAndAvoid].filter(Boolean),
  contextUse:'图片辅助该配句，不要求静态画面单独证明心理、时长、声音或语法；仍须检查图句是否矛盾。',
  review:'pending-independent-review'};
}
function contractFor(item){return {...reviewTarget(item),version:VERSION,style:STYLE,styleVersion:STYLE_VERSION,styleRendering:STYLE_FINISH,composition:COMPOSITION,marks:MARKS};}
const REFERENCE_STYLE='精细商业矢量插画：以所选画风样板的整体媒介、轮廓、色块组织和层次为准，完整表达本词场景，不做简陋图标。';
const REFERENCE_FINISH='画风控制：主体与环境保持样板的概括程度和线条色块关系，保留辨认词义所需的形态与细节。样板中克制的渐变或材质层次可沿用，不扩展成摄影、3D或密集写实绘景；用户和原登记的明确限制仍优先。';
module.exports={VERSION,STYLE_VERSION,STYLE,STYLE_PLANNING,STYLE_FINISH,REFERENCE_STYLE,REFERENCE_FINISH,COMPOSITION,MARKS,reviewTarget,contractFor};
