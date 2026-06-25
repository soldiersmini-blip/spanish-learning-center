export function humanizeAuthError(message?: string) {
  if (!message) return '账号操作失败，请稍后再试。';
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login')) return '邮箱或密码不正确。';
  if (normalized.includes('email')) return '请检查邮箱格式或邮箱验证状态。';
  if (normalized.includes('password')) return '密码不符合要求，请至少使用 8 个字符。';
  if (normalized.includes('rate')) return '请求过于频繁，请稍后再试。';
  return message;
}
