const fs = require('fs');
const path = 'g:/vinted-updated/vinted-next/app/sell/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace handleSubmit
const handleSubRegex = /const handleSubmit = async \(e\) => \{[\s\S]*?setValidationErrors\(\{\}\);\s*setLoading\(true\);/m;
const newHandleSubmit = `const handleSubmit = async (e) => {
        e.preventDefault();
        
        let newErrors = {};
        let firstErrorField = null;

        const addError = (field, msg) => {
            if (!newErrors[field]) {
                newErrors[field] = msg;
                if (!firstErrorField) firstErrorField = field;
            }
        };

        if (photos.length === 0) addError('photos', 'Please upload at least one photo for the item.');

        if (!title.trim()) addError('title', 'Please enter an item title.');
        else if (!validateTextField(title)) addError('title', getTextFieldError('Title'));

        if (!description.trim()) addError('description', 'Please enter an item description.');
        else if (!validateTextField(description)) addError('description', getTextFieldError('Description'));

        if (!selectedCategory) addError('category', 'Please select a category.');
        if (!selectedSubcategory) addError('subcategory', 'Please select a subcategory.');
        
        const isItemTypeRequired = itemTypes && itemTypes.length > 0;
        if (isItemTypeRequired && !selectedItemType) {
            addError('itemType', 'Please select an item type.');
        }

        if (brand && !validateTextField(brand)) addError('brand', getTextFieldError('Brand'));
        if (!condition) addError('condition', 'Please select the item condition.');
        if (!color) addError('color', 'Please select the item color.');
        if (!price || parseFloat(price) <= 0) addError('price', 'Please enter a valid price.');

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            setTimeout(() => {
                const el = document.getElementById('field-' + firstErrorField);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }

        setValidationErrors({});
        setLoading(true);`;

content = content.replace(handleSubRegex, newHandleSubmit);

// 2. Add IDs and error text to fields
content = content.replace(/<div className="si-photo-grid">/, '<div id="field-photos" className="si-photo-grid">\n{validationErrors.photos && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginBottom: \'10px\' }}>{validationErrors.photos}</p>}');

content = content.replace(/<div className="si-field">\s*<label className="si-label">\{t\('sell_item.item_title'\)\}<\/label>/, '<div className="si-field" id="field-title">\n<label className="si-label">{t(\'sell_item.item_title\')}</label>');
content = content.replace(/<div className="si-field si-field-last">\s*<label className="si-label">\{t\('sell_item.item_description'\)\}<\/label>/, '<div className="si-field si-field-last" id="field-description">\n<label className="si-label">{t(\'sell_item.item_description\')}</label>');

content = content.replace(/\{title && !validateTextField\(title\) && \([\s\S]*?\}\)/, '{validationErrors.title && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.title}</p>}');
content = content.replace(/\{description && !validateTextField\(description\) && \([\s\S]*?\}\)/, '{validationErrors.description && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.description}</p>}');
content = content.replace(/\{brand && !validateTextField\(brand\) && \([\s\S]*?\}\)/, '{validationErrors.brand && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.brand}</p>}');

content = content.replace(/<div className="si-field">\s*<div className="si-label-row d-flex justify-content-between">\s*<label className="si-label">\{t\('sell_item.category'\)\}<\/label>/, '<div className="si-field" id="field-category">\n<div className="si-label-row d-flex justify-content-between">\n<label className="si-label">{t(\'sell_item.category\')}</label>');
content = content.replace(/onChange=\{handleCategoryChange\}\s*\/>/g, 'onChange={handleCategoryChange}\n/>\n{validationErrors.category && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.category}</p>}');

content = content.replace(/<div className="si-field">\s*<div className="si-label-row d-flex justify-content-between">\s*<label className="si-label">\{t\('sell_item.subcategory'\)\}<\/label>/, '<div className="si-field" id="field-subcategory">\n<div className="si-label-row d-flex justify-content-between">\n<label className="si-label">{t(\'sell_item.subcategory\')}</label>');
content = content.replace(/onChange=\{handleSubcategoryChange\}\s*disabled=\{!selectedCategory\}\s*\/>/g, 'onChange={handleSubcategoryChange}\ndisabled={!selectedCategory}\n/>\n{validationErrors.subcategory && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.subcategory}</p>}');

content = content.replace(/<div className="si-field">\s*<div className="si-label-row d-flex justify-content-between">\s*<label className="si-label">\{t\('sell_item.item_type'\)\}<\/label>/, '<div className="si-field" id="field-itemType">\n<div className="si-label-row d-flex justify-content-between">\n<label className="si-label">{t(\'sell_item.item_type\')}</label>');
content = content.replace(/onChange=\{setSelectedItemType\}\s*disabled=\{!selectedSubcategory\}\s*\/>/g, 'onChange={setSelectedItemType}\ndisabled={!selectedSubcategory}\n/>\n{validationErrors.itemType && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.itemType}</p>}');

content = content.replace(/<div className="si-field">\s*<label className="si-label">\{t\('sell_item.brand'\)\}<\/label>/, '<div className="si-field" id="field-brand">\n<label className="si-label">{t(\'sell_item.brand\')}</label>');

content = content.replace(/<div className="si-field" style=\{\{ flex: 1 \}\}>\s*<label className="si-label">\{t\('sell_item.color'\)\}<\/label>/, '<div className="si-field" id="field-color" style={{ flex: 1 }}>\n<label className="si-label">{t(\'sell_item.color\')}</label>');
content = content.replace(/onChange=\{setColor\}\s*searchable=\{true\}\s*\/>/g, 'onChange={setColor}\nsearchable={true}\n/>\n{validationErrors.color && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.color}</p>}');

content = content.replace(/<div className="si-field" style=\{\{ flex: 1 \}\}>\s*<label className="si-label">\{t\('sell_item.condition'\)\}<\/label>/, '<div className="si-field" id="field-condition" style={{ flex: 1 }}>\n<label className="si-label">{t(\'sell_item.condition\')}</label>');
content = content.replace(/onChange=\{setCondition\}\s*\/>/g, 'onChange={setCondition}\n/>\n{validationErrors.condition && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.condition}</p>}');

content = content.replace(/<div className="si-field" style=\{\{ maxWidth: '240px' \}\}>/, '<div className="si-field" id="field-price" style={{ maxWidth: \'240px\' }}>');
content = content.replace(/onChange=\{e => setPrice\(e\.target\.value\)\}\s*required\s*\/>/g, 'onChange={e => setPrice(e.target.value)} required />\n{validationErrors.price && <p className="si-error-text" style={{ color: \'#ef4444\', fontSize: \'0.8rem\', marginTop: \'4px\' }}>{validationErrors.price}</p>}');

fs.writeFileSync(path, content);
console.log('Updated app/sell/page.jsx successfully!');
