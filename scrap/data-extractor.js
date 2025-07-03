const cheerio = require("cheerio");

class DataExtractor {
  extractApartmentData($, element) {
    const $el = $(element);

    try {
      const apartment = {
        listingId: $el.attr("data-listingid") || "",
        listingKey: $el.attr("data-ck") || "",
        url: this.extractListingUrl($, $el),
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
        `Error extracting apartment data for listing: ${$el.attr("data-listingid")}`,
        error
      );
      return null;
    }
  }

  extractListingUrl($, $el) {
    // Method 1: Check data-url attribute
    let url = $el.attr("data-url");
    if (url) {
      // Ensure it's a complete URL
      if (url.startsWith('/')) {
        url = 'https://www.apartments.com' + url;
      }
      return url;
    }

    // Method 2: Look for link elements within the placard
    const linkSelectors = [
      'a.property-link',
      'a[href*="/apartments/"]',
      '.property-title a',
      '.js-placardTitle a',
      'h3 a',
      '.property-information a'
    ];

    for (const selector of linkSelectors) {
      const linkEl = $el.find(selector);
      if (linkEl.length) {
        let href = linkEl.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.apartments.com' + href;
          }
          return href;
        }
      }
    }

    // Method 3: Try to construct URL from listing ID
    const listingId = $el.attr("data-listingid");
    if (listingId) {
      return `https://www.apartments.com/apartments/${listingId}/`;
    }

    // Method 4: Check for any apartments.com link in the element
    const allLinks = $el.find('a[href]');
    for (let i = 0; i < allLinks.length; i++) {
      const href = $(allLinks[i]).attr('href');
      if (href && (href.includes('apartments.com') || href.includes('/apartments/'))) {
        if (href.startsWith('/')) {
          return 'https://www.apartments.com' + href;
        }
        return href;
      }
    }

    return "";
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

      // ...existing script and JSON-LD parsing logic...
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

        // ...existing code for other coordinate extraction methods...
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

        // ...existing code for other extraction methods...
      }

      // ...existing meta tag extraction logic...
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
}

module.exports = { DataExtractor };
