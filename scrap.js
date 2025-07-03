// This file now serves as a compatibility layer for the modular scraper
const { ApartmentScrapper } = require("./scrap/apartment-scraper");
const { GeoLocationService } = require("./scrap/geo-location-service");
const fs = require("fs");
const path = require("path");

// Function to read Facebook apartment data
async function readFacebookData() {
  const facebookFolderPath = path.join(__dirname, "facebook-scrapper");
  const facebookApartments = [];
  const geoLocationService = new GeoLocationService();

  try {
    // Read the structured JSON file
    const jsonFilePath = path.join(facebookFolderPath, "facebook-apartments-structured.json");
    
    if (fs.existsSync(jsonFilePath)) {
      const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      
      // Convert Facebook listings to apartment format
      if (jsonData.listings && Array.isArray(jsonData.listings)) {
        for (let i = 0; i < jsonData.listings.length; i++) {
          const listing = jsonData.listings[i];
          
          // Skip listings with null or missing data
          if (!listing.title || !listing.price || !listing.location) {
            continue;
          }

          const apartment = {
            listingId: listing.id || "",
            listingKey: listing.id || "",
            url: listing.url || "",
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
              company: "Facebook Marketplace",
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
            console.log(`Getting coordinates for Facebook listing ${i + 1}/${jsonData.listings.length}: ${addressToGeocode}`);
            
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
            if (i < jsonData.listings.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          facebookApartments.push(apartment);
        }
      }
      
      console.log(`Loaded ${facebookApartments.length} apartments from Facebook Marketplace`);
    } else {
      console.log("Facebook JSON file not found, skipping Facebook data");
    }
  } catch (error) {
    console.error("Error reading Facebook data:", error);
  }
  
  return facebookApartments;
}

async function main() {
  const scraper = new ApartmentScrapper();

  // First, scrape apartments.com data
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
  console.log("Processing Facebook Marketplace data...");
  const facebookApartments = await readFacebookData();
  if (facebookApartments.length > 0) {
    scraper.allApartments.push(...facebookApartments);
    console.log(`Total apartments including Facebook: ${scraper.allApartments.length}`);
    
    // Save the combined results
    scraper.saveResults();
  }
}

module.exports = ApartmentScrapper;

if (require.main === module) {
  main().catch(console.error);
}