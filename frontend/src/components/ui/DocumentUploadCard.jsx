import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Image } from 'lucide-react';

const DocumentUploadCard = ({
  label,
  fieldName,
  accept = '.pdf',
  hint = 'PDF only, max 2MB',
  value,          // existing URL
  onChange,       // (fieldName, file) => void
}) => {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(!!value);
  const inputRef = useRef();

  const isPhotoField = fieldName === 'photo';

  const validateFile = (file) => {
    if (!file) return 'No file selected.';

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) return 'File size exceeds 2MB.';

    const ext = file.name.split('.').pop().toLowerCase();
    if (isPhotoField && !['jpg', 'jpeg', 'png'].includes(ext)) {
      return 'Photo must be JPG or PNG.';
    }
    if (!isPhotoField && ext !== 'pdf') {
      return 'Only PDF files are accepted.';
    }
    return '';
  };

  const handleFile = (file) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setUploaded(true);

    if (isPhotoField) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(file.name);
    }

    onChange && onChange(fieldName, file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setUploaded(false);
    setError('');
    onChange && onChange(fieldName, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <p className="text-xs text-gray-400">{hint}</p>

      {uploaded && !error ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          {isPhotoField && preview ? (
            <img src={preview} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700 truncate">{preview || 'File uploaded'}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-500 transition-colors ml-auto flex-shrink-0"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          {isPhotoField ? (
            <Image className="h-8 w-8 opacity-50" />
          ) : (
            <Upload className="h-8 w-8 opacity-50" />
          )}
          <p className="text-sm font-medium">
            Drag & drop or <span className="text-primary underline">browse</span>
          </p>
          <p className="text-xs opacity-60">{isPhotoField ? 'JPG, PNG' : 'PDF'} • Max 2MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={isPhotoField ? 'image/jpeg,image/png' : 'application/pdf'}
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-600 text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {!uploaded && value && (
        <p className="text-xs text-gray-400">
          Current: <a href={`http://localhost:5000${value}`} target="_blank" rel="noreferrer" className="text-primary underline">View uploaded file</a>
        </p>
      )}
    </div>
  );
};

export default DocumentUploadCard;
