import os
import re

# Patrón comprensivo para emojis
emoji_pattern = re.compile(
    r'[\U0001F300-\U0001F9FF\U00002600-\U000026FF\U00002700-\U000027BF]|'
    r'[✅❌⚠️🎉💡⏳✓✗➜►⬆️⬇️🔍📝🚀⭐🔥💻📊🎯⚡🛠️📦🔧🎨📁📄🌐💾🗂️📋🔒🔓⚙️🆕🔴🟢🟡🔵⚪⚫➢🤖💰📈👨‍💼💼🏢👥🔗📡🔄🔌🗑️⏹️⏭️ℹ️⏱️🏷️]'
)

def remove_emojis_from_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if emoji_pattern.search(content):
            cleaned_content = emoji_pattern.sub('', content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            return True
    except Exception as e:
        print(f"Error procesando {filepath}: {e}")
    return False

# Frontend files
frontend_files = [
    'src/components/ExtractIADropzone.jsx',
    'src/components/ResultsRenderer/ResultsRenderer.jsx',
    'src/components/ResultsRenderer/ResultCard.jsx',
    'src/components/modal/AnalysisSection.jsx',
    'src/components/modal/MultiResultModal.jsx',
    'src/hooks/useLocalDocumentAnalysis.js',
    'src/hooks/useDocumentDownload.js',
    'src/features/ResultCard.jsx',
    'src/pages/Register.jsx',
    'src/styles/components/analysis-section.css',
]

cleaned_count = 0
for file in frontend_files:
    if os.path.exists(file):
        if remove_emojis_from_file(file):
            print(f"Limpiado: {file}")
            cleaned_count += 1

print(f"\nTotal archivos frontend limpiados: {cleaned_count}/{len(frontend_files)}")
