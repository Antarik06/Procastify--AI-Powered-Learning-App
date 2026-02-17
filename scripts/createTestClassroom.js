// Browser Console Script to Create Test Classroom
// Copy and paste this into your browser console while logged in as a teacher

// Make sure you're logged in and have teacher role
// Then run: createTestClassroomInConsole()

window.createTestClassroomInConsole = async function() {
  try {
    // Get current user from localStorage or you'll need to provide userId and userName
    const session = localStorage.getItem('procastify_session');
    if (!session) {
      console.error('❌ Not logged in. Please log in first.');
      return;
    }

    // For Firebase users, you'll need to get the user ID from Firebase Auth
    // This is a simplified version - you may need to adjust based on your auth setup
    console.log('📝 Note: This script requires you to be logged in as a teacher.');
    console.log('💡 Better option: Use the "🧪 Create Test Classroom" button in the Classrooms page!');
    
    return {
      message: 'Please use the "🧪 Create Test Classroom" button in the Classrooms page instead.',
      instructions: [
        '1. Navigate to the Classrooms page',
        '2. Click the green "🧪 Create Test Classroom" button',
        '3. A test classroom with sample data will be created automatically'
      ]
    };
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

console.log('✅ Test classroom script loaded!');
console.log('💡 To create a test classroom:');
console.log('   1. Go to the Classrooms page');
console.log('   2. Click the green "🧪 Create Test Classroom" button');
console.log('   3. A test classroom with 3 sample virtual links will be created');

