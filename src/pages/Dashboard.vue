<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>My Whiteboards</h1>
      <button @click="openNewWhiteboardModal" class="btn btn-primary">
        <i class="fas fa-plus"></i> New Whiteboard
      </button>
    </div>

    <div class="dashboard-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'whiteboards' }"
        @click="activeTab = 'whiteboards'"
      >
        <i class="fas fa-chalkboard"></i> My Whiteboards
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'sessions' }"
        @click="activeTab = 'sessions'"
      >
        <i class="fas fa-calendar-alt"></i> Scheduled Sessions
      </button>
    </div>

    <!-- Whiteboards Tab -->
    <div v-if="activeTab === 'whiteboards'">
      <div v-if="loading" class="loading-container">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading your whiteboards...</p>
      </div>

      <div v-else-if="whiteboards.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-chalkboard"></i>
        </div>
        <h2>No whiteboards yet</h2>
        <p>Create your first whiteboard to get started</p>
        <button @click="openNewWhiteboardModal" class="btn btn-primary">
          <i class="fas fa-plus"></i> Create Whiteboard
        </button>
      </div>

      <div v-else class="whiteboard-grid">
        <div 
          v-for="whiteboard in whiteboards" 
          :key="whiteboard.id" 
          class="whiteboard-card"
        >
          <div class="whiteboard-preview" @click="openWhiteboard(whiteboard.id)">
            <div class="whiteboard-thumbnail">
              <i class="fas fa-chalkboard"></i>
            </div>
            <div class="whiteboard-info">
              <h3>{{ whiteboard.title }}</h3>
              <p class="whiteboard-meta">
                <span>{{ formatDate(whiteboard.updatedAt) }}</span>
                <span>{{ whiteboard.pages.length }} pages</span>
              </p>
            </div>
          </div>
          <div class="whiteboard-actions">
            <button @click="openWhiteboard(whiteboard.id)" class="btn btn-icon" title="Open whiteboard">
              <i class="fas fa-pencil-alt"></i>
            </button>
            <button @click="scheduleSession(whiteboard)" class="btn btn-icon" title="Schedule session">
              <i class="fas fa-calendar-alt"></i>
            </button>
            <button @click="shareWhiteboard(whiteboard)" class="btn btn-icon" title="Share whiteboard">
              <i class="fas fa-share-alt"></i>
            </button>
            <button @click="deleteWhiteboard(whiteboard.id)" class="btn btn-icon btn-danger" title="Delete whiteboard">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Tab -->
    <div v-if="activeTab === 'sessions'">
      <div v-if="loadingSessions" class="loading-container">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading your scheduled sessions...</p>
      </div>

      <div v-else-if="sessions.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <h2>No scheduled sessions</h2>
        <p>Schedule a session from any of your whiteboards</p>
      </div>

      <div v-else class="sessions-list">
        <div 
          v-for="session in sortedSessions" 
          :key="session.id" 
          class="session-card"
          :class="{ 'past-session': isPastSession(session) }"
        >
          <div class="session-header">
            <h3>{{ session.whiteboardTitle }}</h3>
            <div class="session-badge" :class="getSessionStatusClass(session)">
              {{ getSessionStatusText(session) }}
            </div>
          </div>
          
          <div class="session-details">
            <p class="session-time">
              <i class="fas fa-clock"></i>
              {{ formatSessionDateTime(session.dateTime) }} 
              ({{ session.duration }} min)
            </p>
            
            <p class="session-attendees">
              <i class="fas fa-users"></i>
              {{ session.attendees.length }} attendees
            </p>
            
            <div v-if="session.notes" class="session-notes">
              <p><strong>Notes:</strong> {{ session.notes }}</p>
            </div>
          </div>
          
          <div class="session-actions">
            <button @click="joinSession(session)" class="btn btn-primary session-btn">
              <i class="fas fa-sign-in-alt"></i> Join Session
            </button>
            
            <button @click="resendInvites(session)" class="btn btn-outline session-btn">
              <i class="fas fa-envelope"></i> Resend Invites
            </button>
            
            <button @click="deleteSession(session.id)" class="btn btn-danger session-btn">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Whiteboard Modal -->
    <div v-if="showNewWhiteboardModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Create New Whiteboard</h2>
          <button @click="closeModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="whiteboard-title">Whiteboard Title</label>
            <input 
              type="text" 
              id="whiteboard-title" 
              v-model="newWhiteboardTitle" 
              placeholder="Enter a title for your whiteboard"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-outline">Cancel</button>
          <button @click="createWhiteboard" class="btn btn-primary" :disabled="createLoading">
            <i v-if="createLoading" class="fas fa-spinner fa-spin"></i>
            <span v-else>Create</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Share Whiteboard Modal -->
    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Share Whiteboard</h2>
          <button @click="closeShareModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Share this link with your students or colleagues:</p>
          <div class="share-link-container">
            <input 
              type="text" 
              v-model="shareLink" 
              readonly
              ref="shareLinkInput"
            />
            <button @click="copyShareLink" class="btn btn-primary">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <p v-if="linkCopied" class="copied-message">
            <i class="fas fa-check"></i> Link copied to clipboard!
          </p>
        </div>
      </div>
    </div>

    <!-- Schedule Session Modal -->
    <div v-if="showScheduleModal" class="modal-overlay" @click="closeScheduleModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Schedule Whiteboard Session</h2>
          <button @click="closeScheduleModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="session-date">Date</label>
            <input 
              type="date" 
              id="session-date" 
              v-model="sessionDate"
              :min="minDate"
            />
          </div>
          <div class="form-group">
            <label for="session-time">Time</label>
            <input 
              type="time" 
              id="session-time" 
              v-model="sessionTime"
            />
          </div>
          <div class="form-group">
            <label for="session-duration">Duration (minutes)</label>
            <select id="session-duration" v-model="sessionDuration">
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div class="form-group">
            <label>Share with:</label>
            <div class="email-input-container">
              <input 
                type="text" 
                v-model="newEmail" 
                placeholder="Enter email address"
                @keyup.enter="addEmail"
              />
              <button @click="addEmail" class="btn btn-primary">Add</button>
            </div>
            <div v-if="emails.length > 0" class="email-list">
              <div v-for="(email, index) in emails" :key="index" class="email-tag">
                {{ email }}
                <button @click="removeEmail(index)" class="btn-remove">×</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="session-notes">Additional notes</label>
            <textarea 
              id="session-notes" 
              v-model="sessionNotes" 
              placeholder="Add any additional notes for the session"
              rows="3"
            ></textarea>
          </div>

          <div v-if="scheduleLink" class="schedule-link-container">
            <p>Click below to create an email invitation:</p>
            <a :href="emailLink" class="email-link" target="_blank">
              <i class="fas fa-envelope"></i> Send Email Invitation
            </a>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeScheduleModal" class="btn btn-outline">Cancel</button>
          <button @click="generateScheduleLink" class="btn btn-primary" :disabled="!isScheduleFormValid">
            Generate Link
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '@/store/auth'
import { useWhiteboardStore } from '@/store/whiteboard'
import { v4 as uuidv4 } from 'uuid'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'DashboardPage',
  setup() {
    const router = useRouter()
    const whiteboardStore = useWhiteboardStore()
    const authStore = useAuthStore()
    
    // Whiteboards data
    const loading = computed(() => whiteboardStore.loading)
    const whiteboards = computed(() => whiteboardStore.whiteboards)
    
    // New whiteboard modal
    const showNewWhiteboardModal = ref(false)
    const newWhiteboardTitle = ref('')
    const createLoading = ref(false)
    
    // Share modal
    const showShareModal = ref(false)
    const shareLink = ref('')
    const shareLinkInput = ref(null)
    const linkCopied = ref(false)
    const selectedWhiteboard = ref(null)
    
    // Schedule modal
    const showScheduleModal = ref(false)
    const sessionDate = ref('')
    const sessionTime = ref('')
    const sessionDuration = ref('60')
    const sessionNotes = ref('')
    const emails = ref([])
    const newEmail = ref('')
    const scheduleLink = ref('')
    
    // Dashboard tabs
    const activeTab = ref('whiteboards')
    
    // Sessions data
    const sessions = ref([])
    const loadingSessions = ref(false)
    
    // Computed properties
    const minDate = computed(() => {
      const today = new Date()
      return today.toISOString().split('T')[0]
    })
    
    const isScheduleFormValid = computed(() => {
      return sessionDate.value && sessionTime.value && sessionDuration.value && emails.value.length > 0
    })
    
    const emailLink = computed(() => {
      if (!scheduleLink.value) return ''
      
      const subject = encodeURIComponent(`Invitation to Whiteboard Session: ${selectedWhiteboard.value?.title || 'Untitled Whiteboard'}`)
      
      // Format date and time for email
      let dateObj = new Date(`${sessionDate.value}T${sessionTime.value}`)
      const dateTimeFormatted = dateObj.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      
      // Calculate end time
      const endDateObj = new Date(dateObj.getTime() + parseInt(sessionDuration.value) * 60 * 1000)
      const endTimeFormatted = endDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
      
      // Build email body
      let body = encodeURIComponent(
        `Hello,\n\n` +
        `You're invited to join a whiteboard session!\n\n` +
        `Whiteboard: ${selectedWhiteboard.value?.title || 'Untitled Whiteboard'}\n` +
        `Date: ${dateTimeFormatted} - ${endTimeFormatted}\n` +
        `Duration: ${sessionDuration.value} minutes\n\n` +
        `Click the link below to join the session at the scheduled time:\n` +
        `${scheduleLink.value}\n\n` +
        `${sessionNotes.value ? `Additional notes: ${sessionNotes.value}\n\n` : ''}` +
        `Looking forward to your participation!`
      )
      
      return `mailto:${emails.value.join(',')}?subject=${subject}&body=${body}`
    })
    
    // Computed properties for sessions
    const sortedSessions = computed(() => {
      // Sort sessions by date (most recent first)
      return [...sessions.value].sort((a, b) => {
        try {
          // Handle potential invalid date objects
          const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
          const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
          
          // Check if dates are valid before comparing
          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;  // Invalid dates go last
          if (isNaN(dateB.getTime())) return -1;
          
          return dateB - dateA;
        } catch (error) {
          console.error('Error sorting sessions:', error);
          return 0;
        }
      });
    });
    
    // Load user's whiteboards and sessions
    onMounted(async () => {
      if (!authStore.isAuthenticated) {
        router.push('/login')
        return
      }
      
      // Load whiteboards
      await whiteboardStore.fetchUserWhiteboards()
      
      // Load sessions from localStorage
      loadSessions()
    })
    
    // Load sessions from localStorage
    const loadSessions = () => {
      loadingSessions.value = true
      
      try {
        const savedSessions = localStorage.getItem('scheduled-sessions')
        if (savedSessions) {
          // Parse sessions and convert date strings back to Date objects
          const parsed = JSON.parse(savedSessions)
          sessions.value = parsed.map(session => ({
            ...session,
            dateTime: new Date(session.dateTime)
          }))
        }
      } catch (err) {
        console.error('Error loading sessions:', err)
      } finally {
        loadingSessions.value = false
      }
    }
    
    // Session helper functions
    const isPastSession = (session) => {
      const now = new Date()
      const sessionEnd = new Date(session.dateTime.getTime() + parseInt(session.duration) * 60 * 1000)
      return sessionEnd < now
    }
    
    const getSessionStatusClass = (session) => {
      const now = new Date()
      const sessionStart = new Date(session.dateTime)
      const sessionEnd = new Date(sessionStart.getTime() + parseInt(session.duration) * 60 * 1000)
      
      if (now >= sessionStart && now <= sessionEnd) {
        return 'status-active'
      } else if (sessionStart > now) {
        return 'status-upcoming'
      } else {
        return 'status-past'
      }
    }
    
    const getSessionStatusText = (session) => {
      const now = new Date()
      const sessionStart = new Date(session.dateTime)
      const sessionEnd = new Date(sessionStart.getTime() + parseInt(session.duration) * 60 * 1000)
      
      if (now >= sessionStart && now <= sessionEnd) {
        return 'Active Now'
      } else if (sessionStart > now) {
        return 'Upcoming'
      } else {
        return 'Past'
      }
    }
    
    const formatSessionDateTime = (dateTime) => {
      return new Date(dateTime).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }
    
    // Join a session
    const joinSession = (session) => {
      window.open(session.link, '_blank')
    }
    
    // Resend invites for a session
    const resendInvites = (session) => {
      // Create mailto link
      const subject = encodeURIComponent(`Invitation to Whiteboard Session: ${session.whiteboardTitle}`)
      
      // Format date and time for email
      const dateTimeFormatted = new Date(session.dateTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      
      // Calculate end time
      const endDateObj = new Date(session.dateTime.getTime() + parseInt(session.duration) * 60 * 1000)
      const endTimeFormatted = endDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })
      
      // Build email body
      let body = encodeURIComponent(
        `Hello,\n\n` +
        `You're invited to join a whiteboard session!\n\n` +
        `Whiteboard: ${session.whiteboardTitle}\n` +
        `Date: ${dateTimeFormatted} - ${endTimeFormatted}\n` +
        `Duration: ${session.duration} minutes\n\n` +
        `Click the link below to join the session at the scheduled time:\n` +
        `${session.link}\n\n` +
        `${session.notes ? `Additional notes: ${session.notes}\n\n` : ''}` +
        `Looking forward to your participation!`
      )
      
      const mailtoLink = `mailto:${session.attendees.join(',')}?subject=${subject}&body=${body}`
      
      // Open email client
      window.open(mailtoLink, '_blank')
    }
    
    // Delete a session
    const deleteSession = (sessionId) => {
      if (confirm('Are you sure you want to delete this scheduled session?')) {
        // Filter out the deleted session
        sessions.value = sessions.value.filter(s => s.id !== sessionId)
        
        // Save updated sessions to localStorage
        try {
          localStorage.setItem('scheduled-sessions', JSON.stringify(sessions.value))
        } catch (err) {
          console.error('Error saving sessions to localStorage:', err)
        }
      }
    }
    
    const openNewWhiteboardModal = () => {
      showNewWhiteboardModal.value = true
      newWhiteboardTitle.value = ''
    }
    
    const closeModal = () => {
      showNewWhiteboardModal.value = false
    }
    
    const createWhiteboard = async () => {
      try {
        createLoading.value = true
        const whiteboardId = await whiteboardStore.createNewWhiteboard(newWhiteboardTitle.value)
        closeModal()
        router.push(`/whiteboard/${whiteboardId}`)
      } catch (error) {
        console.error('Error creating whiteboard:', error)
      } finally {
        createLoading.value = false
      }
    }
    
    const openWhiteboard = (whiteboardId) => {
      router.push(`/whiteboard/${whiteboardId}`)
    }
    
    const shareWhiteboard = (whiteboard) => {
      selectedWhiteboard.value = whiteboard
      shareLink.value = `${window.location.origin}/whiteboard/${whiteboard.id}`
      showShareModal.value = true
      linkCopied.value = false
      
      // Focus and select input after modal is shown
      setTimeout(() => {
        if (shareLinkInput.value) {
          shareLinkInput.value.focus()
          shareLinkInput.value.select()
        }
      }, 100)
    }
    
    const closeShareModal = () => {
      showShareModal.value = false
    }
    
    const copyShareLink = () => {
      if (shareLinkInput.value) {
        shareLinkInput.value.select()
        document.execCommand('copy')
        linkCopied.value = true
        
        setTimeout(() => {
          linkCopied.value = false
        }, 3000)
      }
    }
    
    const deleteWhiteboard = async (whiteboardId) => {
      if (confirm('Are you sure you want to delete this whiteboard? This action cannot be undone.')) {
        try {
          // Call the store's deleteWhiteboard action
          const success = await whiteboardStore.deleteWhiteboard(whiteboardId)
          
          if (success) {
            console.log('Whiteboard deleted successfully')
          } else {
            console.error('Failed to delete whiteboard')
          }
        } catch (error) {
          console.error('Error deleting whiteboard:', error)
        }
      }
    }
    
    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unknown date'
      
      try {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
        // Check if date is valid before formatting
        if (isNaN(date.getTime())) {
          return 'Unknown date'
        }
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).format(date)
      } catch (error) {
        console.error('Error formatting date:', error)
        return 'Unknown date'
      }
    }
    
    // Schedule session
    const scheduleSession = (whiteboard) => {
      selectedWhiteboard.value = whiteboard
      showScheduleModal.value = true
      
      // Set default date and time
      const now = new Date()
      
      // Set date to tomorrow
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      sessionDate.value = tomorrow.toISOString().split('T')[0]
      
      // Set time to current time
      let hours = now.getHours().toString().padStart(2, '0')
      let minutes = now.getMinutes().toString().padStart(2, '0')
      sessionTime.value = `${hours}:${minutes}`
      
      // Reset other fields
      sessionDuration.value = '60'
      sessionNotes.value = ''
      emails.value = []
      newEmail.value = ''
      scheduleLink.value = ''
    }
    
    const closeScheduleModal = () => {
      showScheduleModal.value = false
      scheduleLink.value = ''
    }
    
    const addEmail = () => {
      if (!newEmail.value || !validateEmail(newEmail.value)) return
      
      if (!emails.value.includes(newEmail.value)) {
        emails.value.push(newEmail.value)
      }
      
      newEmail.value = ''
    }
    
    const removeEmail = (index) => {
      emails.value.splice(index, 1)
    }
    
    const validateEmail = (email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return re.test(email)
    }
    
    const generateScheduleLink = () => {
      // Use network address instead of localhost for better tablet compatibility
      const hostname = window.location.hostname === 'localhost' ? '192.168.178.232' : window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;
      
      // Create URL with query parameters for the session details
      const baseUrl = `${protocol}//${hostname}:${port}/whiteboard/${selectedWhiteboard.value.id}`;
      
      // Encode date and time as ISO string
      const dateTimeObj = new Date(`${sessionDate.value}T${sessionTime.value}`);
      const dateTimeParam = encodeURIComponent(dateTimeObj.toISOString());
      
      // Build the schedule link with query parameters
      scheduleLink.value = `${baseUrl}?scheduled=true&datetime=${dateTimeParam}&duration=${sessionDuration.value}`;
      
      // Save the session details for future reference
      saveSessionDetails();
    }
    
    // Add function to save session details
    const saveSessionDetails = () => {
      if (!selectedWhiteboard.value) return;
      
      // Create a session object
      const session = {
        id: uuidv4(),
        whiteboardId: selectedWhiteboard.value.id,
        whiteboardTitle: selectedWhiteboard.value.title,
        dateTime: new Date(`${sessionDate.value}T${sessionTime.value}`),
        duration: sessionDuration.value,
        attendees: [...emails.value],
        notes: sessionNotes.value,
        link: scheduleLink.value
      };
      
      // Get existing sessions from localStorage
      let sessions = [];
      try {
        const savedSessions = localStorage.getItem('scheduled-sessions');
        if (savedSessions) {
          sessions = JSON.parse(savedSessions);
        }
      } catch (err) {
        console.error('Error reading sessions from localStorage:', err);
      }
      
      // Add new session
      sessions.push(session);
      
      // Save back to localStorage
      try {
        localStorage.setItem('scheduled-sessions', JSON.stringify(sessions));
      } catch (err) {
        console.error('Error saving sessions to localStorage:', err);
      }
    };
    
    return {
      loading,
      whiteboards,
      showNewWhiteboardModal,
      newWhiteboardTitle,
      createLoading,
      showShareModal,
      shareLink,
      shareLinkInput,
      linkCopied,
      showScheduleModal,
      sessionDate,
      sessionTime,
      sessionDuration,
      sessionNotes,
      emails,
      newEmail,
      scheduleLink,
      minDate,
      isScheduleFormValid,
      emailLink,
      activeTab,
      sessions,
      loadingSessions,
      sortedSessions,
      isPastSession,
      getSessionStatusClass,
      getSessionStatusText,
      formatSessionDateTime,
      joinSession,
      resendInvites,
      deleteSession,
      openNewWhiteboardModal,
      closeModal,
      createWhiteboard,
      openWhiteboard,
      shareWhiteboard,
      closeShareModal,
      copyShareLink,
      deleteWhiteboard,
      formatDate,
      scheduleSession,
      closeScheduleModal,
      addEmail,
      removeEmail,
      generateScheduleLink
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  color: var(--dark-color);
}

