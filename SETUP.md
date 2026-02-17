# Environment Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Firebase Project** (for authentication and data storage)
3. **Google AI API Key** (for Gemini AI features)

## Setup Steps

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd Procastify--AI-Powered-Learning-App
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp sample_env .env.local
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Copy your Firebase configuration values

### 4. Google AI API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key for Gemini
3. Copy the API key

### 5. Configure Environment Variables

Edit your `.env.local` file with your actual values:

```env
# Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 6. Firestore Security Rules

Set up basic security rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notes collection with proper ownership
    match /notes/{noteId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || request.auth.uid == resource.data.userId);
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
    
    // Public notes for community features
    match /notes/{noteId} {
      allow read: if resource.data.isPublic == true;
    }
    
    // Classrooms collection
    match /classrooms/{classroomId} {
      // Teachers can create and manage their own classrooms
      allow create: if request.auth != null && 
        request.resource.data.teacherId == request.auth.uid;
      
      // Teachers can read and write their own classrooms
      allow read, write: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
      
      // Students can read classrooms they are enrolled in
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.studentIds;
      
      // Students can join classrooms by adding themselves to studentIds
      // Only allow if: student is not already in the array, and they're adding themselves
      allow update: if request.auth != null && 
        request.auth.uid in request.resource.data.studentIds &&
        !(request.auth.uid in resource.data.studentIds);
    }
  }
}
```

### 7. Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 8. Features Verification

After setup, verify these features work:

- [x] **Guest Mode**: Users can start without registration
- [x] **Authentication**: Email/password login and registration  
- [x] **Custom Summarizer Modes**: Create and use custom AI prompts
- [x] **Notes System**: Document editor and canvas drawing
- [x] **AI Features**: Summary generation, flashcards, text-to-speech
- [x] **Data Persistence**: Guest data in localStorage, user data in Firestore

### 9. Troubleshooting

**Firebase Connection Issues:**
- Check your Firebase configuration values
- Ensure Firestore and Authentication are enabled
- Verify security rules are set correctly

**AI Features Not Working:**
- Verify your Gemini API key is correct
- Check browser console for API errors
- Ensure you have sufficient API quota

**Build Issues:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Update Node.js to the latest LTS version
- Check for TypeScript errors: `npm run build`

## Production Deployment

1. Set environment variables in your hosting platform
2. Build the project: `npm run build`
3. Deploy the `dist` folder to your static hosting service
4. Configure your domain in Firebase Authentication settings

## Security Notes

- Never commit `.env.local` or any file containing secrets
- Use Firebase Security Rules to protect user data
- Regularly rotate your API keys
- Monitor API usage and set up billing alerts