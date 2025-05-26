from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pdfplumber # For PDF processing
import io         # For creating in-memory text streams (for CSV)
import csv        # For writing CSV data
import pandas as pd # For DataFrame manipulation
# from werkzeug.utils import secure_filename # For more secure filenames

app = Flask(__name__)
CORS(app)

# Directory for uploaded PDFs (from user)
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Directory for generated CSV files (output)
OUTPUT_CSVS_FOLDER = 'output_csvs'
if not os.path.exists(OUTPUT_CSVS_FOLDER):
    os.makedirs(OUTPUT_CSVS_FOLDER)

@app.route('/api/create-sheet', methods=['POST'])
def create_sheet_handler():
    if 'pdfFile' not in request.files:
        return jsonify({'error': 'No PDF file part in the request'}), 400
    
    file = request.files['pdfFile']
    
    if file.filename == '':
        return jsonify({'error': 'No PDF file selected'}), 400
        
    if 'option' not in request.form:
        return jsonify({'error': 'No option selected in the request'}), 400
        
    selected_option = request.form['option']
    # filename = secure_filename(file.filename) # Recommended for security
    filename = file.filename 

    top_line_text = ""
    schoolName = "" # Initialize schoolName
    
    # Initialize df_csv and the CSV data string to be sent to frontend/saved
    df_csv = pd.DataFrame()
    processed_csv_output_string = ""
    
    try:
        with pdfplumber.open(file.stream) as pdf:
            # 1. Extract the "single line of text at the top" from the first page
            if len(pdf.pages) > 0:
                first_page = pdf.pages[0]
                page_text_content = first_page.extract_text(x_tolerance=2, y_tolerance=2)
                if page_text_content:
                    lines = page_text_content.split('\n')
                    for line in lines:
                        if line.strip():
                            top_line_text = line.strip()
                            # Attempt to extract school name (second word of the top line)
                            words_in_top_line = top_line_text.split()
                            if len(words_in_top_line) > 1:
                                schoolName = words_in_top_line[1]
                            else:
                                print(f"Warning: Could not extract school name (second word) from top line: '{top_line_text}'")
                            break # Found the first non-empty line
            
            # 2. Extract table(s) from all pages
            all_table_rows = [] # This will be a list of lists
            for i, page in enumerate(pdf.pages):
                tables_on_page = page.extract_tables(table_settings={
                    "vertical_strategy": "lines_strict",
                    "horizontal_strategy": "lines_strict",
                    "snap_tolerance": 5,
                    "join_tolerance": 5,
                    "keep_blank_chars": True,
                })
                
                if tables_on_page:
                    for table_data in tables_on_page:
                        if table_data: # table_data is a list of rows (which are lists of cells)
                            all_table_rows.extend(table_data)

            # 3. Process extracted table data with Pandas
            if all_table_rows:
                # Assume the first row extracted by pdfplumber for a table is the header
                pdf_headers = all_table_rows[0] if all_table_rows else []
                pdf_data_values = all_table_rows[1:] if len(all_table_rows) > 1 else []

                if pdf_data_values and pdf_headers: # Proceed only if there's data and headers
                    source_df = pd.DataFrame(pdf_data_values, columns=pdf_headers)
                    
                    # Define final column names based on user's logic
                    final_column_names = ['Student','Division','No Team ID','Team']
                    match selected_option:
                        case "Invitational":
                            final_column_names.append('Open Test')
                        case "State":
                            final_column_names.append('Topic 1')
                            final_column_names.append('Topic 2')
                    
                    # Create the target DataFrame with the correct columns
                    df_csv = pd.DataFrame(columns=final_column_names)

                    # Populate 'Student' column: "LastName, FirstName" -> "FirstName LastName"
                    # Adjust 'Student_PDF_Col_Name' if the column name in your PDF is different
                    student_pdf_col_name = 'Student' # Or 'Name', etc., based on your PDF
                    if student_pdf_col_name in source_df.columns:
                        df_csv['Student'] = source_df[student_pdf_col_name].apply(
                            lambda x: f"{x.split(',')[1].strip()} {x.split(',')[0].strip()}" 
                            if pd.notna(x) and isinstance(x, str) and ',' in x and len(x.split(',')) > 1 
                            else x
                        )
                    else:
                        df_csv['Student'] = pd.NA
                        print(f"Warning: Column '{student_pdf_col_name}' for student names not found in PDF table.")

                    # Populate 'Division'
                    division_pdf_col_name = 'Division' # Adjust if necessary
                    if division_pdf_col_name in source_df.columns:
                        df_csv['Division'] = source_df[division_pdf_col_name]
                    else:
                        df_csv['Division'] = pd.NA
                        print(f"Warning: Column '{division_pdf_col_name}' for division not found in PDF table.")

                    # Populate 'No Team ID'
                    no_team_id_pdf_col_name = None
                    possible_no_team_id_names = ['No Team ID', 'No Team Id', 'Team ID', 'Team Id', 'ID'] # Be flexible
                    for name_candidate in possible_no_team_id_names:
                        if name_candidate in source_df.columns:
                            no_team_id_pdf_col_name = name_candidate
                            break
                    if no_team_id_pdf_col_name:
                        df_csv['No Team ID'] = source_df[no_team_id_pdf_col_name]
                    else:
                        df_csv['No Team ID'] = pd.NA
                        print(f"Warning: Column for 'No Team ID' not found in PDF table (tried {possible_no_team_id_names}).")
                    
                    df_csv['Team'] = 0 # As per your logic

                    # Ensure option-specific columns exist and fill with a default (e.g., empty string or pd.NA)
                    for col in final_column_names:
                        if col not in df_csv.columns: # This should not happen if df_csv initialized with final_column_names
                            df_csv[col] = pd.NA # Or ""
                        elif col not in ['Student', 'Division', 'No Team ID', 'Team'] and df_csv[col].isnull().all():
                            # For optional columns that were not populated from source_df
                            df_csv[col] = pd.NA # Or ""

                    # Convert the processed DataFrame to CSV string for frontend
                    if not df_csv.empty:
                        processed_csv_output_string = df_csv.to_csv(index=False)

                        # Save the processed df_csv to a file
                        base_pdf_filename, _ = os.path.splitext(filename)
                        safe_school_name = "".join(c if c.isalnum() else "_" for c in schoolName) if schoolName else "UnknownSchool"
                        safe_option = "".join(c if c.isalnum() else "_" for c in selected_option)
                        
                        new_csv_filename = f"{base_pdf_filename}_{safe_school_name}_{safe_option}.csv"
                        csv_save_path = os.path.join(OUTPUT_CSVS_FOLDER, new_csv_filename)
                        try:
                            df_csv.to_csv(csv_save_path, index=False, encoding='utf-8')
                            print(f"Successfully saved processed CSV to: {csv_save_path}")
                        except Exception as e_save:
                            print(f"Error saving processed CSV file '{csv_save_path}': {str(e_save)}")
                    else:
                        print("Processed DataFrame (df_csv) is empty. Nothing to save or send as CSV string.")
                else:
                    print("No data rows extracted from PDF table or headers missing.")
            else:
                print("No table data extracted from PDF by pdfplumber.")

        print(f"Extracted top line: '{top_line_text}'")
        print(f"Extracted schoolName: '{schoolName}'")

        return jsonify({
            'message': 'PDF processed. Extracted text and table data. Processed CSV file saved on server.',
            'filename': filename, # Original PDF filename
            'option': selected_option,
            'school_name': schoolName, # Key name from your latest code
            'csv_data': processed_csv_output_string # CSV string from the processed DataFrame
        }), 200

    except Exception as e_process:
        import traceback
        print(f"Error processing PDF '{filename}': {str(e_process)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error processing PDF. Check server logs. Details: {str(e_process)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
