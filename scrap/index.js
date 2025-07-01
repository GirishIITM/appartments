const { ApartmentScrapper } = require("./apartment-scraper");

async function main() {
  const scraper = new ApartmentScrapper();

  await scraper.scrapeByLocation("https://www.apartments.com/avon-ct/", {
    includeLocations: [
      "collinsville_ct",
      "farmington_ct",
      "unionville_ct",
      "weatogue_ct",
    ],
    maxPages: 3,
    delay: 2000,
    fetchIndividualData: true,
  });

  const searchCriteria = {
    Map: {
      BoundingBox: {
        LowerRight: { Latitude: 41.59493, Longitude: -72.75692 },
        UpperLeft: { Latitude: 41.98708, Longitude: -73.03295 },
      },
      CountryCode: "US",
    },
    Geography: {
      GeographyType: 7,
      Address: { CountryCode: "US" },
      Location: { Latitude: 41.791, Longitude: -72.89494 },
      IsPmcSearchByCityState: false,
      IsAreaTooFar: false,
    },
    Listing: {},
    ResultSeed: 838548,
    Options: 0,
    CountryAbbreviation: "US",
    AdditionalLocales: [],
  };

  await scraper.scrapeWithSearchAPI(searchCriteria, 5, true);
}

module.exports = { ApartmentScrapper };

if (require.main === module) {
  main().catch(console.error);
}
