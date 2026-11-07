export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function recognitionHeadline(from: string, to: string, received = false) {
  const author = firstNameOf(from);
  const person = firstNameOf(to);
  if (received || from.trim() === to.trim()) return `${person} recebeu um reconhecimento especial!`;
  return `${author} reconheceu o excelente trabalho de ${person}!`;
}
