import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScanProducts.css';
import SubHeading from '../../../components/general_components/headings/SubHeading';
import { toast } from 'react-toastify';
import FieldError from '../../../components/FieldError';
import scanApi from '../../../services/scanApi';

function ScanProducts() {
  // Task 2: Refactor upload state to multi-file-ready model
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const storedHistory = localStorage.getItem('uploadHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const handleFileUploadChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Keep support for single-image while allowing multi-image in state
      setUploadedFiles(files);
      setError(null);
      setTouched(true);
    }
  };

  const handleImageUpload = async () => {
    if (uploadedFiles.length === 0) {
      setError("Please select at least one image.");
      setTouched(true);
      return;
    }

    // Task 5: Add UI states: submitting/loading, disable button
    setIsSubmitting(true);
    setError(null);

    try {
      // Task 1 & 3: Use centralized service and request builder
      // Currently using single file upload (isMulti = false) for backward compatibility
      const result = await scanApi.uploadForAnalysis(uploadedFiles, false);

      // Task 4: Use normalized response
      const prediction = result.prediction;

      // Update history in localStorage
      const newEntry = {
        time: new Date().toLocaleString(),
        imageName: uploadedFiles[0].name,
        prediction: prediction,
      };
      
      const updatedHistory = [...history, newEntry];
      setHistory(updatedHistory);
      localStorage.setItem('uploadHistory', JSON.stringify(updatedHistory));

      // Task 6: Fix post-upload navigation
      toast.success(`Classification successful: ${prediction}`);
      navigate(`/food-details/${prediction}`);
      
    } catch (err) {
      // Task 5: Handle backend and network errors
      console.error('Error classifying image:', err);
      const errorMessage = err.message || 'An error occurred during classification.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = () => {
    navigate('/upload-history');
  };

  const handleRetry = () => {
    handleImageUpload();
  };

  // Helper to get first file for display
  const primaryFile = uploadedFiles[0];

  return (
    <div>
      <div className="scan-products-container">
        <h1>Upload a Photo</h1>
        <div className="scan-products-form">
          <label className="scan-products-label" htmlFor="file-upload">Image</label>
          <div 
            className={`upload-section ${error && touched ? 'error-border' : ''} ${isSubmitting ? 'upload-disabled' : ''}`} 
            onClick={() => !isSubmitting && fileInputRef.current?.click()} 
            style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            <p>{isSubmitting ? 'Uploading...' : 'Click to Upload Image'}</p>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              onChange={handleFileUploadChange}
              style={{ display: 'none' }}
              disabled={isSubmitting}
              accept="image/*"
              multiple
            />
            {uploadedFiles.length > 0 && (
              <p className="file-name">
                {uploadedFiles.length === 1 
                  ? `Image added: ${primaryFile.name}`
                  : `${uploadedFiles.length} images selected`}
              </p>
            )}
          </div>
          <FieldError error={error} touched={touched} />
        </div>

        {/* Task 5: Submit button with loading state */}
        <button 
          className="upload-button" 
          onClick={handleImageUpload}
          disabled={isSubmitting || uploadedFiles.length === 0}
        >
          {isSubmitting ? 'Processing...' : 'Analyze Image'}
        </button>

        {/* Task 5: Retry button on failure */}
        {error && !isSubmitting && uploadedFiles.length > 0 && (
          <button className="retry-button" onClick={handleRetry} style={{ marginTop: '10px' }}>
            Retry Upload
          </button>
        )}
      </div>

      <button className="view-history-button" onClick={handleViewHistory} disabled={isSubmitting}>
        View Upload History
      </button>
    </div>
  );
}

export default ScanProducts;