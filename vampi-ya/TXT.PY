import os
import re

def replace_charset_in_html(folder_path):
    """
    Iterates through HTML files, replacing 'Shift_JIS' with 'UTF-8' in the
    meta charset tag, *preserving the original file encoding*.
    """
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith((".html", ".htm")):
                file_path = os.path.join(root, file)
                try:
                    # Read in binary mode, then decode with detected encoding (or a fallback)
                    with open(file_path, 'rb') as f:
                        content_bytes = f.read()

                    # --- Encoding Detection and Decoding ---
                    try:
                        # Attempt to decode as UTF-8 first (common case)
                        content = content_bytes.decode('utf-8')
                    except UnicodeDecodeError:
                        try:
                            # If UTF-8 fails, try Shift-JIS (original encoding)
                            content = content_bytes.decode('shift_jis')
                        except UnicodeDecodeError:
                            # If both fail, use a fallback (e.g., 'latin-1') and ignore errors
                            content = content_bytes.decode('latin-1', errors='ignore')
                            print(f"Warning: Could not reliably decode {file_path}. Using fallback.")
                    # --- End Encoding Detection ---


                    # Regex to find and replace the charset attribute (case-insensitive)
                    pattern = r'(<meta\s+[^>]*?charset\s*=\s*["\']?)(Shift_JIS)(["\']?[^>]*?>)'
                    new_content = re.sub(pattern, r'\1UTF-8\3', content, flags=re.IGNORECASE)

                    if new_content != content:
                        # --- Write Back in Original Encoding ---
                        # Encode the *modified* content back to bytes using the *SAME* encoding
                        # we used to decode it (or the best guess we made).
                        try:
                            #Try to encode back using SHIFT_JIS first:
                            new_content_bytes = new_content.encode('shift_jis')
                        except UnicodeEncodeError:
                            try:
                                # Try UTF-8, maybe it works
                                new_content_bytes = new_content.encode('utf-8')
                            except UnicodeEncodeError:
                                # Fallback, shouldn't happen often
                                new_content_bytes = new_content.encode('latin-1', errors='replace')
                                print(f"Warning: Could not encode back to original. Using fallback for: {file_path}")
                        
                        with open(file_path, 'wb') as f:  # Write in *binary* mode
                            f.write(new_content_bytes)
                        # --- End Write Back ---
                        print(f"Modified: {file_path}")
                    else:
                        print(f"Skipped (no change needed): {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")


# Get folder path from user
folder_path = input("Enter the folder path: ")
replace_charset_in_html(folder_path)
print("Done!")