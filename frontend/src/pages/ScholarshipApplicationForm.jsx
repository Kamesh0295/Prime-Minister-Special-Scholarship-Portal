import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProgressSteps from '../components/ui/ProgressSteps';
import DocumentUploadCard from '../components/ui/DocumentUploadCard';
import { showSuccess, showError, showInfo } from '../store/slices/toastSlice';
import { applicationSuccess } from '../store/slices/applicationSlice';
import { profileSuccess } from '../store/slices/profileSlice';
import { getApplication, createApplication, updateApplication, getProfile } from '../services/studentService';
import { uploadDocuments } from '../services/documentService';
import { ChevronRight, ChevronLeft, Save, Send, Eye, Loader2, Sparkles, CheckCircle2, XCircle, Info, Landmark, Lock, User } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

const STEPS = [
  { label: 'Personal' },
  { label: 'Academic' },
  { label: 'Bank' },
  { label: 'Documents' },
  { label: 'Preview' },
];

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const initialPersonal = {
  fullName: '', dateOfBirth: '', gender: '', religion: '', category: '',
  aadhaarNumber: '', phone: '', email: '', permanentAddress: '', state: '', district: '',
  annualIncome: '',
};
const initialAcademic = {
  institutionName: '', institutionAddress: '', courseName: '', yearOfStudy: '',
  rollNumber: '', previousYearMarks: '', boardUniversityName: '',
};
const initialBank = {
  accountHolderName: '', bankName: '', branchName: '', accountNumber: '', ifscCode: '',
};
const initialDocs = {
  aadhaar: null, incomeCertificate: null, casteCertificate: null, marksheet: null,
  bankPassbook: null, bonafide: null, photo: null,
};

const FloatInput = ({ id, name, label, value, onChange, type = 'text', required, maxLength, disabled }) => (
  <div className="form-group">
    <input
      type={type} id={id} name={name} placeholder={label}
      value={value} onChange={onChange} className="form-input"
      required={required} maxLength={maxLength} disabled={disabled}
    />
    <label htmlFor={id} className="form-label">{label}{required ? ' *' : ''}</label>
  </div>
);

