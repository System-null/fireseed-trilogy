export interface FireseedIndexTextFields {
  mainBody?: string;
  keyEventsText?: string;
  principlesText?: string;
  messageToFuture?: string;
}

export function buildFireseedIndexText(fields: FireseedIndexTextFields): string {
  const normalizeLines = (text?: string): string[] =>
    (text ?? '')
      .split('\n')
      .map(v => v.trim())
      .filter(v => v.length > 0);

  const keyEvents = normalizeLines(fields.keyEventsText);
  const principles = normalizeLines(fields.principlesText);
  const sections: string[] = [];

  const mainBody = (fields.mainBody ?? '').trim();
  if (mainBody) sections.push(mainBody);

  if (keyEvents.length) {
    sections.push(
      '关键回忆事件小结：\n' + keyEvents.map((v, i) => `${i + 1}. ${v}`).join('\n'),
    );
  }

  if (principles.length) {
    sections.push(
      '不可违背的信条 / 原则：\n' + principles.map(v => `- ${v}`).join('\n'),
    );
  }

  const messageToFuture = (fields.messageToFuture ?? '').trim();
  if (messageToFuture) {
    sections.push(`留给未来某人的一句话：\n${messageToFuture}`);
  }

  return sections.join('\n\n');
}
