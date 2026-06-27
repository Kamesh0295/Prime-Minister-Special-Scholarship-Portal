const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dns = require('dns');

// Configure custom DNS servers only when explicitly enabled.
// Some deployment environments resolve Atlas SRV records more reliably with their own DNS.
if (process.env.USE_CUSTOM_DNS === 'true') {
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  } catch (dnsErr) {
    console.warn('Failed to set custom DNS servers, using system default:', dnsErr.message);
  }
}

const sanitizeMongoUri = (uri) => {
  if (!uri) return uri;
  try {
    const protocolMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!protocolMatch) return uri;
    const protocol = protocolMatch[1];
    const rest = protocolMatch[2];
    const lastAtIdx = rest.lastIndexOf('@');
    if (lastAtIdx === -1) return uri;
    
    const creds = rest.substring(0, lastAtIdx);
    const hostDb = rest.substring(lastAtIdx + 1);
    
    const colonIdx = creds.indexOf(':');
    if (colonIdx === -1) {
      return protocol + encodeURIComponent(decodeURIComponent(creds)) + '@' + hostDb;
    }
    
    const username = creds.substring(0, colonIdx);
    const password = creds.substring(colonIdx + 1);
    
    const safeUsername = encodeURIComponent(decodeURIComponent(username));
    const safePassword = encodeURIComponent(decodeURIComponent(password));
    
    return protocol + safeUsername + ':' + safePassword + '@' + hostDb;
  } catch (err) {
    return uri;
  }
};

const getMongoUri = () => {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    ''
  );
};

