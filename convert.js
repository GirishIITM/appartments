const fs = require('fs');
const path = require('path');

function convertJsonToCsv(jsonFilePath, csvFilePath) {
    try {
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(jsonData);
        
        if (!data.apartments || !Array.isArray(data.apartments)) {
            throw new Error('Invalid JSON structure: apartments array not found');
        }
        
        const validApartments = data.apartments.filter(apt => 
            apt.listingId && apt.title && apt.title.trim() !== ''
        );
        
        if (validApartments.length === 0) {
            throw new Error('No valid apartments found in the data');
        }
        
        const headers = [
            'listingId',
            'title',
            'streetAddress',
            'address',
            'rent',
            'beds',
            'baths',
            'sqft',
            'propertyType',
            'phone',
            'latitude',
            'longitude',
            'url',
            'placardType',
            'timestamp'
        ];
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        validApartments.forEach(apt => {
            const row = [
                escapeCSVField(apt.listingId || ''),
                escapeCSVField(apt.title || ''),
                escapeCSVField(apt.streetAddress || ''),
                escapeCSVField(apt.address || ''),
                escapeCSVField(apt.pricing?.rent || ''),
                escapeCSVField(apt.bedsBaths?.beds || ''),
                escapeCSVField(apt.bedsBaths?.baths || ''),
                escapeCSVField(apt.bedsBaths?.sqft || ''),
                escapeCSVField(apt.propertyType || ''),
                escapeCSVField(apt.phone?.number || apt.phone?.data || ''),
                apt.geoLocation?.latitude || '',
                apt.geoLocation?.longitude || '',
                escapeCSVField(apt.url || ''),
                escapeCSVField(apt.placardType || ''),
                escapeCSVField(apt.timestamp || '')
            ];
            csvContent += row.join(',') + '\n';
        });
        
        // Write CSV file
        fs.writeFileSync(csvFilePath, csvContent, 'utf8');
        
        console.log(`✅ Successfully converted ${validApartments.length} apartments to CSV`);
        console.log(`📁 CSV file saved: ${csvFilePath}`);
        
        return {
            success: true,
            totalApartments: validApartments.length,
            csvFilePath: csvFilePath
        };
        
    } catch (error) {
        console.error('❌ Error converting JSON to CSV:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

function escapeCSVField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    
    const stringField = String(field);
    
    // If field contains comma, newline, or quote, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
    }
    
    return stringField;
}

// Main execution
function main() {
    const jsonFilePath = path.join(__dirname, 'apartments_latest.json');
    const csvFilePath = path.join(__dirname, 'apartments_latest.csv');
    
    console.log('🔄 Converting apartments JSON to CSV...');
    console.log(`📂 Input file: ${jsonFilePath}`);
    console.log(`📂 Output file: ${csvFilePath}`);
    
    const result = convertJsonToCsv(jsonFilePath, csvFilePath);
    
    if (result.success) {
        console.log('✨ Conversion completed successfully!');
    } else {
        console.log('💥 Conversion failed!');
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { convertJsonToCsv, escapeCSVField };
