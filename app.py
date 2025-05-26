from flask import Flask, request, jsonify
from flask_cors import CORS # For handling Cross-Origin Resource Sharing
import os # For saving files, if needed

# Initialize the Flask application
app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing requests from your frontend

# Define the directory to save uploaded files (optional)
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/create-sheet', methods=['POST'])
def create_sheet_handler():
    """
    Handles the PDF file upload and option selection.
    For now, it just acknowledges receipt.
    Later, it will process the PDF and generate a CSV.
    """
    if 'pdfFile' not in request.files:
        return jsonify({'error': 'No PDF file part in the request'}), 400
    
    file = request.files['pdfFile']
    
    if file.filename == '':
        return jsonify({'error': 'No PDF file selected'}), 400
        
    if 'option' not in request.form:
        return jsonify({'error': 'No option selected in the request'}), 400
        
    selected_option = request.form['option']

    if file: # Basic check if file exists
        filename = file.filename # In a real app, use secure_filename
        
        # Optional: Save the uploaded file
        # file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        # try:
        #     file.save(file_path)
        # except Exception as e:
        #     return jsonify({'error': f'Could not save file: {str(e)}'}), 500

        print(f"Received PDF: {filename}, Option: {selected_option}") # Server-side log

        # --- Placeholder for PDF Processing & CSV Generation ---
        # Here, you would add your Python logic to:
        # 1. Read and parse the content of `file` (the PDF).
        # 2. Use `selected_option` to determine how to process it.
        # 3. Generate CSV data based on the PDF content and option.
        #
        # For demonstration, let's imagine it produces some CSV data as a string:
        # (Replace this with your actual PDF processing logic)
        
        generated_csv_data = ""
        if selected_option == "invitational":
            # Example: Dummy CSV data for invitational
            generated_csv_data = "HeaderA,HeaderB,HeaderC\nVal1,Val2,Val3\nVal4,Val5,Val6"
        elif selected_option == "regional":
            # Example: Dummy CSV data for regional
            generated_csv_data = "RegHeaderX,RegHeaderY\nRegData1,RegData2"
        else: # state or other
            generated_csv_data = "StateInfo1,StateInfo2,StateInfo3\nS1,S2,S3\nS4,S5,S6"

        # --- End Placeholder ---

        return jsonify({
            'message': 'File and option received successfully by Python backend.',
            'filename': filename,
            'option': selected_option,
            'csv_data': generated_csv_data # Send the generated CSV data back
        }), 200

    return jsonify({'error': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    # Runs the Flask app on http://127.0.0.1:5000/
    # Use debug=True for development (auto-reloads on code changes)
    # In a production environment, use a proper WSGI server like Gunicorn or Waitress.
    app.run(host='0.0.0.0', port=5000, debug=True)
