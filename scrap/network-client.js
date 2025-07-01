const headers = require("../header.js");

class NetworkClient {
  async fetchRawHTML(fullUrl) {
    try {
      const response = await fetch(fullUrl, {
        headers: headers.headersraw,
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`HTML fetched successfully`);

      return { html };
    } catch (error) {
      console.error("Error fetching HTML:", error);
      return null;
    }
  }

  async fetchSearchData(searchPayload) {
    try {
      const response = await fetch(
        "https://www.apartments.com/services/search/",
        {
          headers: headers.headers,
          body: JSON.stringify(searchPayload),
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Search data fetched successfully`);

      return { data };
    } catch (error) {
      console.error("Error fetching search data:", error);
      return null;
    }
  }

  async fetchIndividualApartmentData(listingKey, searchCriteria) {
    try {
      const payload = {
        ListingKey: listingKey,
        SearchCriteria: {
          Map: {
            BoundingBox: {
              LowerRight: { Latitude: 41.74402, Longitude: -72.82534 },
              UpperLeft: { Latitude: 41.84205, Longitude: -72.90396 },
            },
            CountryCode: "US",
          },
          Geography: {
            ID: "8gttx22",
            Display: "Avon, CT",
            GeographyType: 2,
            Address: {
              City: "Avon",
              CountryCode: "USA",
              County: "Hartford",
              State: "CT",
              MarketName: "Hartford",
              DMA: "Hartford-New Haven, CT",
            },
            Location: { Latitude: 41.79142, Longitude: -72.86246 },
            BoundingBox: {
              LowerRight: { Latitude: 41.7579, Longitude: -72.79674 },
              UpperLeft: { Latitude: 41.82494, Longitude: -72.92819 },
            },
            v: 863,
            IsPmcSearchByCityState: false,
            IsAreaTooFar: false,
          },
          Listing: {},
          Paging: {},
          IsBoundedSearch: true,
          ResultSeed: 61515,
          Options: 0,
          CountryAbbreviation: "US",
          AdditionalLocales: [],
        },
      };

      const response = await fetch(
        "https://www.apartments.com/services/property/v3/infoCardData",
        {
          headers: headers.headersIndividual,
          body: JSON.stringify(payload),
          method: "POST",
        }
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = null;
      const text = await response.text();
      console.log(JSON.stringify(text, null, 2));

      return { data };
    } catch (error) {
      console.error(`Error fetching individual data for ${listingKey}:`, error);
      return null;
    }
  }
}

module.exports = { NetworkClient };
