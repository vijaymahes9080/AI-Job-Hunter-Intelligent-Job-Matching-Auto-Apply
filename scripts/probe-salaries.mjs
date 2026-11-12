const boards = ['gitlab', 'elastic', 'mongodb', 'datadog', 'databricks', 'vercel', 'figma', 'discord', 'stripe', 'groww'];
const re = /(?:salary|compensation|pay range|base pay|hourly rate|annual salary)[^.]{0,160}?(?:[$€£]\s?\d[\d,.]*\s?(?:[kKmM])?\s*(?:-|–|to)\s*[$€£]?\s?\d[\d,.]*\s?(?:[kKmM])?)/i;
for (const b of boards) {
  try {
    const r = await fetch('https://boards-api.greenhouse.io/v1/boards/' + b + '/jobs?content=true', { headers: { Accept: 'application/json' } });
    const d = await r.json();
    let withSal = 0;
    const samples = [];
    for (const j of d.jobs || []) {
      const txt = (j.content || '').replace(/<[^>]+>/g, ' ');
      const m = txt.match(re);
      if (m) {
        withSal += 1;
        if (samples.length < 3) samples.push(j.title + ' :: ' + m[0].slice(0, 160));
      }
    }
    console.log(b, 'jobs', (d.jobs || []).length, 'salary', withSal);
    for (const s of samples) console.log('   ', s);
  } catch (e) {
    console.log('err', b, e.message);
  }
}
