import json
import os
import sys

# You may need to install this library: pip install deep_translator
try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("Error: 'deep_translator' library not found.")
    print("Please install it using: pip install deep_translator")
    sys.exit(1)

def translate_dict(d, target_lang):
    """Recursively translate values in a dictionary."""
    translated = {}
    translator = GoogleTranslator(source='en', target=target_lang)
    
    for key, value in d.items():
        if isinstance(value, dict):
            translated[key] = translate_dict(value, target_lang)
        else:
            try:
                # Only translate if it's a string
                if isinstance(value, str):
                    print(f"  Translating: {value[:30]}...")
                    translated[key] = translator.translate(value)
                else:
                    translated[key] = value
            except Exception as e:
                print(f"  Failed to translate '{value}': {e}")
                translated[key] = value
                
    return translated

def main():
    # Configuration
    base_dir = os.path.dirname(os.path.abspath(__file__))
    locales_dir = os.path.join(base_dir, 'src', 'locales')
    source_file = os.path.join(locales_dir, 'en.json')
    
    # Target languages (codes)
    # Add any languages you want here!
    target_languages = ['fr', 'es', 'de', 'ta', 'hi']
    
    if not os.path.exists(source_file):
        print(f"Error: Source file not found at {source_file}")
        return

    with open(source_file, 'r', encoding='utf-8') as f:
        source_data = json.load(f)

    for lang in target_languages:
        print(f"\nProcessing language: {lang}")
        target_path = os.path.join(locales_dir, f"{lang}.json")
        
        try:
            translated_data = translate_dict(source_data, lang)
            
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(translated_data, f, indent=2, ensure_ascii=False)
            
            print(f"Successfully generated: {target_path}")
        except Exception as e:
            print(f"Failed to process {lang}: {e}")

if __name__ == "__main__":
    main()