const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error('MongoDB connection string is missing. Set MONGO_URI, MONGODB_URI, or DATABASE_URL in the deployment environment.');
    }

    const sanitizedUri = sanitizeMongoUri(mongoUri);
    const conn = await mongoose.connect(sanitizedUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✓ Connected to MongoDB Atlas');

    // Ensure all existing models are registered
    const modelsDir = path.join(__dirname, '../models');
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          require(path.join(modelsDir, file));
        }
      }
    }

    // Register temporary/dynamic schemas for collections without models
    const dynamicModels = {
      scholarships: {
        name: 'Scholarship',
        schema: new mongoose.Schema({
          name: String,
          description: String,
          provider: String,
          amount: String,
          criteria: String,
          isActive: { type: Boolean, default: true }
        }, { timestamps: true, strict: false })
      },
      documents: {
        name: 'Document',
        schema: new mongoose.Schema({
          fileName: String,
          fileType: String,
          uploadedBy: mongoose.Schema.Types.ObjectId,
          url: String
        }, { timestamps: true, strict: false })
      },
      chatbotmessages: {
        name: 'ChatbotMessage',
        schema: new mongoose.Schema({
          userId: mongoose.Schema.Types.ObjectId,
          messages: [{
            sender: String,
            text: String,
            timestamp: { type: Date, default: Date.now }
          }]
        }, { timestamps: true, strict: false })
      },
      analytics: {
        name: 'Analytics',
        schema: new mongoose.Schema({
          metricName: String,
          totalPageViews: Number,
          totalVisits: Number,
          lastUpdated: { type: Date, default: Date.now }
        }, { timestamps: true, strict: false })
      },
      recommendations: {
        name: 'Recommendation',
        schema: new mongoose.Schema({
          title: String,
          content: String,
          type: String
        }, { timestamps: true, strict: false })
      }
    };

    for (const [colName, config] of Object.entries(dynamicModels)) {
      if (!mongoose.models[config.name]) {
        mongoose.model(config.name, config.schema, colName);
      }
    }

    const requiredCollections = [
      { colName: 'users', modelName: 'User' },
      { colName: 'studentprofiles', modelName: 'StudentProfile' },
      { colName: 'applications', modelName: 'Application' },
      { colName: 'scholarships', modelName: 'Scholarship' },
      { colName: 'documents', modelName: 'Document' },
      { colName: 'notifications', modelName: 'Notification' },
      { colName: 'faqs', modelName: 'FAQ' },
      { colName: 'chatbotmessages', modelName: 'ChatbotMessage' },
      { colName: 'analytics', modelName: 'Analytics' },
      { colName: 'recommendations', modelName: 'Recommendation' }
    ];

    const db = mongoose.connection.db;
    const collectionsList = await db.listCollections().toArray();
    const existingColNames = collectionsList.map(c => c.name);

    for (const req of requiredCollections) {
      const Model = mongoose.model(req.modelName);

      // Create collection if it does not exist
      if (!existingColNames.includes(req.colName)) {
        await Model.createCollection();
      }

      // Check count and seed if empty
      const count = await Model.countDocuments();
      if (count === 0) {
        if (req.colName === 'users') {
          const adminEmail = 'admin@pmss.gov.in';
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('Admin@123', salt);
          await Model.create({
            fullName: 'PMSS Administrator',
            email: adminEmail,
            passwordHash,
            role: 'admin',
            isActive: true,
          });
        } else if (req.colName === 'faqs') {
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
          await Model.insertMany(defaultFaqs);
        } else if (req.colName === 'scholarships') {
          const defaultScholarships = [
            {
              name: 'Prime Minister Special Scholarship Scheme (PMSSS)',
              description: 'Specifically for students from Jammu & Kashmir and Ladakh pursuing undergraduate professional degrees.',
              provider: 'AICTE / Ministry of Education, Govt. of India',
              amount: '₹1,50,000 to ₹3,00,000 per annum',
              criteria: 'Domicile of J&K/Ladakh, Family income <= 8 LPA, Passed 10+2.',
              isActive: true
            },
            {
              name: 'Central Sector Scheme of Scholarship for College & University Students',
              description: 'For university students scoring above 80th percentile or outstanding CGPA in their studies.',
              provider: 'Department of Higher Education, Govt. of India',
              amount: '₹12,000 to ₹20,000 per annum',
              criteria: 'Marks/CGPA >= 8.0 (80%), Family income <= 4.5 LPA.',
              isActive: true
            },
            {
              name: 'Post-Matric Scholarship Scheme for OBC Students',
              description: 'Financial support for OBC category students pursuing higher education.',
              provider: 'Ministry of Social Justice and Empowerment, Govt. of India',
              amount: '₹10,000 to ₹50,000 per annum',
              criteria: 'OBC category student, family income <= 2.5 LPA.',
              isActive: true
            }
          ];
          await Model.insertMany(defaultScholarships);
        } else if (req.colName === 'analytics') {
          await Model.create({
            metricName: 'General Portal Statistics',
            totalPageViews: 0,
            totalVisits: 0,
            lastUpdated: new Date()
          });
        } else {
          // Find the seeded admin user to serve as a valid reference ID for relationships
          const adminUser = await mongoose.model('User').findOne({ email: 'admin@pmss.gov.in' });
          const refUserId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

          // Minimum required seed document for other collections
          if (req.colName === 'studentprofiles') {
            await Model.create({
              studentId: refUserId,
              fullName: 'Placeholder Student',
              dob: new Date('2000-01-01'),
              gender: 'Male',
              category: 'General',
              email: 'student.placeholder@pmss.gov.in',
              phone: '0000000000',
              profileCompleted: false,
              completionPercentage: 0,
              verificationStatus: 'pending'
            });
          } else if (req.colName === 'applications') {
            await Model.create({
              studentId: refUserId,
              status: 'draft',
              personalDetails: {
                fullName: 'Placeholder Student',
                category: 'General',
                gender: 'Male',
                state: 'Jammu & Kashmir'
              },
              academicDetails: {
                institutionName: 'Placeholder College',
                courseName: 'B.Tech',
                yearOfStudy: '1st Year'
              }
            });
          } else if (req.colName === 'documents') {
            await Model.create({
              fileName: 'placeholder.pdf',
              fileType: 'pdf',
              url: '/uploads/placeholder.pdf'
            });
          } else if (req.colName === 'notifications') {
            await Model.create({
              recipientId: refUserId,
              title: 'System Notification Ready',
              message: 'Database initialized successfully.',
              type: 'info'
            });
          } else if (req.colName === 'chatbotmessages') {
            await Model.create({
              userId: refUserId,
              messages: [
                { sender: 'bot', text: 'System chatbot messages initialized.', timestamp: new Date() }
              ]
            });
          } else if (req.colName === 'recommendations') {
            await Model.create({
              title: 'General Recommendation',
              content: 'Please fill out your student profile to view custom recommendations.',
              type: 'general'
            });
          }
        }
      }

      console.log(`✓ ${req.colName} collection ready`);
    }

    return conn;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    console.error('If this is MongoDB Atlas, check Network Access / IP whitelist and confirm the Render service can reach the cluster.');
    console.error('Also verify the connection string, username, password, and database name in the deployment environment.');
    process.exit(1);
  }
};

module.exports = connectDB;
