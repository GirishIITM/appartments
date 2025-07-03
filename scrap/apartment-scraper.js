const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { DataExtractor } = require("./data-extractor");
const { FileManager } = require("./file-manager");
const { NetworkClient } = require("./network-client");
const { GeoLocationService } = require("./geo-location-service");

class ApartmentScrapper {
  constructor() {
    this.allApartments = [];
    this.totalPages = 0;
    this.currentPage = 1;
    this.dataExtractor = new DataExtractor();
    this.fileManager = new FileManager();
    this.networkClient = new NetworkClient();
    this.geoLocationService = new GeoLocationService();
  }

  async fetchRawHTML(url, params = {}) {
    const fullUrl = this.buildURL(url, params);
    const result = await this.networkClient.fetchRawHTML(fullUrl);
    
    if (result) {
      this.fileManager.saveRawHTML(result.html);
    }
    
    return result;
  }

  async fetchSearchData(searchPayload) {
    const result = await this.networkClient.fetchSearchData(searchPayload);
    
    if (result) {
      this.fileManager.saveSearchData(result.data);
    }
    
    return result;
  }

  async fetchIndividualApartmentData(listingKey, searchCriteria) {
    const result = await this.networkClient.fetchIndividualApartmentData(listingKey, searchCriteria);
    
    if (result) {
      exec("rm -rf individual_data/*", (error) => {
        if (error) {
          console.error(`Error cleaning up individual data directory: ${error}`);
        }
      });
      this.fileManager.saveIndividualData(result.data, listingKey);
    }
    
    return result;
  }

  buildURL(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    return url.toString();
  }

  extractApartmentsFromHTML(html) {
    const $ = cheerio.load(html);
    const apartments = [];

    $("#placardContainer article.placard").each((index, element) => {
      const apartment = this.dataExtractor.extractApartmentData($, element);
      if (apartment) {
        const globalGeo = this.dataExtractor.extractGeoLocationFromHTML(html);
        if (
          !apartment.geoLocation.latitude &&
          !apartment.geoLocation.longitude &&
          globalGeo.latitude &&
          globalGeo.longitude
        ) {
          apartment.geoLocation = globalGeo;
        }
        apartments.push(apartment);
      }
    });

    return apartments;
  }

  extractApartmentsFromSearchData(data) {
    const apartments = [];

    if (data.PlacardState && data.PlacardState.HTML) {
      const $ = cheerio.load(data.PlacardState.HTML);

      $("#placardContainer article.placard").each((index, element) => {
        const apartment = this.dataExtractor.extractApartmentData($, element);
        if (apartment) {
          const globalGeo = this.dataExtractor.extractGeoLocationFromHTML(
            data.PlacardState.HTML
          );
          if (
            !apartment.geoLocation.latitude &&
            !apartment.geoLocation.longitude &&
            globalGeo.latitude &&
            globalGeo.longitude
          ) {
            apartment.geoLocation = globalGeo;
          }
          apartments.push(apartment);
        }
      });
    }

    return apartments;
  }

  async scrapeByLocation(baseUrl, options = {}) {
    const {
      includeLocations = [],
      boundingBox = null,
      maxPages = null,
      delay = 2000,
      fetchIndividualData = false,
    } = options;

    console.log(`Starting scrape for: ${baseUrl}`);

    let params = {};
    if (includeLocations.length > 0) {
      params.c = includeLocations.join("+");
    }
    if (boundingBox) {
      params.bb = boundingBox;
    }

    const result = await this.fetchRawHTML(baseUrl, params);
    if (!result) return;

    const apartments = this.extractApartmentsFromHTML(result.html);

    if (fetchIndividualData) {
      const searchCriteria = this.buildSearchCriteriaFromURL(baseUrl, params);
      await this.fetchIndividualDataForApartments(
        apartments,
        searchCriteria,
        delay
      );
    }

    this.allApartments.push(...apartments);

    console.log(`Extracted ${apartments.length} apartments from page 1`);

    const $ = cheerio.load(result.html);
    const pageInfo = this.dataExtractor.extractPaginationInfo($);

    if (pageInfo.totalPages > 1 && maxPages !== 1) {
      const pagesToScrape = maxPages
        ? Math.min(pageInfo.totalPages, maxPages)
        : pageInfo.totalPages;

      for (let page = 2; page <= pagesToScrape; page++) {
        console.log(`Fetching page ${page} of ${pagesToScrape}...`);

        await new Promise((resolve) => setTimeout(resolve, delay));

        const pageParams = { ...params, page: page };
        const pageResult = await this.fetchRawHTML(baseUrl, pageParams);

        if (pageResult) {
          const pageApartments = this.extractApartmentsFromHTML(
            pageResult.html
          );

          if (fetchIndividualData) {
            const pageSearchCriteria = this.buildSearchCriteriaFromURL(
              baseUrl,
              pageParams
            );
            await this.fetchIndividualDataForApartments(
              pageApartments,
              pageSearchCriteria,
              delay
            );
          }

          this.allApartments.push(...pageApartments);
          console.log(
            `Extracted ${pageApartments.length} apartments from page ${page}`
          );
        }
      }
    }

    this.saveResults();
  }

  async scrapeWithSearchAPI(
    searchCriteria,
    maxPages = null,
    fetchIndividualData = false
  ) {
    console.log("Starting scrape using search API...");

    for (let page = 1; page <= (maxPages || 10); page++) {
      console.log(`Fetching page ${page}...`);

      const payload = {
        ...searchCriteria,
        Paging: { Page: page.toString() },
      };

      const result = await this.fetchSearchData(payload);
      if (!result) break;

      const apartments = this.extractApartmentsFromSearchData(result.data);

      if (apartments.length === 0) {
        console.log(`No more apartments found on page ${page}. Stopping.`);
        break;
      }

      if (fetchIndividualData) {
        await this.fetchIndividualDataForApartments(
          apartments,
          searchCriteria,
          2000
        );
      }

      this.allApartments.push(...apartments);
      console.log(
        `Extracted ${apartments.length} apartments from page ${page}`
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.saveResults();
  }

  async fetchIndividualDataForApartments(
    apartments,
    searchCriteria,
    delay = 2000
  ) {
    for (let i = 0; i < apartments.length; i++) {
      const apartment = apartments[i];
      const listingKey = apartment.listingKey || apartment.dataKey;

      if (listingKey) {
        console.log(
          `Fetching individual data for apartment ${i + 1}/${apartments.length}: ${listingKey}`
        );

        if (apartment.streetAddress) {
          const place = await this.geoLocationService.fetchPlaceByText(apartment.streetAddress);
          if (place && place.latitude && place.longitude) {
            apartment.geoLocation.latitude = place.latitude;
            apartment.geoLocation.longitude = place.longitude;
            apartment.geoLocation.source = "google-places";
          }
        }

        if (i < apartments.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  buildSearchCriteriaFromURL(baseUrl, params) {
    return {
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
    };
  }

  saveResults() {
    const result = this.fileManager.saveResults(this.allApartments);
    
    // Also save Facebook apartments separately for map view
    const facebookApartments = this.allApartments.filter(apt => 
      apt.feedvendorid === 'facebook' || apt.placardType === 'facebook'
    );
    
    if (facebookApartments.length > 0) {
      this.fileManager.saveFacebookData(facebookApartments);
    }
    
    return result;
  }
}

module.exports = { ApartmentScrapper };
