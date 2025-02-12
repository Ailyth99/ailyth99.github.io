import os
import re

def replace_charset_in_html(folder_path):
    """
    Replaces 'Shift_JIS' with 'UTF-8' in the charset attribute of meta tags
    within HTML files in a given folder and its subfolders.
    It only modifies the tag, it doesn't re-encode the file.

    Args:
        folder_path: The path to the folder.
    """
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith((".html", ".htm")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r+', encoding='utf-8', errors='ignore') as f:  # Open in r+ mode for reading and writing
                        content = f.read()

                        # Use regular expressions for a more robust replacement (handles variations)
                        # This handles charset=Shift_JIS, charset="Shift_JIS", and charset='Shift_JIS'
                        new_content = re.sub(r'(<meta\s+[^>]*?charset\s*=\s*["\']?)Shift_JIS(["\']?[^>]*?>)',
                                            r'\1UTF-8\2', content, flags=re.IGNORECASE)
                        
                        # If a replacement was made, write the changes back to the file
                        if new_content != content:
                            f.seek(0)  # Rewind to the beginning of the file
                            f.write(new_content)
                            f.truncate() # Remove any remaining old content
                            print(f"Modified: {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

# Example usage
folder_path = input("Enter the folder path: ")
replace_charset_in_html(folder_path)
print("Done!")