const cheerio = require('cheerio');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function extractMarketplaceData(htmlContent) {
    const $ = cheerio.load(htmlContent);
    const extractedData = {
        listings: [],
        metadata: {
            extractedAt: new Date().toISOString(),
            source: 'Facebook Marketplace',
            totalListings: 0
        }
    };

    // Check for new format JSON data (facebook-apartments2.html style)
    const newFormatData = extractNewFormatData($);
    if (newFormatData.length > 0) {
        extractedData.listings.push(...newFormatData);
    }

    $('script[type="application/json"]').each((index, element) => {
        try {
            const scriptContent = $(element).text();
            if (scriptContent && scriptContent.trim().startsWith('{')) {
                const jsonData = JSON.parse(scriptContent);
                
                const listings = findMarketplaceListings(jsonData);
                extractedData.listings.push(...listings);
            }
        } catch (error) {
            console.log(`Skipping script tag ${index} due to parse error:`, error.message);
        }
    });

    $('script[data-sjs]').each((index, element) => {
        try {
            const scriptContent = $(element).text();
            if (scriptContent && scriptContent.includes('MarketplaceFeedListingStoryObject')) {
                const jsonMatches = scriptContent.match(/\{[^{}]*"MarketplaceFeedListingStoryObject"[^{}]*\}/g);
                if (jsonMatches) {
                    jsonMatches.forEach(match => {
                        try {
                            const jsonData = JSON.parse(match);
                            const listings = findMarketplaceListings(jsonData);
                            extractedData.listings.push(...listings);
                        } catch (e) {
                        }
                    });
                }
            }
        } catch (error) {
            console.log(`Skipping inline script ${index}:`, error.message);
        }
    });

    extractedData.metadata.totalListings = extractedData.listings.length;
    return extractedData;
}

function extractNewFormatData($) {
    const listings = [];
    
    $('script[type="application/json"]').each((index, element) => {
        try {
            const scriptContent = $(element).text();
            if (scriptContent && scriptContent.includes('marketplace_feed_stories')) {
                const jsonData = JSON.parse(scriptContent);
                const marketplaceListings = findMarketplaceFeedListings(jsonData);
                listings.push(...marketplaceListings);
            }
        } catch (error) {
            console.log(`Skipping new format script tag ${index} due to parse error:`, error.message);
        }
    });
    
    return listings;
}

function findMarketplaceListings(obj, listings = []) {
    if (!obj || typeof obj !== 'object') return listings;

    if (obj.__typename === 'MarketplaceFeedListingStoryObject' || 
        obj.__isMarketplaceListingRenderable === 'GroupCommerceProductItem') {
        
        const listing = extractListingData(obj);
        if (listing && listing.id) {
            listings.push(listing);
        }
    }

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (Array.isArray(obj[key])) {
                obj[key].forEach(item => findMarketplaceListings(item, listings));
            } else if (typeof obj[key] === 'object') {
                findMarketplaceListings(obj[key], listings);
            }
        }
    }

    return listings;
}

function findMarketplaceFeedListings(obj, listings = []) {
    if (!obj || typeof obj !== 'object') return listings;

    // Look for marketplace_feed_stories structure
    if (obj.marketplace_feed_stories && obj.marketplace_feed_stories.edges) {
        obj.marketplace_feed_stories.edges.forEach(edge => {
            if (edge.node && edge.node.listing) {
                const listing = extractNewFormatListingData(edge.node);
                if (listing && listing.id) {
                    listings.push(listing);
                }
            }
        });
    }

    // Recursively search through the object
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (Array.isArray(obj[key])) {
                obj[key].forEach(item => findMarketplaceFeedListings(item, listings));
            } else if (typeof obj[key] === 'object') {
                findMarketplaceFeedListings(obj[key], listings);
            }
        }
    }

    return listings;
}

