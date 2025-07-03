const fs = require("fs");
const path = require("path");

class FileManager {
  constructor() {
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ["raw_page", "appartments", "individual_data", "search_data"];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });
  }

  saveRawHTML(html) {
    const filename = `raw_page/raw_page.html`;
    fs.writeFileSync(filename, html);
    console.log(`HTML saved as ${filename}`);
    return filename;
  }

  saveSearchData(data) {
    const filename = `search_data/search_data.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Search data saved as ${filename}`);
    return filename;
  }

  saveIndividualData(data, listingKey) {
    const filename = `individual_data/individual_${listingKey}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Individual data saved as ${filename}`);
    return filename;
  }

  saveResults(apartments) {
    // Create CSV content
    const csvHeaders = [
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

    const csvRows = apartments.map((apt) => [
      apt.listingId || "",
      (apt.title || "").replace(/"/g, '""'),
      (apt.address || "").replace(/"/g, '""'),
      (apt.streetAddress || "").replace(/"/g, '""'),
      apt.pricing?.rent || "",
      apt.bedsBaths?.beds || "",
      apt.bedsBaths?.baths || "",
      apt.bedsBaths?.sqft || "",
      apt.propertyType || "",
      apt.phone?.number || "",
      apt.url || "",
      apt.placardType || "",
      apt.features.has3DTour ? "Yes" : "No",
      (apt.logo.company || "").replace(/"/g, '""'),
      apt.geoLocation ? apt.geoLocation.latitude || "" : "",
      apt.geoLocation ? apt.geoLocation.longitude || "" : "",
      apt.geoLocation ? apt.geoLocation.source || "" : "",
      this.escapeCsvValue(apt.timestamp),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    // Save JSON
    const jsonData = {
      timestamp: new Date().toISOString(),
      totalApartments: apartments.length,
      apartments: apartments,
    };

    const jsonFilename = `appartments/apartments.json`;
    const csvFilename = `appartments/apartments.csv`;

    try {
      // Ensure apartments directory exists
      if (!fs.existsSync("appartments")) {
        fs.mkdirSync("appartments");
      }

      // Save files without timestamps
      fs.writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
      fs.writeFileSync(csvFilename, csvContent);

      console.log(`JSON data saved as ${jsonFilename}`);
      console.log(`CSV data saved as ${csvFilename}`);

      return { jsonFilename, csvFilename };
    } catch (error) {
      console.error("Error saving data:", error);
      return null;
    }
  }

  saveFacebookData(facebookApartments) {
    if (!facebookApartments || facebookApartments.length === 0) return;

    // Convert Facebook data to the map-compatible format
    const facebookJsonData = {
      timestamp: new Date().toISOString(),
      totalApartments: facebookApartments.length,
      apartments: facebookApartments.map(apt => ({
        ...apt,
        // Ensure consistent data structure for map view
        feedvendorid: 'facebook',
        placardType: 'facebook',
        url: apt.url || (apt.listingId ? `https://www.facebook.com/marketplace/item/${apt.listingId}` : ''),
        address: apt.address || apt.streetAddress,
        pricing: apt.pricing || { rent: '' },
        bedsBaths: apt.bedsBaths || { beds: '', baths: '', sqft: '' },
        geoLocation: apt.geoLocation || { latitude: null, longitude: null, source: 'facebook-marketplace' }
      }))
    };

    const facebookJsonPath = "appartments/facebook_apartments.json";

    try {
      // Ensure apartments directory exists
      if (!fs.existsSync("appartments")) {
        fs.mkdirSync("appartments");
      }

      // Save Facebook JSON data
      fs.writeFileSync(facebookJsonPath, JSON.stringify(facebookJsonData, null, 2));
      console.log(`Facebook JSON data saved as ${facebookJsonPath}`);

      return facebookJsonPath;
    } catch (error) {
      console.error("Error saving Facebook data:", error);
      return null;
    }
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

module.exports = { FileManager };
