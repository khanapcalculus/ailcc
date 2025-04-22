import { createWhiteboard, deleteWhiteboard as deleteWhiteboardFromFirebase, getUserWhiteboards, getWhiteboard, updateWhiteboard } from '@/services/firebase';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from './auth';

export const useWhiteboardStore = defineStore('whiteboard', {
  state: () => ({
    id: null,
    title: '',
    ownerId: '',
    collaborators: [],
    pages: [],
    currentPageIndex: 0,
    history: [],
    historyIndex: -1,
    settings: {
      backgroundColor: '#ffffff',
      gridEnabled: true,
      gridSize: 20
    },
    loading: false,
    error: null,
    savedState: null,
    whiteboards: [],
    // Tool properties
    currentTool: 'pen',
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 2,
    // Custom stroke patterns
    strokePatterns: [
      { id: 'solid', label: 'Solid', dash: [] },
      { id: 'dashed', label: 'Dashed', dash: [10, 5] },
      { id: 'dotted', label: 'Dotted', dash: [2, 4] },
      { id: 'dash-dot', label: 'Dash Dot', dash: [10, 5, 2, 5] }
    ],
    currentStrokePattern: 'solid',
    hasUnsavedChanges: false
  }),
  
  getters: {
    currentPage: (state) => state.currentPageIndex + 1,
    totalPages: (state) => state.pages.length,
    currentPageObjects: (state) => state.pages[state.currentPageIndex]?.objects || [],
    canUndo: (state) => state.historyIndex > 0,
    canRedo: (state) => state.historyIndex < state.history.length - 1,
    isLoading: (state) => state.loading,
    hasChanges: (state) => {
      if (!state.savedState) return false;
      return JSON.stringify(state.pages) !== JSON.stringify(state.savedState.pages);
    }
  },
  
  actions: {
    async fetchUserWhiteboards() {
      this.loading = true;
      this.error = null;
      
      try {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return
        
        this.whiteboards = await getUserWhiteboards(authStore.userId)
      } catch (error) {
        console.error('Error fetching whiteboards', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    
    async createNewWhiteboard(title) {
      this.loading = true;
      this.error = null;
      
      try {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) throw new Error('User must be authenticated')
        
        const whiteboardData = {
          title: title || 'Untitled Whiteboard',
          ownerId: authStore.userId,
          collaborators: [],
          pages: [
            {
              id: uuidv4(),
              objects: []
            }
          ],
          settings: {
            backgroundColor: '#ffffff',
            gridEnabled: true,
            gridSize: 20
          }
        }
        
        const whiteboardId = await createWhiteboard(whiteboardData)
        return whiteboardId
      } catch (error) {
        console.error('Error creating whiteboard', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async loadWhiteboard(whiteboardId) {
      this.loading = true;
      this.error = null;
      
      try {
        const whiteboard = await getWhiteboard(whiteboardId);
        
        // Initialize with default page if empty
        if (!whiteboard.pages || whiteboard.pages.length === 0) {
          whiteboard.pages = [{ id: uuidv4(), objects: [] }];
        }
        
        // Ensure each page has objects array
        whiteboard.pages = whiteboard.pages.map(page => {
          return { ...page, objects: page.objects || [] };
        });
        
        // Load into state
        this.id = whiteboard.id;
        this.title = whiteboard.title;
        this.ownerId = whiteboard.ownerId;
        this.collaborators = whiteboard.collaborators || [];
        this.pages = whiteboard.pages;
        this.currentPageIndex = 0;
        this.settings = whiteboard.settings || this.settings;
        
        // Reset history
        this.history = [];
        this.historyIndex = -1;
        
        // Save initial state for change detection
        this.savedState = JSON.parse(JSON.stringify({ pages: this.pages }));
        
        return whiteboard;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async saveWhiteboard() {
      console.log('saveWhiteboard called with ID:', this.id);
      if (!this.id) {
        console.error('Cannot save whiteboard: no ID provided');
        return false;
      }

      this.loading = true;
      this.error = null;
      
      try {
        console.log('Preparing data to save, current pages:', this.pages?.length || 0);
        const dataToSave = {
          pages: this.pages ? JSON.parse(JSON.stringify(this.pages)) : [{ id: uuidv4(), objects: [] }],
          settings: this.settings || { backgroundColor: '#ffffff', gridEnabled: true, gridSize: 20 },
          title: this.title || 'Untitled Whiteboard'
        };
        
        // Ensure we have at least one page
        if (!dataToSave.pages || dataToSave.pages.length === 0) {
          console.log('No pages found, creating default page');
          dataToSave.pages = [{ id: uuidv4(), objects: [] }];
        }
        
        // Ensure each page has valid data
        dataToSave.pages = dataToSave.pages.map(page => {
          return { 
            id: page.id || uuidv4(), 
            objects: Array.isArray(page.objects) ? page.objects : [] 
          };
        });
        
        console.log('Saving whiteboard with pages:', dataToSave.pages.length);
        // Save to Firebase
        await updateWhiteboard(this.id, dataToSave);
        console.log('Whiteboard saved successfully');
        
        // Update saved state
        this.savedState = JSON.parse(JSON.stringify({ pages: dataToSave.pages }));
        this.hasUnsavedChanges = false;
        
        return true;
      } catch (error) {
        console.error('Error saving whiteboard:', error);
        this.error = error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Page navigation
    setCurrentPage(pageNumber) {
      const index = pageNumber - 1;
      if (index >= 0 && index < this.pages.length) {
        this.currentPageIndex = index;
      }
    },
    
    addPage() {
      console.log('addPage called in store with current state:', {
        id: this.id,
        pageCount: this.pages.length,
        currentIndex: this.currentPageIndex
      });
      
      // Ensure pages array exists
      if (!this.pages) {
        console.log('Pages array does not exist, initializing it');
        this.pages = [];
      }
      
      // Create new page
      const newPage = {
        id: uuidv4(),
        objects: []
      };
      console.log('Created new page with id:', newPage.id);
      
      // Add to pages array
      this.pages.push(newPage);
      console.log('Added page to array, new page count:', this.pages.length);
      
      // Navigate to the new page
      this.currentPageIndex = this.pages.length - 1;
      console.log('Set current page index to:', this.currentPageIndex);
      
      // Add to history
      this._addToHistory();
      console.log('Added change to history');
      
      // Mark as having changes that need to be saved
      this.hasUnsavedChanges = true;
      
      return newPage;
    },
    
    deletePage(pageIndex) {
      if (this.pages.length <= 1) {
        return false; // Don't allow deleting the last page
      }
      
      if (pageIndex >= 0 && pageIndex < this.pages.length) {
        // Remove the page
        this.pages.splice(pageIndex, 1);
        
        // Adjust current page if needed
        if (this.currentPageIndex >= this.pages.length) {
          this.currentPageIndex = this.pages.length - 1;
        }
        
        // Add to history
        this._addToHistory();
        
        return true;
      }
      
      return false;
    },
    
    // Object management
    addObject(object) {
      if (!object.id) {
        object.id = uuidv4();
        console.log(`[Store] Assigned new ID to object: ${object.id}`);
      }
      
      console.log(`[Store] Adding object: ${object.id}, type: ${object.type}, pageIndex: ${this.currentPageIndex}`);
      
      // Add to current page
      if (!this.pages[this.currentPageIndex]) {
        console.warn(`[Store] Current page index ${this.currentPageIndex} not found, adding page.`);
        this.addPage(); // This might shift the index, be careful
        // Re-check index after adding page
        if (!this.pages[this.currentPageIndex]) {
          console.error('[Store] Failed to add object: Page index still invalid after adding page.');
          return null;
        }
      }
      
      // Ensure objects array exists
      if (!this.pages[this.currentPageIndex].objects) {
        console.warn('[Store] Objects array missing on page, initializing.');
        this.pages[this.currentPageIndex].objects = [];
      }
      
      this.pages[this.currentPageIndex].objects.push(object);
      
      // Add to history
      this._addToHistory();
      
      return object;
    },
    
    updateObject(objectId, updates) {
      const objects = this.pages[this.currentPageIndex].objects;
      const index = objects.findIndex(obj => obj.id === objectId);
      
      if (index !== -1) {
        // Update object
        objects[index] = { ...objects[index], ...updates };
        
        // Add to history
        this._addToHistory();
        
        return true;
      }
      
      return false;
    },
    
    deleteObject(objectId) {
      console.log(`[Store] Attempting to delete object ${objectId} on page index ${this.currentPageIndex}`);
      const objects = this.pages[this.currentPageIndex]?.objects;
      
      if (!objects) {
        console.error(`[Store] Cannot delete object ${objectId}: No objects array found for page index ${this.currentPageIndex}`);
        return false;
      }
      
      // Log the IDs of objects on the current page for comparison
      const objectIdsOnPage = objects.map(obj => obj.id);
      console.log(`[Store] Objects on current page (${this.currentPageIndex}): [${objectIdsOnPage.join(', ')}]`);
      
      const index = objects.findIndex(obj => obj.id === objectId);
      
      if (index !== -1) {
        objects.splice(index, 1);
        console.log(`[Store] Successfully deleted object ${objectId} from page ${this.currentPageIndex}`);
        this._addToHistory();
        return true;
      } else {
        console.warn(`[Store] Failed to find object ${objectId} on page ${this.currentPageIndex}.`);
        return false;
      }
    },
    
    // History management
    undo() {
      if (!this.canUndo) return false;
      
      // Move back in history
      this.historyIndex--;
      
      // Restore state
      const historyItem = this.history[this.historyIndex];
      this.pages = JSON.parse(JSON.stringify(historyItem.pages));
      
      return true;
    },
    
    redo() {
      if (!this.canRedo) return false;
      
      // Move forward in history
      this.historyIndex++;
      
      // Restore state
      const historyItem = this.history[this.historyIndex];
      this.pages = JSON.parse(JSON.stringify(historyItem.pages));
      
      return true;
    },
    
    _addToHistory() {
      // If we're not at the end of history, remove future states
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      
      // Add current state to history
      this.history.push({
        timestamp: Date.now(),
        pages: JSON.parse(JSON.stringify(this.pages))
      });
      
      // Update index
      this.historyIndex = this.history.length - 1;
      
      // Limit history size
      if (this.history.length > 50) {
        this.history = this.history.slice(this.history.length - 50);
        this.historyIndex = this.history.length - 1;
      }
    },
    
    // Tool management
    setCurrentTool(toolName) {
      this.currentTool = toolName;
    },
    
    setStrokeColor(color) {
      this.strokeColor = color;
    },
    
    setFillColor(color) {
      this.fillColor = color;
    },
    
    setStrokeWidth(width) {
      this.strokeWidth = width;
    },
    
    setStrokePattern(patternId) {
      this.currentStrokePattern = patternId;
    },
    
    // Clear current state
    clearWhiteboard() {
      this.id = null;
      this.title = '';
      this.ownerId = '';
      this.collaborators = [];
      this.pages = [];
      this.currentPageIndex = 0;
      this.history = [];
      this.historyIndex = -1;
      this.settings = {
        backgroundColor: '#ffffff',
        gridEnabled: true,
        gridSize: 20
      };
      this.error = null;
      this.savedState = null;
    },
    
    setDefaultStrokeColorForTheme(isDark) {
      if (isDark) {
        // If current color is black or dark, switch to white
        if (this.strokeColor === '#000000' || this.strokeColor.startsWith('#3') || this.strokeColor.startsWith('#4')) {
          console.log('[Store Theme] Switching default stroke to white for dark mode');
          this.setStrokeColor('#ffffff');
        }
      } else {
        // If current color is white or light, switch to black
        if (this.strokeColor === '#ffffff' || this.strokeColor.startsWith('#f') || this.strokeColor.startsWith('#e')) {
          console.log('[Store Theme] Switching default stroke to black for light mode');
          this.setStrokeColor('#000000');
        }
      }
    },
    
    async deleteWhiteboard(whiteboardId) {
      this.loading = true;
      this.error = null;
      
      try {
        await deleteWhiteboardFromFirebase(whiteboardId);
        
        // Remove from local state if it exists
        this.whiteboards = this.whiteboards.filter(wb => wb.id !== whiteboardId);
        
        return true;
      } catch (error) {
        console.error('Error deleting whiteboard:', error);
        this.error = error.message;
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
}); 