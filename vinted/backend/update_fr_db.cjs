const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted').then(async () => {
    const db = mongoose.connection.db;
    
    await db.collection('languages').updateOne(
        { code: 'fr' },
        { 
            $set: {
                'translations.products.home_breadcrumb': 'Accueil',
                'translations.products.all_breadcrumb': 'Tout',
                'translations.products.items_count': '{{count}} articles',
                'translations.products.reset_all': 'Réinitialiser tous les filtres',
                'translations.products.results_for_search': 'Résultats pour "{{search}}"',
                'translations.products.all_products_breadcrumb': 'Tous les produits',
                'translations.products.from': 'De',
                'translations.products.up_to': 'Jusqu\'à',
                'translations.products.sort': 'Trier',
                'translations.products.apply_range': 'Appliquer',
                'translations.products.max_must_be_greater': 'Max doit être ≥ Min',
                'translations.products.visual_search_setup_required': 'Configuration de recherche visuelle requise',
                'translations.products.visual_search_missing_keys': 'Vos clés d\'API ne sont pas encore configurées.',
                'translations.products.all_items': 'Tous les {{name}}',
                'translations.products.all_categories': 'Toutes les catégories',
                'translations.products.sort_relevance': 'Pertinence',
                'translations.products.sort_price_asc': 'Prix : croissant',
                'translations.products.sort_price_desc': 'Prix : décroissant',
                'translations.products.sort_newest': 'Le plus récent',
                'translations.products.sort_sale': 'Articles en solde'
            }
        }
    );
    console.log('Updated DB');
    process.exit(0);
});
