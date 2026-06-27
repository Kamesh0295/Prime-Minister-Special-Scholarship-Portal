require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const FAQ = require('./src/models/FAQ');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('════════════════════════════════════════════════════');
    console.log('         MongoDB Atlas Seeding Diagnostic Tool      ');
    console.log('════════════════════════════════════════════════════\n');

    console.log('🔄 Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ Database connected successfully.');

    // 1. Seed Admin Account
    const adminEmail = 'admin@pmss.gov.in';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log('🔄 Seeding default admin account...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123', salt);
      await User.create({
        fullName: 'PMSS Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log('🟢 Default admin account created successfully.');
      console.log('   Email:    admin@pmss.gov.in');
      console.log('   Password: Admin@123');
    } else {
      console.log('ℹ️ Admin account already exists (skipping).');
    }

    // 2. Seed FAQs
    const faqCount = await FAQ.countDocuments();
    if (faqCount === 0) {
      console.log('🔄 Seeding default chatbot FAQs...');
      const defaultFaqs = [
        {
          question: 'Am I eligible for this scholarship?',
          answer: 'To be eligible for PMSSS, you must be a resident of Jammu & Kashmir or Ladakh, have passed Class 12 or equivalent, and have a family income under ₹8,00,000 per annum. Standard General, Engineering, and Medical degree courses are supported.',
          category: 'eligibility'
        },
        {
          question: 'What documents are required?',
          answer: 'The required documents are:\n1. Aadhaar Card\n2. Domicile/State Residence Certificate\n3. Income Certificate\n4. Caste/Community Certificate\n5. Class 12 Marksheet\n6. Bank Passbook\n7. Bonafide College Certificate.',
          category: 'documents'
        },
        {
          question: 'How do I apply?',
          answer: 'First, navigate to "My Profile" and complete all details to at least 80%. Then, go to "Application", verify your pre-filled details, upload any additional files, and click "Submit Application".',
          category: 'process'
        },
        {
          question: 'When is the deadline?',
          answer: 'Scholarship deadlines are set by the Ministry of Education, Government of India. Please monitor the homepage announcements and dashboard notifications for the current registration deadlines.',
          category: 'deadlines'
        },
        {
          question: 'Why was my application rejected?',
          answer: 'Common reasons for rejection include: blurred or illegible documents, mismatched names between Aadhaar and academic marksheets, or incorrect bank details. Please check the remarks left by the reviewer, correct the details in your profile, and re-submit.',
          category: 'general'
        },
        {
          question: 'How can I update my profile?',
          answer: 'You can update your profile by navigating to the "My Profile" page. Fill in the required fields under the respective tabs, upload any updated documents, and click "Save Profile Changes" at the bottom.',
          category: 'general'
        }
      ];
      await FAQ.insertMany(defaultFaqs);
      console.log('🟢 FAQ Knowledge Base seeded successfully.');
    } else {
      console.log('ℹ️ FAQs already seeded (skipping).');
    }

    console.log('\n🎉 Database setup and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n🔴 CONNECTION/SEEDING FAILED!');
    console.error(`❌ Error Details: ${error.message}`);
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Verify your network connection and ensure your IP is whitelisted in MongoDB Atlas under Network Access.');
    console.log('2. Ensure you have URL-encoded any special characters in your password (like "@" as "%40").');
    console.log('3. Double-check that your cluster domain name is correct in your MONGO_URI.');
    process.exit(1);
  }
};

seed();
