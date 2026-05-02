const fs = require('fs');
const path = require('path');

const srcDir = 'e:/vinted-user&admin/vinted-admin/frontend/src/pages';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace pagination object inside Table with pagination={true}
    content = content.replace(/pagination=\{\{[\s\S]*?\}\}/g, 'pagination={true}');

    // Remove lingering useEffects that rely on totalPages
    content = content.replace(/useEffect\(\(\) => \{\n\s*if \(currentPage > totalPages && totalPages > 0\) \{\n\s*setCurrentPage\(totalPages\);\n\s*\}\n\s*\}, \[[^\]]*totalPages[^\]]*\]\);\n?/g, '');
    content = content.replace(/useEffect\(\(\) => \{\n\s*if \(currentPage > totalPages\) \{\n\s*setCurrentPage\(totalPages\);\n\s*\}\n\s*\}, \[[^\]]*totalPages[^\]]*\]\);\n?/g, '');

    // Remove lingering paginated slice constants completely
    content = content.replace(/const paginated[a-zA-Z0-9_]* = [a-zA-Z0-9_]*\.slice\([\s\S]*?paginationLimit\n\s*\);\n?/g, '');

    if (file === 'Users.jsx') {
        content = content.replace(/setTotalPages\(Math\.ceil\(.*?\)\);\n?/g, '');
        content = content.replace(/const \[totalPages, setTotalPages\] = useState\(1\);\n?/g, '');
        // Fix useEffect dependency array in Users.jsx
        content = content.replace(/ \[\s*currentPage,\s*searchTerm,\s*paginationLimit\s*\]/g, ' [searchTerm, paginationLimit]');
    }

    // Replace currentPage occurrences with nothing or remove the useState
    content = content.replace(/const \[currentPage, setCurrentPage\] = useState\(1\);\n?/g, '');

    // Also change setCurrentPage(1) in the onChange handlers for forms to just nothing.
    content = content.replace(/;\s*setCurrentPage\(1\)/g, '');

    fs.writeFileSync(filePath, content);
});

console.log("Pagination completely fixed and totalPages eliminated locally.");
