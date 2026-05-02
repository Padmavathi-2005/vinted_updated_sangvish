const fs = require('fs');
const path = require('path');

const srcDir = 'e:/vinted-user&admin/vinted-admin/frontend/src/pages';
const componentsDir = 'e:/vinted-user&admin/vinted-admin/frontend/src/components';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove local pagination calculation variables
    content = content.replace(/const totalPages = Math\.ceil\((.*?)\.length \/ paginationLimit\) \|\| 1;/g, '');
    content = content.replace(/const totalPages = Math\.ceil\((.*?)\.length \/ paginationLimit\);/g, '');

    // Remove the slice itself
    content = content.replace(/const paginated(.*?) = (.*?)\.slice\([\s\S]*?paginationLimit\n\s*\);/g, '');

    // Replace the data={} prop with the unpaginated variable
    // Listings.jsx
    content = content.replace(/data=\{paginatedData\}/g, 'data={filteredListings || filteredCategories || filteredData || users}');
    // Wait, dynamic replacing requires exact names:
    if (file === 'Listings.jsx') content = content.replace(/data=\{.*?\}/, 'data={filteredListings}');
    if (file === 'Orders.jsx') content = content.replace(/data=\{paginatedOrders\}/, 'data={filteredOrders}');
    if (file === 'Categories.jsx') content = content.replace(/data=\{paginatedData\}/, 'data={filteredCategories}');
    if (file === 'Subcategories.jsx') content = content.replace(/data=\{paginatedData\}/, 'data={filteredData}');
    if (file === 'ItemTypes.jsx') content = content.replace(/data=\{paginatedData\}/, 'data={filteredData}');
    if (file === 'Languages.jsx') content = content.replace(/data=\{paginatedData\}/, 'data={filteredData}');
    if (file === 'Currencies.jsx') content = content.replace(/data=\{paginatedData\}/, 'data={filteredData}');

    fs.writeFileSync(filePath, content);
});

console.log("Successfully updated parents to let Table handle pagination natively.");
