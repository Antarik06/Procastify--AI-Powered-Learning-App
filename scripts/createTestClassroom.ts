// Test script to create a fake classroom for testing
// Run this in the browser console or as a standalone script

import { ClassroomService } from '../services/classroomService';
import { VirtualClassLink } from '../types';

export const createTestClassroom = async (teacherId: string, teacherName: string) => {
  try {
    console.log('Creating test classroom...');
    
    // Create the classroom
    const classroom = await ClassroomService.createClassroom(
      teacherId,
      teacherName,
      'Test Mathematics 101',
      'This is a test classroom for Mathematics 101. Join to test the classroom features including virtual class links, announcements, and resources.'
    );

    console.log('Classroom created:', classroom);
    console.log('Invite Code:', classroom.inviteCode);

    // Add some sample virtual links
    const sampleLinks = [
      {
        title: 'Weekly Math Review Session',
        url: 'https://zoom.us/j/1234567890',
        description: 'Join us every Monday at 3 PM for a comprehensive review of the week\'s topics',
        scheduledDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: teacherId
      },
      {
        title: 'Office Hours - Google Meet',
        url: 'https://meet.google.com/abc-defg-hij',
        description: 'Drop-in office hours for questions and help',
        scheduledDate: Date.now() + (2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdBy: teacherId
      },
      {
        title: 'Final Exam Review',
        url: 'https://zoom.us/j/9876543210',
        description: 'Comprehensive review session before the final exam',
        scheduledDate: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days from now
        createdBy: teacherId
      }
    ];

    for (const linkData of sampleLinks) {
      await ClassroomService.addVirtualLink(classroom.id, linkData);
      console.log('Added link:', linkData.title);
    }

    console.log('✅ Test classroom created successfully!');
    console.log('📋 Classroom Details:');
    console.log('   Name:', classroom.name);
    console.log('   ID:', classroom.id);
    console.log('   Invite Code:', classroom.inviteCode);
    console.log('   Virtual Links:', sampleLinks.length);
    
    return classroom;
  } catch (error) {
    console.error('❌ Error creating test classroom:', error);
    throw error;
  }
};

// For browser console usage
if (typeof window !== 'undefined') {
  (window as any).createTestClassroom = createTestClassroom;
}

