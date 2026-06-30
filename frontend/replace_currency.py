import os, glob

path = r'c:\Users\marel\OneDrive\Desktop\sidekick\frontend\src\app\**\*.tsx'
for filepath in glob.glob(path, recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We first fix the `?` if they were inserted by the previous run
    content = content.replace('?{job.hourly_rate}', '₹{job.hourly_rate}')
    content = content.replace('?{rj.hourly_rate}', '₹{rj.hourly_rate}')
    content = content.replace('?{app.expected_salary}', '₹{app.expected_salary}')
    
    # Also replace any literal $ that might have been missed
    new_content = content.replace('${job.hourly_rate}', '₹{job.hourly_rate}')
    new_content = new_content.replace('${rj.hourly_rate}', '₹{rj.hourly_rate}')
    new_content = new_content.replace('${app.expected_salary}', '₹{app.expected_salary}')
    new_content = new_content.replace('Hourly Rate ($)', 'Hourly Rate (₹)')
    new_content = new_content.replace('Expected Hourly Rate ($)', 'Expected Hourly Rate (₹)')
    new_content = new_content.replace('<DollarSign', '<IndianRupee')
    
    if new_content != content:
        # Import IndianRupee if needed
        if '<IndianRupee' in new_content and 'IndianRupee' not in new_content:
            new_content = new_content.replace('DollarSign', 'DollarSign, IndianRupee')
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')
