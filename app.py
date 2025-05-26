from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pdfplumber # For PDF processing
import io         # For creating in-memory text streams (for CSV)
import csv        # For writing CSV data

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
    # For security, it's good practice to secure the filename
    # from werkzeug.utils import secure_filename
    # filename = secure_filename(file.filename)
    filename = file.filename 

    top_line_text = ""
    generated_csv_data = ""
    
    try:
        # Process the PDF file stream directly with pdfplumber
        # file.stream.seek(0) # Ensure stream is at the beginning if read before

        with pdfplumber.open(file.stream) as pdf:
            # 1. Extract the "single line of text at the top" from the first page
            if len(pdf.pages) > 0:
                first_page = pdf.pages[0]
                # Extract text; x_tolerance helps group nearby characters, y_tolerance for lines
                # This extracts all text, then we find the first non-empty line.
                page_text_content = first_page.extract_text(x_tolerance=2, y_tolerance=2)
                if page_text_content:
                    lines = page_text_content.split('\n')
                    for line in lines:
                        if line.strip(): # Get the first non-empty line
                            top_line_text = line.strip()
                            break 
            
            # 2. Extract table(s) from all pages and convert to CSV
            all_table_rows = []
            for i, page in enumerate(pdf.pages):
                # extract_tables can find multiple tables per page.
                # You might need to tune "vertical_strategy" and "horizontal_strategy"
                # "lines" is good if tables have visible borders. "text" can be used otherwise.
                tables_on_page = page.extract_tables(table_settings={
                    "vertical_strategy": "lines_strict", # or "text", "lines"
                    "horizontal_strategy": "lines_strict", # or "text", "lines"
                    "snap_tolerance": 5,             # How close a char has to be to a line to be part of it
                    "join_tolerance": 5,             # How close words have to be to be joined
                    "keep_blank_chars": True,
                    # "text_x_tolerance": 2,        # if using text strategy
                    # "text_y_tolerance": 2,        # if using text strategy
                })
                
                if tables_on_page:
                    for table_index, table_data in enumerate(tables_on_page):
                        if table_data: # Ensure table_data is not empty
                            # For multi-page tables:
                            # If this is not the first page AND we already have rows AND
                            # the current table looks like it has a header similar to our first table,
                            # we might want to skip its header. This is a heuristic.
                            # A simpler approach for now: append all rows from all tables found.
                            # If your tables have headers only on the first page of the *table content*,
                            # you'll need more sophisticated logic to identify and handle headers across pages.
                            
                            # Simple concatenation of all rows from all detected tables:
                            all_table_rows.extend(table_data)

            if all_table_rows:
                # Convert list of lists (table data) to a CSV formatted string
                output = io.StringIO()
                csv_writer = csv.writer(output)
                csv_writer.writerows(all_table_rows)
                generated_csv_data = output.getvalue()
                output.close()

        school_name = (top_line_text).split()[1]

        column_names = ['Student','Division','No Team ID','Team']

        match selected_option:
            case "Invitational":
                column_names.append('Open Test')
            case "State":
                column_names.append('Topic 1')
                column_names.append('Topic 2')

        df_csv = pd.DataFrame(columns=column_names)  

        df_csv['Student'] = (generated_csv_data['Student'].split(",")[1] + " " +
        generated_csv_data['Student'].split(",")[0])

        df_csv['Division'] = generated_csv_data['Division']

        df_csv['No Team ID'] = generated_csv_data['No Team ID']

        df_csv['Team'] = 0

        return jsonify({
            'message': 'PDF processed successfully. Extracted text and table data.',
            'filename': filename,
            'option': selected_option,
            'school_name': school_name,    # New field for the extracted top line
            'csv_data': generated_csv_data     # CSV data as a string
        }), 200

    except Exception as e:
        # Log the full error server-side for debugging
        import traceback
        print(f"Error processing PDF '{filename}': {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error processing PDF. Check server logs. Details: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
