import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
import ProgressSteps from '../components/ui/ProgressSteps';
import DocumentUploadCard from '../components/ui/DocumentUploadCard';
import { showSuccess, showError, showInfo } from '../store/slices/toastSlice';
import { applicationSuccess } from '../store/slices/applicationSlice';
import { getApplication, createApplication, updateApplication } from '../services/studentService';
import { uploadDocuments } from '../services/documentService';
import { ChevronRight, ChevronLeft, Save, Send, Eye, Loader2, Sparkles, CheckCircle2, XCircle, Info, Landmark } from 'lucide-react';
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

const SelectField = ({ id, name, label, value, onChange, options, required }) => (
  <div>
    <label htmlFor={id} className="text-xs font-medium text-gray-600 mb-1 block">{label}{required ? ' *' : ''}</label>
    <select id={id} name={name} value={value} onChange={onChange} className="form-select">
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

  // Pre-fill from user profile
  useEffect(() => {
    if (user) {
      setPersonal((p) => ({
        ...p,
        fullName: user.fullName || '',
        phone: user.phone || '',
        email: user.email || '',
        state: user.state || '',
        district: user.district || '',
      }));
      setAcademic((a) => ({
        ...a,
        institutionName: user.institution || '',
        courseName: user.course || '',
        yearOfStudy: user.yearOfStudy || '',
      }));
    }
  }, [user]);

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
    const uploadedCount = docItems.filter((d) => docs[d] || application?.documents?.[d]).length;
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
      const app = await saveOrCreate(buildPayload('draft'));
      dispatch(applicationSuccess(app));
      dispatch(showSuccess('Draft saved successfully!'));
    } catch (err) {
      dispatch(showError(err.response?.data?.message || 'Failed to save draft.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const required = ['aadhaar', 'incomeCertificate', 'marksheet', 'photo'];
    const missing = required.filter((d) => !docs[d] && !application?.documents?.[d]);
    if (missing.length > 0) {
      dispatch(showError(`Please upload: ${missing.join(', ')}`));
      return;
    }

    setSubmitting(true);
    try {
      const newFiles = Object.entries(docs).filter(([, v]) => v instanceof File);
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach(([key, file]) => formData.append(key, file));
        await uploadDocuments(formData);
        dispatch(showInfo('Documents uploaded...'));
      }

      const app = await saveOrCreate(buildPayload('submitted'));
      dispatch(applicationSuccess(app));
      dispatch(showSuccess('Application submitted successfully!'));
      navigate('/dashboard/status');
    } catch (err) {
      dispatch(showError(err.response?.data?.message || 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
  };

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
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('personalDetails')}</h2>
                  
                  {/* OCR trigger */}
                  <button
                    onClick={() => triggerOCR('aadhaar')}
                    disabled={ocrLoading.aadhaar}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ocrLoading.aadhaar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {ocrLoading.aadhaar ? t('extracting') : t('ocrBtn')}
                  </button>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-fullname" name="fullName" label={t('fullName')} value={personal.fullName} onChange={handleFieldChange(setPersonal)} required />
                  <FloatInput id="p-dob" name="dateOfBirth" label={t('dob')} type="date" value={personal.dateOfBirth} onChange={handleFieldChange(setPersonal)} />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <SelectField id="p-gender" name="gender" label="Gender" value={personal.gender} onChange={handleFieldChange(setPersonal)} options={['Male','Female','Other']} />
                  <FloatInput id="p-religion" name="religion" label="Religion" value={personal.religion} onChange={handleFieldChange(setPersonal)} />
                  <SelectField id="p-category" name="category" label={t('caste')} value={personal.category} onChange={handleFieldChange(setPersonal)} options={['SC','ST','OBC','General']} required />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-aadhaar" name="aadhaarNumber" label={t('aadhaar')} value={personal.aadhaarNumber} onChange={handleFieldChange(setPersonal)} maxLength={12} />
                  <FloatInput id="p-phone" name="phone" label={t('phone')} value={personal.phone} onChange={handleFieldChange(setPersonal)} maxLength={10} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="p-email" name="email" label={t('email')} type="email" value={personal.email} onChange={handleFieldChange(setPersonal)} />
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <FloatInput id="p-income" name="annualIncome" label={t('income')} type="number" value={personal.annualIncome} onChange={handleFieldChange(setPersonal)} required />
                    </div>
                    <button
                      onClick={() => triggerOCR('incomeCertificate')}
                      disabled={ocrLoading.incomeCertificate}
                      className="px-2.5 py-3 mt-1.5 border hover:bg-slate-50 text-slate-500 rounded-xl transition flex items-center justify-center shrink-0"
                      title="Scan Income Cert"
                    >
                      {ocrLoading.incomeCertificate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-500" />}
                    </button>
                  </div>
                </div>

                <FloatInput id="p-address" name="permanentAddress" label="Permanent Address" value={personal.permanentAddress} onChange={handleFieldChange(setPersonal)} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField id="p-state" name="state" label={t('state')} value={personal.state} onChange={handleFieldChange(setPersonal)} options={STATES} required />
                  <FloatInput id="p-district" name="district" label={t('district')} value={personal.district} onChange={handleFieldChange(setPersonal)} />
                </div>
              </div>
            )}

            {/* Step 1: Academic */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('academicDetails')}</h2>
                  <button
                    onClick={() => triggerOCR('marksheet')}
                    disabled={ocrLoading.marksheet}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ocrLoading.marksheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {ocrLoading.marksheet ? t('extracting') : 'Scan Mark Sheet (OCR)'}
                  </button>
                </div>
                
                <FloatInput id="a-inst" name="institutionName" label={t('institution')} value={academic.institutionName} onChange={handleFieldChange(setAcademic)} required />
                <FloatInput id="a-addr" name="institutionAddress" label="Institution Address" value={academic.institutionAddress} onChange={handleFieldChange(setAcademic)} />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="a-course" name="courseName" label={t('course')} value={academic.courseName} onChange={handleFieldChange(setAcademic)} required />
                  <SelectField id="a-year" name="yearOfStudy" label={t('yearOfStudy')} value={academic.yearOfStudy} onChange={handleFieldChange(setAcademic)}
                    options={['1st Year','2nd Year','3rd Year','4th Year','5th Year']} required />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="a-roll" name="rollNumber" label={t('rollNumber')} value={academic.rollNumber} onChange={handleFieldChange(setAcademic)} />
                  <FloatInput id="a-marks" name="previousYearMarks" label={t('marks')} type="number" value={academic.previousYearMarks} onChange={handleFieldChange(setAcademic)} />
                </div>

                <FloatInput id="a-uni" name="boardUniversityName" label="Board / University Name" value={academic.boardUniversityName} onChange={handleFieldChange(setAcademic)} required />
              </div>
            )}

            {/* Step 2: Bank */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('bankDetails')}</h2>
                  <button
                    onClick={() => triggerOCR('bankPassbook')}
                    disabled={ocrLoading.bankPassbook}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ocrLoading.bankPassbook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {ocrLoading.bankPassbook ? t('extracting') : 'Scan Passbook (OCR)'}
                  </button>
                </div>
                
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
                  <Landmark className="w-4 h-4 shrink-0 text-amber-500" />
                  Ensure bank accounts are active and seeded with your Aadhaar for Direct Benefit Transfer (DBT).
                </p>

                <FloatInput id="b-holder" name="accountHolderName" label="Account Holder Name" value={bank.accountHolderName} onChange={handleFieldChange(setBank)} required />
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="b-bank" name="bankName" label={t('bankName')} value={bank.bankName} onChange={handleFieldChange(setBank)} required />
                  <FloatInput id="b-branch" name="branchName" label="Branch Name" value={bank.branchName} onChange={handleFieldChange(setBank)} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatInput id="b-acc" name="accountNumber" label={t('accNo')} value={bank.accountNumber} onChange={handleFieldChange(setBank)} required />
                  <FloatInput id="b-ifsc" name="ifscCode" label={t('ifsc')} value={bank.ifscCode} onChange={handleFieldChange(setBank)} required />
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-800 border-b pb-2 mb-4 uppercase tracking-wide">{t('documents')}</h2>
                <p className="text-[11px] text-slate-400">All certificates must be uploaded as legible PDFs (max 2MB). Photo should be JPG/PNG format.</p>
                
                <div className="grid sm:grid-cols-2 gap-5">
                  <DocumentUploadCard label="Aadhaar Card *" fieldName="aadhaar" hint="PDF only, max 2MB" value={application?.documents?.aadhaar} onChange={handleDocChange} />
                  <DocumentUploadCard label="Income Certificate *" fieldName="incomeCertificate" hint="PDF only, max 2MB" value={application?.documents?.incomeCertificate} onChange={handleDocChange} />
                  <DocumentUploadCard label="Caste Certificate (if applicable)" fieldName="casteCertificate" hint="PDF only, max 2MB" value={application?.documents?.casteCertificate} onChange={handleDocChange} />
                  <DocumentUploadCard label="Class 12 / Qualifying Marksheet *" fieldName="marksheet" hint="PDF only, max 2MB" value={application?.documents?.marksheet} onChange={handleDocChange} />
                  <DocumentUploadCard label="Bank Passbook / Cancelled Cheque" fieldName="bankPassbook" hint="PDF only, max 2MB" value={application?.documents?.bankPassbook} onChange={handleDocChange} />
                  <DocumentUploadCard label="Bonafide Certificate from College" fieldName="bonafide" hint="PDF only, max 2MB" value={application?.documents?.bonafide} onChange={handleDocChange} />
                  <DocumentUploadCard label="Passport Size Photo *" fieldName="photo" hint="JPG/PNG, max 2MB" accept=".jpg,.jpeg,.png" value={application?.documents?.photo} onChange={handleDocChange} />
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
