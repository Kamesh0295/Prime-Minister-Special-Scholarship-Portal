import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getProfileById, verifyProfile, deleteProfileAdmin } from '../services/adminService';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { BACKEND_ORIGIN } from '../services/apiBase';
import {
  User,
  MapPin,
  GraduationCap,
  Users,
  Landmark,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Bookmark
} from 'lucide-react';

const AdminProfileDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfileById(id);
        if (res.data.success) {
          setProfile(res.data.data);
          setRemarks(res.data.data.verificationRemarks || '');
        }
      } catch (err) {
        dispatch(showError('Failed to load profile.'));
        navigate('/admin/profiles');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, navigate, dispatch]);

  const handleVerify = async (status) => {
    setActionLoading(true);
    try {
      const res = await verifyProfile(id, { status, remarks });
      if (res.data.success) {
        dispatch(showSuccess(`Profile verification updated to '${status}'!`));
        setProfile(res.data.data);
        setShowRejectForm(false);
      }
    } catch {
      dispatch(showError('Failed to update verification status.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this student profile? This action cannot be undone.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await deleteProfileAdmin(id);
      if (res.data.success) {
        dispatch(showSuccess('Student profile deleted successfully.'));
        navigate('/admin/profiles');
      }
    } catch {
      dispatch(showError('Failed to delete student profile.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const dateOfBirth = profile.dob ? new Date(profile.dob).toLocaleDateString() : '—';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/admin/profiles')}
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Student Profiles
        </button>

        {/* Profile Deletion Banner */}
        {profile.deleteRequested && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-bold">Profile Deletion Requested</p>
                <p className="text-xs text-rose-600/90 font-medium">This student has submitted a deletion request for their profile records.</p>
              </div>
            </div>
            <button
              onClick={handleDeleteProfile}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition self-end sm:self-auto disabled:opacity-50"
            >
              Approve & Delete Profile
            </button>
          </div>
        )}

        {/* Header summary */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {profile.profilePhoto ? (
              <img
                src={`${BACKEND_ORIGIN}${profile.profilePhoto}`}
                alt=""
                className="h-16 w-16 rounded-full object-cover border border-gray-100"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                {profile.fullName?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.fullName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{profile.email} • {profile.phone}</p>
              <div className="flex gap-2 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  profile.verificationStatus === 'verified'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : profile.verificationStatus === 'rejected'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {profile.verificationStatus}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                  {profile.completionPercentage}% Completed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. PERSONAL INFORMATION */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 font-medium uppercase">Full Name</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.fullName || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Date of Birth</p>
                <p className="font-bold text-gray-800 mt-0.5">{dateOfBirth}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Gender</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.gender || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Blood Group</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.bloodGroup || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Aadhaar Card No</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.aadhaar || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Nationality</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.nationality || '—'}</p>
              </div>
            </div>
          </div>

          {/* 2. ADDRESS INFORMATION */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Address Details
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 font-medium uppercase">Permanent Address</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.address?.permanentAddress || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Current Address</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.address?.currentAddress || '—'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-gray-400 font-medium uppercase">State</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.address?.state || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">District</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.address?.district || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Pincode</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.address?.pincode || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. ACADEMIC INFORMATION */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Academic Profile
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <p className="text-gray-400 font-medium uppercase">College / Institution</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.collegeName || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 font-medium uppercase">Affiliated University</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.universityName || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Degree / Course</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.degree || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Department</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.department || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Roll Number</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.rollNumber || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Year of Study</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.yearOfStudy || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Academic Year</p>
                <p className="font-bold text-gray-800 mt-0.5">{profile.academicYear || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium uppercase">Current CGPA / %</p>
                <p className="font-bold text-primary mt-0.5">{profile.cgpa ? `${profile.cgpa}%` : '—'}</p>
              </div>
            </div>
          </div>

          {/* 4. BANK & FAMILY DETAILS */}
          <div className="space-y-6">
            
            {/* Family Info */}
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Family & Income Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400 font-medium uppercase">Father's Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.fatherName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Mother's Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.motherName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Parent Occupation</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.parentOccupation || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Annual Family Income</p>
                  <p className="font-bold text-emerald-600 mt-0.5">{profile.familyIncome ? `₹${profile.familyIncome.toLocaleString()}` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Bank details */}
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Bank Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2">
                  <p className="text-gray-400 font-medium uppercase">Account Holder Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.accountHolderName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Bank Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.bankName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Branch Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.branchName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">Account Number</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.accountNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium uppercase">IFSC Code</p>
                  <p className="font-bold text-gray-800 mt-0.5">{profile.ifscCode || '—'}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 5. DOCUMENTS SECTION */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Uploaded Verification Credentials
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {Object.entries({
              'Aadhaar Card': profile.documents?.aadhaar,
              'Income Certificate': profile.documents?.incomeCertificate,
              'Marksheet Document': profile.documents?.marksheet,
              'Bank Passbook Copy': profile.documents?.bankPassbook,
              'Community Certificate': profile.documents?.casteCertificate
            }).map(([label, val]) => (
              <div key={label} className="p-3 border border-gray-100 rounded-xl bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-gray-700 truncate">{label}</span>
                </div>
                {val ? (
                  <a
                    href={`${BACKEND_ORIGIN}${val}`} target="_blank" rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    View Document →
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0 italic">Not Uploaded</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 6. VERIFICATION CONTROLS PANEL */}
        <div className="card p-6 space-y-4 border border-gray-150">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            Profile Audit & Verification Status
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="verify-remarks" className="text-xs font-semibold text-gray-500 mb-1.5 block">Verification Remarks</label>
              <textarea
                id="verify-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter document verification remarks or rejection reasons..."
                rows="3"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleVerify('verified')}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Verify & Approve Profile
              </button>

              <button
                type="button"
                onClick={() => handleVerify('rejected')}
                disabled={actionLoading || !remarks.trim()}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject Verification
              </button>
            </div>
            
            {!remarks.trim() && (
              <p className="text-[10px] text-red-500 font-medium">* Remarks are required to trigger a profile rejection.</p>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminProfileDetail;
