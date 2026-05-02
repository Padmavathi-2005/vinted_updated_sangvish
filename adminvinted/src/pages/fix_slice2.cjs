const fs = require('fs');
const path = require('path');

const srcDir = 'e:/vinted-user&admin/vinted-admin/frontend/src/pages';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Multi-line replacement string for paginated slice logic
    content = content.replace(/const paginatedOrders = filteredOrders\.slice\([^;]*\);/m, '');
    content = content.replace(/const paginatedData = filteredListings\.slice\([^;]*\);/m, '');
    content = content.replace(/const paginatedData = filteredData\.slice\([^;]*\);/m, '');
    content = content.replace(/const paginatedCategories = filteredCategories\.slice\([^;]*\);/m, '');
    content = content.replace(/const paginatedData = filteredCategories\.slice\([^;]*\);/m, '');

    // Sometimes the regex matching misses the specific newline carriage returns. So let's target by exact component substring
    if (file === 'Orders.jsx') {
        content = content.replace(/const paginatedOrders = filteredOrders\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'Listings.jsx') {
        content = content.replace(/const paginatedData = filteredListings\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'Subcategories.jsx') {
        content = content.replace(/const paginatedData = filteredData\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'ItemTypes.jsx') {
        content = content.replace(/const paginatedData = filteredData\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'Languages.jsx') {
        content = content.replace(/const paginatedData = filteredData\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'Currencies.jsx') {
        content = content.replace(/const paginatedData = filteredData\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }
    if (file === 'Categories.jsx') {
        content = content.replace(/const paginatedData = filteredCategories\.slice\([\s\S]*?paginationLimit\s*\);/m, '');
    }

    fs.writeFileSync(filePath, content);
});

console.log("Pagination slices removed.");
