const { processHtmlFile, saveToCsvFile } = require('./htmltojson');

console.log('Facebook Marketplace Data Extractor');
console.log('=====================================\n');

const result = processHtmlFile('./facebook-apartments.html', './extracted-apartments.json');

if (result && result.listings.length > 0) {
    saveToCsvFile(result, './extracted-apartments.csv');
    
    console.log('\nExtraction Summary:');
    console.log(`Total listings found: ${result.listings.length}`);
    console.log('Files generated:');
    console.log('   - extracted-apartments.json (structured data)');
    console.log('   - extracted-apartments.csv (spreadsheet format)');
    
    const locationStats = {};
    result.listings.forEach(listing => {
        const location = listing.location?.city || 'Unknown';
        locationStats[location] = (locationStats[location] || 0) + 1;
    });
    
    console.log('\nListings by location:');
    Object.entries(locationStats).forEach(([location, count]) => {
        console.log(`   ${location}: ${count} listings`);
    });
    
    const prices = result.listings
        .filter(l => l.price && l.price.amount)
        .map(l => l.price.amount);
    
    if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        console.log('\nPrice statistics:');
        console.log(`   Min: $${minPrice}`);
        console.log(`   Max: $${maxPrice}`);
        console.log(`   Average: $${avgPrice.toFixed(2)}`);
    }
} else {
    console.log('No listings extracted. Check the HTML file format.');
}
