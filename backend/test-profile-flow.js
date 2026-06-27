const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('🏁 Starting End-to-End API Flow Verification...\n');

  try {
    // 1. Register a new student
    const email = `test_student_${Date.now()}@pmss.gov.in`;
    const password = 'Password123';
    console.log(`Step 1: Registering new student with email: ${email}`);
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Student',
        email,
        password,
        phone: '9876543210',
        dateOfBirth: '2000-01-01',
        state: 'Tamil Nadu',
        district: 'Chennai',
        institution: 'Chennai College',
        course: 'Engineering',
        yearOfStudy: '1st Year',
        role: 'student'
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok || !regData.success) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log('✅ Student registered successfully.');
    const studentToken = regData.data.token;

    // 2. Upload Profile documents (Photo + PDFs)
    console.log('\nStep 2: Uploading mock profile photo and PDFs...');
    const formData = new FormData();
    
    // Create File objects from the local dummy files
    const dummyPdfBuffer = fs.readFileSync(path.join(__dirname, '../dummy.pdf'));
    const dummyJpgBuffer = fs.readFileSync(path.join(__dirname, '../dummy.jpg'));
    
    formData.append('photo', new Blob([dummyJpgBuffer], { type: 'image/jpeg' }), 'dummy.jpg');
    formData.append('aadhaar', new Blob([dummyPdfBuffer], { type: 'application/pdf' }), 'dummy.pdf');
    formData.append('incomeCertificate', new Blob([dummyPdfBuffer], { type: 'application/pdf' }), 'dummy.pdf');
    formData.append('marksheet', new Blob([dummyPdfBuffer], { type: 'application/pdf' }), 'dummy.pdf');
    formData.append('bankPassbook', new Blob([dummyPdfBuffer], { type: 'application/pdf' }), 'dummy.pdf');

    const uploadRes = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(`File upload failed: ${JSON.stringify(uploadData)}`);
    }
    console.log('✅ Files uploaded successfully:', Object.keys(uploadData.data));

    // 3. Update/Save Student Profile Details
    console.log('\nStep 3: Completing student profile details...');
    const profilePayload = {
      fullName: 'Test Student',
      dob: '2000-01-01',
      gender: 'Male',
      email,
      phone: '9876543210',
      aadhaar: '123456789012',
      bloodGroup: 'O+',
      nationality: 'Indian',
      address: {
        permanentAddress: '123 Main Street',
        currentAddress: '123 Main Street',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600001'
      },
      collegeName: 'Chennai College',
      universityName: 'Anna University',
      degree: 'B.E.',
      department: 'Engineering',
      yearOfStudy: '1st Year',
      rollNumber: 'REG100200',
      academicYear: '2024-25',
      cgpa: 85,
      fatherName: 'Father Name',
      motherName: 'Mother Name',
      parentOccupation: 'Service',
      familyIncome: 250000,
      bankName: 'State Bank of India',
      accountHolderName: 'Test Student',
      accountNumber: '100020003000',
      ifscCode: 'SBIN0000123',
      branchName: 'Chennai Main',
      profilePhoto: uploadData.data.photo,
      documents: {
        aadhaar: uploadData.data.aadhaar,
        incomeCertificate: uploadData.data.incomeCertificate,
        marksheet: uploadData.data.marksheet,
        bankPassbook: uploadData.data.bankPassbook
      }
    };

    const profileUpdateRes = await fetch(`${BASE_URL}/student/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify(profilePayload)
    });

    const profileUpdateData = await profileUpdateRes.json();
    if (!profileUpdateRes.ok || !profileUpdateData.success) {
      throw new Error(`Profile update failed: ${JSON.stringify(profileUpdateData)}`);
    }
    console.log(`✅ Profile updated. Completion status: ${profileUpdateData.data.completionPercentage}% Complete, Completed status: ${profileUpdateData.data.profileCompleted}`);
    if (!profileUpdateData.data.profileCompleted || profileUpdateData.data.completionPercentage < 100) {
      throw new Error('Profile was not marked as completed at 100%.');
    }

    // 4. Create and Submit Scholarship Application Form
    console.log('\nStep 4: Submitting Scholarship Application (autofilling profile details)...');
    const applicationPayload = {
      personalDetails: {
        fullName: profileUpdateData.data.fullName,
        dateOfBirth: profileUpdateData.data.dob,
        gender: profileUpdateData.data.gender,
        aadhaarNumber: profileUpdateData.data.aadhaar,
        phone: profileUpdateData.data.phone,
        email: profileUpdateData.data.email,
        permanentAddress: profileUpdateData.data.address.permanentAddress,
        state: profileUpdateData.data.address.state,
        district: profileUpdateData.data.address.district,
        religion: 'Hinduism',
        category: 'General'
      },
      academicDetails: {
        institutionName: profileUpdateData.data.collegeName,
        courseName: profileUpdateData.data.degree,
        yearOfStudy: profileUpdateData.data.yearOfStudy,
        rollNumber: profileUpdateData.data.rollNumber,
        previousYearMarks: profileUpdateData.data.cgpa,
        boardUniversityName: profileUpdateData.data.universityName
      },
      bankDetails: {
        accountHolderName: profileUpdateData.data.accountHolderName,
        bankName: profileUpdateData.data.bankName,
        branchName: profileUpdateData.data.branchName,
        accountNumber: profileUpdateData.data.accountNumber,
        ifscCode: profileUpdateData.data.ifscCode
      },
      documents: {
        aadhaar: profileUpdateData.data.documents.aadhaar,
        incomeCertificate: profileUpdateData.data.documents.incomeCertificate,
        marksheet: profileUpdateData.data.documents.marksheet,
        bankPassbook: profileUpdateData.data.documents.bankPassbook,
        photo: profileUpdateData.data.profilePhoto,
        bonafide: profileUpdateData.data.documents.aadhaar // Reuse Aadhaar as mock bonafide for testing
      }
    };

    const appSubmitRes = await fetch(`${BASE_URL}/student/application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify(applicationPayload)
    });

    const appSubmitData = await appSubmitRes.json();
    if (!appSubmitRes.ok || !appSubmitData.success) {
      throw new Error(`Application submission failed: ${JSON.stringify(appSubmitData)}`);
    }
    console.log(`✅ Application submitted successfully. Status: ${appSubmitData.data.status}`);

    // 5. Admin Login
    console.log('\nStep 5: Logging in as Admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pmss.gov.in',
        password: 'Admin@123'
      })
    });

    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminLoginData.success) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
    }
    console.log('✅ Admin login successful.');
    const adminToken = adminLoginData.data.token;

    // 6. Admin lists student profiles to locate the new profile
    console.log('\nStep 6: Listing student profiles from admin panel...');
    const profilesRes = await fetch(`${BASE_URL}/admin/profiles?search=Test Student`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const profilesData = await profilesRes.json();
    if (!profilesRes.ok || !profilesData.success) {
      throw new Error(`Fetch profiles failed: ${JSON.stringify(profilesData)}`);
    }

    const foundProfile = profilesData.data.profiles.find(p => p.email === email);
    if (!foundProfile) {
      throw new Error(`Profile for ${email} not found in admin profiles list.`);
    }
    console.log(`✅ Found student profile in list with verification status: ${foundProfile.verificationStatus}`);

    // 7. Admin verifies the profile
    console.log(`\nStep 7: Verifying and approving student profile (ID: ${foundProfile._id})...`);
    const verifyRes = await fetch(`${BASE_URL}/admin/profiles/${foundProfile._id}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'verified',
        remarks: 'All documents and credentials verified successfully.'
      })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(`Admin profile verification failed: ${JSON.stringify(verifyData)}`);
    }
    console.log(`✅ Student profile verification status updated to: ${verifyData.data.verificationStatus}`);
    
    console.log('\n🎉 ALL END-TO-END FLOW TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ TEST FLOW FAILED:', error.message);
    process.exit(1);
  }
}

runTest();