function extractListingData(listingObj) {
    try {
        const listing = {
            id: null,
            title: null,
            price: null,
            location: null,
            description: null,
            images: [],
            seller: null,
            category: null,
            isAvailable: true,
            bedrooms: null,
            bathrooms: null,
            propertyType: null,
            postedDate: null,
            url: null
        };

        if (listingObj.marketplace_listing_title) {
            listing.title = listingObj.marketplace_listing_title;
        }

        if (listingObj.custom_title) {
            listing.description = listingObj.custom_title;
            
            const bedroomMatch = listingObj.custom_title.match(/(\d+)\s*bedroom/i);
            const bathroomMatch = listingObj.custom_title.match(/(\d+)\s*bathroom/i);
            
            if (bedroomMatch) listing.bedrooms = parseInt(bedroomMatch[1]);
            if (bathroomMatch) listing.bathrooms = parseInt(bathroomMatch[1]);
        }

        if (listingObj.listing_price) {
            listing.price = {
                formatted: listingObj.listing_price.formatted_amount,
                amount: parseFloat(listingObj.listing_price.amount),
                currency: 'USD'
            };
        }

        if (listingObj.location && listingObj.location.reverse_geocode) {
            listing.location = {
                city: listingObj.location.reverse_geocode.city,
                state: listingObj.location.reverse_geocode.state,
                displayName: listingObj.location.reverse_geocode.city_page?.display_name
            };
        }

        if (listingObj.custom_sub_titles_with_rendering_flags) {
            const locationSubtitle = listingObj.custom_sub_titles_with_rendering_flags[0]?.subtitle;
            if (locationSubtitle && !listing.location) {
                listing.location = { address: locationSubtitle };
            } else if (locationSubtitle && listing.location) {
                listing.location.address = locationSubtitle;
            }
        }

        if (listingObj.marketplace_listing_seller) {
            listing.seller = {
                name: listingObj.marketplace_listing_seller.name,
                id: listingObj.marketplace_listing_seller.id
            };
        }

        if (listingObj.primary_listing_photo && listingObj.primary_listing_photo.image) {
            listing.images.push({
                url: listingObj.primary_listing_photo.image.uri,
                width: listingObj.primary_listing_photo.image.width,
                height: listingObj.primary_listing_photo.image.height
            });
        }

        listing.isAvailable = !listingObj.is_sold && !listingObj.is_pending && !listingObj.is_hidden;

        if (listingObj.marketplace_listing_category_id) {
            listing.category = listingObj.marketplace_listing_category_id;
        }

        if (listingObj.id) {
            listing.id = listingObj.id;
        } else if (listingObj.story_key) {
            listing.id = listingObj.story_key;
        }

        if (listing.title && listing.title.toLowerCase().includes('apartment')) {
            listing.propertyType = 'apartment';
        } else if (listing.title && listing.title.toLowerCase().includes('house')) {
            listing.propertyType = 'house';
        } else if (listing.title && listing.title.toLowerCase().includes('condo')) {
            listing.propertyType = 'condo';
        }

        return listing;
    } catch (error) {
        console.error('Error extracting listing data:', error);
        return null;
    }
}

function extractNewFormatListingData(nodeObj) {
    try {
        const listing = {
            id: null,
            title: null,
            price: null,
            location: null,
            description: null,
            images: [],
            seller: null,
            category: null,
            isAvailable: true,
            bedrooms: null,
            bathrooms: null,
            propertyType: null,
            postedDate: null,
            url: null,
            storyKey: null,
            tracking: null
        };

        const listingData = nodeObj.listing;
        if (!listingData) return null;

        // Extract basic info
        listing.id = listingData.id;
        listing.storyKey = nodeObj.story_key;
        listing.tracking = nodeObj.tracking;

        // Extract title and description
        listing.title = listingData.marketplace_listing_title || '';
        listing.description = listingData.custom_title || '';

        // Extract bedroom/bathroom info from custom_title
        if (listingData.custom_title) {
            const bedroomMatch = listingData.custom_title.match(/(\d+)\s*bedroom/i);
            const bathroomMatch = listingData.custom_title.match(/(\d+)\s*bathroom/i);
            
            if (bedroomMatch) listing.bedrooms = parseInt(bedroomMatch[1]);
            if (bathroomMatch) listing.bathrooms = parseInt(bathroomMatch[1]);
        }

        // Extract price
        if (listingData.listing_price) {
            listing.price = {
                formatted: listingData.listing_price.formatted_amount,
                amount: parseFloat(listingData.listing_price.amount),
                currency: 'USD'
            };
        }

        // Extract location
        if (listingData.location && listingData.location.reverse_geocode) {
            listing.location = {
                city: listingData.location.reverse_geocode.city,
                state: listingData.location.reverse_geocode.state,
                displayName: listingData.location.reverse_geocode.city_page?.display_name,
                cityPageId: listingData.location.reverse_geocode.city_page?.id
            };
        }

        // Extract address from custom_sub_titles_with_rendering_flags
        if (listingData.custom_sub_titles_with_rendering_flags && listingData.custom_sub_titles_with_rendering_flags[0]) {
            const subtitle = listingData.custom_sub_titles_with_rendering_flags[0].subtitle;
            if (subtitle && listing.location) {
                listing.location.address = subtitle;
            } else if (subtitle) {
                listing.location = { address: subtitle };
            }
        }

        // Extract seller information
        if (listingData.marketplace_listing_seller) {
            listing.seller = {
                name: listingData.marketplace_listing_seller.name,
                id: listingData.marketplace_listing_seller.id
            };
        }

        // Extract primary image
        if (listingData.primary_listing_photo && listingData.primary_listing_photo.image) {
            listing.images.push({
                url: listingData.primary_listing_photo.image.uri,
                id: listingData.primary_listing_photo.id
            });
        }

        // Extract availability status
        listing.isAvailable = !listingData.is_sold && !listingData.is_pending && !listingData.is_hidden;

        // Extract category
        listing.category = listingData.marketplace_listing_category_id;

        // Determine property type
        const titleLower = listing.title.toLowerCase();
        const descLower = (listing.description || '').toLowerCase();
        
        if (titleLower.includes('apartment') || descLower.includes('apartment')) {
            listing.propertyType = 'apartment';
        } else if (titleLower.includes('house') || descLower.includes('house')) {
            listing.propertyType = 'house';
        } else if (titleLower.includes('condo') || descLower.includes('condo')) {
            listing.propertyType = 'condo';
        } else if (titleLower.includes('townhouse') || descLower.includes('townhouse')) {
            listing.propertyType = 'townhouse';
        }

        return listing;
    } catch (error) {
        console.error('Error extracting new format listing data:', error);
        return null;
    }
}

