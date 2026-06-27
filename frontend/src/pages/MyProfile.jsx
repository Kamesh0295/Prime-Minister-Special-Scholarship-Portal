import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import DocumentUploadCard from '../components/ui/DocumentUploadCard';
import { getProfile, updateProfile, requestProfileDeletion } from '../services/studentService';
import { uploadDocuments } from '../services/documentService';
import { profileStart, profileSuccess, profileFailure } from '../store/slices/profileSlice';
import { showSuccess, showError, showInfo } from '../store/slices/toastSlice';
import { BACKEND_ORIGIN } from '../services/apiBase';
import {
  User,
  MapPin,
  GraduationCap,
  Users,
  Landmark,
  FileText,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  Calendar,
  Lock
} from 'lucide-react';

const TABS = [
  { id: 'personal', label: 'Personal Details', icon: User },
  { id: 'address', label: 'Address Info', icon: MapPin },
  { id: 'academic', label: 'Academic Info', icon: GraduationCap },
  { id: 'family', label: 'Family & Income', icon: Users },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const MyProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form Fields State
  const [profileData, setProfileData] = useState({
    fullName: '', dob: '', gender: '', category: '', email: '', phone: '', aadhaar: '', bloodGroup: '', nationality: 'Indian',
    address: { permanentAddress: '', currentAddress: '', state: '', district: '', pincode: '' },
    collegeName: '', universityName: '', degree: '', department: '', yearOfStudy: '', rollNumber: '', academicYear: '', cgpa: '',
    fatherName: '', motherName: '', parentOccupation: '', familyIncome: '',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '',
    profilePhoto: '',
    documents: { aadhaar: '', incomeCertificate: '', casteCertificate: '', marksheet: '', bankPassbook: '' },
    documentStatuses: {},
  });

  const [selectedFiles, setSelectedFiles] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      dispatch(profileStart());
      try {
        const res = await getProfile();
        if (res.data.success && res.data.data) {
          const data = res.data.data;
          
          // Format date if present
          let formattedDob = '';
          if (data.dob) {
            formattedDob = new Date(data.dob).toISOString().split('T')[0];
          }

          setProfileData({
            fullName: data.fullName || '',
            dob: formattedDob,
            gender: data.gender || '',
            email: data.email || '',
            phone: data.phone || '',
            aadhaar: data.aadhaar || '',
            bloodGroup: data.bloodGroup || '',
            nationality: data.nationality || 'Indian',
            address: {
              permanentAddress: data.address?.permanentAddress || '',
              currentAddress: data.address?.currentAddress || '',
              state: data.address?.state || '',
              district: data.address?.district || '',
              pincode: data.address?.pincode || '',
            },
            collegeName: data.collegeName || '',
            universityName: data.universityName || '',
            degree: data.degree || '',
            department: data.department || '',
            yearOfStudy: data.yearOfStudy || '',
            rollNumber: data.rollNumber || '',
            academicYear: data.academicYear || '',
            cgpa: data.cgpa || '',
            fatherName: data.fatherName || '',
            motherName: data.motherName || '',
            parentOccupation: data.parentOccupation || '',
            familyIncome: data.familyIncome || '',
            bankName: data.bankName || '',
            accountHolderName: data.accountHolderName || '',
            accountNumber: data.accountNumber || '',
            ifscCode: data.ifscCode || '',
            branchName: data.branchName || '',
            profilePhoto: data.profilePhoto || '',
            category: data.category || '',
            documents: {
              aadhaar: data.documents?.aadhaar || '',
              incomeCertificate: data.documents?.incomeCertificate || '',
              casteCertificate: data.documents?.casteCertificate || '',
              marksheet: data.documents?.marksheet || '',
              bankPassbook: data.documents?.bankPassbook || '',
            },
            documentStatuses: data.documentStatuses || {},
            profileCompleted: data.profileCompleted || false,
            completionPercentage: data.completionPercentage || 0,
            verificationStatus: data.verificationStatus || 'pending',
            verificationRemarks: data.verificationRemarks || '',
            deleteRequested: data.deleteRequested || false,
          });

          dispatch(profileSuccess({ data, exists: res.data.exists }));
        }
      } catch (err) {
        dispatch(profileFailure(err.message));
        dispatch(showError('Failed to load profile.'));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [dispatch]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value }
    }));
  };

  const handleDocChange = (fieldName, file) => {
    setSelectedFiles((prev) => ({ ...prev, [fieldName]: file }));
  };

  // Form Validation logic
  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    if (name === 'email') {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !regex.test(value)) {
        errors.email = 'Invalid email address format.';
      } else {
        delete errors.email;
      }
    }
    if (name === 'phone') {
      const cleanVal = value.replace(/\D/g, '');
      if (value && cleanVal.length !== 10) {
        errors.phone = 'Mobile number must be exactly 10 digits.';
      } else {
        delete errors.phone;
      }
    }
    if (name === 'aadhaar') {
      const cleanVal = value.replace(/\D/g, '');
      if (value && cleanVal.length !== 12) {
        errors.aadhaar = 'Aadhaar must be exactly 12 digits.';
      } else {
        delete errors.aadhaar;
      }
    }
    if (name === 'ifscCode') {
      const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (value && !regex.test(value.toUpperCase())) {
        errors.ifscCode = 'IFSC format is incorrect (e.g. SBIN0001234).';
      } else {
        delete errors.ifscCode;
      }
    }
    setValidationErrors(errors);
  };

  const calculateCompletion = () => {
    const fields = [
      profileData.fullName, profileData.dob, profileData.gender, profileData.category, profileData.phone, profileData.email, profileData.aadhaar, profileData.bloodGroup, profileData.nationality,
      profileData.address?.permanentAddress, profileData.address?.currentAddress, profileData.address?.state, profileData.address?.district, profileData.address?.pincode,
      profileData.collegeName, profileData.universityName, profileData.degree, profileData.department, profileData.yearOfStudy, profileData.rollNumber, profileData.academicYear, profileData.cgpa,
      profileData.fatherName, profileData.motherName, profileData.parentOccupation, profileData.familyIncome,
      profileData.bankName, profileData.accountHolderName, profileData.accountNumber, profileData.ifscCode, profileData.branchName,
      profileData.profilePhoto || selectedFiles.photo,
      profileData.documents?.aadhaar || selectedFiles.aadhaar,
      profileData.documents?.incomeCertificate || selectedFiles.incomeCertificate,
      profileData.documents?.casteCertificate || selectedFiles.casteCertificate,
      profileData.documents?.marksheet || selectedFiles.marksheet,
      profileData.documents?.bankPassbook || selectedFiles.bankPassbook
    ];
    const filled = fields.filter(f => f !== undefined && f !== null && String(f).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(showError('Please resolve all validation errors before saving.'));
      return;
    }

    setSaving(true);
    try {
      // 1. Upload files first if selected
      let updatedPhoto = profileData.profilePhoto;
      let updatedDocs = { ...profileData.documents };

      const fileEntries = Object.entries(selectedFiles).filter(([, v]) => v instanceof File);
      if (fileEntries.length > 0) {
        dispatch(showInfo('Uploading profile files...'));
        const formData = new FormData();
        fileEntries.forEach(([key, file]) => {
          formData.append(key, file);
        });
        
        const uploadRes = await uploadDocuments(formData);
        if (uploadRes.data.success) {
          const urls = uploadRes.data.data;
          if (urls.photo) updatedPhoto = urls.photo;
          
          // Map castes or marksheet documents
          Object.keys(urls).forEach((key) => {
            if (key !== 'photo') {
              updatedDocs[key] = urls[key];
            }
          });
        }
      }

      // 2. Submit Profile Update payload
      const payload = {
        ...profileData,
        profilePhoto: updatedPhoto,
        documents: updatedDocs,
      };

      const res = await updateProfile(payload);
      if (res.data.success) {
        dispatch(showSuccess('Profile updated successfully!'));
        setProfileData(prev => ({
          ...prev,
          ...res.data.data
        }));
        dispatch(profileSuccess({ data: res.data.data, exists: true }));
        setSelectedFiles({});
      }
    } catch (err) {
      dispatch(showError(err.response?.data?.message || 'Failed to save profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    setDeleteLoading(true);
    try {
      const res = await requestProfileDeletion();
      if (res.data.success) {
        dispatch(showSuccess('Deletion request submitted successfully.'));
        setProfileData(prev => ({ ...prev, deleteRequested: true }));
        setShowDeleteModal(false);
      }
    } catch (err) {
      dispatch(showError('Failed to submit deletion request.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const completionPercent = calculateCompletion();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profileData.profilePhoto ? (
                <img
                  src={`${BACKEND_ORIGIN}${profileData.profilePhoto}`}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {profileData.fullName?.charAt(0) || user?.fullName?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profileData.fullName || user?.fullName}</h1>
              <p className="text-xs text-gray-400 mt-0.5">Role: Student • {profileData.email}</p>
              
              <div className="flex gap-2 mt-2">
                {/* Verification Status Badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  profileData.verificationStatus === 'verified'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : profileData.verificationStatus === 'rejected'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {profileData.verificationStatus === 'verified' ? '✓ Verified' : profileData.verificationStatus === 'rejected' ? '✗ Rejected' : '⧗ Pending Verify'}
                </span>
                
                {profileData.deleteRequested && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                    Delete Requested
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="w-full md:w-64 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
              <span>Profile Complete</span>
              <span className="text-primary font-black">{completionPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">Complete profile to unlock application autofills.</p>
          </div>
        </div>

        {/* Tab & Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Tab Selection Navigation */}
          <div className="card p-3 space-y-1">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-primary'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Content Panel */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden">
              
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* 1. PERSONAL DETAILS */}
                {activeTab === 'personal' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Personal Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="fullName" name="fullName" placeholder="Full Name"
                          value={profileData.fullName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="fullName" className="form-label">Full Name *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="date" id="dob" name="dob" placeholder="Date of Birth"
                          value={profileData.dob} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="dob" className="form-label">Date of Birth *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="gender" className="text-xs font-semibold text-gray-500 mb-1 block">Gender *</label>
                        <select
                          id="gender" name="gender" value={profileData.gender} onChange={handleFieldChange}
                          className="form-select" required
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="category" className="text-xs font-semibold text-gray-500 mb-1 block">Category *</label>
                        <select
                          id="category" name="category" value={profileData.category} onChange={handleFieldChange}
                          className="form-select" required
                        >
                          <option value="">Select Category</option>
                          <option value="General">General</option>
                          <option value="OBC">OBC</option>
                          <option value="SC">SC</option>
                          <option value="ST">ST</option>
                        </select>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="bloodGroup" name="bloodGroup" placeholder="Blood Group"
                          value={profileData.bloodGroup} onChange={handleFieldChange} className="form-input"
                        />
                        <label htmlFor="bloodGroup" className="form-label">Blood Group</label>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="nationality" name="nationality" placeholder="Nationality"
                          value={profileData.nationality} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="nationality" className="form-label">Nationality *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="form-group">
                        <input
                          type="email" id="email" name="email" placeholder="Email Address"
                          value={profileData.email} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="email" className="form-label">Email Address *</label>
                        {validationErrors.email && <p className="text-red-500 text-[10px] mt-1">{validationErrors.email}</p>}
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="phone" name="phone" placeholder="Mobile Number"
                          value={profileData.phone} onChange={handleFieldChange} className="form-input" required maxLength={10}
                        />
                        <label htmlFor="phone" className="form-label">Mobile Number *</label>
                        {validationErrors.phone && <p className="text-red-500 text-[10px] mt-1">{validationErrors.phone}</p>}
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="aadhaar" name="aadhaar" placeholder="Aadhaar Number"
                          value={profileData.aadhaar} onChange={handleFieldChange} className="form-input" required maxLength={12}
                        />
                        <label htmlFor="aadhaar" className="form-label">Aadhaar Number *</label>
                        {validationErrors.aadhaar && <p className="text-red-500 text-[10px] mt-1">{validationErrors.aadhaar}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ADDRESS DETAILS */}
                {activeTab === 'address' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Address Information</h3>
                    <div className="form-group">
                      <input
                        type="text" id="permanentAddress" name="permanentAddress" placeholder="Permanent Address"
                        value={profileData.address.permanentAddress} onChange={handleAddressChange} className="form-input" required
                      />
                      <label htmlFor="permanentAddress" className="form-label">Permanent Address *</label>
                    </div>
                    <div className="form-group">
                      <input
                        type="text" id="currentAddress" name="currentAddress" placeholder="Current Address"
                        value={profileData.address.currentAddress} onChange={handleAddressChange} className="form-input" required
                      />
                      <label htmlFor="currentAddress" className="form-label">Current/Correspondence Address *</label>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="state" className="text-xs font-semibold text-gray-500 mb-1 block">State *</label>
                        <select
                          id="state" name="state" value={profileData.address.state} onChange={handleAddressChange}
                          className="form-select" required
                        >
                          <option value="">Select State</option>
                          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="district" name="district" placeholder="District"
                          value={profileData.address.district} onChange={handleAddressChange} className="form-input" required
                        />
                        <label htmlFor="district" className="form-label">District *</label>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="pincode" name="pincode" placeholder="Pincode"
                          value={profileData.address.pincode} onChange={handleAddressChange} className="form-input" required maxLength={6}
                        />
                        <label htmlFor="pincode" className="form-label">Pincode *</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ACADEMIC INFO */}
                {activeTab === 'academic' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Academic Profile</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="collegeName" name="collegeName" placeholder="College Name"
                          value={profileData.collegeName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="collegeName" className="form-label">College / Institution *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="universityName" name="universityName" placeholder="University Name"
                          value={profileData.universityName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="universityName" className="form-label">Affiliated University *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="degree" name="degree" placeholder="Degree (e.g. B.Tech / B.Sc)"
                          value={profileData.degree} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="degree" className="form-label">Degree (Course Level) *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="department" name="department" placeholder="Department"
                          value={profileData.department} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="department" className="form-label">Branch / Department *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="yearOfStudy" className="text-xs font-semibold text-gray-500 mb-1 block">Year *</label>
                        <select
                          id="yearOfStudy" name="yearOfStudy" value={profileData.yearOfStudy} onChange={handleFieldChange}
                          className="form-select" required
                        >
                          <option value="">Year</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                          <option value="5th Year">5th Year</option>
                        </select>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="rollNumber" name="rollNumber" placeholder="Roll Number"
                          value={profileData.rollNumber} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="rollNumber" className="form-label">Roll/Reg No *</label>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="text" id="academicYear" name="academicYear" placeholder="Academic Year"
                          value={profileData.academicYear} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="academicYear" className="form-label">Acad Year (e.g. 2024-25) *</label>
                      </div>
                      <div className="form-group pt-5">
                        <input
                          type="number" step="0.01" id="cgpa" name="cgpa" placeholder="CGPA / Percentage"
                          value={profileData.cgpa} onChange={handleFieldChange} className="form-input" required min="0" max="100"
                        />
                        <label htmlFor="cgpa" className="form-label">CGPA / % *</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. FAMILY INFO */}
                {activeTab === 'family' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Family Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="fatherName" name="fatherName" placeholder="Father Name"
                          value={profileData.fatherName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="fatherName" className="form-label">Father's Name *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="motherName" name="motherName" placeholder="Mother Name"
                          value={profileData.motherName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="motherName" className="form-label">Mother's Name *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="parentOccupation" name="parentOccupation" placeholder="Parent Occupation"
                          value={profileData.parentOccupation} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="parentOccupation" className="form-label">Parent's Occupation *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="number" id="familyIncome" name="familyIncome" placeholder="Annual Family Income"
                          value={profileData.familyIncome} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="familyIncome" className="form-label">Annual Family Income *</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. BANK INFO */}
                {activeTab === 'bank' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Bank Details</h3>
                    <div className="form-group">
                      <input
                        type="text" id="accountHolderName" name="accountHolderName" placeholder="Account Holder Name"
                        value={profileData.accountHolderName} onChange={handleFieldChange} className="form-input" required
                      />
                      <label htmlFor="accountHolderName" className="form-label">Account Holder Name *</label>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="bankName" name="bankName" placeholder="Bank Name"
                          value={profileData.bankName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="bankName" className="form-label">Bank Name *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="branchName" name="branchName" placeholder="Branch Name"
                          value={profileData.branchName} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="branchName" className="form-label">Branch Name *</label>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <input
                          type="text" id="accountNumber" name="accountNumber" placeholder="Account Number"
                          value={profileData.accountNumber} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="accountNumber" className="form-label">Account Number *</label>
                      </div>
                      <div className="form-group">
                        <input
                          type="text" id="ifscCode" name="ifscCode" placeholder="IFSC Code"
                          value={profileData.ifscCode} onChange={handleFieldChange} className="form-input" required
                        />
                        <label htmlFor="ifscCode" className="form-label">Bank IFSC Code *</label>
                        {validationErrors.ifscCode && <p className="text-red-500 text-[10px] mt-1">{validationErrors.ifscCode}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. DOCUMENTS */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Documents & Photo Upload</h3>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <DocumentUploadCard
                        label="Profile Photo *" fieldName="photo" hint="JPG or PNG format, max 2MB"
                        value={profileData.profilePhoto} onChange={handleDocChange}
                        status={profileData.documentStatuses?.photo?.status}
                        remarks={profileData.documentStatuses?.photo?.remarks}
                      />
                      <DocumentUploadCard
                        label="Aadhaar Card PDF *" fieldName="aadhaar" hint="PDF only, max 2MB"
                        value={profileData.documents.aadhaar} onChange={handleDocChange}
                        status={profileData.documentStatuses?.aadhaar?.status}
                        remarks={profileData.documentStatuses?.aadhaar?.remarks}
                      />
                      <DocumentUploadCard
                        label="Income Certificate PDF *" fieldName="incomeCertificate" hint="PDF only, max 2MB"
                        value={profileData.documents.incomeCertificate} onChange={handleDocChange}
                        status={profileData.documentStatuses?.incomeCertificate?.status}
                        remarks={profileData.documentStatuses?.incomeCertificate?.remarks}
                      />
                      <DocumentUploadCard
                        label="Marksheet PDF *" fieldName="marksheet" hint="PDF only, max 2MB"
                        value={profileData.documents.marksheet} onChange={handleDocChange}
                        status={profileData.documentStatuses?.marksheet?.status}
                        remarks={profileData.documentStatuses?.marksheet?.remarks}
                      />
                      <DocumentUploadCard
                        label="Bank Passbook / Cheque PDF *" fieldName="bankPassbook" hint="PDF only, max 2MB"
                        value={profileData.documents.bankPassbook} onChange={handleDocChange}
                        status={profileData.documentStatuses?.bankPassbook?.status}
                        remarks={profileData.documentStatuses?.bankPassbook?.remarks}
                      />
                      <DocumentUploadCard
                        label="Caste/Community Certificate PDF" fieldName="casteCertificate" hint="PDF only, max 2MB"
                        value={profileData.documents.casteCertificate} onChange={handleDocChange}
                        status={profileData.documentStatuses?.casteCertificate?.status}
                        remarks={profileData.documentStatuses?.casteCertificate?.remarks}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Form Actions Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={profileData.deleteRequested}
                  className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Request Profile Delete
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 px-6 font-bold flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Profile Changes
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

      {/* Delete Request Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full p-6 shadow-card-lg relative animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              Request Profile Deletion
            </h3>
            
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Are you sure you want to request your profile deletion? 
              This will request permission from the administrator to clear all details. 
              Once deleted, you must fill all information again.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRequest}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1"
              >
                {deleteLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyProfile;