.dashboard-tabs {
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--grey-color);
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.whiteboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.whiteboard-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.whiteboard-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.whiteboard-preview {
  padding: 1.5rem;
  cursor: pointer;
}

.whiteboard-thumbnail {
  background-color: #f8f9fa;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.whiteboard-thumbnail i {
  font-size: 3rem;
  color: var(--primary-color);
  opacity: 0.7;
}

.whiteboard-info h3 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
  color: var(--dark-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.whiteboard-meta {
  display: flex;
  justify-content: space-between;
  color: var(--grey-color);
  font-size: 0.875rem;
}

.whiteboard-actions {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.btn-icon {
  flex: 1;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: var(--dark-color);
}

.btn-icon:hover {
  background-color: #f8f9fa;
}

.btn-danger {
  color: var(--danger-color);
}

.btn-danger:hover {
  background-color: #ffebee;
}

.empty-state {
  text-align: center;
  padding: 4rem 0;
}

.empty-icon {
  font-size: 4rem;
  color: var(--grey-color);
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--dark-color);
}

.empty-state p {
  color: var(--grey-color);
  margin-bottom: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  gap: 1rem;
}

.loading-container i {
  font-size: 2rem;
  color: var(--primary-color);
}

.loading-container p {
  color: var(--grey-color);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 1.5rem;
  color: var(--dark-color);
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--grey-color);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  gap: 1rem;
  border-top: 1px solid #f0f0f0;
}

