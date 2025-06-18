const fs = require("fs");
const cheerio = require("cheerio");
const headers = require("./header.js");
const { exec } = require("child_process");

// mkdir raw_page appartments individual_data search_data create them if they don't exist
if (!fs.existsSync("raw_page")) fs.mkdirSync("raw_page");
if (!fs.existsSync("appartments")) fs.mkdirSync("appartments");
if (!fs.existsSync("individual_data")) fs.mkdirSync("individual_data");
if (!fs.existsSync("search_data")) fs.mkdirSync("search_data");

class ApartmentScrapper {
  constructor() {
    this.allApartments = [];
    this.totalPages = 0;
    this.currentPage = 1;
  }

  async fetchRawHTML(url, params = {}) {
    const fullUrl = this.buildURL(url, params);

    try {
      const response = await fetch(fullUrl, {
        headers: headers.headersraw,
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const timestamp = Date.now();
      const filename = `raw_page/raw_page_${timestamp}.html`;

      fs.writeFileSync(filename, html);
      console.log(`HTML saved as ${filename}`);

      return { html, filename };
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
      const timestamp = Date.now();
      const filename = `search_data/search_data_${timestamp}.json`;

      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Search data saved as ${filename}`);

      return { data, filename };
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

      const data = null
      const text = await response.text();
      console.log(JSON.stringify(text, null, 2));
      const timestamp = Date.now();
      exec("rm -rf individual_data/*", (error) => {
        if (error) {
          console.error(
            `Error cleaning up individual data directory: ${error}`
          );
        }
      });
      const filename = `individual_data/individual_${listingKey}_${timestamp}.json`;

      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Individual data saved as ${filename}`);

      return { data, filename };
    } catch (error) {
      console.error(`Error fetching individual data for ${listingKey}:`, error);
      return null;
    }
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
      const apartment = this.extractApartmentData($, element);
      if (apartment) {
        const globalGeo = this.extractGeoLocationFromHTML(html);
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
        const apartment = this.extractApartmentData($, element);
        if (apartment) {
          const globalGeo = this.extractGeoLocationFromHTML(
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

  extractApartmentData($, element) {
    const $el = $(element);

    try {
      const apartment = {
        listingId: $el.attr("data-listingid") || "",
        listingKey: $el.attr("data-ck") || "",
        url: $el.attr("data-url") || "",
        streetAddress: $el.attr("data-streetaddress") || "",
        countryCode: $el.attr("data-countrycode") || "",
        dataKey: $el.attr("data-ck") || "",
        feedvendorid: $el.attr("data-feedvendorid") || "",

        title: $el.find(".js-placardTitle.title").text().trim() || "",
        address: $el.find(".property-address").text().trim() || "",

        pricing: this.extractPricing($, $el),

        bedsBaths: this.extractBedsBaths($, $el),

        propertyType: $el.find(".property-type-for-rent").text().trim() || "",

        phone: this.extractPhone($, $el),

        image: this.extractImage($, $el),

        logo: this.extractLogo($, $el),

        features: this.extractFeatures($, $el),

        geoLocation: this.extractGeoLocation($, $el),

        timestamp: new Date().toISOString(),

        placardType: this.getPlacardType($el),

        individualData: null,
      };

      return apartment;
    } catch (error) {
      console.error(
        `Error extracting apartment data for listing: ${$el.attr(
          "data-listingid"
        )}`,
        error
      );
      return null;
    }
  }

  extractGeoLocation($, element) {
    const $el = $(element);
    const geoData = {
      latitude: null,
      longitude: null,
      source: null,
    };

    try {
      const dataLatitude = $el.attr("data-latitude") || $el.attr("data-lat");
      const dataLongitude =
        $el.attr("data-longitude") ||
        $el.attr("data-lng") ||
        $el.attr("data-lon");

      if (dataLatitude && dataLongitude) {
        geoData.latitude = parseFloat(dataLatitude);
        geoData.longitude = parseFloat(dataLongitude);
        geoData.source = "data-attributes";
        return geoData;
      }

      const mapContainer = $el
        .find("[data-lat], [data-lng], [data-latitude], [data-longitude]")
        .first();
      if (mapContainer.length) {
        const lat =
          mapContainer.attr("data-lat") || mapContainer.attr("data-latitude");
        const lng =
          mapContainer.attr("data-lng") ||
          mapContainer.attr("data-longitude") ||
          mapContainer.attr("data-lon");

        if (lat && lng) {
          geoData.latitude = parseFloat(lat);
          geoData.longitude = parseFloat(lng);
          geoData.source = "map-container";
          return geoData;
        }
      }

      const scriptTags = $("script").toArray();
      for (const script of scriptTags) {
        const scriptContent = $(script).html() || "";

        const coordsMatch =
          scriptContent.match(
            /(?:lat|latitude)["']?\s*[:=]\s*([-]?\d+\.?\d*)[^}]*(?:lng|lon|longitude)["']?\s*[:=]\s*([-]?\d+\.?\d*)/i
          ) ||
          scriptContent.match(
            /(?:lng|lon|longitude)["']?\s*[:=]\s*([-]?\d+\.?\d*)[^}]*(?:lat|latitude)["']?\s*[:=]\s*([-]?\d+\.?\d*)/i
          );

        if (coordsMatch) {
          const lat = parseFloat(coordsMatch[1]);
          const lng = parseFloat(coordsMatch[2]);

          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            geoData.latitude = lat;
            geoData.longitude = lng;
            geoData.source = "script-coordinates";
            return geoData;
          }
        }

        const centerMatch =
          scriptContent.match(
            /center["']?\s*:\s*\[\s*([-]?\d+\.?\d*)\s*,\s*([-]?\d+\.?\d*)\s*\]/i
          ) ||
          scriptContent.match(
            /center["']?\s*:\s*\{\s*lat\s*:\s*([-]?\d+\.?\d*)[^}]*lng\s*:\s*([-]?\d+\.?\d*)/i
          );

        if (centerMatch) {
          const lat = parseFloat(centerMatch[1]);
          const lng = parseFloat(centerMatch[2]);

          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            geoData.latitude = lat;
            geoData.longitude = lng;
            geoData.source = "script-center";
            return geoData;
          }
        }

        const googleMapsMatch = scriptContent.match(
          /google\.maps\.LatLng\s*\(\s*([-]?\d+\.?\d*)\s*,\s*([-]?\d+\.?\d*)\s*\)/i
        );
        if (googleMapsMatch) {
          const lat = parseFloat(googleMapsMatch[1]);
          const lng = parseFloat(googleMapsMatch[2]);

          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            geoData.latitude = lat;
            geoData.longitude = lng;
            geoData.source = "google-maps";
            return geoData;
          }
        }
      }

      const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
      for (const script of jsonLdScripts) {
        try {
          const jsonData = JSON.parse($(script).html() || "{}");
          const geoInfo = this.findGeoInObject(jsonData);
          if (geoInfo.latitude && geoInfo.longitude) {
            geoData.latitude = geoInfo.latitude;
            geoData.longitude = geoInfo.longitude;
            geoData.source = "json-ld";
            return geoData;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.error("Error extracting geo location:", error);
    }

    return geoData;
  }

  findGeoInObject(obj) {
    const geoData = { latitude: null, longitude: null };

    if (!obj || typeof obj !== "object") return geoData;

    if (obj.geo && obj.geo.latitude && obj.geo.longitude) {
      geoData.latitude = parseFloat(obj.geo.latitude);
      geoData.longitude = parseFloat(obj.geo.longitude);
      return geoData;
    }

    if (obj.latitude && obj.longitude) {
      geoData.latitude = parseFloat(obj.latitude);
      geoData.longitude = parseFloat(obj.longitude);
      return geoData;
    }

    if (obj.lat && obj.lng) {
      geoData.latitude = parseFloat(obj.lat);
      geoData.longitude = parseFloat(obj.lng);
      return geoData;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {
        const result = this.findGeoInObject(obj[key]);
        if (result.latitude && result.longitude) {
          return result;
        }
      }
    }

    return geoData;
  }

  extractGeoLocationFromHTML(html) {
    const $ = cheerio.load(html);
    const geoData = {
      latitude: null,
      longitude: null,
      source: null,
    };

    try {
      const scriptTags = $("script").toArray();
      for (const script of scriptTags) {
        const scriptContent = $(script).html() || "";

        const coordsRegex =
          /(?:latitude|lat)["']?\s*[:=]\s*([-]?\d+\.?\d*)[^}]*(?:longitude|lng|lon)["']?\s*[:=]\s*([-]?\d+\.?\d*)/gi;
        let match;
        while ((match = coordsRegex.exec(scriptContent)) !== null) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);

          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            geoData.latitude = lat;
            geoData.longitude = lng;
            geoData.source = "html-script-global";
            return geoData;
          }
        }

        const mapCenterRegex =
          /center["']?\s*:\s*{\s*lat\s*:\s*([-]?\d+\.?\d*)[^}]*lng\s*:\s*([-]?\d+\.?\d*)/gi;
        while ((match = mapCenterRegex.exec(scriptContent)) !== null) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);

          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            geoData.latitude = lat;
            geoData.longitude = lng;
            geoData.source = "html-map-center";
            return geoData;
          }
        }
      }

      const metaTags = $(
        'meta[property*="latitude"], meta[property*="longitude"], meta[name*="geo"]'
      ).toArray();
      const geoMeta = {};
      for (const meta of metaTags) {
        const property = $(meta).attr("property") || $(meta).attr("name") || "";
        const content = $(meta).attr("content") || "";

        if (
          property.includes("latitude") ||
          property.includes("geo.position.latitude")
        ) {
          geoMeta.latitude = parseFloat(content);
        }
        if (
          property.includes("longitude") ||
          property.includes("geo.position.longitude")
        ) {
          geoMeta.longitude = parseFloat(content);
        }
      }

      if (
        geoMeta.latitude &&
        geoMeta.longitude &&
        !isNaN(geoMeta.latitude) &&
        !isNaN(geoMeta.longitude)
      ) {
        geoData.latitude = geoMeta.latitude;
        geoData.longitude = geoMeta.longitude;
        geoData.source = "html-meta-tags";
        return geoData;
      }
    } catch (error) {
      console.error("Error extracting geo location from HTML:", error);
    }

    return geoData;
  }

  extractPricing($, $el) {
    const pricing = {
      rent: "",
      priceRange: "",
      hasFeesButton: false,
    };

    const priceSelectors = [
      ".property-pricing",
      ".property-rents",
      ".price-range",
      ".property-information-wrapper .price-range",
    ];

    for (const selector of priceSelectors) {
      const priceEl = $el.find(selector);
      if (priceEl.length) {
        pricing.rent = priceEl.text().trim();
        break;
      }
    }

    pricing.hasFeesButton = $el.find(".js-feeTransparencyLink").length > 0;

    return pricing;
  }

  extractBedsBaths($, $el) {
    const bedsBaths = {
      beds: "",
      baths: "",
      sqft: "",
      full: "",
    };

    const bedSelectors = [
      ".property-beds",
      ".bed-range",
      ".property-information-wrapper .bed-range",
    ];

    for (const selector of bedSelectors) {
      const bedEl = $el.find(selector);
      if (bedEl.length) {
        bedsBaths.full = bedEl.text().trim();

        const text = bedsBaths.full;
        const bedMatch = text.match(/(\d+|Studio)\s*Bed/i);
        const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*Bath/i);
        const sqftMatch = text.match(/(\d+(?:,\d+)?)\s*sq\s*ft/i);

        if (bedMatch) bedsBaths.beds = bedMatch[1];
        if (bathMatch) bedsBaths.baths = bathMatch[1];
        if (sqftMatch) bedsBaths.sqft = sqftMatch[1].replace(",", "");

        break;
      }
    }

    return bedsBaths;
  }

  extractPhone($, $el) {
    const phoneEl = $el.find(".phone-link");
    return {
      number: phoneEl.find("span").text().trim() || "",
      data: phoneEl.attr("phone-data") || "",
    };
  }

  extractImage($, $el) {
    const imgEl = $el.find(".imageContainer img");
    return {
      src: imgEl.attr("src") || "",
      alt: imgEl.attr("alt") || "",
      title: imgEl.attr("title") || "",
    };
  }

  extractLogo($, $el) {
    const logoEl = $el.find(".property-logo");
    const logoText = logoEl.attr("aria-label") || "";
    const logoStyle = logoEl.attr("style") || "";
    const logoMatch = logoStyle.match(/url\(([^)]+)\)/);

    return {
      company: logoText,
      logoUrl: logoMatch ? logoMatch[1] : "",
      hasLogo: logoEl.length > 0,
    };
  }

  extractFeatures($, $el) {
    const features = {
      has3DTour: false,
      virtualTour: false,
      specialties: [],
    };

    features.has3DTour = $el.find(".virtualTour").length > 0;
    features.virtualTour = $el.find(".virtualTour span").text().trim() || "";

    if ($el.find(".js-student-housing").length > 0) {
      features.specialties.push("Student Housing");
    }

    if ($el.find(".js-incomeRestriction-housing").length > 0) {
      features.specialties.push("Income Restriction");
    }

    return features;
  }

  getPlacardType($el) {
    const classList = $el.attr("class") || "";

    if (classList.includes("placard-option-diamond")) return "diamond";
    if (classList.includes("placard-option-gold")) return "gold";
    if (classList.includes("placard-option-silver")) return "silver";
    if (classList.includes("placard-option-silverpropres"))
      return "silverpropres";
    if (classList.includes("placard-option-prosumer")) return "prosumer";
    if (classList.includes("reinforcement")) return "reinforcement";

    return "basic";
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
    const pageInfo = this.extractPaginationInfo($);

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
          `Fetching individual data for apartment ${i + 1}/${apartments.length
          }: ${listingKey}`
        );

        // const individualResult = await this.fetchIndividualApartmentData(
        //   listingKey,
        //   searchCriteria
        // );
        // if (individualResult) {
        //   apartment.individualData = individualResult.data;
        //
        //   if (individualResult.data && individualResult.data.Listing) {
        //     const listing = individualResult.data.Listing;
        //
        //     if (listing.Address && listing.Address.Location) {
        //       apartment.geoLocation = {
        //         latitude: listing.Address.Location.Latitude,
        //         longitude: listing.Address.Location.Longitude,
        //         source: "individual-api",
        //       };
        //     }
        //
        //     if (listing.RentRollups && listing.RentRollups.length > 0) {
        //       apartment.rentRollups = listing.RentRollups;
        //     }
        //
        //     if (listing.Phones && listing.Phones.length > 0) {
        //       apartment.phone.number = listing.Phones[0].PhoneNumber;
        //     }
        //
        //     if (listing.VirtualTour) {
        //       apartment.features.virtualTourUrl = listing.VirtualTour.Uri;
        //     }
        //   }
        // }
        //
        if (i < apartments.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  buildSearchCriteriaFromURL(baseUrl, params) {
    // Return the correct format matching individual.js
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

  extractPaginationInfo($) {
    const pageInfo = {
      currentPage: 1,
      totalPages: 1,
      totalResults: 0,
    };

    const pageRange = $(".pageRange").text();
    const pageMatch = pageRange.match(/Page (\d+) of (\d+)/);

    if (pageMatch) {
      pageInfo.currentPage = parseInt(pageMatch[1]);
      pageInfo.totalPages = parseInt(pageMatch[2]);
    }

    const searchResults = $(".searchResults").text();
    const resultsMatch = searchResults.match(/(\d+) Result/);

    if (resultsMatch) {
      pageInfo.totalResults = parseInt(resultsMatch[1]);
    }

    return pageInfo;
  }

  saveResults() {
    const timestamp = Date.now();

    const jsonFilename = `appartments/apartments_${timestamp}.json`;
    const jsonData = {
      timestamp: new Date().toISOString(),
      totalApartments: this.allApartments.length,
      apartments: this.allApartments,
    };

    fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
    fs.writeFileSync(
      "apartments_latest.json",
      JSON.stringify(jsonData, null, 2)
    );
    console.log(`JSON data saved as ${jsonFilename}`);

    const csvFilename = `appartments/apartments_${timestamp}.csv`;
    this.saveAsCSV(csvFilename);

    console.log(`\nScraping completed!`);
    console.log(`Total apartments extracted: ${this.allApartments.length}`);
    console.log(`Files saved: ${jsonFilename}, ${csvFilename}`);
  }

  saveAsCSV(filename) {
    const headers = [
      "listingId",
      "title",
      "address",
      "streetAddress",
      "rent",
      "beds",
      "baths",
      "sqft",
      "propertyType",
      "phone",
      "url",
      "placardType",
      "has3DTour",
      "company",
      "latitude",
      "longitude",
      "geoSource",
      "timestamp",
    ];

    let csvContent = headers.join(",") + "\n";

    this.allApartments.forEach((apt) => {
      const row = [
        this.escapeCsvValue(apt.listingId),
        this.escapeCsvValue(apt.title),
        this.escapeCsvValue(apt.address),
        this.escapeCsvValue(apt.streetAddress),
        this.escapeCsvValue(apt.pricing.rent),
        this.escapeCsvValue(apt.bedsBaths.beds),
        this.escapeCsvValue(apt.bedsBaths.baths),
        this.escapeCsvValue(apt.bedsBaths.sqft),
        this.escapeCsvValue(apt.propertyType),
        this.escapeCsvValue(apt.phone.number),
        this.escapeCsvValue(apt.url),
        this.escapeCsvValue(apt.placardType),
        apt.features.has3DTour ? "Yes" : "No",
        this.escapeCsvValue(apt.logo.company),
        apt.geoLocation ? apt.geoLocation.latitude || "" : "",
        apt.geoLocation ? apt.geoLocation.longitude || "" : "",
        apt.geoLocation ? apt.geoLocation.source || "" : "",
        this.escapeCsvValue(apt.timestamp),
      ];

      csvContent += row.join(",") + "\n";
    });

    fs.writeFileSync(filename, csvContent);
    console.log(`CSV data saved as ${filename}`);
  }

  escapeCsvValue(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
}

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

module.exports = ApartmentScrapper;

if (require.main === module) {
  main().catch(console.error);
}
