const companies = ['mattermost','grafana','sentry','netlify','cloudflare','supabase','hashnode','gitpod','canonical','postman','freshworks','zoho','chargebee','hasura','atlan','deepsource','sarvam','observe-ai','scaler','unacademy','razorpay','cred','jupiter','setu','moengage','clevertap','whatfix','leadsquared','wingify','vahan','fractal','tredence','sigmoid','locus','fareye','zolve','niramai','qure','solana','parity','consensys','nethermind','chainlink','tenderly','alchemy','polygon','coingecko','deliveroo','revolut','monzo','starling','wise','gocardless','checkout','sumup','personio','pitch','contentful','typeform','hotjar','pleo','taxfix','wefox','sennder','heyjobs','thermondo'];
for (const c of companies) {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${c}?mode=json`, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length) console.log(c, d.length, d.slice(0,2).map(j=>j.text+' / '+(j.categories?.location||'')));
    }
  } catch {}
}
