import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { showSuccess, showError } from '../store/slices/toastSlice';
import { getApplicationById, updateApplicationStatus, downloadLetterAdmin } from '../services/adminService';
import {
  ArrowLeft, CheckCircle, XCircle, MessageSquare, Download,
  FileText, User, BookOpen, CreditCard, Paperclip, Loader2,
  AlertTriangle, ShieldCheck, Sparkles, HelpCircle
} from 'lucide-react';

const DetailRow = ({ label, value, ocrValue }) => {
  const hasMismatch = ocrValue && value && String(ocrValue).trim().toLowerCase() !== String(value).trim().toLowerCase();
  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 sm:w-44 flex-shrink-0 capitalize font-medium">{label.replace(/([A-Z])/g, ' $1')}</span>
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs font-bold text-slate-800">{value || '—'}</span>
        {ocrValue && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
            hasMismatch ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            <Sparkles className="w-3 h-3" />
            OCR: {ocrValue} {hasMismatch && '(Mismatch)'}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, children, iconColor = 'text-primary' }) => (
  <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-slate-50/50">
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="px-5 py-2">{children}</div>
  </div>
);

const AdminApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [modal, setModal] = useState({ open: false, action: '', title: '', placeholder: '' });
  const [remarkInput, setRemarkInput] = useState('');
  const [internalRemark, setInternalRemark] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getApplicationById(id);
        setApplication(res.data.data);
        setInternalRemark(res.data.data.internalRemarks || '');
      } catch {
        dispatch(showError('Application not found.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, dispatch]);

  const openModal = (action) => {
    const configs = {
      approve:   { title: 'Approve Application',      placeholder: 'Optional approval note...' },
      reject:    { title: 'Reject Application',       placeholder: 'Reason for rejection (required)...' },
      revise:    { title: 'Request Revision',         placeholder: 'Note for student revision...' },
      review:    { title: 'Mark as Under Review',     placeholder: 'Optional note...' },
      disburse:  { title: 'Disburse Scholarship Funds',placeholder: 'Optional disbursement transaction reference...' },
    };
    setRemarkInput('');
    setModal({ open: true, action, ...configs[action] });
  };

  const handleAction = async () => {
    const { action } = modal;
    if (action === 'reject' && !remarkInput.trim()) {
      dispatch(showError('Rejection reason is required.'));
      return;
    }

    const statusMap = {
      approve: 'approved',
      reject:  'rejected',
      revise:  'submitted',
      review:  'under_review',
      disburse: 'disbursed',
    };

    setActionLoading(true);
    try {
      const res = await updateApplicationStatus(id, {
        status: statusMap[action],
        remarks: remarkInput,
        internalRemarks: internalRemark,
      });
      setApplication(res.data.data);
      dispatch(showSuccess(`Application ${action === 'disburse' ? 'disbursed' : action + 'd'} successfully.`));
      setModal({ open: false });
    } catch (err) {
      dispatch(showError(err.response?.data?.message || 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadLetter = async () => {
    try {
      setDownloading(true);
      const res = await downloadLetterAdmin(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `PMSS_Approval_Letter_${application.studentId?.fullName?.replace(/ /g,'_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      dispatch(showSuccess('Download started.'));
    } catch {
      dispatch(showError('Failed to download letter.'));
    } finally {
      setDownloading(false);
    }
  };

  const doc = application;
  const student = doc?.studentId;
  const p = doc?.personalDetails || {};
  const a = doc?.academicDetails || {};
  const b = doc?.bankDetails || {};
  const docs = doc?.documents || {};
  const ocr = doc?.ocrData || {};
  const fraudFlags = doc?.fraudFlags || [];

  return (
    <DashboardLayout>
      {/* Back */}
      <button onClick={() => navigate('/admin/applications')} className="px-4 py-2 border hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition mb-6">
        <ArrowLeft className="w-4 h-4 text-slate-400" />
        Back to Applications
      </button>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : !application ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-3xl text-slate-400 font-bold">
          Application not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fraud warning alerts panel */}
          {fraudFlags.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Security & Fraud Verification Alerts</h3>
              </div>
              <ul className="list-disc list-inside text-xs font-semibold text-red-700 space-y-1">
                {fraudFlags.map((flag, idx) => (
                  <li key={idx}>{flag.description} <span className="text-[9px] font-black uppercase text-red-500">[{flag.severity}]</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main details */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Status Header */}
              <div className="bg-white p-5 border border-slate-200/80 rounded-3xl shadow-sm flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Application Status:</span>
                  <StatusBadge status={doc.status} />
                </div>
                {['approved', 'disbursed'].includes(doc.status) && (
                  <button
                    onClick={handleDownloadLetter}
                    disabled={downloading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow disabled:opacity-50"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download Award PDF
                  </button>
                )}
              </div>

              {/* Student info */}
              <SectionCard icon={User} title="Student Registration Record">
                <DetailRow label="Full Name"  value={student?.fullName} ocrValue={ocr.fullName} />
                <DetailRow label="Email"      value={student?.email} />
                <DetailRow label="Phone"      value={student?.phone} />
                <DetailRow label="Registered Institution" value={student?.institution} />
                <DetailRow label="Registration Date" value={student?.createdAt ? new Date(student.createdAt).toLocaleDateString('en-IN') : '—'} />
              </SectionCard>

              {/* Personal details */}
              <SectionCard icon={User} title="Personal Form Details" iconColor="text-purple-600">
                <DetailRow label="Full Name" value={p.fullName} ocrValue={ocr.fullName} />
                <DetailRow label="Aadhaar Card" value={p.aadhaarNumber} ocrValue={ocr.aadhaarNumber} />
                <DetailRow label="Date of Birth" value={p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '—'} ocrValue={ocr.dateOfBirth ? new Date(ocr.dateOfBirth).toISOString().split('T')[0] : ''} />
                <DetailRow label="Annual Family Income" value={p.annualIncome ? `₹${p.annualIncome.toLocaleString()}` : '—'} ocrValue={ocr.income ? `₹${ocr.income.toLocaleString()}` : ''} />
                <DetailRow label="State of Domicile" value={p.state} />
                <DetailRow label="District" value={p.district} />
                <DetailRow label="Category" value={p.category} />
                <DetailRow label="Gender" value={p.gender} />
              </SectionCard>

              {/* Academic details */}
              <SectionCard icon={BookOpen} title="Academic Details" iconColor="text-blue-500">
                <DetailRow label="Institution Name" value={a.institutionName} />
                <DetailRow label="Course Name" value={a.courseName} />
                <DetailRow label="Year of Study" value={a.yearOfStudy} />
                <DetailRow label="Board Roll Number" value={a.rollNumber} />
                <DetailRow label="Previous Year Marks (%)" value={a.previousYearMarks ? `${a.previousYearMarks}%` : '—'} ocrValue={ocr.previousYearMarks ? `${ocr.previousYearMarks}%` : ''} />
                <DetailRow label="Board/University Name" value={a.boardUniversityName} />
              </SectionCard>

              {/* Bank details */}
              <SectionCard icon={CreditCard} title="Direct Benefit Transfer Bank Details" iconColor="text-emerald-600">
                <DetailRow label="Account Holder Name" value={b.accountHolderName} />
                <DetailRow label="Bank Name" value={b.bankName} />
                <DetailRow label="Account Number" value={b.accountNumber} ocrValue={ocr.bankAccountNumber} />
                <DetailRow label="IFSC Code" value={b.ifscCode} ocrValue={ocr.bankIfscCode} />
              </SectionCard>

              {/* Documents */}
              <SectionCard icon={Paperclip} title="Uploaded Documentation Files" iconColor="text-amber-500">
                <div className="py-3 grid sm:grid-cols-2 gap-3">
                  {Object.entries(docs).filter(([,v]) => v).map(([key, url]) => (
                    <a key={key}
                      href={`http://localhost:5000${url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-700 text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </a>
                  ))}
                  {Object.keys(docs).length === 0 && (
                    <p className="text-xs text-slate-400 py-2">No documents uploaded.</p>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Right Action panels */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Review Actions Card */}
              <div className="bg-white p-5 border border-slate-200/80 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scholarship Verification actions</h3>
                
                <div className="space-y-2 flex flex-col">
                  {/* Under Review */}
                  {doc.status === 'submitted' && (
                    <button
                      onClick={() => openModal('review')}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      Mark Under Review
                    </button>
                  )}

                  {/* Approve */}
                  {['submitted', 'institution_verified', 'under_review'].includes(doc.status) && (
                    <button
                      onClick={() => openModal('approve')}
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Application
                    </button>
                  )}

                  {/* Disburse */}
                  {doc.status === 'approved' && (
                    <button
                      onClick={() => openModal('disburse')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      Disburse Scholarship Funds
                    </button>
                  )}

                  {/* Reject / Revision */}
                  {!['approved', 'rejected', 'disbursed'].includes(doc.status) && (
                    <>
                      <button
                        onClick={() => openModal('reject')}
                        className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Application
                      </button>

                      <button
                        onClick={() => openModal('revise')}
                        className="w-full py-2.5 border hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-500" />
                        Request Revision
                      </button>
                    </>
                  )}

                  {/* Finished state */}
                  {['rejected', 'disbursed'].includes(doc.status) && (
                    <div className="text-center py-4 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-400">
                      Scholarship evaluation complete. status: {doc.status.toUpperCase()}.
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {doc.reviewerRemarks && (
                <div className="bg-white p-5 border border-slate-200/80 rounded-3xl shadow-sm space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evaluation remarks</h3>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl font-medium leading-relaxed">{doc.reviewerRemarks}</p>
                </div>
              )}

              {/* Internal remarks */}
              <div className="bg-white p-5 border border-slate-200/80 rounded-3xl shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Internal remarks (Confidential)</h3>
                <textarea
                  value={internalRemark}
                  onChange={(e) => setInternalRemark(e.target.value)}
                  placeholder="Add internal verification notes..."
                  rows={4}
                  className="w-full text-xs p-3 border rounded-2xl outline-none focus:border-blue-500 transition min-h-[90px] bg-slate-50"
                />
              </div>

              {/* College remarks */}
              {doc.institutionRemarks && (
                <div className="bg-white p-5 border border-slate-200/80 rounded-3xl shadow-sm space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">College verification remarks</h3>
                  <p className="text-xs text-slate-600 bg-blue-50/20 p-3 rounded-2xl border border-blue-100/50 font-medium leading-relaxed">
                    {doc.institutionRemarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        footer={
          <>
            <button onClick={() => setModal({ ...modal, open: false })} className="px-4 py-2 border text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50">Cancel</button>
            <button
              onClick={handleAction}
              disabled={actionLoading}
              className={`px-5 py-2 text-white font-bold rounded-xl text-xs shadow flex items-center gap-1.5 ${
                modal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                modal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                modal.action === 'disburse' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm Action
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-normal">
            {modal.action === 'approve' && 'Approving application will issue an authenticated award letter containing verified QR Code and digital seal. Student will be notified.'}
            {modal.action === 'reject'  && 'Rejecting this application immediately revokes PMSSS eligibility for this student. Rejection reason is required.'}
            {modal.action === 'revise'  && 'This will revert status to draft, requesting the student to log in and upload correct verification files.'}
            {modal.action === 'review'  && 'This marks the application in Under Review status to initiate manual auditing.'}
            {modal.action === 'disburse' && 'Disbursing will finalize scholarship awards. An DBT fund transfer notification will be sent to the candidate.'}
          </p>
          <textarea
            placeholder={modal.placeholder}
            value={remarkInput}
            onChange={(e) => setRemarkInput(e.target.value)}
            rows={4}
            className="w-full text-xs p-3 border rounded-xl outline-none focus:border-blue-500 transition min-h-[90px]"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminApplicationDetail;