function saveToJsonFile(data, filename = 'facebook-apartments.json') {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filename, jsonString, 'utf8');
        console.log(`Data saved to ${filename}`);
        console.log(`Extracted ${data.listings.length} listings`);
        return true;
    } catch (error) {
        console.error('Error saving to file:', error);
        return false;
    }
}

function saveToCsvFile(data, filename = 'facebook-apartments.csv') {
    try {
        const csvWriter = createCsvWriter({
            path: filename,
            header: [
                { id: 'id', title: 'ID' },
                { id: 'storyKey', title: 'Story Key' },
                { id: 'title', title: 'Title' },
                { id: 'priceAmount', title: 'Price ($)' },
                { id: 'priceFormatted', title: 'Price Formatted' },
                { id: 'city', title: 'City' },
                { id: 'state', title: 'State' },
                { id: 'address', title: 'Address' },
                { id: 'displayName', title: 'Location Display Name' },
                { id: 'cityPageId', title: 'City Page ID' },
                { id: 'bedrooms', title: 'Bedrooms' },
                { id: 'bathrooms', title: 'Bathrooms' },
                { id: 'propertyType', title: 'Property Type' },
                { id: 'description', title: 'Description' },
                { id: 'sellerName', title: 'Seller Name' },
                { id: 'sellerId', title: 'Seller ID' },
                { id: 'isAvailable', title: 'Available' },
                { id: 'imageUrl', title: 'Primary Image URL' },
                { id: 'category', title: 'Category ID' }
            ]
        });

        const csvData = data.listings.map(listing => ({
            id: listing.id || '',
            storyKey: listing.storyKey || '',
            title: listing.title || '',
            priceAmount: listing.price?.amount || '',
            priceFormatted: listing.price?.formatted || '',
            city: listing.location?.city || '',
            state: listing.location?.state || '',
            address: listing.location?.address || '',
            displayName: listing.location?.displayName || '',
            cityPageId: listing.location?.cityPageId || '',
            bedrooms: listing.bedrooms || '',
            bathrooms: listing.bathrooms || '',
            propertyType: listing.propertyType || '',
            description: listing.description || '',
            sellerName: listing.seller?.name || '',
            sellerId: listing.seller?.id || '',
            isAvailable: listing.isAvailable,
            imageUrl: listing.images?.[0]?.url || '',
            category: listing.category || ''
        }));

        csvWriter.writeRecords(csvData)
            .then(() => {
                console.log(`CSV data saved to ${filename}`);
                console.log(`Exported ${csvData.length} listings to CSV`);
            })
            .catch(error => {
                console.error('Error saving CSV file:', error);
            });

        return true;
    } catch (error) {
        console.error('Error creating CSV file:', error);
        return false;
    }
}

function processHtmlFile(htmlFilePath, outputPath = null) {
    try {
        console.log('Reading HTML file...');
        const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        console.log('Extracting marketplace data...');
        const extractedData = extractMarketplaceData(htmlContent);
        
        const baseFileName = htmlFilePath.replace('.html', '');
        const outputFile = outputPath || `${baseFileName}-structured.json`;
        const csvFile = outputFile.replace('.json', '.csv');
        
        const jsonSuccess = saveToJsonFile(extractedData, outputFile);
        const csvSuccess = saveToCsvFile(extractedData, csvFile);
        
        if (jsonSuccess && csvSuccess && extractedData.listings.length > 0) {
            console.log('\nSample listing:');
            console.log(JSON.stringify(extractedData.listings[0], null, 2));
        }
        
        return extractedData;
    } catch (error) {
        console.error('Error processing HTML file:', error);
        return null;
    }
}

if (require.main === module) {
    // Process both files
    const htmlFilePath1 = './facebook-apartments.html';
    const htmlFilePath2 = './facebook-apartments2.html';
    
    console.log('Processing facebook-apartments.html...');
    processHtmlFile(htmlFilePath1);
    
    console.log('\nProcessing facebook-apartments2.html...');
    processHtmlFile(htmlFilePath2);
}

module.exports = {
    extractMarketplaceData,
    processHtmlFile,
    saveToJsonFile,
    saveToCsvFile
};

