import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import ScholarshipInfoCenter from '../components/ScholarshipInfoCenter';
import {
  GraduationCap,
  CheckCircle,
  Users,
  FileText,
  ArrowRight,
  BookOpen,
  Award,
  ClipboardList,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react';

const eligibilityItems = [
  'Indian citizen pursuing full-time studies in India',
  'Family annual income below ₹6 lakh per annum',
  'Minimum 60% marks in previous qualifying examination',
  'Studying in a recognized institution/university',
  'Not availing any other central government scholarship',
  'SC / ST / OBC / General (EWS) categories eligible',
];

const steps = [
  { icon: Users,        label: 'Register',    desc: 'Create your account with basic details' },
  { icon: ClipboardList,label: 'Fill Form',   desc: 'Complete the scholarship application form' },
  { icon: FileText,     label: 'Upload Docs', desc: 'Upload required certificates and documents' },
  { icon: Award,        label: 'Get Approved',desc: 'Track status and receive scholarship funds' },
];

const stats = [
  { value: '12,000+', label: 'Scholars Awarded' },
  { value: '₹50,000', label: 'Max Annual Amount' },
  { value: '28',       label: 'States Covered' },
  { value: '500+',     label: 'Partner Institutions' },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Government tricolor strip */}
      <div className="gov-banner" />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0, transparent 50%), radial-gradient(circle at 80% 20%, #F59E0B 0, transparent 40%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/90 mb-6">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Official Government of India Portal
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4 font-display">
              Prime Minister
              <span className="text-accent block">Special Scholarship</span>
              Scheme
            </h1>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Empowering meritorious students from economically weaker sections through
              financial support for higher education. Apply online — completely paperless.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-accent px-7 py-3 text-base shadow-lg">
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 px-7 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white font-medium text-base transition-all duration-200">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1080 80 360 -20 0 20L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center p-4">
                <p className="text-3xl font-bold text-primary font-display">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-surface-50" id="about">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">About the Scheme</span>
              <h2 className="text-3xl font-bold mt-2 mb-4 text-gray-900">
                Supporting India's Brightest Minds
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The Prime Minister Special Scholarship Scheme (PMSS) is a flagship initiative
                by the Government of India to provide financial assistance to meritorious
                students from economically weaker sections pursuing higher education.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                The scheme aims to ensure that no eligible student is denied access to
                higher education due to financial constraints. Scholarships are disbursed
                directly to the student's bank account through Direct Benefit Transfer (DBT).
              </p>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-50 rounded-xl">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Fully Paperless Process</p>
                  <p className="text-xs text-gray-500">Apply, upload, track — all online</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'UG Scholarship', value: '₹30,000/year', color: 'bg-blue-50 text-blue-700' },
                { label: 'PG Scholarship', value: '₹50,000/year', color: 'bg-green-50 text-green-700' },
                { label: 'Technical Courses', value: '₹50,000/year', color: 'bg-purple-50 text-purple-700' },
                { label: 'Medical Courses',  value: '₹50,000/year', color: 'bg-amber-50 text-amber-700' },
              ].map((item, i) => (
                <div key={i} className="card p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color.split(' ')[1]} font-display`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-16 bg-white" id="eligibility">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Who Can Apply</span>
            <h2 className="text-3xl font-bold mt-2 text-gray-900">Eligibility Criteria</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {eligibilityItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-surface-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scholarship Information Center */}
      <ScholarshipInfoCenter />

      {/* How to Apply Section */}
      <section className="py-16 bg-primary-50" id="how-to-apply">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Simple Process</span>
            <h2 className="text-3xl font-bold mt-2 text-gray-900">How to Apply</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="card p-6 text-center relative group hover:shadow-card-md hover:-translate-y-1 transition-all duration-200">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-primary">
                    {i + 1}
                  </div>
                  <div className="h-14 w-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-2 group-hover:bg-primary-100 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.label}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Link to="/register" className="btn-primary px-8 py-3 text-base shadow-primary">
              Start Your Application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">PMSS Portal</span>
              </div>
              <p className="text-gray-400 text-sm max-w-xs">
                Prime Minister Special Scholarship Scheme — Government of India, Ministry of Education.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-gray-400">
              <p className="font-medium text-white mb-1">Contact</p>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                support@pmss.gov.in
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                1800-XXX-XXXX (Toll Free)
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Prime Minister Special Scholarship Scheme. Government of India.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
