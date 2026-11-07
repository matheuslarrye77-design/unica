const sha = 'e3a95c5';
const status = await (await fetch(`https://api.github.com/repos/matheuslarrye77-design/unica/commits/${sha}/status`)).json();
console.log(JSON.stringify({
  state: status.state,
  statuses: (status.statuses ?? []).map((item) => ({ context: item.context, state: item.state })),
}));
const overall = await fetch('https://unica-abd9.vercel.app/api/goals/center', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8', 'x-unica-demo': 'helena' },
  body: JSON.stringify({ text: 'Calcule o desempenho geral de novembro de 2026 com os pesos atuais. Não alterar o pódio.', mode: 'overall' }),
});
const body = await overall.json();
const ids = (body.conference?.overall?.scores ?? []).map((item) => item.userId);
console.log(JSON.stringify({
  kind: body.kind,
  n: ids.length,
  unique: new Set(ids).size,
  scores: body.conference?.overall?.scores?.map((item) => ({ name: item.name, score: item.score, place: item.place })),
  criterionProbe: 'skip',
}, null, 2));
const bank = await (await fetch('https://unica-abd9.vercel.app/api/goals', { headers: { 'x-unica-demo': 'helena' } })).json();
console.log(JSON.stringify({
  criterion: bank.criterion,
  applied: bank.ledger?.applied?.length,
  nov: bank.bank?.periods?.find((item) => item.key === '2026-11')?.goals?.length,
  jan: bank.bank?.periods?.find((item) => item.key === '2027-01')?.goals,
}, null, 2));
