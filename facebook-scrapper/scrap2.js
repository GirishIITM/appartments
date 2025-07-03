fetch("https://www.facebook.com/marketplace/103799809658833/propertyrentals?exact=false&latitude=41.8097&longitude=-72.8311&radius=3", {
  "headers": {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en-IN;q=0.9,en;q=0.8,kn;q=0.7,hi;q=0.6",
    "cache-control": "no-cache",
    "dpr": "0.9",
    "pragma": "no-cache",
    "priority": "u=0, i",
    "sec-ch-prefers-color-scheme": "dark",
    "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"137.0.7151.119\", \"Chromium\";v=\"137.0.7151.119\", \"Not/A)Brand\";v=\"24.0.0.0\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": "\"\"",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-ch-ua-platform-version": "\"6.14.11\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "viewport-width": "1518",
    "cookie": "datr=bqBkaBndzOU6Vl7lH3DwTAYp; sb=bqBkaLPFH_mKT8GdrTO5ND3Q; ps_l=1; ps_n=1; locale=en_GB; c_user=100045272798056; xs=46%3Ad7yGmlLqM0XiQQ%3A2%3A1751432052%3A-1%3A-1; fr=0sMBQ7swwwbQvJWpK.AWcQjDVUjVm_Q9r_YIH2HmXNhd80jkqbtfSOzz8avC-O7NZpAjY.BoWmlj..AAA.0.0.BoZLt2.AWcZJs42T89bPAUbHpNWQB2ldiM; wd=1517x721; dpr=0.8999999761581421; presence=C%7B%22t3%22%3A%5B%5D%2C%22utc3%22%3A1751434618882%2C%22v%22%3A1%7D"
  },
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": null,
  "method": "GET"
})
  .then(response => response.text()).then(html => {
    fs = require('fs');
    fs.writeFileSync('facebook-apartments2.html', html);
    console.log('Facebook property rentals HTML saved successfully');
    console.log('HTML size:', html.length, 'characters');
    
    // Quick check for marketplace links in the HTML
    const linkMatches = html.match(/\/marketplace\/item\/\d+/g);
    if (linkMatches) {
      console.log('Found', linkMatches.length, 'marketplace item links in HTML');
    }
  })
  .catch(error => {
    console.error('Error fetching Facebook property rentals data:', error);
  });