import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { ArrowLeft, Save, Send, Upload, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

const ExperimentForm = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [methodology, setMethodology] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  // Status & UI
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileValidationError, setFileValidationError] = useState('');

  useEffect(() => {
    if (editId) {
      const fetchDraft = async () => {
        try {
          setFetchLoading(true);
          const response = await API.get(`/experiments/${editId}`);
          if (response.data?.success) {
            const exp = response.data.data;
            setTitle(exp.title);
            setHypothesis(exp.hypothesis);
            setMethodology(exp.methodology);
            setExpectedOutcome(exp.expectedOutcome);
            setTags(exp.tags.join(', '));
            if (exp.fileUrl) {
              setFileName(exp.fileUrl.split('/').pop());
            }
          }
        } catch (err) {
          setError('Failed to fetch the draft details');
        } finally {
          setFetchLoading(false);
        }
      };
      fetchDraft();
    }
  }, [editId]);

  const handleFileChange = (e) => {
    setFileValidationError('');
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate type (PDF only)
    if (selectedFile.type !== 'application/pdf') {
      setFileValidationError('File must be a PDF document.');
      setFile(null);
      setFileName('');
      return;
    }

    // Validate size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFileValidationError('File size exceeds the 5MB limit.');
      setFile(null);
      setFileName('');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleSave = async (statusType) => {
    setError('');
    if (!title || !hypothesis || !methodology || !expectedOutcome) {
      setError('Title, Hypothesis, Methodology, and Expected Outcome are required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('hypothesis', hypothesis);
    formData.append('methodology', methodology);
    formData.append('expectedOutcome', expectedOutcome);
    formData.append('tags', tags);
    formData.append('status', statusType); // 'Draft' or 'Pending'
    if (file) {
      formData.append('file', file);
    }

    try {
      setLoading(true);
      let response;

      if (editId) {
        // Updating existing draft
        response = await API.patch(`/experiments/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Submitting new experiment
        response = await API.post('/experiments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (response.data?.success) {
        navigate('/dashboard');
      } else {
        setError(response.data?.message || 'Submission failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="h-12 w-12 border-4 border-scifi-violet border-t-transparent rounded-full animate-spin shadow-violet-glow mb-4" />
        <p className="text-gray-400 font-mono text-sm uppercase tracking-wider animate-pulse">Querying Quantum Database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Return button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm font-mono uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4" /> Return to Dashboard
      </button>

      {/* Form Card */}
      <div className="glass-panel-glow rounded-2xl p-8 shadow-cyan-glow">
        
        <div className="border-b border-white/5 pb-5 mb-6">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">
            {editId ? 'Modify Research Draft' : 'Submit Anti-Gravity Proposal'}
          </h1>
          <p className="text-[10px] text-scifi-cyan font-mono uppercase tracking-widest mt-1">
            // DOCUMENT REGISTRATION NODE
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-scifi-red/10 border border-scifi-red/35 text-scifi-red rounded-xl flex items-start gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-mono text-xs uppercase tracking-wider">Proposal Blocked</p>
              <p className="text-xs opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Research Title
            </label>
            <input
              type="text"
              placeholder="e.g. Dynamic Casimir Cavities for Gravitational Metric Repulsion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-sm"
              required
            />
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Experiment Hypothesis
            </label>
            <textarea
              rows={4}
              placeholder="State your physical hypothesis. Define the mechanics of local gravitation modification..."
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              className="w-full px-4 py-3 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-sm font-sans"
              required
            />
          </div>

          {/* Methodology */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Experimental Methodology
            </label>
            <textarea
              rows={5}
              placeholder="Detail your equipment, cryogenic setup, laser measurements, and experimental progression..."
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              className="w-full px-4 py-3 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-sm font-sans"
              required
            />
          </div>

          {/* Expected Outcome */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Expected Outcome
            </label>
            <textarea
              rows={3}
              placeholder="What measurable gravitational deviation (in micro-g) or potential energy offset do you project?"
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              className="w-full px-4 py-3 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-sm font-sans"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Search Tags (Comma-Separated)
            </label>
            <input
              type="text"
              placeholder="e.g. quantum, casimir, superconducting, metric-shielding"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-sm font-mono"
            />
          </div>

          {/* PDF File Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">
              Attach Formal Research PDF (Optional, Max 5MB)
            </label>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex items-center gap-2 px-5 py-3 bg-scifi-darkest/80 hover:bg-gray-800 border border-white/10 hover:border-scifi-cyan rounded-xl text-gray-300 hover:text-white cursor-pointer transition-all duration-300 text-sm font-semibold">
                <Upload className="h-4 w-4 text-scifi-cyan" />
                Upload PDF File
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {fileName ? (
                <div className="flex items-center gap-2 text-scifi-cyan text-sm font-mono border border-scifi-cyan/30 bg-scifi-cyan/5 px-3 py-1.5 rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                  <ShieldCheck className="h-4 w-4 text-scifi-green" />
                </div>
              ) : (
                <span className="text-xs text-gray-500 font-mono">No document attachment uploaded</span>
              )}
            </div>

            {fileValidationError && (
              <p className="text-scifi-red text-xs mt-2 font-mono flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {fileValidationError}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => handleSave('Draft')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 px-6 border border-white/10 hover:border-white/30 bg-scifi-dark bg-opacity-40 text-gray-300 hover:text-white font-bold rounded-xl transition-all text-sm"
            >
              <Save className="h-4 w-4" />
              Save Proposal Draft
            </button>
            
            <button
              onClick={() => handleSave('Pending')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-scifi-violet to-scifi-cyan hover:from-scifi-violet/90 hover:to-scifi-cyan/90 text-white font-bold rounded-xl shadow-cyan-glow hover:shadow-cyan-glow-intense transition-all hover:scale-102 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit to Lead Scientists
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExperimentForm;
