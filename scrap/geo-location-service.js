require("dotenv").config();

class GeoLocationService {
  async fetchPlaceByText(address) {
    try {
      const googleApiKey = process.env.API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
        address
      )}&inputtype=textquery&fields=geometry&key=${googleApiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log(data);

      if (data.candidates && data.candidates[0]?.geometry?.location) {
        return {
          latitude: data.candidates[0].geometry.location.lat,
          longitude: data.candidates[0].geometry.location.lng,
        };
      }
    } catch (error) {
      console.error("Error fetching place by text:", error);
    }
    return null;
  }
}

module.exports = { GeoLocationService };
