const headers = { 'content-type': 'application/json; charset=utf-8', 'x-unica-demo': 'helena' };
async function center(body) {
  const res = await fetch('https://unica-abd9.vercel.app/api/goals/center', { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json();
  return {
    kind: json.kind,
    persist: json.persist,
    mode: json.conference?.mode,
    selected: json.conference?.overall?.selected,
    weights: json.conference?.overall?.weights,
    scores: (json.conference?.overall?.scores ?? []).map((item) => ({ name: item.name, score: item.score, place: item.place })),
    reply: json.kind === 'clarify' ? json.reply : undefined,
  };
}

const APRIL = `Período: abril de 2027.
Condições:
* Tickets resolvidos: mínimo de 10.
* Satisfação: mínimo de 80%.
* Primeira resposta: máximo de 5 minutos.
* TMA: máximo de 15 minutos.
Rafael Oliveira: 20 tickets, 90% de satisfação, 2 minutos de primeira resposta e 10 minutos de TMA.
Felipe Costa: 18 tickets, 85% de satisfação, 3 minutos de primeira resposta e 12 minutos de TMA.
Camila: 9 tickets, 95% de satisfação, 6 minutos de primeira resposta e 18 minutos de TMA.
Conferir. Não alterar o pódio.`;

const four = await center({
  text: APRIL,
  mode: 'overall',
  history: [{ text: 'Desempenho geral: envie as condições de entrada e os resultados. Identifico os indicadores na mensagem.' }],
  indicators: ['satisfacao'],
});
const two = await center({
  text: 'Desempenho geral de abril de 2027. Tickets mínimo 10. Primeira resposta máximo 5 minutos. Rafael Oliveira: 20 tickets e 2 min de primeira resposta. Felipe Costa: 18 tickets e 3 min de primeira resposta. Conferir. Não alterar o pódio.',
  mode: 'overall',
});
const one = await center({
  text: 'Desempenho geral de abril de 2027. Satisfação mínima de 80%. Rafael Oliveira 90% de satisfação. Felipe Costa 85% de satisfação. Conferir. Não alterar o pódio.',
  mode: 'overall',
});
console.log(JSON.stringify({ four, two, one }, null, 2));