const SelectField = ({ id, name, label, value, onChange, options, required, disabled }) => (
  <div>
    <label htmlFor={id} className="text-xs font-medium text-gray-600 mb-1 block">{label}{required ? ' *' : ''}</label>
    <select id={id} name={name} value={value} onChange={onChange} className="form-select" disabled={disabled}>
      <option value="">Select {label}</option>
      {options.map((o) => (
        <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
  </div>
);

const ScholarshipApplicationForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, token } = useSelector((s) => s.auth);
  const { application } = useSelector((s) => s.application);

  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState(initialPersonal);
  const [academic, setAcademic] = useState(initialAcademic);
  const [bank, setBank]     = useState(initialBank);
  const [docs, setDocs]     = useState(initialDocs);
  const [appId, setAppId]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState({});
  const [ocrData, setOcrData] = useState(null);

  // Student Profile Integration State
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch Student Profile status
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const res = await getProfile();
        if (res.data.success) {
          // Verify if profile exists and has been created
          if (res.data.exists) {
            setProfile(res.data.data);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch student profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchStudentProfile();
  }, []);

  // Pre-fill from student profile when loaded
  useEffect(() => {
    if (profile && (profile.completionPercentage || 0) >= 80) {
      setPersonal((p) => ({
        ...p,
        fullName: profile.fullName || '',
        dateOfBirth: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
        gender: profile.gender || '',
        aadhaarNumber: profile.aadhaar || '',
        phone: profile.phone || '',
        email: profile.email || '',
        permanentAddress: profile.address?.permanentAddress || '',
        state: profile.address?.state || '',
        district: profile.address?.district || '',
        annualIncome: profile.familyIncome || '',
      }));
      setAcademic((a) => ({
        ...a,
        institutionName: profile.collegeName || '',
        courseName: profile.degree || '',
        yearOfStudy: profile.yearOfStudy || '',
        rollNumber: profile.rollNumber || '',
        previousYearMarks: profile.cgpa || '',
        boardUniversityName: profile.universityName || '',
      }));
      setBank((b) => ({
        ...b,
        accountHolderName: profile.accountHolderName || '',
        bankName: profile.bankName || '',
        branchName: profile.branchName || '',
        accountNumber: profile.accountNumber || '',
        ifscCode: profile.ifscCode || '',
      }));
    }
  }, [profile]);

  // Load draft if exists
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getApplication();
        const app = res.data.data;
        if (app) {
          setAppId(app._id);
          if (app.personalDetails) setPersonal({ ...initialPersonal, ...app.personalDetails });
          if (app.academicDetails) setAcademic({ ...initialAcademic, ...app.academicDetails });
          if (app.bankDetails)     setBank({ ...initialBank, ...app.bankDetails });
          if (app.ocrData)         setOcrData(app.ocrData);
          dispatch(applicationSuccess(app));
        }
      } catch { /* new application */ }
    };
    load();
  }, [dispatch]);

  const handleFieldChange = (setter) => (e) =>
    setter((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleDocChange = (fieldName, file) =>
    setDocs((p) => ({ ...p, [fieldName]: file }));

  // OCR Auto-fill function
  const triggerOCR = async (docType) => {
    setOcrLoading((prev) => ({ ...prev, [docType]: true }));
    dispatch(showInfo(`Scanning ${docType} via AI OCR...`));
    try {
      const res = await axios.post(
        'http://localhost:5000/api/ai/ocr',
        { documentType: docType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const data = res.data.data;
        dispatch(showSuccess(`Extracted details from ${docType} successfully!`));

        if (docType === 'aadhaar') {
          setPersonal((p) => ({
            ...p,
            aadhaarNumber: data.aadhaarNumber || p.aadhaarNumber,
            fullName: data.fullName || p.fullName,
            dateOfBirth: data.dateOfBirth || p.dateOfBirth,
          }));
          setOcrData((o) => ({ ...o, aadhaarNumber: data.aadhaarNumber, fullName: data.fullName, dateOfBirth: data.dateOfBirth }));
        } else if (docType === 'marksheet') {
          setAcademic((a) => ({
            ...a,
            rollNumber: data.rollNumber || a.rollNumber,
            previousYearMarks: data.previousYearMarks || a.previousYearMarks,
            boardUniversityName: data.boardName || a.boardUniversityName,
          }));
          setOcrData((o) => ({ ...o, previousYearMarks: data.previousYearMarks }));
        } else if (docType === 'bankPassbook') {
          setBank((b) => ({
            ...b,
            accountHolderName: data.accountHolderName || b.accountHolderName,
            bankName: data.bankName || b.bankName,
            branchName: data.branchName || b.branchName,
            accountNumber: data.accountNumber || b.accountNumber,
            ifscCode: data.ifscCode || b.ifscCode,
          }));
          setOcrData((o) => ({ ...o, bankAccountNumber: data.accountNumber, bankIfscCode: data.ifscCode }));
        } else if (docType === 'incomeCertificate') {
          setPersonal((p) => ({
            ...p,
            annualIncome: data.annualIncome || p.annualIncome,
          }));
          setOcrData((o) => ({ ...o, income: data.annualIncome }));
        }
      }
    } catch (err) {
      dispatch(showError('OCR failed to read. Please enter details manually.'));
    } finally {
      setOcrLoading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const getCompletionScore = () => {
    let score = 0;
    const personalItems = [personal.fullName, personal.dateOfBirth, personal.gender, personal.category, personal.aadhaarNumber, personal.state, personal.annualIncome];
    const personalCount = personalItems.filter(Boolean).length;
    score += (personalCount / personalItems.length) * 25;

    const academicItems = [academic.institutionName, academic.courseName, academic.yearOfStudy, academic.previousYearMarks];
    const academicCount = academicItems.filter(Boolean).length;
    score += (academicCount / academicItems.length) * 25;

    const bankItems = [bank.accountHolderName, bank.bankName, bank.accountNumber, bank.ifscCode];
    const bankCount = bankItems.filter(Boolean).length;
    score += (bankCount / bankItems.length) * 25;

    const docItems = ['aadhaar', 'incomeCertificate', 'marksheet', 'photo'];
    const uploadedCount = docItems.filter((d) => 
      docs[d] || 
      application?.documents?.[d] || 
      profile?.documents?.[d] || 
      (d === 'photo' && profile?.profilePhoto)
    ).length;
    score += (uploadedCount / docItems.length) * 25;

    return Math.round(score);
  };

  const getEligibility = () => {
    const reasons = [];
    const recommendations = [];
    let status = 'Eligible';

    const income = personal.annualIncome;
    if (income && Number(income) > 800000) {
      status = 'Not Eligible';
      reasons.push('Income exceeds ₹8,00,000 limit.');
      recommendations.push('Consider applying for open/private non-government aid.');
    }

    const marks = academic.previousYearMarks;
    if (marks === undefined || marks === '') {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Marks are required.');
      recommendations.push('Fill in your class 12 or equivalent qualifying marks.');
    } else if (Number(marks) < 50) {
      status = 'Not Eligible';
      reasons.push('Marks are below the minimum 50% cutoff.');
      recommendations.push('A minimum academic score of 50% is required.');
    }

    if (!personal.aadhaarNumber || personal.aadhaarNumber.length < 12) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Aadhaar number is missing/incomplete.');
      recommendations.push('Provide a valid 12-digit Aadhaar Card number.');
    }

    if (!personal.state) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Domicile State missing.');
      recommendations.push('State Domicile is mandatory to verify local bounds.');
    }

    if (status === 'Eligible' && Number(marks) >= 50 && Number(marks) < 60) {
      status = 'Probably Eligible';
      reasons.push('Marks qualify, but allocation is subject to board ranking cutoffs.');
      recommendations.push('Submit your application early to secure rank queue.');
    }

    return { status, reasons, recommendations };
  };

  const buildPayload = (status = 'draft') => ({
    personalDetails: { ...personal, dateOfBirth: personal.dateOfBirth || undefined, annualIncome: personal.annualIncome ? Number(personal.annualIncome) : undefined },
    academicDetails: { ...academic, previousYearMarks: academic.previousYearMarks ? Number(academic.previousYearMarks) : undefined },
    bankDetails: bank,
    ocrData,
    status,
  });

  const saveOrCreate = async (payload) => {
    if (appId) {
      const res = await updateApplication(appId, payload);
      return res.data.data;
    } else {
      const res = await createApplication(payload);
      const app = res.data.data;
      setAppId(app._id);
      return app;
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Refresh database states first
      const appRes = await getApplication();
      const currentApp = appRes.data.data;
      const profileRes = await getProfile();
      const currentProfile = profileRes.data.data;

      const payload = buildPayload('draft');
      payload.documents = {
        aadhaar: currentApp?.documents?.aadhaar || currentProfile?.documents?.aadhaar || '',
        incomeCertificate: currentApp?.documents?.incomeCertificate || currentProfile?.documents?.incomeCertificate || '',
        casteCertificate: currentApp?.documents?.casteCertificate || currentProfile?.documents?.casteCertificate || '',
        marksheet: currentApp?.documents?.marksheet || currentProfile?.documents?.marksheet || '',
        bankPassbook: currentApp?.documents?.bankPassbook || currentProfile?.documents?.bankPassbook || '',
        bonafide: currentApp?.documents?.bonafide || currentProfile?.documents?.bonafide || '',
        photo: currentApp?.documents?.photo || currentProfile?.profilePhoto || currentProfile?.documents?.photo || '',
      };

      const app = await saveOrCreate(payload);
      dispatch(applicationSuccess(app));
      dispatch(showSuccess('Draft saved successfully!'));
    } catch (err) {
      dispatch(showError(err.response?.data?.message || 'Failed to save draft.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 8. Auto-fetch latest profile and application data before submitting to prevent out-of-sync checks
      const profileRes = await getProfile();
      let latestProfile = profile;
      if (profileRes.data.success && profileRes.data.exists) {
        latestProfile = profileRes.data.data;
        setProfile(latestProfile);
        dispatch(profileSuccess({ data: latestProfile, exists: true }));
      }

      const appRes = await getApplication();
      let latestApp = application;
      if (appRes.data.data) {
        latestApp = appRes.data.data;
        setAppId(latestApp._id);
        dispatch(applicationSuccess(latestApp));
      }

      // 4. Validate using profile.documents, application.documents, and local docs state
      const required = ['aadhaar', 'incomeCertificate', 'marksheet', 'photo'];
      
      // 5. Add console logs for debugging
      console.log('[DEBUG] Validating scholarship application documents...');
      console.log('[DEBUG] Local unsaved docs state:', docs);
      console.log('[DEBUG] DB Application documents:', latestApp?.documents);
      console.log('[DEBUG] DB Profile documents:', latestProfile?.documents);
      console.log('[DEBUG] DB Profile profilePhoto:', latestProfile?.profilePhoto);

      const missing = [];
      const validationDetails = {};

      required.forEach((field) => {
        const localVal = docs[field];
        const appVal = latestApp?.documents?.[field];
        const profileVal = field === 'photo'
          ? (latestProfile?.profilePhoto || latestProfile?.documents?.photo)
          : latestProfile?.documents?.[field];

        const exists = localVal || appVal || profileVal;
        validationDetails[field] = {
          exists: !!exists,
          local: localVal ? (localVal.name || 'File Object') : 'empty',
          dbApp: appVal || 'empty',
          dbProfile: profileVal || 'empty',
        };

        if (!exists) {
          missing.push(field);
        }
      });

      console.log('[DEBUG] Document validation results:', validationDetails);

      if (missing.length > 0) {
        // 10. Detailed error message showing exactly what is missing and current values
        const missingDetails = missing.map((field) => {
          const detail = validationDetails[field];
          return `- ${field}: (local: ${detail.local}, application db: ${detail.dbApp}, profile db: ${detail.dbProfile})`;
        }).join('\n');
        
        dispatch(showError(`Please upload all required documents.\nMissing:\n${missingDetails}`));
        setSubmitting(false);
        return;
      }

      // 9. If files exist, upload only newly selected files and submit immediately
      const newFiles = Object.entries(docs).filter(([, v]) => v instanceof File);
      if (newFiles.length > 0) {
        dispatch(showInfo('Uploading documents...'));
        const formData = new FormData();
        newFiles.forEach(([key, file]) => formData.append(key, file));
        const uploadRes = await uploadDocuments(formData);
        
        if (uploadRes.data.success) {
          dispatch(showSuccess('Documents uploaded successfully!'));
          // 3. Refresh profile state after upload
          const refreshedProfileRes = await getProfile();
          if (refreshedProfileRes.data.success && refreshedProfileRes.data.exists) {
            const refreshedProfile = refreshedProfileRes.data.data;
            setProfile(refreshedProfile);
            dispatch(profileSuccess({ data: refreshedProfile, exists: true }));
          }
          const refreshedAppRes = await getApplication();
          if (refreshedAppRes.data.data) {
            dispatch(applicationSuccess(refreshedAppRes.data.data));
          }
        }
      }

      // Re-fetch database states to build final payload
      const finalProfileRes = await getProfile();
      const finalProfile = finalProfileRes.data.data || latestProfile;
      const finalAppRes = await getApplication();
      const finalApp = finalAppRes.data.data || latestApp;

      const payload = buildPayload('submitted');
      payload.documents = {
        aadhaar: finalApp?.documents?.aadhaar || finalProfile?.documents?.aadhaar || '',
        incomeCertificate: finalApp?.documents?.incomeCertificate || finalProfile?.documents?.incomeCertificate || '',
        casteCertificate: finalApp?.documents?.casteCertificate || finalProfile?.documents?.casteCertificate || '',
        marksheet: finalApp?.documents?.marksheet || finalProfile?.documents?.marksheet || '',
        bankPassbook: finalApp?.documents?.bankPassbook || finalProfile?.documents?.bankPassbook || '',
        bonafide: docs.bonafide instanceof File ? '' : (finalApp?.documents?.bonafide || finalProfile?.documents?.bonafide || ''),
        photo: finalApp?.documents?.photo || finalProfile?.profilePhoto || finalProfile?.documents?.photo || '',
      };

      console.log('[DEBUG] Submitting application with payload:', payload);

      const app = await saveOrCreate(payload);
      dispatch(applicationSuccess(app));
      dispatch(showSuccess('Application submitted successfully!'));
      navigate('/dashboard/status');
    } catch (err) {
      console.error('[DEBUG] Submission error:', err);
      dispatch(showError(err.response?.data?.message || 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || (profile.completionPercentage || 0) < 80) {
    const currentPercent = profile ? (profile.completionPercentage || 0) : 0;
    return (
      <DashboardLayout>
        <div className="card p-8 text-center max-w-lg mx-auto mt-12 space-y-6 shadow-card border border-gray-100">
          <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Profile Completion Required</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              A minimum of 80% profile completion is required to apply for scholarships. Currently, your profile completion is at {currentPercent}%. Please complete your profile details (personal, academic, bank, and documents) to proceed.
            </p>
          </div>
          
          <div className="space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
              <span>Profile Status</span>
              <span className="text-amber-600 font-extrabold">{currentPercent}% Complete</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${currentPercent}%` }} />
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard/profile')}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 font-semibold shadow-primary"
          >
            <User className="h-4 w-4 text-white" />
            Complete Profile Now
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isAlreadySubmitted = application && !['draft', 'submitted'].includes(application.status) && application.status;

  if (isAlreadySubmitted) {
    return (
      <DashboardLayout>
        <div className="card p-8 text-center max-w-md mx-auto mt-8">
          <div className="h-16 w-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Application Under Process</h2>
          <p className="text-sm text-gray-500 mb-5">
            Your application is currently <strong>{application.status?.replace('_', ' ')}</strong> and cannot be edited.
          </p>
          <button onClick={() => navigate('/dashboard/status')} className="btn-primary">
            View Status
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const completionPercent = getCompletionScore();
  const eligibility = getEligibility();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-800">{t('apply')}</h1>
              <p className="text-xs text-slate-500 mt-1">Prime Minister Special Scholarship Scheme — Section {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <ProgressSteps steps={STEPS} currentStep={step} />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            
            {/* Step 0: Personal */}
             {step === 0 && (
              <div className="space-y-4">
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 mb-4">
                  <Info className="h-4 w-4 shrink-0" />
                  Basic details are pre-filled and locked from My Profile. To edit, go to the My Profile page.
                </p>

                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('personalDetails')}</h2>
                  
                  {/* OCR trigger is disabled since profile is pre-filled */}
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-fullname" name="fullName" label={t('fullName')} value={personal.fullName} onChange={handleFieldChange(setPersonal)} required disabled={true} />
                  <FloatInput id="p-dob" name="dateOfBirth" label={t('dob')} type="date" value={personal.dateOfBirth} onChange={handleFieldChange(setPersonal)} disabled={true} />
                </div>
 
                <div className="grid sm:grid-cols-3 gap-4">
                  <SelectField id="p-gender" name="gender" label="Gender" value={personal.gender} onChange={handleFieldChange(setPersonal)} options={['Male','Female','Other']} disabled={true} />
                  <FloatInput id="p-religion" name="religion" label="Religion" value={personal.religion} onChange={handleFieldChange(setPersonal)} />
                  <SelectField id="p-category" name="category" label={t('caste')} value={personal.category} onChange={handleFieldChange(setPersonal)} options={['SC','ST','OBC','General']} required />
                </div>
 
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-aadhaar" name="aadhaarNumber" label={t('aadhaar')} value={personal.aadhaarNumber} onChange={handleFieldChange(setPersonal)} maxLength={12} disabled={true} />
                  <FloatInput id="p-phone" name="phone" label={t('phone')} value={personal.phone} onChange={handleFieldChange(setPersonal)} maxLength={10} disabled={true} />
                </div>
 
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-email" name="email" label={t('email')} type="email" value={personal.email} onChange={handleFieldChange(setPersonal)} disabled={true} />
                  <FloatInput id="p-income" name="annualIncome" label={t('income')} type="number" value={personal.annualIncome} onChange={handleFieldChange(setPersonal)} required disabled={true} />
                </div>
 
                <FloatInput id="p-address" name="permanentAddress" label="Permanent Address" value={personal.permanentAddress} onChange={handleFieldChange(setPersonal)} disabled={true} />
 
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField id="p-state" name="state" label={t('state')} value={personal.state} onChange={handleFieldChange(setPersonal)} options={STATES} required disabled={true} />
                  <FloatInput id="p-district" name="district" label={t('district')} value={personal.district} onChange={handleFieldChange(setPersonal)} disabled={true} />
                </div>
              </div>
            )}

            {/* Step 1: Academic */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 mb-4">
                  <Info className="h-4 w-4 shrink-0" />
                  Academic details are pre-filled and locked from My Profile. To edit, go to the My Profile page.
                </p>

                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('academicDetails')}</h2>
                  
                  {/* OCR trigger is disabled since profile is pre-filled */}
                </div>
                
                <FloatInput id="a-inst" name="institutionName" label={t('institution')} value={academic.institutionName} onChange={handleFieldChange(setAcademic)} required disabled={true} />
                <FloatInput id="a-addr" name="institutionAddress" label="Institution Address" value={academic.institutionAddress} onChange={handleFieldChange(setAcademic)} />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="a-course" name="courseName" label={t('course')} value={academic.courseName} onChange={handleFieldChange(setAcademic)} required disabled={true} />
                  <SelectField id="a-year" name="yearOfStudy" label={t('yearOfStudy')} value={academic.yearOfStudy} onChange={handleFieldChange(setAcademic)}
                    options={['1st Year','2nd Year','3rd Year','4th Year','5th Year']} required disabled={true} />
                </div>
 
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="a-roll" name="rollNumber" label={t('rollNumber')} value={academic.rollNumber} onChange={handleFieldChange(setAcademic)} disabled={true} />
                  <FloatInput id="a-marks" name="previousYearMarks" label={t('marks')} type="number" value={academic.previousYearMarks} onChange={handleFieldChange(setAcademic)} disabled={true} />
                </div>
 
                <FloatInput id="a-uni" name="boardUniversityName" label="Board / University Name" value={academic.boardUniversityName} onChange={handleFieldChange(setAcademic)} required disabled={true} />
              </div>
            )}

            {/* Step 2: Bank */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 mb-4">
                  <Info className="h-4 w-4 shrink-0" />
                  Bank details are pre-filled and locked from My Profile. To edit, go to the My Profile page.
                </p>

                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('bankDetails')}</h2>
                  
                  {/* OCR trigger is disabled since profile is pre-filled */}
                </div>
                
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
                  <Landmark className="w-4 h-4 shrink-0 text-amber-500" />
                  Ensure bank accounts are active and seeded with your Aadhaar for Direct Benefit Transfer (DBT).
                </p>

                <FloatInput id="b-holder" name="accountHolderName" label="Account Holder Name" value={bank.accountHolderName} onChange={handleFieldChange(setBank)} required disabled={true} />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="b-bank" name="bankName" label={t('bankName')} value={bank.bankName} onChange={handleFieldChange(setBank)} required disabled={true} />
                  <FloatInput id="b-branch" name="branchName" label="Branch Name" value={bank.branchName} onChange={handleFieldChange(setBank)} disabled={true} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="b-acc" name="accountNumber" label={t('accNo')} value={bank.accountNumber} onChange={handleFieldChange(setBank)} required disabled={true} />
                  <FloatInput id="b-ifsc" name="ifscCode" label={t('ifsc')} value={bank.ifscCode} onChange={handleFieldChange(setBank)} required disabled={true} />
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5 mb-4">
                  <Info className="h-4 w-4 shrink-0" />
                  Profile documents are pre-filled and locked from My Profile. To edit, go to the My Profile page.
                </p>

                <h2 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 uppercase tracking-wide">{t('documents')}</h2>
                <p className="text-[11px] text-slate-400">All certificates must be uploaded as legible PDFs (max 2MB). Photo should be JPG/PNG format.</p>
                
                <div className="grid sm:grid-cols-2 gap-5">
                  <DocumentUploadCard
                    label="Aadhaar Card *" fieldName="aadhaar" hint="PDF only, max 2MB"
                    value={application?.documents?.aadhaar || profile?.documents?.aadhaar} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.aadhaar?.status || profile?.documentStatuses?.aadhaar?.status}
                    remarks={application?.documentStatuses?.aadhaar?.remarks || profile?.documentStatuses?.aadhaar?.remarks}
                  />
                  <DocumentUploadCard
                    label="Income Certificate *" fieldName="incomeCertificate" hint="PDF only, max 2MB"
                    value={application?.documents?.incomeCertificate || profile?.documents?.incomeCertificate} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.incomeCertificate?.status || profile?.documentStatuses?.incomeCertificate?.status}
                    remarks={application?.documentStatuses?.incomeCertificate?.remarks || profile?.documentStatuses?.incomeCertificate?.remarks}
                  />
                  <DocumentUploadCard
                    label="Caste Certificate (if applicable)" fieldName="casteCertificate" hint="PDF only, max 2MB"
                    value={application?.documents?.casteCertificate || profile?.documents?.casteCertificate} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.casteCertificate?.status || profile?.documentStatuses?.casteCertificate?.status}
                    remarks={application?.documentStatuses?.casteCertificate?.remarks || profile?.documentStatuses?.casteCertificate?.remarks}
                  />
                  <DocumentUploadCard
                    label="Class 12 / Qualifying Marksheet *" fieldName="marksheet" hint="PDF only, max 2MB"
                    value={application?.documents?.marksheet || profile?.documents?.marksheet} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.marksheet?.status || profile?.documentStatuses?.marksheet?.status}
                    remarks={application?.documentStatuses?.marksheet?.remarks || profile?.documentStatuses?.marksheet?.remarks}
                  />
                  <DocumentUploadCard
                    label="Bank Passbook / Cancelled Cheque" fieldName="bankPassbook" hint="PDF only, max 2MB"
                    value={application?.documents?.bankPassbook || profile?.documents?.bankPassbook} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.bankPassbook?.status || profile?.documentStatuses?.bankPassbook?.status}
                    remarks={application?.documentStatuses?.bankPassbook?.remarks || profile?.documentStatuses?.bankPassbook?.remarks}
                  />
                  <DocumentUploadCard
                    label="Bonafide Certificate from College" fieldName="bonafide" hint="PDF only, max 2MB"
                    value={application?.documents?.bonafide} onChange={handleDocChange}
                    status={application?.documentStatuses?.bonafide?.status}
                    remarks={application?.documentStatuses?.bonafide?.remarks}
                  />
                  <DocumentUploadCard
                    label="Passport Size Photo *" fieldName="photo" hint="JPG/PNG, max 2MB" accept=".jpg,.jpeg,.png"
                    value={application?.documents?.photo || profile?.profilePhoto} onChange={handleDocChange} readOnly={true}
                    status={application?.documentStatuses?.photo?.status || profile?.documentStatuses?.photo?.status}
                    remarks={application?.documentStatuses?.photo?.remarks || profile?.documentStatuses?.photo?.remarks}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Preview */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wide">{t('previewSubmit')}</h2>
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  Review all details carefully. Mismatches detected by the Nodal Officers will cause delay or rejection.
                </p>

                {[
                  { title: t('personalDetails'), data: personal },
                  { title: t('academicDetails'), data: academic },
                  { title: t('bankDetails'),     data: bank },
                ].map(({ title, data }) => (
                  <div key={title} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50/70 px-4 py-2.5 border-b">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-50 bg-white">
                      {Object.entries(data).filter(([,v]) => v !== undefined && v !== '').map(([k, v]) => (
                        <div key={k} className="px-4 py-3 border-b border-slate-50/50">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{k.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{k === 'annualIncome' ? `₹${Number(v).toLocaleString()}` : v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <button
              onClick={() => step > 0 ? setStep((s) => s - 1) : navigate('/dashboard')}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Dashboard' : 'Previous'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 border hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-400" />}
                {t('saveDraft')}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t('submit')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Profile score card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('profileCompletion')}</h3>
              <span className="text-xs font-black text-blue-600">{completionPercent}%</span>
            </div>
            
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              ></div>
            </div>

            <div className="pt-2 text-[10px] space-y-1.5 text-slate-500 font-medium">
              <div className="flex justify-between">
                <span>Personal Fields:</span>
                <span className={personal.fullName && personal.category && personal.state ? 'text-green-600 font-bold' : ''}>
                  {personal.fullName && personal.category && personal.state ? '✓ Done' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Academic Fields:</span>
                <span className={academic.institutionName && academic.courseName && academic.previousYearMarks ? 'text-green-600 font-bold' : ''}>
                  {academic.institutionName && academic.courseName && academic.previousYearMarks ? '✓ Done' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bank Details:</span>
                <span className={bank.accountNumber && bank.ifscCode ? 'text-green-600 font-bold' : ''}>
                  {bank.accountNumber && bank.ifscCode ? '✓ Seeded' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uploaded Certificates:</span>
                <span className={docs.marksheet || application?.documents?.marksheet ? 'text-green-600 font-bold' : ''}>
                  {docs.marksheet || application?.documents?.marksheet ? '✓ Uploaded' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Eligibility Panel */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {t('eligibilityCheck')}
            </h3>

            {/* Overall Status Banner */}
            <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 ${
              eligibility.status === 'Eligible' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
              eligibility.status === 'Probably Eligible' ? 'bg-orange-50 text-orange-800 border border-orange-100' :
              eligibility.status === 'Not Eligible' ? 'bg-red-50 text-red-800 border border-red-100' :
              'bg-slate-50 text-slate-600 border'
            }`}>
              {eligibility.status === 'Eligible' || eligibility.status === 'Probably Eligible' ? (
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${eligibility.status === 'Eligible' ? 'text-emerald-600' : 'text-orange-500'}`} />
              ) : eligibility.status === 'Not Eligible' ? (
                <XCircle className="w-5 h-5 shrink-0 text-red-600" />
              ) : (
                <Info className="w-5 h-5 shrink-0 text-slate-400" />
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide">Status Estimate</p>
                <p className="text-xs font-black mt-0.5">{eligibility.status}</p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 text-xs font-medium">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Annual Income limit:</span>
                {personal.annualIncome ? (
                  Number(personal.annualIncome) <= 800000 ? (
                    <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> ₹{Number(personal.annualIncome).toLocaleString()}</span>
                  ) : (
                    <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Exceeded</span>
                  )
                ) : (
                  <span className="text-slate-400">Blank</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Qualifying Marks (50%):</span>
                {academic.previousYearMarks ? (
                  Number(academic.previousYearMarks) >= 50 ? (
                    <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {academic.previousYearMarks}%</span>
                  ) : (
                    <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed Cutoff</span>
                  )
                ) : (
                  <span className="text-slate-400">Blank</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Aadhaar Filled:</span>
                {personal.aadhaarNumber && personal.aadhaarNumber.length === 12 ? (
                  <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                ) : (
                  <span className="text-red-500 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Incomplete</span>
                )}
              </div>
            </div>

            {/* Reasons/Recs */}
            {eligibility.reasons.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 space-y-2">
                <div>
                  <p className="font-bold text-slate-700 uppercase">Reasons:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1 font-medium">
                    {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                {eligibility.recommendations.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 uppercase">Action Advice:</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 font-medium text-blue-600">
                      {eligibility.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScholarshipApplicationForm;
