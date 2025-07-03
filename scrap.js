// This file now serves as a compatibility layer for the modular scraper
const { ApartmentScrapper } = require("./scrap/apartment-scraper");
const { GeoLocationService } = require("./scrap/geo-location-service");
const { processHtmlFile } = require("./facebook-scrapper/htmltojson");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Function to run Facebook scrapers
async function runFacebookScrapers() {
  console.log("Running Facebook scrapers...");
  
  try {
    // Run Facebook scraper 1
    console.log("Fetching Facebook apartments listings...");
    await new Promise((resolve, reject) => {
      exec("node facebook-scrapper/scrap.js", { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error("Error running scrap.js:", error);
          reject(error);
        } else {
          console.log(stdout);
          if (stderr) console.warn(stderr);
          resolve();
        }
      });
    });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run Facebook scraper 2  
    console.log("Fetching Facebook property rentals...");
    await new Promise((resolve, reject) => {
      exec("node facebook-scrapper/scrap2.js", { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error("Error running scrap2.js:", error);
          reject(error);
        } else {
          console.log(stdout);
          if (stderr) console.warn(stderr);
          resolve();
        }
      });
    });
    
    // Wait for files to be written
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    console.error("Error running Facebook scrapers:", error);
    return false;
  }
}

// Function to process Facebook HTML files and extract data
async function processFacebookHtmlFiles() {
  console.log("Processing Facebook HTML files...");
  
  try {
    const facebookDir = path.join(__dirname, "facebook-scrapper");
    let allListings = [];
    
    // Process facebook-apartments.html
    const apartmentsHtmlPath = path.join(facebookDir, "facebook-apartments.html");
    if (fs.existsSync(apartmentsHtmlPath)) {
      console.log("Processing facebook-apartments.html...");
      const result1 = processHtmlFile(apartmentsHtmlPath);
      if (result1 && result1.listings) {
        allListings.push(...result1.listings);
        console.log(`Extracted ${result1.listings.length} listings from facebook-apartments.html`);
      }
    }
    
    // Process facebook-apartments2.html
    const apartments2HtmlPath = path.join(facebookDir, "facebook-apartments2.html");
    if (fs.existsSync(apartments2HtmlPath)) {
      console.log("Processing facebook-apartments2.html...");
      const result2 = processHtmlFile(apartments2HtmlPath);
      if (result2 && result2.listings) {
        allListings.push(...result2.listings);
        console.log(`Extracted ${result2.listings.length} listings from facebook-apartments2.html`);
      }
    }
    
    console.log(`Total Facebook listings extracted: ${allListings.length}`);
    return allListings;
  } catch (error) {
    console.error("Error processing Facebook HTML files:", error);
    return [];
  }
}

