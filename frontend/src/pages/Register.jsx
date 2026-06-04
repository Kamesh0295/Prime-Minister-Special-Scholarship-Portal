import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure } from '../store/slices/authSlice';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { registerStudent } from '../services/authService';
import { GraduationCap, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const initialForm = {
  fullName: '', email: '', password: '', confirmPassword: '',
  phone: '', dateOfBirth: '', state: '', district: '', institution: '',
  course: '', yearOfStudy: '',
};

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((s) => s.auth);
  const [form, setForm] = useState(initialForm);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(0); // 0 = account, 1 = personal

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validateStep0 = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'Valid email is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const validateStep1 = () => {
    if (form.phone && !/^\d{10}$/.test(form.phone)) return 'Phone must be exactly 10 digits.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep0();
    if (err) { dispatch(showError(err)); return; }
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep1();
    if (err) { dispatch(showError(err)); return; }

    dispatch(authStart());
    try {
      const { confirmPassword, ...payload } = form;
      const res = await registerStudent(payload);
      if (res.data.success) {
        dispatch(authSuccess(res.data.data));
        dispatch(showSuccess('Registration successful! Welcome to PMSS.'));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      dispatch(authFailure(msg));
      dispatch(showError(msg));
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <div className="gov-banner" />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center bg-primary rounded-2xl shadow-primary mb-4">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">Apply for PMSS Scholarship</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['Account Info', 'Personal Info'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                  i < step ? 'bg-primary border-primary text-white'
                  : i === step ? 'border-primary text-primary'
                  : 'border-gray-200 text-gray-400'
                }`}>
                  {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
                {i < 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <div className="card p-8 shadow-card-md">
            <form onSubmit={handleSubmit} noValidate>
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Account Credentials</h2>

                  <div className="form-group">
                    <input type="text" id="reg-fullname" name="fullName" placeholder="Full Name"
                      value={form.fullName} onChange={handleChange} className="form-input" required />
                    <label htmlFor="reg-fullname" className="form-label">Full Name *</label>
                  </div>

                  <div className="form-group">
                    <input type="email" id="reg-email" name="email" placeholder="Email Address"
                      value={form.email} onChange={handleChange} className="form-input" required />
                    <label htmlFor="reg-email" className="form-label">Email Address *</label>
                  </div>

                  <div className="form-group">
                    <input type={showPass ? 'text' : 'password'} id="reg-password" name="password"
                      placeholder="Password" value={form.password} onChange={handleChange}
                      className="form-input pr-12" required />
                    <label htmlFor="reg-password" className="form-label">Password (min 8 chars) *</label>
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="form-group">
                    <input type={showPass ? 'text' : 'password'} id="reg-confirm" name="confirmPassword"
                      placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange}
                      className="form-input" required />
                    <label htmlFor="reg-confirm" className="form-label">Confirm Password *</label>
                  </div>

                  <button type="button" onClick={handleNext}
                    className="btn-primary w-full py-3 text-base mt-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Personal & Academic Details</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <input type="tel" id="reg-phone" name="phone" placeholder="Phone Number"
                        value={form.phone} onChange={handleChange} className="form-input" maxLength={10} />
                      <label htmlFor="reg-phone" className="form-label">Phone (10 digits)</label>
                    </div>
                    <div className="form-group">
                      <input type="date" id="reg-dob" name="dateOfBirth" placeholder="Date of Birth"
                        value={form.dateOfBirth} onChange={handleChange} className="form-input" />
                      <label htmlFor="reg-dob" className="form-label">Date of Birth</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-state" className="text-xs font-medium text-gray-600 mb-1 block">State</label>
                      <select id="reg-state" name="state" value={form.state} onChange={handleChange} className="form-select">
                        <option value="">Select State</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <input type="text" id="reg-district" name="district" placeholder="District"
                        value={form.district} onChange={handleChange} className="form-input" />
                      <label htmlFor="reg-district" className="form-label">District</label>
                    </div>
                  </div>

                  <div className="form-group">
                    <input type="text" id="reg-institution" name="institution" placeholder="Institution Name"
                      value={form.institution} onChange={handleChange} className="form-input" />
                    <label htmlFor="reg-institution" className="form-label">Institution Name</label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <input type="text" id="reg-course" name="course" placeholder="Course Name"
                        value={form.course} onChange={handleChange} className="form-input" />
                      <label htmlFor="reg-course" className="form-label">Course Name</label>
                    </div>
                    <div>
                      <label htmlFor="reg-year" className="text-xs font-medium text-gray-600 mb-1 block">Year of Study</label>
                      <select id="reg-year" name="yearOfStudy" value={form.yearOfStudy} onChange={handleChange} className="form-select">
                        <option value="">Select Year</option>
                        {['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(y =>
                          <option key={y} value={y}>{y}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1 py-3">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button type="submit" id="register-btn" disabled={loading} className="btn-primary flex-1 py-3 text-base">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : <>Register <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
