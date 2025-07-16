'''import secrets

# JWT secret (at least 32 characters)
jwt_secret = secrets.token_urlsafe(48)
print("JWT_SECRET=", jwt_secret)

# Refresh token secret
jwt_refresh_secret = secrets.token_urlsafe(48)
print("JWT_REFRESH_SECRET=", jwt_refresh_secret)

# 32-character encryption key (for AES-256)
encryption_key = secrets.token_hex(16)  # 16 bytes = 32 hex characters
print("ENCRYPTION_KEY=", encryption_key)
'''
import os
import json
from pathlib import Path

def scan_empty_files(root_directory="."):
    """
    Scans through the project directory and finds all empty files
    Returns a list of empty files with their paths
    """
    
    empty_files = []
    total_files = 0
    
    print(f"🔍 Scanning directory: {os.path.abspath(root_directory)}")
    print("=" * 60)
    
    # Walk through all directories and files
    for root, dirs, files in os.walk(root_directory):
        # Skip node_modules and other unnecessary directories
        dirs[:] = [d for d in dirs if d not in [
            'node_modules', '.git', '.vscode', '__pycache__', 
            'dist', 'build', '.next', 'coverage', '.nyc_output'
        ]]
        
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, root_directory)
            total_files += 1
            
            try:
                # Check if file is empty (0 bytes)
                if os.path.getsize(file_path) == 0:
                    empty_files.append({
                        'path': relative_path,
                        'full_path': file_path,
                        'directory': os.path.dirname(relative_path),
                        'filename': file,
                        'extension': os.path.splitext(file)[1]
                    })
                    print(f"📄 Empty: {relative_path}")
                    
            except (OSError, IOError) as e:
                print(f"❌ Error reading {relative_path}: {e}")
    
    return empty_files, total_files

def categorize_empty_files(empty_files):
    """
    Categorizes empty files by type and location
    """
    categories = {
        'backend': [],
        'frontend': [],
        'database': [],
        'docs': [],
        'config': [],
        'other': []
    }
    
    file_types = {
        'javascript': [],
        'jsx': [],
        'sql': [],
        'markdown': [],
        'json': [],
        'css': [],
        'other': []
    }
    
    for file_info in empty_files:
        path = file_info['path']
        ext = file_info['extension'].lower()
        
        # Categorize by location
        if path.startswith('backend'):
            categories['backend'].append(file_info)
        elif path.startswith('frontend'):
            categories['frontend'].append(file_info)
        elif path.startswith('database'):
            categories['database'].append(file_info)
        elif path.startswith('docs'):
            categories['docs'].append(file_info)
        elif ext in ['.json', '.yml', '.yaml', '.env', '.config']:
            categories['config'].append(file_info)
        else:
            categories['other'].append(file_info)
        
        # Categorize by file type
        if ext in ['.js', '.mjs', '.cjs']:
            file_types['javascript'].append(file_info)
        elif ext in ['.jsx', '.tsx']:
            file_types['jsx'].append(file_info)
        elif ext == '.sql':
            file_types['sql'].append(file_info)
        elif ext in ['.md', '.txt']:
            file_types['markdown'].append(file_info)
        elif ext == '.json':
            file_types['json'].append(file_info)
        elif ext in ['.css', '.scss', '.sass']:
            file_types['css'].append(file_info)
        else:
            file_types['other'].append(file_info)
    
    return categories, file_types

def generate_report(empty_files, total_files, categories, file_types):
    """
    Generates a comprehensive report of empty files
    """
    print("\n" + "=" * 60)
    print("📊 EMPTY FILES REPORT")
    print("=" * 60)
    
    print(f"📈 Total files scanned: {total_files}")
    print(f"📄 Empty files found: {len(empty_files)}")
    print(f"📊 Completion rate: {((total_files - len(empty_files)) / total_files * 100):.1f}%")
    
    print("\n🗂️ BY LOCATION:")
    for category, files in categories.items():
        if files:
            print(f"  {category.upper()}: {len(files)} files")
            for file_info in files[:5]:  # Show first 5
                print(f"    - {file_info['path']}")
            if len(files) > 5:
                print(f"    ... and {len(files) - 5} more")
    
    print("\n📁 BY FILE TYPE:")
    for file_type, files in file_types.items():
        if files:
            print(f"  {file_type.upper()}: {len(files)} files")
    
    print("\n🔥 CRITICAL EMPTY FILES (likely causing errors):")
    critical_files = [
        f for f in empty_files 
        if any(critical in f['path'].lower() for critical in [
            'app.js', 'server.js', 'main.jsx', 'app.jsx', 'index.js',
            'package.json', 'vite.config', 'tailwind.config'
        ])
    ]
    
    if critical_files:
        for file_info in critical_files:
            print(f"  ⚠️  {file_info['path']}")
    else:
        print("  ✅ No critical files are empty")

def save_results(empty_files, filename="empty_files_report.json"):
    """
    Saves the results to a JSON file for further processing
    """
    report_data = {
        "scan_timestamp": str(Path().absolute()),
        "total_empty_files": len(empty_files),
        "empty_files": empty_files
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Report saved to: {filename}")

def create_todo_list(empty_files):
    """
    Creates a TODO list for filling empty files
    """
    todo_content = "# 📋 Empty Files TODO List\n\n"
    todo_content += f"Found {len(empty_files)} empty files that need content:\n\n"
    
    # Group by directory
    by_directory = {}
    for file_info in empty_files:
        directory = file_info['directory']
        if directory not in by_directory:
            by_directory[directory] = []
        by_directory[directory].append(file_info)
    
    for directory, files in sorted(by_directory.items()):
        todo_content += f"## {directory or 'Root'}\n\n"
        for file_info in files:
            todo_content += f"- [ ] {file_info['filename']}\n"
        todo_content += "\n"
    
    with open("EMPTY_FILES_TODO.md", 'w', encoding='utf-8') as f:
        f.write(todo_content)
    
    print("📝 TODO list created: EMPTY_FILES_TODO.md")

def main():
    """
    Main function to run the empty file scanner
    """
    print("🚀 Empty File Scanner for Secure VM Portal")
    print("=" * 60)
    
    # Get the directory to scan (current directory by default)
    scan_directory = input("Enter directory to scan (press Enter for current directory): ").strip()
    if not scan_directory:
        scan_directory = "."
    
    if not os.path.exists(scan_directory):
        print(f"❌ Directory '{scan_directory}' does not exist!")
        return
    
    # Scan for empty files
    empty_files, total_files = scan_empty_files(scan_directory)
    
    if not empty_files:
        print("\n🎉 No empty files found! Your project structure is complete.")
        return
    
    # Categorize files
    categories, file_types = categorize_empty_files(empty_files)
    
    # Generate report
    generate_report(empty_files, total_files, categories, file_types)
    
    # Save results
    save_results(empty_files)
    
    # Create TODO list
    create_todo_list(empty_files)
    
    print("\n✅ Scan complete!")
    print("\nNext steps:")
    print("1. Check EMPTY_FILES_TODO.md for a checklist")
    print("2. Review empty_files_report.json for detailed info")
    print("3. Fill critical files first (app.js, package.json, etc.)")
    print("4. Copy-paste code from the conversation into empty files")

if __name__ == "__main__":
    main()
