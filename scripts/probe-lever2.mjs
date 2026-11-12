const companies = ['meesho','swiggy','zomato','flipkart','myntra','phonepe','paytm','navi','slice','jupiter','groww','upstox','zerodha','smallcase','coinswitch','instamojo','razorpay','cashfree','payu','billdesk','open','airtel','jio','infosys','tcs','wipro','hcl','techmahindra','ltimindtree','mphasis','hexaware','persistent','coforge','birlasoft','zensar','cyient','questglobal','tataelxsi','thoughtworks','publicissapient','nagarro','globant','epam','luxoft','dxc','unacademy','byjus','vedantu','upgrad','simplilearn','greatlearning','scaler','interviewbit','hackerrank','hackerearth','codechef','geeksforgeeks','turing','deel','remote','klenty','chargebee','zoho','freshworks','whatfix','capillary','manthan','algonomy','locus','fareye','delhivery','shiprocket','porter','blackbuck','rivigo','ninjacart','waycool','bigbasket','grofers','blinkit','zepto','dunzo','urban-company','urbanclap','housejoy','nobroker','magicbricks','99acres','housing','proptiger','makemytrip','goibibo','cleartrip','yatra','ixigo','redbus','abhibus','oyo','treebo','fabhotels'];
for (const c of companies) {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${c}?mode=json`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length) {
        const india = d.filter(j => /india|chennai|bengaluru|bangalore|hyderabad|pune|mumbai|gurugram|noida/i.test(JSON.stringify(j.categories||{})));
        console.log(c, 'total', d.length, 'india', india.length);
      }
    }
  } catch {}
}
