import React, { useState } from 'react';
import { CalendarEvent, CalendarEventType, Classroom, UserPreferences, VirtualClassLink } from '../types';
import { ClassroomService } from '../services/classroomService';
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Trash2, Calendar, BookOpen, FileText, GraduationCap, Clock, Video } from 'lucide-react';

interface ClassroomCalendarProps {
  classroom: Classroom;
  user: UserPreferences;
  onUpdate: () => void;
}

const EVENT_TYPES: { value: CalendarEventType; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'lecture', label: 'Lecture', color: 'bg-blue-500', icon: <BookOpen size={14} /> },
  { value: 'assignment', label: 'Assignment', color: 'bg-orange-500', icon: <FileText size={14} /> },
  { value: 'exam', label: 'Exam', color: 'bg-red-500', icon: <GraduationCap size={14} /> },
  { value: 'revision', label: 'Revision', color: 'bg-green-500', icon: <BookOpen size={14} /> },
  { value: 'custom', label: 'Custom', color: 'bg-purple-500', icon: <Calendar size={14} /> },
];

const MEETING_TYPE = { label: 'Virtual Meeting', color: 'bg-indigo-500', icon: <Video size={14} /> };

const ClassroomCalendar: React.FC<ClassroomCalendarProps> = ({ classroom, user, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('lecture');

  const isTeacher = user.role === 'teacher' && classroom.teacherId === user.id;
  
  // Convert scheduled virtual links to calendar event format
  const virtualMeetings = (classroom.virtualLinks || [])
    .filter(link => link.scheduledDate)
    .map(link => {
      const date = new Date(link.scheduledDate!);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      return {
        id: `meeting-${link.id}`,
        title: link.title,
        description: link.description,
        date: link.scheduledDate!,
        time: timeString,
        eventType: 'custom' as CalendarEventType, // Use custom but render with meeting style
        createdBy: link.createdBy,
        createdAt: link.createdAt,
        isMeeting: true, // Flag to identify as meeting
        meetingUrl: link.url
      };
    });
  
  // Combine calendar events with virtual meetings
  const events = [...(classroom.calendarEvents || []), ...virtualMeetings];

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, date);
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openAddEvent = (date: Date) => {
    if (!isTeacher) return;
    setSelectedDate(date);
    setEditingEvent(null);
    setEventTitle('');
    setEventDescription('');
    setEventTime('');
    setEventType('lecture');
    setShowEventModal(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    if (!isTeacher) return;
    setEditingEvent(event);
    setSelectedDate(new Date(event.date));
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventTime(event.time || '');
    setEventType(event.eventType);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !selectedDate) return;
    setSaving(true);

    try {
      if (editingEvent) {
        await ClassroomService.updateCalendarEvent(classroom.id, editingEvent.id, {
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          date: selectedDate.getTime(),
          time: eventTime || undefined,
          eventType
        });
      } else {
        await ClassroomService.addCalendarEvent(classroom.id, {
          title: eventTitle.trim(),
          description: eventDescription.trim() || undefined,
          date: selectedDate.getTime(),
          time: eventTime || undefined,
          eventType,
          createdBy: user.id
        });
      }
      setShowEventModal(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await ClassroomService.deleteCalendarEvent(classroom.id, eventId);
      onUpdate();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getEventTypeConfig = (type: CalendarEventType, isMeeting?: boolean) => {
    if (isMeeting) return MEETING_TYPE;
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[4];
  };

  // Render calendar grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Empty cells for days before start
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-[#1e1f22]" />);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = isSameDay(date, today);

      days.push(
        <div
          key={day}
          className={`h-24 bg-[#2b2d31] border border-white/5 p-1 overflow-hidden cursor-pointer hover:bg-[#36393f] transition-colors ${isToday ? 'ring-2 ring-[#5865F2]' : ''}`}
          onClick={() => isTeacher && openAddEvent(date)}
        >
          <div className={`text-xs font-medium mb-1 ${isToday ? 'text-[#5865F2]' : 'text-gray-400'}`}>
            {day}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 3).map(event => {
              const isMeeting = (event as any).isMeeting;
              const config = getEventTypeConfig(event.eventType, isMeeting);
              const meetingUrl = (event as any).meetingUrl;
              return (
                <div
                  key={event.id}
                  className={`${config.color} text-white text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${isMeeting ? 'cursor-pointer hover:opacity-80' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMeeting && meetingUrl) {
                      window.open(meetingUrl, '_blank');
                    } else if (!isMeeting) {
                      openEditEvent(event);
                    }
                  }}
                >
                  {config.icon}
                  <span className="truncate">{event.title}</span>
                  {event.time && <span className="text-[10px] opacity-80">@{event.time}</span>}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-400">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // Upcoming events list
  const upcomingEvents = events
    .filter(e => e.date >= Date.now())
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-[#5865F2]" size={24} />
          Class Calendar
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {EVENT_TYPES.map(type => (
          <div key={type.value} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className={`w-3 h-3 rounded ${type.color}`} />
            {type.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className={`w-3 h-3 rounded ${MEETING_TYPE.color}`} />
          {MEETING_TYPE.label}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#2b2d31] rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-[#1e1f22]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {renderCalendar()}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-[#2b2d31] rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Clock size={18} className="text-[#5865F2]" />
          Upcoming Events
        </h3>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming events scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const isMeeting = (event as any).isMeeting;
              const meetingUrl = (event as any).meetingUrl;
              const config = getEventTypeConfig(event.eventType, isMeeting);
              const eventDate = new Date(event.date);
              return (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors ${isMeeting ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (isMeeting && meetingUrl) {
                      window.open(meetingUrl, '_blank');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {event.title}
                        {isMeeting && <span className="text-xs bg-indigo-500/30 px-2 py-0.5 rounded">Meeting</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {eventDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {event.time && ` at ${event.time}`}
                      </div>
                      {isMeeting && event.description && (
                        <div className="text-xs text-gray-500 mt-1">{event.description}</div>
                      )}
                    </div>
                  </div>
                  {!isMeeting && isTeacher && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditEvent(event)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2b2d31] p-6 rounded-2xl w-full max-w-md border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h3>
              <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#5865F2] resize-none"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Time (optional)</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setEventType(type.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1 ${eventType === type.value
                        ? `${type.color} border-transparent text-white`
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSaveEvent}
                disabled={!eventTitle.trim() || saving}
                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomCalendar;
