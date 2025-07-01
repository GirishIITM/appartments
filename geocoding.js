require("dotenv").config();

const apiKey = process.env.API_KEY;

//https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
const baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
const placesBaseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";

async function findPlaceByText(address) {
  const url = `${placesBaseUrl}?query=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      throw new Error(`Places API error: ${data.status}`);
    }

    return data.results[0].geometry.location;
  } catch (error) {
    console.error(`Error finding place "${address}":`, error.message);
    return null;
  }
}

async function geocodeAddress(address) {
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }

  const url = `${baseUrl}?address=${encodeURIComponent(address)}&key=${apiKey}`;
  console.log(`Geocoding URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);

    if (data.status === "OK" && data.results && data.results.length > 0) {
      return data.results[0].geometry.location;
    } else {
      console.log(`Geocoding API couldn't find address, trying Places API...`);
      return await findPlaceByText(address);
    }
  } catch (error) {
    console.error(`Error geocoding address "${address}":`, error.message);
    console.log(`Trying Places API as fallback...`);
    return await findPlaceByText(address);
  }
}

// Export functions for use in other modules
module.exports = {
  geocodeAddress,
  findPlaceByText
};

//example usage
// const coords = geocodeAddress("9 Riverview Unit 9");
// coords
//   .then((location) => {
//     if (location) {
//       console.log(
//         `Coordinates for the address: ${location.lat}, ${location.lng}`
//       );
//     } else {
//       console.log("Failed to retrieve coordinates.");
//     }
//   })
//   .catch((error) => {
//     console.error("An error occurred:", error.message);
//   });
