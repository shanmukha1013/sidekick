import os, glob

path = r'c:\Users\marel\OneDrive\Desktop\sidekick\frontend\src\app\**\*.tsx'
for filepath in glob.glob(path, recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('\u20b9{app.expected_salary}', '')
    new_content = new_content.replace('\u20b9{rj.hourly_rate}', '')
    new_content = new_content.replace('\u20b9{job.hourly_rate}', '')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Restored {filepath}')
