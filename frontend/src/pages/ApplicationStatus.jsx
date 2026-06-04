import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { showError } from '../store/slices/toastSlice';
import { applicationSuccess } from '../store/slices/applicationSlice';
import { getApplication, downloadApprovalLetter } from '../services/studentService';
import {
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  Info,
  FileText,
  ArrowRight,
  Loader2,
  MessageSquare,
} from 'lucide-react';

const TIMELINE = [
  { status: 'submitted',    label: 'Submitted',    desc: 'Your application has been received.' },
  { status: 'under_review', label: 'Under Review', desc: 'Our team is reviewing your application and documents.' },
  { status: 'verified',     label: 'Verified',     desc: 'Your documents have been verified.' },
  { status: 'approved',     label: 'Approved',     desc: 'Congratulations! Your scholarship has been approved.' },
];

const ApplicationStatus = () => {
  const dispatch = useDispatch();
  const { application } = useSelector((s) => s.application);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await getApplication();
        if (res.data.success) dispatch(applicationSuccess(res.data.data));
      } catch {
        dispatch(showError('Failed to load application status.'));
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [dispatch]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await downloadApprovalLetter();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PMSS_Approval_Letter.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      dispatch(showError('Failed to download letter.'));
    } finally {
      setDownloading(false);
    }
  };

  const getStepIndex = (status) => {
    const idx = TIMELINE.findIndex((t) => t.status === status);
    return idx === -1 ? -1 : idx;
  };

  const currentIdx = application ? getStepIndex(application.status) : -1;
  const isRejected = application?.status === 'rejected';
  const isApproved = application?.status === 'approved';

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Application Status</h1>
        <p className="text-sm text-gray-500 mb-6">Track your scholarship application in real time</p>

        {loading ? (
          <SkeletonCard />
        ) : !application ? (
          <div className="card p-10 text-center">
            <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">No Application Found</h2>
            <p className="text-sm text-gray-500 mb-5">You haven't applied for the scholarship yet.</p>
            <Link to="/dashboard/application" className="btn-primary">
              Apply Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Header */}
            <div className={`card p-5 border-l-4 ${
              isApproved ? 'border-l-green-500' :
              isRejected ? 'border-l-red-500' :
              'border-l-primary'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Status</p>
                  <StatusBadge status={application.status} className="text-sm" />
                </div>
                {application.submittedAt && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Submitted On</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(application.submittedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {isApproved && (
                <div className="mt-4 flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm">🎉 Scholarship Approved!</p>
                      <p className="text-xs text-green-600 mt-0.5">Your approval letter is ready to download.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="btn-primary bg-green-600 hover:bg-green-700 text-sm"
                    id="download-letter-btn"
                  >
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download Letter
                  </button>
                </div>
              )}

              {isRejected && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Application Rejected</p>
                      {application.reviewerRemarks && (
                        <p className="text-sm text-red-600 mt-1">{application.reviewerRemarks}</p>
                      )}
                      <p className="text-xs text-red-500 mt-2">
                        For queries, contact: support@pmss.gov.in
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {!isRejected && (
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-6">Application Timeline</h2>
                <div className="space-y-0">
                  {TIMELINE.map((step, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    const pending = i > currentIdx;
                    return (
                      <div key={step.status} className="flex gap-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            done ? 'bg-primary border-primary text-white'
                            : active ? 'border-primary text-primary bg-white shadow-[0_0_0_4px_rgba(37,99,235,0.1)]'
                            : 'border-gray-200 text-gray-300'
                          }`}>
                            {done ? <CheckCircle className="h-4 w-4" /> : <Clock className={`h-4 w-4 ${active ? 'text-primary animate-pulse' : ''}`} />}
                          </div>
                          {i < TIMELINE.length - 1 && (
                            <div className={`w-0.5 h-10 my-0.5 ${done ? 'bg-primary' : 'bg-gray-100'}`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-10 last:pb-0">
                          <p className={`font-semibold text-sm ${active ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                            {step.label}
                            {active && <span className="ml-2 text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">Current</span>}
                          </p>
                          <p className={`text-xs mt-0.5 ${pending ? 'text-gray-300' : 'text-gray-500'}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviewer Remarks */}
            {application.reviewerRemarks && !isRejected && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Reviewer Remarks
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  {application.reviewerRemarks}
                </div>
              </div>
            )}

            {/* Status History */}
            {application.statusHistory?.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-400" />
                  Status History
                </h2>
                <div className="space-y-2">
                  {[...application.statusHistory].reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(h.changedAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplicationStatus;