.share-link-container {
  display: flex;
  margin-top: 1rem;
}

.share-link-container input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  font-size: 0.875rem;
}

.share-link-container .btn {
  margin-top: 0;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
}

.copied-message {
  margin-top: 1rem;
  color: var(--success-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.email-input-container {
  display: flex;
  margin-bottom: 10px;
}

.email-input-container input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  font-size: 0.875rem;
}

.email-input-container .btn {
  margin-top: 0;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
}

.email-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.email-tag {
  background-color: #f0f0f0;
  border-radius: 16px;
  padding: 4px 10px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.btn-remove {
  background: none;
  border: none;
  margin-left: 5px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: #999;
}

.btn-remove:hover {
  color: var(--danger-color);
}

.schedule-link-container {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: var(--border-radius);
  border: 1px solid #e0e0e0;
}

.email-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border-radius: var(--border-radius);
  text-decoration: none;
  font-weight: 500;
}

.email-link:hover {
  background-color: var(--primary-dark-color);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--dark-color);
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
}

.form-group textarea {
  resize: vertical;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.session-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  padding: 1.5rem;
}

.session-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.past-session {
  opacity: 0.7;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.session-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--dark-color);
}

.session-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-active {
  background-color: #4caf50;
  color: white;
}

.status-upcoming {
  background-color: #2196f3;
  color: white;
}

.status-past {
  background-color: #9e9e9e;
  color: white;
}

.session-details {
  margin-bottom: 1.5rem;
}

.session-time,
.session-attendees {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  color: var(--grey-color);
}

.session-notes {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.session-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.session-btn {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .whiteboard-grid {
    grid-template-columns: 1fr;
  }
}
</style> 