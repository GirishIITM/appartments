const headers = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-US,en;q=0.8",
  "content-type": "application/json",
  priority: "u=1, i",
  "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "sec-gpc": "1",
  "x-requested-with": "XMLHttpRequest",
  Referer: "https://www.apartments.com/?bb=n45gr000wHjr10jqI",
  "Referrer-Policy": "no-referrer-when-downgrade",
};

const headersraw = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.8",
  "cache-control": "max-age=0",
  priority: "u=0, i",
  "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "sec-gpc": "1",
  "upgrade-insecure-requests": "1",
  cookie: "AKA_A2=A",
};

const headersIndividual = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.8",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "x-csrf-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYmYiOjE3NTAyMjkxODcsImV4cCI6MTc1MDMxNTU4NywiaWF0IjoxNzUwMjI5MTg3LCJpc3MiOiJodHRwczovL3d3dy5hcGFydG1lbnRzLmNvbSIsImF1ZCI6Imh0dHBzOi8vd3d3LmFwYXJ0bWVudHMuY29tIn0.bDDweTWsei7UAjy3o-OMxKyTEEAAGYKZmTjxqXjzCu0",
    "x-requested-with": "XMLHttpRequest",
    "cookie": "cb=1; cul=en-US; ab=%7b%22e%22%3atrue%2c%22r%22%3a%5b%5d%7d; afe=%7b%22e%22%3afalse%7d; fso=%7b%22e%22%3afalse%7d; _ga=GA1.2.344681279.1750223500; _gid=GA1.2.1156129840.1750223500; s=; akaalb_www_apartments_com_main=1750232789~op=ap_alb_aptsweb_prd_rental_trends:www_apartments_com_RESTON|ap_alb_aptsweb_prd_reston_only:www_apartments_com_RESTON|ap_alb_aptsweb_prd_default:www_apartments_com_LAX|~rv=80~m=www_apartments_com_RESTON:0|www_apartments_com_LAX:0|~os=0847b47fe1c72dfaedb786f1e8b4b630~id=502c272664bed0009adb0181d0ba3d4f; ak_bmsc=5F6EB39B2A0C71A2C64081CE4EB4AF81~000000000000000000000000000000~YAAQDAHARYArm3iXAQAAHUzjgRwtNKvomYdquWQFHcKD/qRRSziKRxX0VuCDIoQLN61/PXM7QwWxUW3jmMrOvNscKLLV1u1MrmmJlHv2/HZmqo002tFZ6JwoajB2OCi/S0gwq6G7wq2nucQBKb7MRP4R79fs9VdejWvgQqzhJK0FIx1kQKJlxM1R4CzopyS4/H13XxyPFZCsG8hC/RqV4ByDjyvPFvV6vzw4rW7FXMtqTtFIaqZ1L9wka21kBc+plf657X08k6Bw13FjmECAHtIhA8ryZfIYjqfvlxelgevc7+trjUa2vt8VMdfRSMbDgNOMfsV2v1q3sdfNWP6zPA79hcRI6m8xOEw5pGcIwVeyDSPi+L4ze9abeRP3Tn6st9R7jIaC1OuSDwVEQNZA; sr=%7B%22Width%22%3A879%2C%22Height%22%3A897%2C%22PixelRatio%22%3A1%7D; uat=%7B%22VisitorId%22%3A%229f1ceb58-7982-4003-bf70-077950cb6cec%22%2C%22VisitId%22%3A%227e0263ab-1c2f-47c6-8b15-cb19a508261d%22%2C%22LastActivityDate%22%3A%222025-06-18T02%3A56%3A58.9108503-04%3A00%22%2C%22LastFrontDoor%22%3A%22APTS%22%2C%22LastSearchId%22%3A%2246E7F1CD-2906-4AA5-A242-B75D19DB8A78%22%7D; lsc=%7B%22Map%22%3A%7B%22BoundingBox%22%3A%7B%22LowerRight%22%3A%7B%22Latitude%22%3A41.74402%2C%22Longitude%22%3A-72.82534%7D%2C%22UpperLeft%22%3A%7B%22Latitude%22%3A41.84205%2C%22Longitude%22%3A-72.90396%7D%7D%2C%22CountryCode%22%3A%22US%22%7D%2C%22Geography%22%3A%7B%22ID%22%3A%228gttx22%22%2C%22Display%22%3A%22Avon%2C%20CT%22%2C%22GeographyType%22%3A2%2C%22Address%22%3A%7B%22City%22%3A%22Avon%22%2C%22CountryCode%22%3A%22USA%22%2C%22County%22%3A%22Hartford%22%2C%22State%22%3A%22CT%22%2C%22MarketName%22%3A%22Hartford%22%2C%22DMA%22%3A%22Hartford-New%20Haven%2C%20CT%22%7D%2C%22Location%22%3A%7B%22Latitude%22%3A41.79142%2C%22Longitude%22%3A-72.86246%7D%2C%22BoundingBox%22%3A%7B%22LowerRight%22%3A%7B%22Latitude%22%3A41.7579%2C%22Longitude%22%3A-72.79674%7D%2C%22UpperLeft%22%3A%7B%22Latitude%22%3A41.82494%2C%22Longitude%22%3A-72.92819%7D%7D%2C%22v%22%3A863%2C%22IsPmcSearchByCityState%22%3Afalse%2C%22IsAreaTooFar%22%3Afalse%7D%2C%22Listing%22%3A%7B%7D%2C%22Paging%22%3A%7B%7D%2C%22IsBoundedSearch%22%3Atrue%2C%22ResultSeed%22%3A61515%2C%22Options%22%3A0%2C%22CountryAbbreviation%22%3A%22US%22%2C%22AdditionalLocales%22%3A%5B%5D%7D; bm_mi=91B88EEDC2BB91F4D0CF9F2A82E32B5F~YAAQDAHARUYsm3iXAQAAz5XjgRwWa+Wq5xrX5Sqlt8aZ/uB6qRa1NWDXoiWtfMo2fQ4ezyRqyFsRBtm6jNStAYH6aYn4yfKgcSLNQ7m5ACkmDbhbTkTFfGVPMf6IV4UGiV+s1gbIgHZvAl3p0cmiY5/W0Bby9cSXq2KFeln01IoWsL2+ZpICTBd2UPWPAN1m0iR9MVzPtMQIF8NZTJI+rdsOPejzskQGF8MkL92xZ/64Zp3vPwlqnDblNiqbJvNMu01X+b6RLcfEOCVNtT5JtzzxAnlMFakBLDjvfOPWeTjG8rs+4aXDJZGf3LNvSkOkasvbKMlnIF9I~1; _gat=1; csgp-origin=LAX-CSGP; bm_sv=9FA40968B73BFDC62131BA005C37C96F~YAAQDAHARXosm3iXAQAAu7zjgRwc61pVI8ZdX/u9kswbNSyGGci90mat3m6eG5+n2FMPbjjIP7XFgWkmzSC1esBrqGgSOpsSjSwWHAH3zwv4btUULw9IqM5ZSk6ViJo/jEB+ofy+Br4x5JyxSG39xEVxPyP67D35Syrd9dKiqWRnSFGk6eUlBbjv95hBMvnfmH2pawSzV7J40FjOy+HV5NO8C44P8dRBsLaRtKe54QYvrgQThBT6w6if5bfey5mfmyB40Q==~1",
    "Referer": "https://www.apartments.com/avon-ct/?bb=zsk-_8-vvH28mmzS",
    "Referrer-Policy": "no-referrer-when-downgrade"
}

module.exports = {
  headers,
  headersraw,
  headersIndividual
};
