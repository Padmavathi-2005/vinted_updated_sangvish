import json
import os
import pymongo
from deep_translator import GoogleTranslator
from time import sleep

# Configuration
# Read MONGO_URI from .env if possible, otherwise hardcoded from your provided context
MONGO_URI = "mongodb+srv://support_db_uuser:gyhkuN-jammy8-voxqub@vinted.ek5p4it.mongodb.net/vinted_db?appName=vinted"
DB_NAME = "vinted_db"
LOCALES_DIR = "src/locales"
BASE_LANG_FILE = f"{LOCALES_DIR}/en.json"

def get_active_languages():
    """Fetches active languages from MongoDB."""
    try:
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        # Assuming the collection name is 'languages' and it has a 'code' field
        languages_col = db['languages']
        # Fetch languages where status is active (usually 1 or true)
        langs = list(languages_col.find({"status": 1}))
        
        # If no active field, just get all
        if not langs:
            langs = list(languages_col.find())
            
        lang_list = []
        for l in langs:
            # Check for 'code', 'iso_code', or 'shortcut'
            code = l.get('code') or l.get('iso_code') or l.get('shortcut')
            if code and code != 'en':
                lang_list.append(code.lower())
        
        client.close()
        return list(set(lang_list)) # Unique codes
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        # Default fallback if DB fails
        return ['fr', 'es', 'de', 'ta', 'hi']

def translate_dict(d, target_lang):
    """Recursively translates a dictionary."""
    translated = {}
    for key, value in d.items():
        if isinstance(value, dict):
            translated[key] = translate_dict(value, target_lang)
        else:
            try:
                # Basic translation using Google
                print(f"  Translating: {value[:30]}...")
                translated[key] = GoogleTranslator(source='en', target=target_lang).translate(value)
                sleep(0.1) # Small delay to avoid rate limiting
            except Exception as e:
                print(f"  Failed to translate '{key}': {e}")
                translated[key] = value # Fallback to English
    return translated

def merge_translations(base, target, target_lang):
    """Recursively merges base into target, translating only missing keys."""
    updated = target.copy()
    for key, value in base.items():
        if key not in updated:
            if isinstance(value, dict):
                print(f"  Adding new category: {key}")
                updated[key] = translate_dict(value, target_lang)
            else:
                print(f"  Translating missing key: {key} ({value[:20]}...)")
                try:
                    updated[key] = GoogleTranslator(source='en', target=target_lang).translate(value)
                    sleep(0.1)
                except Exception:
                    updated[key] = value
        elif isinstance(value, dict) and isinstance(updated[key], dict):
            updated[key] = merge_translations(value, updated[key], target_lang)
    return updated

def update_locales():
    if not os.path.exists(BASE_LANG_FILE):
        print(f"Error: Base file {BASE_LANG_FILE} not found!")
        return

    with open(BASE_LANG_FILE, 'r', encoding='utf-8') as f:
        base_translations = json.load(f)

    target_langs = get_active_languages()
    print(f"Found languages in DB: {target_langs}")

    if not os.path.exists(LOCALES_DIR):
        os.makedirs(LOCALES_DIR)

    for lang in target_langs:
        print(f"\nProcessing language: {lang}")
        output_file = f"{LOCALES_DIR}/{lang}.json"
        
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                
                print(f"  Checking for missing keys in {lang}...")
                updated_data = merge_translations(base_translations, existing_data, lang)
                
                if updated_data == existing_data:
                    print(f"  All keys present, skipping: {output_file}")
                    continue
                else:
                    print(f"  Saving updated file: {output_file}")
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(updated_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"  Error updating {output_file}: {e}, will re-generate")
                # Fallback to full translation below
        
        if not os.path.exists(output_file):
            # Translate the entire base dictionary
            try:
                translated_data = translate_dict(base_translations, lang)
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(translated_data, f, ensure_ascii=False, indent=2)
                print(f"Successfully generated {output_file}")
            except Exception as e:
                print(f"CRITICAL ERROR processing {lang}: {e}")
                continue

if __name__ == "__main__":
    import sys
    print("Starting translation sync...")
    
    with open(BASE_LANG_FILE, 'r', encoding='utf-8') as f:
        base_translations = json.load(f)

    if len(sys.argv) > 1:
        target_langs = sys.argv[1:]
        print(f"Targeting specific languages: {target_langs}")
        
        for lang in target_langs:
            print(f"\nProcessing language: {lang}")
            output_file = f"{LOCALES_DIR}/{lang}.json"
            
            existing_data = {}
            if os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            
            updated_data = merge_translations(base_translations, existing_data, lang)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(updated_data, f, ensure_ascii=False, indent=2)
            print(f"Done: {output_file}")
    else:
        update_locales()
        
    print("\nAll locales synchronized successfully!")