// Function to read Facebook apartment data
async function readFacebookData() {
  const facebookApartments = [];
  const geoLocationService = new GeoLocationService();

  try {
    // First run the Facebook scrapers and process HTML
    const facebookScrapingSuccess = await runFacebookScrapers();
    if (!facebookScrapingSuccess) {
      console.log("Facebook scraping failed, trying to read existing structured data...");
    }
    
    // Process HTML files to get listings
    const facebookListings = await processFacebookHtmlFiles();
    
    if (facebookListings.length === 0) {
      // Fallback to reading existing structured JSON file
      const jsonFilePath = path.join(__dirname, "facebook-scrapper", "facebook-apartments-structured.json");
      if (fs.existsSync(jsonFilePath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        if (jsonData.listings) {
          facebookListings.push(...jsonData.listings);
        }
      }
    }
    
    // Convert Facebook listings to apartment format
    if (facebookListings && facebookListings.length > 0) {
      for (let i = 0; i < facebookListings.length; i++) {
        const listing = facebookListings[i];
        
        // Skip listings with null or missing data
        if (!listing.title || !listing.price || !listing.location) {
          continue;
        }

        const apartment = {
          listingId: listing.id || "",
          listingKey: listing.id || "",
          url: listing.url || (listing.id ? `https://www.facebook.com/marketplace/item/${listing.id}` : ""),
          streetAddress: listing.location?.address || "",
          countryCode: "US",
          dataKey: listing.id || "",
          feedvendorid: "facebook",
          
          title: listing.title || "",
          address: listing.location?.displayName || listing.location?.address || "",
          
          pricing: {
            rent: listing.price?.formatted || "",
            priceRange: listing.price?.formatted || "",
            hasFeesButton: false,
          },
          
          bedsBaths: {
            beds: listing.bedrooms ? listing.bedrooms.toString() : "",
            baths: listing.bathrooms ? listing.bathrooms.toString() : "",
            sqft: "",
            full: `${listing.bedrooms || ''} Beds, ${listing.bathrooms || ''} Baths`,
          },
          
          propertyType: listing.propertyType || "",
          
          phone: {
            number: "",
            data: "",
          },
          
          image: {
            src: listing.images && listing.images[0] ? listing.images[0].url : "",
            alt: listing.title || "",
            title: listing.title || "",
          },
          
          logo: {
            company: listing.seller?.name || "Facebook Marketplace",
            logoUrl: "",
            hasLogo: true,
          },
          
          features: {
            has3DTour: false,
            virtualTour: false,
            specialties: ["Facebook Marketplace"],
          },
          
          geoLocation: {
            latitude: null,
            longitude: null,
            source: "facebook-marketplace",
          },
          
          timestamp: new Date().toISOString(),
          placardType: "facebook",
          individualData: null,
          
          // Facebook-specific data
          facebookData: {
            seller: listing.seller,
            category: listing.category,
            isAvailable: listing.isAvailable,
            postedDate: listing.postedDate,
            description: listing.description,
          }
        };

        // Get geolocation for the apartment
        const addressToGeocode = apartment.streetAddress || apartment.address;
        if (addressToGeocode) {
          console.log(`Getting coordinates for Facebook listing ${i + 1}/${facebookListings.length}: ${addressToGeocode}`);
          
          try {
            const coordinates = await geoLocationService.fetchPlaceByText(addressToGeocode);
            if (coordinates && coordinates.latitude && coordinates.longitude) {
              apartment.geoLocation.latitude = coordinates.latitude;
              apartment.geoLocation.longitude = coordinates.longitude;
              apartment.geoLocation.source = "google-places-facebook";
              console.log(`✓ Found coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
            } else {
              console.log(`✗ No coordinates found for: ${addressToGeocode}`);
            }
          } catch (error) {
            console.error(`Error geocoding Facebook listing: ${error.message}`);
          }

          // Add delay to avoid hitting API rate limits
          if (i < facebookListings.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        facebookApartments.push(apartment);
      }
    }
    
    console.log(`Loaded ${facebookApartments.length} apartments from Facebook Marketplace`);
  } catch (error) {
    console.error("Error reading Facebook data:", error);
  }
  
  return facebookApartments;
}

async function main() {
  console.log("Starting comprehensive apartment scraping...");
  
  const scraper = new ApartmentScrapper();

  // First, scrape apartments.com data
  console.log("\n=== APARTMENTS.COM SCRAPING ===");
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
  
  // Add Facebook apartment data with geolocation
  console.log("\n=== FACEBOOK MARKETPLACE SCRAPING ===");
  const facebookApartments = await readFacebookData();
  if (facebookApartments.length > 0) {
    scraper.allApartments.push(...facebookApartments);
    console.log(`Total apartments including Facebook: ${scraper.allApartments.length}`);
    
    // Save the combined results
    scraper.saveResults();
  }
  
  console.log("\n=== SCRAPING COMPLETE ===");
  console.log(`Apartments.com listings: ${scraper.allApartments.filter(apt => apt.feedvendorid !== 'facebook').length}`);
  console.log(`Facebook Marketplace listings: ${facebookApartments.length}`);
  console.log(`Total listings: ${scraper.allApartments.length}`);
  console.log("Check the map_view.html to see both data sources!");
}

module.exports = ApartmentScrapper;

if (require.main === module) {
  main().catch(console.error);
}