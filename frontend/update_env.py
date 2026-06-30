import glob

path = r'c:\Users\marel\OneDrive\Desktop\sidekick\frontend\src\app\**\*.tsx'
for filepath in glob.glob(path, recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('"http://localhost:8000/api/v1"', '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1")')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')
