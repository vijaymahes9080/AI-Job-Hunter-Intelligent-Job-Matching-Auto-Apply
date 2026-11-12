const boards = [
  'postman','razorpay','freshworks','chargebee','hasura','browserstack','atlan','groww','meesho','swiggy','zomato','phonepe','cred','zepto','dream11','ola','flipkart','myntra','noon','deel','remotecom','gitlab','stripe','vercel','supabase','notion','figma','linear','airtable','discord','shopify','cloudflare','datadog','databricks','snowflake','mongodb','elastic','hashicorp','canonical','autommattic','automattic'
];
const results = [];
for (const b of boards) {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) { console.log(b, r.status); continue; }
    const d = await r.json();
    const jobs = (d.jobs || []);
    const india = jobs.filter(j => /india|bengaluru|bangalore|hyderabad|chennai|pune|mumbai|gurugram|noida|remote/i.test(j.location?.name || ''));
    console.log(b, jobs.length, 'india-ish', india.length);
    if (india.length) results.push({board:b, jobs:india.slice(0,5).map(j=>({title:j.title,loc:j.location?.name,id:j.id,url:j.absolute_url}))});
  } catch(e) { console.log(b, 'ERR', e.message); }
}
console.log(JSON.stringify(results,null,2));
