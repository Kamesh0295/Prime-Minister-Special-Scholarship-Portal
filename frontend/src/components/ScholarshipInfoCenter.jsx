import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showSuccess, showError } from '../store/slices/toastSlice';
import {
  Info,
  Award,
  UserCheck,
  XCircle,
  ClipboardList,
  FileText,
  HelpCircle,
  Bookmark,
  MessageSquare,
  Star,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const ScholarshipInfoCenter = () => {
  const dispatch = useDispatch();
  const [activeSection, setActiveSection] = useState('details');
  const [openFaq, setOpenFaq] = useState({});
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const sections = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'benefits', label: 'Benefits', icon: Award },
    { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
    { id: 'exclusions', label: 'Exclusions', icon: XCircle },
    { id: 'process', label: 'How to Apply', icon: ClipboardList },
    { id: 'documents', label: 'Required Documents', icon: FileText },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'sources', label: 'Sources & Refs', icon: Bookmark },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  // Smooth scroll handler with offset for sticky navbar
  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // height of sticky navbar + spacing
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  // Intersection Observer for highlighting sidebar based on scroll position
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -50% 0px', // detects when section is in top half
      threshold: 0.1,
    };

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleFeedbackChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim() || rating === 0) {
      dispatch(showError('Please fill out all fields and select a rating.'));
      return;
    }
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      dispatch(showError('Please enter a valid email address.'));
      return;
    }

    dispatch(showSuccess('Thank you for your feedback!'));
    setSubmitted(true);
    // Log feedback mock submission
    console.log('Feedback submitted:', { ...form, rating });
  };

  const handleResetFeedback = () => {
    setForm({ name: '', email: '', message: '' });
    setRating(0);
    setSubmitted(false);
  };

  return (
    <section className="bg-white border-t border-gray-100 py-16 sm:py-24" id="scholarship-info-center">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full">
            Information Portal
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-3 text-gray-900 font-display">
            Scholarship Information Center
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mt-2 text-sm sm:text-base leading-relaxed">
            Everything you need to know about the Prime Minister Special Scholarship Scheme, eligibility criteria, application process, and required documents.
          </p>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-gray-100 py-2.5 -mx-4 px-4 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
          {sections.map((s) => {
            const Icon = s.icon;
            const isSelected = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleScrollTo(s.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Desktop Layout grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8">
          {/* Sticky Sidebar Navigation Menu */}
          <div className="hidden md:block md:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div className="bg-surface-50 border border-gray-100 rounded-2xl p-4 shadow-card">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">
                  Quick Navigation
                </p>
                <nav className="flex flex-col gap-1">
                  {sections.map((s) => {
                    const Icon = s.icon;
                    const isSelected = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleScrollTo(s.id)}
                        className={`flex items-center justify-between w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                          isSelected
                            ? 'bg-primary-50 text-primary font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                          {s.label}
                        </span>
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isSelected ? 'text-primary translate-x-0.5' : 'text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sticky Sidebar Apply CTA */}
              <div className="bg-gradient-to-br from-primary-900 to-primary-700 text-white rounded-2xl p-5 shadow-primary/20 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
                <h4 className="font-bold text-lg mb-1 relative z-10 font-display">Ready to Apply?</h4>
                <p className="text-xs text-white/80 mb-4 relative z-10 leading-relaxed">
                  Start your online digital application for the PMSS scholarship now.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full bg-accent text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-accent-600 shadow-accent/20 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Cards Content Area */}
          <div className="md:col-span-9 space-y-8">
            {/* 1. Details */}
            <div id="details" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-blue-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Info className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">PMSS Scholarship Details</h3>
              </div>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                The PMSS Scholarship Portal helps eligible students apply for scholarships online.
                Students can register, submit applications, upload documents, and track application
                status through a secure digital platform.
              </p>
            </div>

            {/* 2. Benefits */}
            <div id="benefits" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-green-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Scholarship Benefits</h3>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  'Financial assistance for eligible students',
                  'Online application process',
                  'Real-time status tracking',
                  'Transparent approval process',
                  'Reduced paperwork',
                  'Faster scholarship disbursement',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-gray-600 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Eligibility */}
            <div id="eligibility" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-purple-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Eligibility Criteria</h3>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  'Must be a registered student',
                  'Must meet academic requirements',
                  'Must provide valid supporting documents',
                  'Family income should satisfy scholarship guidelines',
                  'Must possess a valid student ID',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-gray-600 text-sm">
                    <CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Exclusions */}
            <div id="exclusions" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-red-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <XCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Exclusions</h3>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  'Incomplete applications',
                  'Invalid documents',
                  'False information provided',
                  'Students not meeting eligibility requirements',
                  'Duplicate scholarship applications',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-gray-600 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 5. Application Process */}
            <div id="process" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-amber-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">How to Apply</h3>
              </div>
              <div className="relative border-l-2 border-amber-100 ml-4 pl-6 space-y-6">
                {[
                  { step: 'Step 1', title: 'Register an account', desc: 'Sign up with your basic contact and academic information.' },
                  { step: 'Step 2', title: 'Login to the portal', desc: 'Access your applicant dashboard using credentials.' },
                  { step: 'Step 3', title: 'Fill scholarship application form', desc: 'Provide academic details, bank details, and personal info.' },
                  { step: 'Step 4', title: 'Upload required documents', desc: 'Upload original scans of certificates as specified.' },
                  { step: 'Step 5', title: 'Submit application', desc: 'Verify inputs and submit the application for officer review.' },
                  { step: 'Step 6', title: 'Track application status', desc: 'Check the real-time timeline in your student dashboard.' },
                ].map((item, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-white border-2 border-amber-500 group-hover:bg-amber-500 transition-colors" />
                    <p className="text-xs font-bold text-amber-600 tracking-wider uppercase">{item.step}</p>
                    <h4 className="font-semibold text-gray-900 text-sm mt-0.5">{item.title}</h4>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Documents Required */}
            <div id="documents" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-indigo-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Required Documents</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3.5">
                {[
                  'Aadhaar Card',
                  'Student ID Card',
                  'Income Certificate',
                  'Community Certificate',
                  'Academic Mark Sheets',
                  'Passport Size Photograph',
                  'Bank Passbook Copy',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-50 border border-gray-100 hover:bg-indigo-50/10 transition-colors">
                    <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <span className="text-gray-700 text-xs sm:text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Frequently Asked Questions */}
            <div id="faq" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-sky-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Frequently Asked Questions</h3>
              </div>
              <div className="space-y-3">
                {[
                  {
                    q: 'How can I apply for a scholarship?',
                    a: 'Register, login, complete the form, upload documents, and submit.',
                  },
                  {
                    q: 'Can I track my application?',
                    a: 'Yes, real-time application tracking is available.',
                  },
                  {
                    q: 'What documents are required?',
                    a: 'Aadhaar, income certificate, mark sheets, bank details, and student ID.',
                  },
                  {
                    q: 'Can I edit my application after submission?',
                    a: 'Only before final verification by the administrator.',
                  },
                  {
                    q: 'How will I know my application status?',
                    a: 'Status updates are available in the dashboard and via notifications.',
                  },
                ].map((faq, idx) => {
                  const isOpen = !!openFaq[idx];
                  return (
                    <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden bg-surface-50 hover:bg-white hover:border-sky-100 transition-all duration-200">
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="flex items-center justify-between w-full px-5 py-4 text-left font-semibold text-gray-900 text-sm focus:outline-none"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
                      </button>
                      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                          <p className="px-5 pb-4 text-gray-500 text-xs sm:text-sm leading-relaxed border-t border-gray-50/50 pt-2 bg-white">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8. Sources and References */}
            <div id="sources" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-teal-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Bookmark className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Sources and References</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Government Scholarship Guidelines',
                  'PMSS Official Documentation',
                  'Educational Institution Verification Records',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-600 text-sm">
                    <Bookmark className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 9. Feedback */}
            <div id="feedback" className="card p-6 sm:p-8 scroll-mt-24 border-l-4 border-l-rose-500 hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 font-display">Provide Your Feedback</h3>
              </div>

              {submitted ? (
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 text-center animate-fade-in">
                  <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 fill-rose-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Feedback Submitted Successfully!</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Thank you for sharing your thoughts. Your feedback helps us continuously improve the scholarship portal experience.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFeedback}
                    className="btn-secondary py-2 px-4 text-xs font-semibold"
                  >
                    Submit Another Feedback
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-1">
                    Help us improve our portal. Share your application experience, questions, or general feedback.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="form-group">
                      <input
                        type="text"
                        id="feedback-name"
                        name="name"
                        placeholder="Your Name"
                        value={form.name}
                        onChange={handleFeedbackChange}
                        className="form-input"
                        required
                      />
                      <label htmlFor="feedback-name" className="form-label">Your Name</label>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                      <input
                        type="email"
                        id="feedback-email"
                        name="email"
                        placeholder="Email Address"
                        value={form.email}
                        onChange={handleFeedbackChange}
                        className="form-input"
                        required
                      />
                      <label htmlFor="feedback-email" className="form-label">Email Address</label>
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div className="flex flex-col gap-1.5 p-1">
                    <span className="text-xs font-semibold text-gray-500">Rating</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          className="p-1 focus:outline-none transition-transform duration-100 active:scale-90"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`h-6 w-6 transition-colors duration-150 ${
                              star <= (hoverRating || rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="text-xs font-semibold text-amber-600 ml-2 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          {rating} / 5 Star{rating > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="form-group">
                    <textarea
                      id="feedback-message"
                      name="message"
                      placeholder="Your Message"
                      rows="4"
                      value={form.message}
                      onChange={handleFeedbackChange}
                      className="form-input pt-6"
                      required
                    />
                    <label htmlFor="feedback-message" className="form-label">Your Message</label>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full sm:w-auto py-2.5 px-6 font-semibold"
                  >
                    Submit Feedback
                  </button>
                </form>
              )}
            </div>

            {/* Mobile Apply CTA */}
            <div className="md:hidden bg-gradient-to-br from-primary-900 to-primary-700 text-white rounded-2xl p-6 shadow-primary/20 shadow-lg text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
              <h4 className="font-bold text-lg mb-1 relative z-10 font-display">Ready to Apply?</h4>
              <p className="text-xs text-white/80 mb-4 relative z-10 max-w-sm mx-auto leading-relaxed">
                Start your online digital application for the PMSS scholarship now.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full bg-accent text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-accent-600 shadow-accent/20 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScholarshipInfoCenter;
