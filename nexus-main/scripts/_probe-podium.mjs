import fs from 'node:fs';

const json = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const podium of json.podiums ?? []) {
  console.log('---', podium.periodKey, podium.mode, podium.modeLabel);
  for (const row of podium.ranking ?? []) {
    console.log(row.place, row.name, row.displayScore ?? row.score);
    for (const metric of row.metrics ?? []) {
      console.log(' ', metric.id, metric.shown, 'contrib', metric.contribution);
    }
  }
}
console.log('count', (json.podiums ?? []).length);
