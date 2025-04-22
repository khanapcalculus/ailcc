<template>
  <div class="whiteboard-page" :class="{ 'dark-mode': isDarkMode }">
    <!-- Scheduled Session Banner -->
    <div v-if="isScheduledSession" class="scheduled-session-banner">
      <div class="session-info">
        <i class="fas fa-calendar-check"></i>
        <div class="session-details">
          <h3>Scheduled Session</h3>
          <p>{{ sessionDetails }}</p>
        </div>
      </div>
      <button @click="dismissSessionBanner" class="btn-dismiss">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="whiteboard-container">
      <div class="whiteboard-canvas" ref="canvasContainer"></div>
    </div>
    
    <div class="toolbar left-toolbar">
      <div class="toolbar-section tools">
        <button 
          v-for="toolName in toolNames" 
          :key="toolName"
          class="tool-btn"
          :class="{ active: currentTool === toolName }"
          @click="setTool(toolName)"
          :title="getToolLabel(toolName)"
        >
          <i :class="`fas fa-${getToolIcon(toolName)}`"></i>
        </button>
      </div>
      
      <div class="toolbar-section expandable">
        <button class="section-title-btn" @click="togglePalette('colors')" title="Colors">
          <i class="fas fa-palette"></i>
        </button>
        <div v-if="isPaletteOpen.colors" class="palette-content colors">
          <div class="color-swatches">
            <div 
              v-for="color in colors" 
              :key="color"
              class="color-swatch"
              :class="{ active: strokeColor === color }"
              :style="{ backgroundColor: color }"
              @click="selectColor(color)"
              :title="getColorName(color)"
            ></div>
          </div>
        </div>
      </div>
      
      <div class="toolbar-section expandable">
        <button class="section-title-btn" @click="togglePalette('strokeWidths')" title="Stroke Width">
          <i class="fas fa-ruler-horizontal"></i>
        </button>
        <div v-if="isPaletteOpen.strokeWidths" class="palette-content strokeWidths">
          <div class="stroke-options">
            <button 
              v-for="width in strokeWidths" 
              :key="width"
              class="stroke-btn"
              :class="{ active: currentStrokeWidth === width }"
              @click="selectStrokeWidth(width)"
              :title="`${width}px`"
            >
              <div 
                class="stroke-preview" 
                :style="{ 
                  height: `${width}px`, 
                  width: `${width}px`,
                  minHeight: '2px', /* Ensure very small dots are visible */
                  minWidth: '2px' /* Ensure very small dots are visible */
                }"
              ></div>
            </button>
          </div>
        </div>
      </div>
      
      <div class="toolbar-section expandable" v-if="strokePatterns && strokePatterns.length > 0">
        <button class="section-title-btn" @click="togglePalette('strokePatterns')" title="Stroke Style">
          <i class="fas fa-ellipsis-h"></i>
        </button>
        <div v-if="isPaletteOpen.strokePatterns" class="palette-content strokePatterns">
          <div class="pattern-options">
            <button 
              v-for="pattern in strokePatterns" 
              :key="pattern.id"
              class="pattern-btn"
              :class="{ active: currentStrokePattern === pattern.id }"
              @click="selectStrokePattern(pattern.id)"
              :title="pattern.label"
            >
              <div class="pattern-preview" :style="getPatternStyle(pattern)"></div>
            </button>
          </div>
        </div>
      </div>
      
      <div class="toolbar-section actions">
        <button class="tool-btn" @click="undo" :disabled="!canUndo" title="Undo">
          <i class="fas fa-undo"></i>
        </button>
        <button class="tool-btn" @click="redo" :disabled="!canRedo" title="Redo">
          <i class="fas fa-redo"></i>
        </button>
        <button class="tool-btn" @click="exportImage" title="Export">
          <i class="fas fa-download"></i>
        </button>
        <button class="tool-btn theme-toggle-btn" @click="toggleTheme" :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          <i :class="['fas', isDarkMode ? 'fa-sun' : 'fa-moon']"></i>
        </button>
        <button class="tool-btn" @click="goBack" title="Exit">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="page-navigation" :class="{'tablet-mode': isTabletMode}">
      <button class="nav-btn" @click="handleAddPage" title="Add New Page">
        <i class="fas fa-plus"></i>
      </button>
      <button class="page-btn" @click="prevPage" :disabled="currentPage <= 1" title="Previous Page">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" @click="nextPage" :disabled="currentPage >= totalPages" title="Next Page">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    
    <div v-if="collaborators && collaborators.length > 0" class="collaborators">
      <div v-for="user in collaborators" :key="user.userId" class="collaborator">
        <div class="collaborator-avatar">{{ getInitials(user.displayName || 'User') }}</div>
        <span class="collaborator-name">{{ user.displayName || 'Anonymous' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import ToolManager from '@/plugins/whiteboard/ToolManager';
import rtcService from '@/services/rtc';
import { useAuthStore } from '@/store/auth';
import { useWhiteboardStore } from '@/store/whiteboard';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'WhiteboardPage',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const whiteboardStore = useWhiteboardStore();
    const _authStore = useAuthStore();
    
    // Refs
    const canvasContainer = ref(null);
    const stage = ref(null);
    const layer = ref(null);
    const toolManager = ref(null);
    
    // Collaboration state
    const collaborators = ref([]);
    const isConnecting = ref(false);
    
    // Whiteboard state
    const whiteboardId = computed(() => route.params.id);
    const currentPage = computed(() => whiteboardStore.currentPage);
    const totalPages = computed(() => whiteboardStore.totalPages);
    const currentTool = computed(() => whiteboardStore.currentTool);
    const strokeColor = computed(() => whiteboardStore.strokeColor);
    const canUndo = computed(() => whiteboardStore.canUndo);
    const canRedo = computed(() => whiteboardStore.canRedo);
    const strokePatterns = computed(() => whiteboardStore.strokePatterns);
    const currentStrokePattern = computed(() => whiteboardStore.currentStrokePattern);
    
    // Tool and color options
    const toolNames = ref(['pen', 'line', 'eraser', 'rectangle', 'ellipse', 'text', 'image', 'selection']);
    const colors = ref([
      '#000000', '#444444', '#888888', '#FFFFFF', // Greys
      '#E6194B', '#F58231', '#FFE119', '#BFEF45', // Reds/Oranges/Yellows/Greens
      '#3CB44B', '#42D4F4', '#4363D8', '#911EB4', // Greens/Blues/Purples
      '#F032E6', '#A9A9A9', '#FABEBE', '#FFD8B1'  // Pinks/Light Tones
    ]);
    const strokeWidths = ref(Array.from({ length: 16 }, (_, i) => i + 1)); // Generates [1, 2, ..., 16]
    const currentStrokeWidth = ref(2); // Keep default or change if needed
    
    // State for palette visibility
    const isPaletteOpen = reactive({
      colors: false,
      strokeWidths: false,
      strokePatterns: false
    });
    
    // Detect if we're on a tablet
    const isTabletMode = ref(false);
    
    // Dark Mode State
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = ref(prefersDark); // Initialize based on OS preference
    
    // Scheduled session state
    const isScheduledSession = ref(false);
    const scheduledDateTime = ref(null);
    const scheduledDuration = ref(null);
    const showSessionBanner = ref(true);
    
    // Computed property for session details
    const sessionDetails = computed(() => {
      if (!scheduledDateTime.value) return '';
      
      const dateTime = new Date(scheduledDateTime.value);
      const endTime = new Date(dateTime.getTime() + parseInt(scheduledDuration.value || 60) * 60 * 1000);
      
      const dateFormatted = dateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const timeFormatted = dateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      const endTimeFormatted = endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      return `${dateFormatted} • ${timeFormatted} - ${endTimeFormatted}`;
    });
    
    // Function to toggle theme
    const toggleTheme = () => {
      isDarkMode.value = !isDarkMode.value;
      
      // Update store's default color
      whiteboardStore.setDefaultStrokeColorForTheme(isDarkMode.value);
      
      // Optional: Save preference to localStorage
      try {
        localStorage.setItem('whiteboard-theme', isDarkMode.value ? 'dark' : 'light');
      } catch (e) {
        console.warn('Could not save theme preference to localStorage');
      }
    };
    
    // Initialize Konva stage
    const initKonva = () => {
      // Create stage
      stage.value = new Konva.Stage({
        container: canvasContainer.value,
        width: canvasContainer.value.clientWidth,
        height: canvasContainer.value.clientHeight,
        draggable: false // Explicitly disable stage dragging
      });
      
      // Create layer
      layer.value = new Konva.Layer();
      
      // Optimize layer for drawing
      layer.value.hitGraphEnabled(false); // Disable hit detection for performance
      layer.value.listening(false);       // Disable event listening on layer level
      
      stage.value.add(layer.value);
      
      // Enhance canvas performance
      if (stage.value.content) {
        // Set Konva optimization flags
        Konva.pixelRatio = 1;                        // Optimize for speed over quality
        stage.value.content.style.willChange = 'transform'; // Hint for browser optimization
        
        // Disable text selection
        stage.value.content.style.userSelect = 'none';
        stage.value.content.style.webkitUserSelect = 'none';
        stage.value.content.style.mozUserSelect = 'none';
      }
      
      // Optimize event handling for pen & touch
      const container = stage.value.container();
      container.style.touchAction = 'none';          // Prevent browser handling of touch
      container.setAttribute('touch-action', 'none'); // For older browsers
      
      // Optimize Konva for drawing performance
      stage.value.batchDraw();
      
      // Set up high-priority direct event handler that bypasses Konva's event system
      container.addEventListener('pointermove', (e) => {
        if (currentTool.value === 'pen' && toolManager.value && 
            toolManager.value.getActiveTool() && 
            toolManager.value.getActiveTool().isPainting) {
          // Use browser's native event system for faster response
          e.preventDefault();
        }
      }, { passive: false, capture: true });
      
      // Prevent default touch actions on the stage to allow drawing
      stage.value.on('touchstart mousedown', (e) => {
        // Prevent native scrolling/panning behavior
        e.evt.preventDefault();
        
        // For touch devices, capture touch to prevent scrolling
        if (e.evt.type === 'touchstart') {
          canvasContainer.value.style.touchAction = 'none';
        }
      });
      
      // Prevent default touch actions on the stage during movement as well
      stage.value.on('touchmove mousemove', (e) => {
        // Prevent native scrolling/panning behavior
        e.evt.preventDefault();
      });
      
      // Handle end of touch/mouse events
      stage.value.on('touchend mouseup', (e) => {
        if (e.evt.type === 'touchend') {
          // Delay restoring touch action to ensure all events are processed
          setTimeout(() => {
            canvasContainer.value.style.touchAction = '';
          }, 100);
        }
      });
      
      // Add specific touch event handler to the canvas container
      canvasContainer.value.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        // If we're using the pen tool, ensure we don't lose events
        if (currentTool.value === 'pen' && toolManager.value && 
            toolManager.value.getActiveTool() && 
            toolManager.value.getActiveTool().isPainting) {
          // Ensure event propagation
          e.stopPropagation = false;
        }
      }, { passive: false });
      
      // Initialize tool manager
      toolManager.value = new ToolManager();
      toolManager.value.init(stage.value, layer.value, addObject, deleteObject, renderObjects);
      
      // Set initial tool from store
      setTool(currentTool.value);
      
      // Set up window resize handler
      window.addEventListener('resize', handleResize);
      
      // Initial setup for stage size
      handleResize();
    };
    
    // Update handleResize to properly handle all tools
    const handleResize = () => {
      if (!stage.value || !canvasContainer.value) return;
      
      const width = canvasContainer.value.clientWidth;
      const height = canvasContainer.value.clientHeight;
      
      console.log('Window resized to:', width, 'x', height);
      
      // Update stage size
      stage.value.width(width);
      stage.value.height(height);
      stage.value.batchDraw();
      
      // Handle tool-specific resize logic
      if (toolManager.value) {
        // Resize native canvas if we're using the pen tool with native canvas
        if (currentTool.value === 'pen') {
          const penTool = toolManager.value.getTool('pen');
          if (penTool && penTool.useNativeCanvas && typeof penTool.resizeNativeCanvas === 'function') {
            penTool.resizeNativeCanvas();
            console.log('Resized native canvas during window resize');
          }
        }
        
        // For selection tool, update transformer
        if (currentTool.value === 'selection') {
          const selectionTool = toolManager.value.getTool('selection');
          if (selectionTool && selectionTool.transformer) {
            try {
              selectionTool.transformer.update();
              layer.value.batchDraw();
            } catch (err) {
              console.error('Error updating transformer during resize:', err);
            }
          }
        }
        
        // Force rerender objects to ensure proper positioning
        renderObjects();
      }
    };
    
    // Update setupPenTool function to avoid interfering with other tools
    const setupPenTool = () => {
      if (!toolManager.value) return;
      
      console.log('Setting up optimized pen tool');
      
      // Get the pen tool instance to check for native canvas support
      const penTool = toolManager.value.getTool('pen');
      const usesNativeCanvas = penTool && penTool.useNativeCanvas;
      
      if (usesNativeCanvas) {
        console.log('Using native canvas approach for pen tool');
        
        // For native canvas approach, we still need Konva visible for displaying existing strokes
        if (layer.value) {
          // Keep layer visible but optimize its settings
          layer.value.hitGraphEnabled(false);
          layer.value.listening(false);
          
          // Force update to ensure it's rendered properly
          layer.value.clearCache();
          layer.value.batchDraw();
        }
        
        // Ensure pen tool can receive touch events properly
        if (canvasContainer.value) {
          canvasContainer.value.style.touchAction = 'none';
          canvasContainer.value.style.userSelect = 'none';
          canvasContainer.value.style.webkitUserSelect = 'none';
        }
        
        // Make sure native canvas is properly set up
        if (penTool && typeof penTool.resizeNativeCanvas === 'function') {
          penTool.resizeNativeCanvas();
        }
      } else {
        // Standard Konva optimization for desktop
        if (stage.value && stage.value.container()) {
          // Ensure we have the correct touch handling
          const container = stage.value.container();
          
          // Allow precise drawing by preventing scroll/zoom
          container.style.touchAction = 'none';
          
          // Add handling for pen pressure if available
          if (window.PointerEvent) {
            container.style.touchAction = 'none';
            container.style.msTouchAction = 'none';
            container.style.msContentZooming = 'none';
          }
        }
        
        // Apply optimal layer settings for drawing
        if (layer.value) {
          // For drawing, we don't need hit detection
          layer.value.hitGraphEnabled(false);
          layer.value.listening(false);
          
          // More extreme optimizations for tablets
          if (isTabletMode.value) {
            layer.value.perfectDrawEnabled(false);
          }
          
          // Make sure any existing transitions are completed
          layer.value.clearCache();
          layer.value.batchDraw();
        }
      }
      
      // Ensure that we're ready for drawing with any changes in the pen tool
      if (penTool && typeof penTool.reset === 'function') {
        penTool.reset();
      }
    };
    
    // Helper function to prevent unwanted events
    const preventEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Update the setTool function to properly handle tool switching
    const setTool = (toolName) => {
      if (!toolManager.value) return;
      
      try {
        console.log('Switching to tool:', toolName);
        
        // Special optimizations for pen tool
        const isPenTool = toolName === 'pen';
        
        // Configure options based on drawing needs
        const options = {
          strokeColor: whiteboardStore.strokeColor,
          strokeWidth: whiteboardStore.strokeWidth,
          fillColor: whiteboardStore.fillColor,
          dash: getCurrentPatternDash()
        };
        
        // Reset the layer for all tools
        if (layer.value) {
          // Make sure the layer is visible in case it was hidden by the pen tool
          layer.value.visible(true);
          
          // Configure layer based on tool type
          if (toolName === 'selection') {
            // For selection tool, we need hit detection
            layer.value.hitGraphEnabled(true);
            layer.value.listening(true);
          } else {
            // For other tools, optimize for rendering
            layer.value.hitGraphEnabled(isPenTool ? false : true);
            layer.value.listening(isPenTool ? false : true);
          }
          
          // Clear any cached states
          layer.value.clearCache();
          layer.value.batchDraw();
        }
        
        // Apply any tool-specific optimizations
        if (isPenTool && stage.value) {
          // Optimize for pen drawing
          if (stage.value.content) {
            stage.value.content.style.willChange = 'transform';
          }
          
          // Ensure smooth lines
          options.tension = 0.3; // Light smoothing for natural writing
          
          console.log('Optimized canvas for pen drawing');
        }
        
        // Set the tool
        toolManager.value.setActiveTool(toolName, options);
        
        // Update store
        whiteboardStore.setCurrentTool(toolName);
        
        // Additional setup for pen tool after setting it
        if (isPenTool) {
          // Allow a moment for the tool to initialize
          setTimeout(() => {
            setupPenTool();
          }, 10);
        }
        // Special handling for selection tool
        else if (toolName === 'selection') {
          setTimeout(() => {
            renderObjects();
          }, 10);
        }
        // For all other tools, ensure objects are visible and properly rendered
        else {
          setTimeout(() => {
            renderObjects();
          }, 10);
        }
      } catch (err) {
        console.error(`Error setting tool to ${toolName}:`, err);
      }
    };
    
    // Set stroke color
    const setColor = (color) => {
      whiteboardStore.setStrokeColor(color);
      
      // Update current tool options
      if (toolManager.value && toolManager.value.getActiveTool()) {
        toolManager.value.getActiveTool().setOptions({ strokeColor: color });
      }
    };
    
    // Set stroke pattern
    const setStrokePattern = (patternId) => {
      whiteboardStore.setStrokePattern(patternId);
      
      // Update current tool options
      if (toolManager.value && toolManager.value.getActiveTool()) {
        const dash = getCurrentPatternDash();
        toolManager.value.getActiveTool().setOptions({ dash });
      }
    };
    
    // Get pattern style for preview
    const getPatternStyle = (pattern) => {
      if (!pattern || !pattern.id) {
        return {
          height: '2px',
          width: '100%',
          backgroundColor: '#000'
        };
      }
      
      if (pattern.id === 'solid') {
        return {
          height: '2px',
          width: '100%',
          backgroundColor: '#000'
        };
      }
      
      const dash = pattern.dash || [];
      const dashGap = dash.join(',');
      return {
        height: '2px',
        width: '100%',
        backgroundColor: 'transparent',
        backgroundImage: `linear-gradient(to right, #000 0%, #000 50%, transparent 50%, transparent 100%)`,
        backgroundSize: `${dashGap || '10,5'}px 1px`,
        backgroundRepeat: 'repeat-x'
      };
    };
    
    // Get current pattern dash array
    const getCurrentPatternDash = () => {
      if (!strokePatterns.value || !currentStrokePattern.value) return [];
      
      const pattern = strokePatterns.value.find(p => p.id === currentStrokePattern.value);
      return pattern && pattern.dash ? pattern.dash : [];
    };
    
    // Add object to whiteboard with support for all transformation properties
    const addObject = (object) => {
      // Handle position and transformation updates from selection tool
      if (object.type === 'position-update') {
        // Create a complete update object with all provided properties
        const updates = {};
        
        // Add each property that exists in the update object
        if (object.x !== undefined) updates.x = object.x;
        if (object.y !== undefined) updates.y = object.y;
        if (object.width !== undefined) updates.width = object.width;
        if (object.height !== undefined) updates.height = object.height; 
        if (object.radiusX !== undefined) updates.radiusX = object.radiusX;
        if (object.radiusY !== undefined) updates.radiusY = object.radiusY;
        if (object.rotation !== undefined) updates.rotation = object.rotation;
        if (object.scaleX !== undefined) updates.scaleX = object.scaleX;
        if (object.scaleY !== undefined) updates.scaleY = object.scaleY;
        
        // Update the object in the store
        console.log('Updating object with transformation:', object.id, updates);
        whiteboardStore.updateObject(object.id, updates);
        
        console.log(`[RTC Send] Attempting to send update-object for ${object.id}`);
        rtcService.sendUpdate({
          action: 'update-object',
          objectId: object.id,
          updates: updates,
          pageIndex: currentPage.value - 1
        });
        
        // No immediate render needed here, transformations update existing objects
        return;
      }
      
      // Logic for adding new objects
      if (!object.id) {
        object.id = uuidv4();
        console.log(`[Store] Assigned new ID to object: ${object.id}`);
      }
      const addedObject = whiteboardStore.addObject(object); // Add to local store first
      
      if (addedObject) {
        // Send update to other users
        console.log(`[RTC Send] Attempting to send add-object for ${addedObject.id}`);
        rtcService.sendUpdate({
          action: 'add-object',
          object: addedObject, // Send the object added to the store
          pageIndex: currentPage.value - 1
        });
      } else {
        console.error("[RTC Send] Failed to add object to store, cannot send update.");
      }
    };
    
    // Delete object from whiteboard
    const deleteObject = (objectId) => {
      const success = whiteboardStore.deleteObject(objectId); // Delete from local store first
      
      if (success) {
        // Send update to other users
        console.log(`[RTC Send] Attempting to send delete-object for ${objectId}`);
        rtcService.sendUpdate({
          action: 'delete-object',
          objectId: objectId,
          pageIndex: currentPage.value - 1
        });
      } else {
        console.error(`[RTC Send] Failed to delete object ${objectId} from store.`);
      }
    };
    
    // Render current page objects
    const renderObjects = () => {
      if (!layer.value) return;
      
      // Clear the layer, but first remove transformer to avoid errors
      if (toolManager.value && toolManager.value.getTool('selection') && toolManager.value.getTool('selection').transformer) {
        const selectionTool = toolManager.value.getTool('selection');
        if (selectionTool.transformer) {
          try {
            selectionTool.transformer.nodes([]);
            selectionTool.transformer.remove();
          } catch (err) {
            console.error('Error removing transformer:', err);
          }
        }
      }
      
      // Now clear the layer
      layer.value.destroyChildren();
      
      // Get current page objects
      const objects = whiteboardStore.currentPageObjects;
      
      // Check if selection tool is active to set draggable property
      const isSelectionToolActive = currentTool.value === 'selection';
      
      // Render each object
      objects.forEach(obj => {
        let shape;
        
        switch (obj.type) {
          case 'path':
            shape = new Konva.Line({
              points: obj.points,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              lineCap: 'round',
              lineJoin: 'round',
              tension: obj.tension || 0.5,
              dash: obj.dash || [],
              draggable: isSelectionToolActive,
              id: obj.id
            });
            break;
            
          case 'line':
            shape = new Konva.Line({
              points: obj.points,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              lineCap: 'round',
              lineJoin: 'round',
              dash: obj.dash || [],
              draggable: isSelectionToolActive,
              id: obj.id
            });
            break;
            
          case 'rectangle':
            shape = new Konva.Rect({
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              fill: obj.fill,
              dash: obj.dash || [],
              draggable: isSelectionToolActive,
              id: obj.id,
              rotation: obj.rotation || 0,
              scaleX: obj.scaleX || 1,
              scaleY: obj.scaleY || 1
            });
            break;
            
          case 'ellipse':
            shape = new Konva.Ellipse({
              x: obj.x,
              y: obj.y,
              radiusX: obj.radiusX,
              radiusY: obj.radiusY,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              fill: obj.fill,
              dash: obj.dash || [],
              draggable: isSelectionToolActive,
              id: obj.id,
              rotation: obj.rotation || 0,
              scaleX: obj.scaleX || 1,
              scaleY: obj.scaleY || 1
            });
            break;
            
          case 'text':
            shape = new Konva.Text({
              x: obj.x,
              y: obj.y,
              text: obj.text,
              fontSize: obj.fontSize,
              fontFamily: obj.fontFamily,
              fill: obj.fill,
              align: obj.align,
              width: obj.width,
              fontStyle: obj.fontStyle,
              draggable: isSelectionToolActive,
              id: obj.id,
              rotation: obj.rotation || 0,
              scaleX: obj.scaleX || 1,
              scaleY: obj.scaleY || 1
            });
            break;
            
          case 'image': {
            // For images, we need to load the image first
            const imageObj = new Image();
            imageObj.onload = () => {
              const imgShape = new Konva.Image({
                x: obj.x,
                y: obj.y,
                image: imageObj,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation || 0,
                scaleX: obj.scaleX || 1,
                scaleY: obj.scaleY || 1,
                draggable: isSelectionToolActive,
                id: obj.id
              });
              
              layer.value.add(imgShape);
              layer.value.batchDraw();
            };
            imageObj.src = obj.src;
            break;
          }
        }
        
        if (shape) {
          shape.classList = ['object'];
          
          // Apply any additional transformations if they exist
          if (obj.rotation && shape.rotation) shape.rotation(obj.rotation);
          if (obj.scaleX && shape.scaleX) shape.scaleX(obj.scaleX);
          if (obj.scaleY && shape.scaleY) shape.scaleY(obj.scaleY);
          
          layer.value.add(shape);
        }
      });
      
      // If selection tool is active, create a new transformer and add appropriate event handlers
      if (isSelectionToolActive && toolManager.value) {
        try {
          const selectionTool = toolManager.value.getTool('selection');
          if (selectionTool && selectionTool.transformer) {
            // Add the transformer to the layer
            layer.value.add(selectionTool.transformer);
          } else if (selectionTool) {
            // If transformer doesn't exist, reactivate the tool to create it
            toolManager.value.setActiveTool('selection');
          }
        } catch (err) {
          console.error('Error adding transformer:', err);
        }
      }
      
      layer.value.batchDraw();
    };
    
    // Navigation
    const prevPage = () => {
      console.log('prevPage called');
      forcePageNavigation('prev');
    };
    
    const nextPage = () => {
      console.log('nextPage called');
      forcePageNavigation('next');
    };
    
    const addPage = async () => {
      console.log('Simplified addPage function running');
      
      try {
        // First create a new page in the store
        console.log('Creating new page');
        const newPage = whiteboardStore.addPage();
        
        // Force immediate render
        console.log('Forcing render');
        renderObjects();
        
        // Then attempt to save
        console.log('Saving changes');
        try {
          await whiteboardStore.saveWhiteboard();
          console.log('Save successful');
        } catch (saveErr) {
          console.error('Error saving whiteboard:', saveErr);
          // Continue even if save fails
        }
        
        // Notify other users
        console.log('Notifying other users');
        rtcService.sendUpdate({
          action: 'add-page'
        });
        
        console.log('Page addition successful');
        return newPage;
      } catch (error) {
        console.error('Error in simplified addPage:', error);
        throw error; // Re-throw to allow caller to handle
      }
    };
    
    // Undo/Redo
    const undo = () => {
      whiteboardStore.undo();
      
      // Notify other users
      rtcService.sendUpdate({
        action: 'undo'
      });
    };
    
    const redo = () => {
      whiteboardStore.redo();
      
      // Notify other users
      rtcService.sendUpdate({
        action: 'redo'
      });
    };
    
    // Export whiteboard as image
    const exportImage = () => {
      if (!stage.value) return;
      
      // Get data URL
      const dataURL = stage.value.toDataURL();
      
      // Create download link
      const link = document.createElement('a');
      link.download = `whiteboard-${whiteboardId.value}-page-${currentPage.value}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    // Tool icon mapping
    const getToolIcon = (toolName) => {
      const iconMap = {
        pen: 'pencil-alt',
        line: 'minus',
        eraser: 'eraser',
        rectangle: 'vector-square',
        ellipse: 'circle',
        text: 'font',
        image: 'image',
        selection: 'mouse-pointer'
      };
      return iconMap[toolName] || 'question-circle';
    };
    
    // Tool label mapping
    const getToolLabel = (toolName) => {
      const labelMap = {
        pen: 'Pen',
        line: 'Line',
        eraser: 'Eraser',
        rectangle: 'Rectangle',
        ellipse: 'Ellipse',
        text: 'Text',
        image: 'Image',
        selection: 'Selection'
      };
      return labelMap[toolName] || 'Unknown';
    };
    
    // Get color name
    const getColorName = (color) => {
      const colorNames = {
        '#000000': 'Black',
        '#444444': 'Dark Grey',
        '#888888': 'Medium Grey',
        '#FFFFFF': 'White',
        '#E6194B': 'Red',
        '#F58231': 'Orange',
        '#FFE119': 'Yellow',
        '#BFEF45': 'Green',
        '#3CB44B': 'Lime Green',
        '#42D4F4': 'Cyan',
        '#4363D8': 'Blue',
        '#911EB4': 'Purple',
        '#F032E6': 'Pink',
        '#A9A9A9': 'Grey',
        '#FABEBE': 'Light Pink',
        '#FFD8B1': 'Light Orange'
      };
      return colorNames[color] || color;
    };
    
    // Get initials from name
    const getInitials = (name) => {
      if (!name) return '?';
      return name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    };
    
    // Set stroke width
    const setStrokeWidth = (width) => {
      currentStrokeWidth.value = width;
      whiteboardStore.setStrokeWidth(width);
      
      // Update current tool options
      if (toolManager.value && toolManager.value.getActiveTool()) {
        toolManager.value.getActiveTool().setOptions({ strokeWidth: width });
      }
    };
    
    // Go back to dashboard
    const goBack = () => {
      router.push('/dashboard');
    };
    
    // Handle real-time updates
    const handleRemoteUpdate = (data) => {
      console.log('[RTC] Received remote update:', data);
      
      // Process updates from other users
      switch (data.action) {
        case 'mock-connection':
          // This is a special action to test the mock RTC connection
          console.log('[RTC] Mock connection test received:', data.message);
          // We can show a notification or something here if needed
          break;
        case 'add-object':
          console.log(`[RTC] Handling add-object for page ${data.pageIndex}, current page is ${currentPage.value - 1}`);
          if (data.pageIndex === currentPage.value - 1) {
            // Update the store first
            console.log(`[RTC] Adding object ${data.object?.id} to local store.`);
            const addedObject = whiteboardStore.addObject(data.object);
            if (addedObject) {
              console.log(`[RTC] Object ${addedObject.id} added to store, triggering render.`);
              // Then render
              renderObjects();
            } else {
              console.error('[RTC] Failed to add object to store.');
            }
          } else {
            console.log(`[RTC] Ignoring add-object for different page.`);
          }
          break;
        case 'delete-object':
          console.log(`[RTC] Handling delete-object for page ${data.pageIndex}, current page is ${currentPage.value - 1}`);
          if (data.pageIndex === currentPage.value - 1) {
            // Update the store first
            console.log(`[RTC] Deleting object ${data.objectId} from local store.`);
            const success = whiteboardStore.deleteObject(data.objectId);
            if (success) {
              console.log(`[RTC] Object ${data.objectId} deleted from store, triggering render.`);
              // Then render
              renderObjects();
            } else {
              console.error(`[RTC] Failed to delete object ${data.objectId} from store.`);
            }
          } else {
            console.log(`[RTC] Ignoring delete-object for different page.`);
          }
          break;
        case 'update-object':
          if (data.pageIndex === currentPage.value - 1) {
            whiteboardStore.updateObject(data.objectId, data.updates);
            renderObjects();
          }
          break;
        case 'add-page':
          console.log('Received add-page action, current whiteboard ID:', whiteboardId.value);
          
          // Just add a page locally without reloading
          try {
            console.log('Adding page locally');
            whiteboardStore.addPage();
            
            // Navigate to the newly added page
            console.log('Navigating to the new page');
            whiteboardStore.setCurrentPage(whiteboardStore.totalPages);
            
            // Render the new page
            console.log('Rendering new page');
            renderObjects();
          } catch (err) {
            console.error('Error handling remote add-page:', err);
            
            // Fallback to reload method
            console.log('Falling back to reload method');
            whiteboardStore.loadWhiteboard(whiteboardId.value).then(() => {
              whiteboardStore.setCurrentPage(whiteboardStore.totalPages);
              renderObjects();
            });
          }
          break;
        case 'undo':
          whiteboardStore.undo();
          renderObjects();
          break;
        case 'redo':
          whiteboardStore.redo();
          renderObjects();
          break;
        default:
          console.warn('[RTC] Received unknown action:', data.action);
      }
    };
    
    // Handle user joined
    const handleUserJoined = (_user) => {
      collaborators.value = rtcService.getCollaborators();
    };
    
    // Handle user left
    const handleUserLeft = (_user) => {
      collaborators.value = rtcService.getCollaborators();
    };
    
    // Load whiteboard data and set up RTC
    const setupWhiteboard = async () => {
      try {
        isConnecting.value = true;
        
        console.log('[Whiteboard] Setting up whiteboard:', whiteboardId.value);
        
        // First load the whiteboard data
        await whiteboardStore.loadWhiteboard(whiteboardId.value);
        console.log('[Whiteboard] Whiteboard data loaded successfully');
        
        // Try to initialize RTC service with retry
        let rtcInitialized = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!rtcInitialized && retryCount < maxRetries) {
          try {
            console.log(`[Whiteboard] Initializing RTC service (attempt ${retryCount + 1}/${maxRetries})`);
            const success = await rtcService.initialize(whiteboardId.value);
            
            if (success) {
              console.log('[Whiteboard] RTC service initialized successfully');
              rtcInitialized = true;
              
              // Set up event handlers
              console.log('[Whiteboard] Setting up RTC event handlers');
              rtcService.onUpdate(handleRemoteUpdate);
              rtcService.onUserJoined(handleUserJoined);
              rtcService.onUserLeft(handleUserLeft);
              
              // Get initial collaborators
              collaborators.value = rtcService.getCollaborators();
              console.log('[Whiteboard] Initial collaborators:', collaborators.value);
            } else {
              console.error('[Whiteboard] Failed to initialize RTC service on attempt', retryCount + 1);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          } catch (error) {
            console.error('[Whiteboard] Error initializing RTC service:', error);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
        
        if (!rtcInitialized) {
          console.warn('[Whiteboard] Could not initialize RTC service after multiple attempts. Continuing without real-time collaboration.');
          // Make sure we at least have empty collaborators array
          collaborators.value = [];
        }
        
        // Render initial objects - this should work even if RTC failed
        console.log('[Whiteboard] Rendering initial objects');
        renderObjects();
      } catch (error) {
        console.error('[Whiteboard] Error setting up whiteboard:', error);
        // Add more details to help debugging
        console.error('[Whiteboard] Error details:', { 
          name: error.name,
          message: error.message,
          stack: error.stack,
          whiteboardId: whiteboardId.value
        });
        
        // Show error message to user
        alert('Error loading whiteboard. Redirecting to dashboard.');
        router.push('/dashboard');
      } finally {
        isConnecting.value = false;
      }
    };
    
    // Initialize
    onMounted(() => {
      // Add viewport meta tag to prevent zooming on tablets
      const setViewportMeta = () => {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        console.log('Set viewport meta tag to prevent zooming');
      };
      
      // Call it immediately
      setViewportMeta();
      
      // Initialize Konva
      initKonva();
      
      // Enable tablet optimization immediately if on a tablet
      if (isTabletMode.value) {
        enableTabletDrawingMode();
      }
      
      setupWhiteboard();
      
      // Add additional touch event handling for second and subsequent strokes
      const enhanceTouchHandling = () => {
        if (canvasContainer.value) {
          console.log('Adding enhanced touch event handling');

          // Add document-level touch event handlers to ensure nothing gets missed
          document.addEventListener('touchmove', (e) => {
            if (currentTool.value === 'pen') {
              e.preventDefault();
            }
          }, { passive: false, capture: true });
          
          // Disable Safari's text selection and elastic behaviors
          document.documentElement.style.WebkitUserSelect = 'none';
          document.documentElement.style.WebkitTouchCallout = 'none';
          document.body.style.overscrollBehavior = 'none';
        }
      };
      
      // Add enhanced touch handling
      enhanceTouchHandling();
      
      // Watch for tool changes to reset handlers
      watch(currentTool, (newTool) => {
        if (newTool === 'pen') {
          // When switching to pen, wait a moment then enhance touch handling
          setTimeout(() => {
            setupPenTool();
          }, 50);
        }
      });
      
      // Set up touch handling for tablet devices
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Add fullscreen change event listeners
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.addEventListener('mozfullscreenchange', handleFullScreenChange);
      document.addEventListener('MSFullscreenChange', handleFullScreenChange);
      
      // Replace the resize event handler
      window.addEventListener('resize', () => {
        // Check if device is in tablet mode
        checkIfTablet();
        
        // Check if we're in a maximized state by comparing window size to screen size
        const isMaximized = window.innerWidth >= window.screen.width * 0.9 && 
                            window.innerHeight >= window.screen.height * 0.9;
        
        if (isMaximized || isTabletMode.value) {
          console.log('Window appears to be maximized or in tablet mode');
          
          // Force visibility of the navigation bar
          const pageNav = document.querySelector('.page-navigation');
          if (pageNav) {
            // Ensure it's visible
            pageNav.style.visibility = 'visible';
            pageNav.style.opacity = '1';
            
            // Add special class if needed
            if (isTabletMode.value) {
              pageNav.classList.add('tablet-mode');
            }
            
            // Ensure it's properly positioned
            setTimeout(() => {
              handleFullScreenChange();
            }, 100);
          }
        }
        
        // Always handle resize to adjust the canvas
        handleResize();
      });
      
      // Add specific styling triggers for the navigation bar
      const togglePageNavigationVisibility = (visible = true) => {
        const pageNav = document.querySelector('.page-navigation');
        if (pageNav) {
          if (visible) {
            pageNav.classList.add('force-visible');
          } else {
            // Only remove if not in tablet mode
            if (!isTabletMode.value) {
              pageNav.classList.remove('force-visible');
            }
          }
        }
      };

      // Add a periodic check to ensure navigation remains visible
      const navCheckInterval = setInterval(() => {
        if (isTabletMode.value) {
          togglePageNavigationVisibility(true);
        }
      }, 5000); // Check every 5 seconds

      // Make sure components are visible initially (useful for tablets)
      setTimeout(() => {
        checkIfTablet();
        handleFullScreenChange();
        togglePageNavigationVisibility(true);
      }, 500);
      
      // Update the navVisibilityInterval
      const navVisibilityInterval = setInterval(() => {
        // Only run this check on tablet mode
        if (isTabletMode.value) {
          const pageNav = document.querySelector('.page-navigation');
          if (pageNav) {
            // Force visibility in tablet mode using CSS classes
            pageNav.classList.add('force-visible');
            
            // Check if maximized by comparing inner window size to screen size
            const isMaximized = window.innerWidth >= window.screen.width * 0.9 && 
                                window.innerHeight >= window.screen.height * 0.9;
            
            if (isMaximized) {
              // Add maximized class for enhanced visibility
              pageNav.classList.add('maximized');
              console.log('Enhanced navigation visibility for tablet maximized view');
            } else {
              // Remove maximized class, but keep force-visible for tablet mode
              pageNav.classList.remove('maximized');
            }
          }
        }
      }, 2000); // Check every 2 seconds
      
      // Clean up on unmount
      onBeforeUnmount(() => {
        // Remove event listeners
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('touchmove', preventEvent);
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
        
        // Restore document styles
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Reset viewport meta
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0';
        }
        
        // Clean up toolManager
        if (toolManager.value) {
          toolManager.value.destroy();
        }
        
        // Clean up RTC
        rtcService.disconnect();
        
        // Clean up whiteboard store
        whiteboardStore.clearWhiteboard();
        
        // Clear the navigation check interval
        clearInterval(navCheckInterval);
        
        // Clear the navigation visibility interval
        clearInterval(navVisibilityInterval);
      });
      
      // Check for scheduled session parameters
      checkForScheduledSession();
    });
    
    // Watch for page changes
    watch(currentPage, () => {
      renderObjects();
    });
    
    // Watch for changes in the store's objects to re-render
    watch(() => whiteboardStore.currentPageObjects, (newObjects, oldObjects) => {
      // Basic check to avoid re-render if objects haven't changed reference
      if (JSON.stringify(newObjects) !== JSON.stringify(oldObjects)) {
        renderObjects();
      }
    }, { deep: true });
    
    // Watch for tool changes to update draggable states
    watch(currentTool, () => {
      renderObjects();
    });
    
    // Function to toggle palettes
    const togglePalette = (paletteName) => {
      // Close other palettes when opening one
      Object.keys(isPaletteOpen).forEach(key => {
        if (key !== paletteName) {
          isPaletteOpen[key] = false;
        }
      });
      // Toggle the selected palette
      isPaletteOpen[paletteName] = !isPaletteOpen[paletteName];
      
      // Position the palette properly after opening
      if (isPaletteOpen[paletteName]) {
        setTimeout(() => {
          const paletteElement = document.querySelector(`.palette-content.${paletteName}`);
          const toolbar = document.querySelector('.left-toolbar');
          if (paletteElement && toolbar) {
            const toolbarRect = toolbar.getBoundingClientRect();
            paletteElement.style.left = `${toolbarRect.right + 20}px`;
          }
        }, 10);
      }
    };

    // Modified selection functions to close palette after selection
    const selectColor = (color) => {
      setColor(color);
      isPaletteOpen.colors = false; // Close palette
    };

    const selectStrokeWidth = (width) => {
      setStrokeWidth(width);
      isPaletteOpen.strokeWidths = false; // Close palette
    };

    const selectStrokePattern = (patternId) => {
      setStrokePattern(patternId);
      isPaletteOpen.strokePatterns = false; // Close palette
    };
    
    // Add a method to debug page navigation
    const forcePageNavigation = (direction) => {
      console.log('Force page navigation called:', direction);
      
      try {
        // Get current state
        const currentPageIndex = whiteboardStore.currentPageIndex;
        const totalPages = whiteboardStore.pages.length;
        
        console.log('Current state:', { currentPageIndex, totalPages });
        
        if (direction === 'next' && currentPageIndex < totalPages - 1) {
          console.log('Navigating to next page');
          whiteboardStore.setCurrentPage(currentPageIndex + 2); // +1 for index, +1 for next
          renderObjects();
          console.log('Now on page:', whiteboardStore.currentPageIndex + 1);
        } else if (direction === 'prev' && currentPageIndex > 0) {
          console.log('Navigating to previous page');
          whiteboardStore.setCurrentPage(currentPageIndex); // -1 for index, +1 for prev
          renderObjects();
          console.log('Now on page:', whiteboardStore.currentPageIndex + 1);
        } else if (direction === 'last') {
          console.log('Navigating to last page');
          whiteboardStore.setCurrentPage(totalPages);
          renderObjects();
          console.log('Now on page:', whiteboardStore.currentPageIndex + 1);
        } else if (direction === 'first') {
          console.log('Navigating to first page');
          whiteboardStore.setCurrentPage(1);
          renderObjects();
          console.log('Now on page:', whiteboardStore.currentPageIndex + 1);
        }
      } catch (err) {
        console.error('Error in forcePageNavigation:', err);
      }
    };

    // Update the handleAddPage method
    const handleAddPage = async (e) => {
      console.log('Add Page button clicked', e);
      // Prevent default behavior and stop propagation
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Use a try-catch to handle potential errors
      try {
        console.log('Calling addPage function directly');
        await addPage();
        
        // Force navigation to the last page
        console.log('Forcing navigation to the last page');
        forcePageNavigation('last');
        
        console.log('Add page operation completed');
      } catch (err) {
        console.error('Error in handleAddPage:', err);
      }
    };
    
    // Replace the existing handleFullScreenChange function
    const handleFullScreenChange = () => {
      console.log('Fullscreen change detected');
      
      // Force redraw of page navigation
      const pageNav = document.querySelector('.page-navigation');
      if (pageNav) {
        // Check if we're in fullscreen mode
        const isFullscreen = document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement ||
            document.msFullscreenElement;
            
        // Check if the window is maximized
        const isMaximized = window.innerWidth >= window.screen.width * 0.9 && 
                            window.innerHeight >= window.screen.height * 0.9;
        
        // Apply appropriate visibility settings
        if (isFullscreen || isMaximized || isTabletMode.value) {
          // Make navigation bar very visible
          pageNav.style.visibility = 'visible';
          pageNav.style.opacity = '1';
          pageNav.style.bottom = '30px';
          pageNav.style.padding = '10px';
          pageNav.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
          pageNav.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.3)';
          pageNav.style.border = '2px solid rgba(255, 255, 255, 0.8)';
          
          if (isTabletMode.value) {
            pageNav.classList.add('tablet-mode');
          }
          
          console.log('Enhanced navigation visibility for fullscreen/maximized view');
        } else {
          // Reset to default styles if not in special mode
          pageNav.style.visibility = '';
          pageNav.style.opacity = '';
          pageNav.style.bottom = '';
          pageNav.style.padding = '';
          pageNav.style.backgroundColor = '';
          pageNav.style.boxShadow = '';
          pageNav.style.border = '';
          
          pageNav.classList.remove('tablet-mode');
        }
      }
      
      // Force resize handler to run
      handleResize();
    };
    
    // Update detection in onMounted
    const checkIfTablet = () => {
      // Check if we're on a tablet - various detection methods
      const userAgent = navigator.userAgent.toLowerCase();
      const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 1024 && window.innerWidth > 480;
      
      // Set tablet mode if any conditions match
      isTabletMode.value = isTablet || (isTouch && isSmallScreen);
      
      console.log('Device detection:', { isTablet, isTouch, isSmallScreen, isTabletMode: isTabletMode.value });
    };
    
    // Add a function for extreme tablet optimization
    const enableTabletDrawingMode = () => {
      console.log('Enabling extreme tablet drawing optimization');
      
      // Skip this if we don't have the canvas container
      if (!canvasContainer.value || !stage.value) return;
      
      // 1. Set up direct DOM handling that completely bypasses Vue and Konva for maximum performance
      const container = canvasContainer.value;
      
      // 2. Create a canvas-level touchmove handler with the highest priority possible
      const directTouchHandler = (e) => {
        // Only activate for pen tool
        if (currentTool.value !== 'pen') return;
        
        // Immediately prevent any browser handling
        e.preventDefault();
        e.stopPropagation();
        
        // Force redraw if we have an active pen tool with painting state
        if (toolManager.value && 
            toolManager.value.getTool('pen') && 
            toolManager.value.getTool('pen').isPainting) {
          
          // Get the position
          const touch = e.touches[0];
          if (!touch) return;
          
          // Convert to canvas coordinates
          const rect = container.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          
          // Directly forward the position to the pen tool
          if (typeof toolManager.value.getTool('pen')._addPoint === 'function') {
            toolManager.value.getTool('pen')._addPoint({ x, y });
          }
        }
      };
      
      // Add the handler with the highest possible priority
      container.addEventListener('touchmove', directTouchHandler, {
        passive: false,
        capture: true
      });
      
      // Make sure to clean it up when we're done
      onBeforeUnmount(() => {
        container.removeEventListener('touchmove', directTouchHandler, {
          capture: true
        });
      });
      
      // 3. Apply extreme performance optimizations to the stage
      if (stage.value) {
        // Reduce Konva's overhead
        stage.value.listening(false);        // Disable event listening system
        stage.value.perfectDrawEnabled(false); // Disable perfect drawing
        
        // Apply direct rendering optimizations
        if (stage.value.content) {
          // Use GPU acceleration
          stage.value.content.style.willChange = 'transform';
          stage.value.content.style.transform = 'translateZ(0)';
        }
      }
      
      // 4. Configure for maximum draw performance at the expense of quality
      if (layer.value) {
        // Turn off all unnecessary features
        layer.value.listening(false);
        layer.value.hitGraphEnabled(false);
        layer.value.perfectDrawEnabled(false);
        
        // Give drawing operations maximum priority
        layer.value.imageSmoothingEnabled(false);
      }
      
      // 5. Disable touch handling in the entire document to prevent interference
      const preventDocumentTouch = (e) => {
        if (currentTool.value === 'pen' && e.target.closest('.whiteboard-canvas')) {
          e.preventDefault();
          return false;
        }
      };
      
      document.addEventListener('touchmove', preventDocumentTouch, { passive: false });
      
      // Clean up when done
      onBeforeUnmount(() => {
        document.removeEventListener('touchmove', preventDocumentTouch);
      });
      
      // 6. Disable selection, highlighting, and other browser features
      container.style.userSelect = 'none';
      container.style.webkitUserSelect = 'none';
      container.style.WebkitTapHighlightColor = 'rgba(0,0,0,0)';
      container.style.WebkitTouchCallout = 'none';
      
      // 7. Force the screen to be non-zoomable
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      console.log('Tablet drawing mode fully enabled');
    };
    
    // Add watcher for dark mode to update stage background
    watch(isDarkMode, (newValue) => {
      if (stage.value && stage.value.container()) {
        const newBgColor = newValue ? '#333333' : '#ffffff'; // Dark grey or white
        console.log(`[Theme] Changing stage background to: ${newBgColor}`);
        stage.value.container().style.backgroundColor = newBgColor;
      } else {
        console.warn('[Theme] Stage not available to change background color.');
      }
    });
    
    // Apply initial background color on mount
    onMounted(() => {
      // ... (existing localStorage theme loading)
      
      // Set initial stage background
      const initialBgColor = isDarkMode.value ? '#333333' : '#ffffff';
      if (stage.value && stage.value.container()) {
          stage.value.container().style.backgroundColor = initialBgColor;
      } else {
          // If stage isn't ready yet, try again after a short delay
          setTimeout(() => {
              if (stage.value && stage.value.container()) {
                  stage.value.container().style.backgroundColor = initialBgColor;
                  console.log(`[Theme] Set initial stage background (delayed): ${initialBgColor}`);
              }
          }, 200);
      }
      
      // ... rest of onMounted ...
    });
    
    // Handle scheduled session
    const checkForScheduledSession = () => {
      const { scheduled, datetime, duration } = route.query;
      
      if (scheduled === 'true' && datetime) {
        try {
          // Parse the datetime parameter
          const dateTime = new Date(decodeURIComponent(datetime));
          
          // Check if it's a valid date
          if (!isNaN(dateTime.getTime())) {
            scheduledDateTime.value = dateTime;
            scheduledDuration.value = duration || '60';
            isScheduledSession.value = true;
            showSessionBanner.value = true;
            
            console.log('Detected scheduled session:', {
              datetime: dateTime,
              duration: scheduledDuration.value
            });
          }
        } catch (err) {
          console.error('Error parsing scheduled session parameters:', err);
        }
      }
    };
    
    const dismissSessionBanner = () => {
      showSessionBanner.value = false;
    };
    
    return {
      canvasContainer,
      currentPage,
      totalPages,
      currentTool,
      strokeColor,
      canUndo,
      canRedo,
      toolNames,
      colors,
      strokeWidths,
      currentStrokeWidth,
      strokePatterns,
      currentStrokePattern,
      collaborators,
      isConnecting,
      setTool,
      setColor,
      setStrokePattern,
      getPatternStyle,
      prevPage,
      nextPage,
      addPage,
      undo,
      redo,
      exportImage,
      getToolIcon,
      getToolLabel,
      getColorName,
      getInitials,
      setStrokeWidth,
      goBack,
      isPaletteOpen,
      togglePalette,
      selectColor,
      selectStrokeWidth,
      selectStrokePattern,
      handleAddPage,
      forcePageNavigation,
      isTabletMode,
      isDarkMode,
      toggleTheme,
      isScheduledSession: computed(() => isScheduledSession.value && showSessionBanner.value),
      sessionDetails,
      dismissSessionBanner
    };
  }
};
</script>

<style scoped>
:root {
  --button-size: 40px;
  --button-radius: 10px;
  --button-border-color: #ccc;
  --button-bg-color: white;
  --button-text-color: #555;
  --gap-small: 6px;
  --gap-medium: 12px;

  --button-hover-bg: #f8f9fa;
  --button-hover-border: #bbb;
  --button-hover-text: #007bff;

  --button-active-bg: #e9ecef;
  --button-active-border: #adb5bd;
  --button-active-text: #0056b3;
  
  --dark-bg: #2c2c2c;
  --dark-ui-bg: #3a3a3a;
  --dark-ui-border: #505050;
  --dark-text: #e0e0e0;

  --dark-button-bg: #4a4a4a;
  --dark-button-border: #606060;
  --dark-button-hover-bg: #5a5a5a;
  --dark-button-hover-text: #fff;
  --icon-size: 2.5rem;
}

.whiteboard-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f8f9fa;
  position: relative;
  color: #333;
}

.whiteboard-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.whiteboard-canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  /* Prevent browser from handling touch gestures like scrolling/panning */
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

.left-toolbar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 15px;
  display: flex;
  flex-direction: column;
  padding: 15px;
  background-color: var(--button-bg-color);
  border-radius: calc(var(--button-radius) + 10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 2px solid var(--button-border-color);
  z-index: 10;
  width: auto;
  gap: 0;
  justify-content: center;
  height: auto;
  max-height: 90vh;
  overflow: visible;
}

.toolbar-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
}

.toolbar-section + .toolbar-section {
  border-top: 2px solid #eee;
  padding-top: 10px;
  margin-top: 0;
}

/* --- UNIFIED BUTTON STYLING --- */
.tool-btn,
.section-title-btn,
.page-btn,
.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #cccccc;
  background-color: var(--button-bg-color);
  border-radius: var(--button-radius);
  cursor: pointer;
  color: var(--button-text-color);
  transition: all 0.15s ease;
  padding: 0;
  margin: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.tool-btn:hover,
.section-title-btn:hover,
.page-btn:hover:not(:disabled),
.nav-btn:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--button-hover-border);
  color: var(--button-hover-text);
}

.tool-btn.active {
  background-color: var(--button-active-bg);
  border-color: var(--button-active-border);
  color: var(--button-active-text);
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.05);
}

.tool-btn:disabled,
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--button-hover-bg);
}

.tool-btn i,
.section-title-btn i,
.page-btn i,
.nav-btn i {
  font-size: 1.5rem;
  margin: 0;
}

/* Specific styles for toolbar buttons */
.left-toolbar .tool-btn,
.left-toolbar .section-title-btn {
  width: 40px;
  height: 40px;
  margin: 2px 0;
}

.left-toolbar .tool-btn i,
.left-toolbar .section-title-btn i {
  font-size: 1.5rem;
}
/* --- END UNIFIED BUTTON STYLING --- */

/* --- PALETTE STYLING --- */
.palette-content {
  position: fixed;
  left: 100px;
  top: 50%;
  transform: translateY(-50%);
  padding: 15px;
  background-color: var(--button-bg-color);
  border-radius: var(--button-radius);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 2px solid var(--button-border-color);
  z-index: 100;
  min-width: 250px;
}

/* Make sure palette is properly positioned over canvas */
.expandable {
  position: relative;
}

/* Colors */
.palette-content.colors .color-swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin: 0 auto;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}
.color-swatch[title="White"] { border-color: #ddd; }
.color-swatch.active { border-color: #333; transform: scale(1.15); }

/* Stroke Widths */
.palette-content.strokeWidths .stroke-options,
.palette-content.stroke-widths .stroke-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
  align-items: center;
  justify-items: center;
}

/* Stroke Patterns */
.palette-content.strokePatterns .pattern-options,
.palette-content.stroke-patterns .pattern-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stroke-btn {
  width: 100%;
  height: 40px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.stroke-btn:hover { background-color: #f0f0f0; }
.stroke-btn.active { background-color: #dcdcdc; }
.stroke-preview {
  background-color: var(--button-text-color);
  border-radius: 50%;
  display: block;
  margin: auto;
  max-width: 30px;
  max-height: 30px;
}

.pattern-btn {
  width: 100%;
  height: 30px;
  padding: 0 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.pattern-btn:hover { background-color: #f0f0f0; }
.pattern-btn.active { background-color: #dcdcdc; }
.pattern-preview {
  height: 8px;
  width: 80%;
  background-color: #333;
}
/* --- END PALETTE STYLING --- */

/* Page Navigation */
.page-navigation {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 3px;
  background-color: var(--button-bg-color);
  border-radius: calc(var(--button-radius) / 2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px 6px;
  z-index: 1000;
  border: 1px solid var(--button-border-color);
}
.page-indicator {
  margin: 0 3px;
  font-size: 0.8rem;
  min-width: 30px;
  text-align: center;
  color: var(--button-text-color);
}

/* Make the navigation buttons smaller */
.page-navigation .page-btn,
.page-navigation .nav-btn {
  width: 20px;
  height: 20px;
}

.page-navigation .page-btn i,
.page-navigation .nav-btn i {
  font-size: 0.8rem;
}

/* --- DARK MODE STYLES --- */
.whiteboard-page.dark-mode {
  background-color: var(--dark-bg);
  color: var(--dark-text);
}

.whiteboard-page.dark-mode .left-toolbar,
.whiteboard-page.dark-mode .page-navigation,
.whiteboard-page.dark-mode .palette-content {
  background-color: var(--dark-ui-bg);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
  border-color: var(--dark-ui-border);
}

.whiteboard-page.dark-mode .toolbar-section + .toolbar-section {
  border-top-color: var(--dark-ui-border);
}

/* Dark mode buttons */
.whiteboard-page.dark-mode .tool-btn,
.whiteboard-page.dark-mode .section-title-btn,
.whiteboard-page.dark-mode .page-btn,
.whiteboard-page.dark-mode .nav-btn {
  background-color: var(--dark-button-bg);
  border-color: var(--dark-button-border);
  color: white;
  box-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.whiteboard-page.dark-mode .tool-btn i,
.whiteboard-page.dark-mode .section-title-btn i,
.whiteboard-page.dark-mode .page-btn i,
.whiteboard-page.dark-mode .nav-btn i {
  color: white;
}

.whiteboard-page.dark-mode .tool-btn:hover,
.whiteboard-page.dark-mode .section-title-btn:hover,
.whiteboard-page.dark-mode .page-btn:hover:not(:disabled),
.whiteboard-page.dark-mode .nav-btn:hover {
  background-color: var(--dark-button-hover-bg);
  border-color: var(--dark-button-hover-border);
  color: var(--dark-button-hover-text);
}

.whiteboard-page.dark-mode .tool-btn.active {
  background-color: var(--dark-button-active-bg);
  border-color: var(--dark-button-active-border);
  color: var(--dark-button-active-text);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
}

.whiteboard-page.dark-mode .page-indicator {
  color: white;
}

/* Dark mode palettes */
.whiteboard-page.dark-mode .color-swatch[title="White"] { border-color: #777; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
.whiteboard-page.dark-mode .color-swatch.active { border-color: #fff; }
.whiteboard-page.dark-mode .stroke-btn:hover { background-color: var(--dark-button-hover-bg); }
.whiteboard-page.dark-mode .stroke-btn.active { background-color: var(--dark-button-active-bg); }
.whiteboard-page.dark-mode .stroke-preview { background-color: var(--dark-text); }
.whiteboard-page.dark-mode .pattern-btn:hover { background-color: var(--dark-button-hover-bg); }
.whiteboard-page.dark-mode .pattern-btn.active { background-color: var(--dark-button-active-bg); }
.whiteboard-page.dark-mode .pattern-preview { background-color: var(--dark-text); }

/* Style for the theme toggle button specific colors */
.theme-toggle-btn i.fa-sun { color: #f1c40f; }
.theme-toggle-btn i.fa-moon { color: #f39c12; }
.whiteboard-page.dark-mode .theme-toggle-btn i.fa-sun { color: #f39c12; }
.whiteboard-page.dark-mode .theme-toggle-btn i.fa-moon { color: #bdc3c7; }

/* Ensure other icons follow the general dark mode button color */
.whiteboard-page.dark-mode .tool-btn:not(.theme-toggle-btn) i,
.whiteboard-page.dark-mode .section-title-btn i,
.whiteboard-page.dark-mode .page-btn i,
.whiteboard-page.dark-mode .nav-btn i {
  color: var(--dark-button-text);
}

.whiteboard-page.dark-mode .tool-btn:not(.theme-toggle-btn):hover i,
.whiteboard-page.dark-mode .section-title-btn:hover i,
.whiteboard-page.dark-mode .page-btn:hover:not(:disabled) i,
.whiteboard-page.dark-mode .nav-btn:hover i {
  color: var(--dark-button-hover-text);
}

.whiteboard-page.dark-mode .tool-btn.active:not(.theme-toggle-btn) i {
  color: var(--dark-button-hover-text);
}

/* Keep canvas drawing area background consistent or theme-based */
.whiteboard-canvas {
   /* background-color: white; /* Uncomment if you ALWAYS want white */
   /* Or leave it unset to follow .whiteboard-page background */
}

.whiteboard-page.dark-mode .left-toolbar {
  border-color: var(--dark-ui-border);
  background-color: var(--dark-ui-bg);
  /* Add scrollbar styling for dark mode if desired */
}

/* Make sure page navigation bar gets dark styling too */
.whiteboard-page.dark-mode .page-navigation {
  background-color: var(--dark-ui-bg);
  border-color: var(--dark-ui-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* Scheduled Session Banner */
.scheduled-session-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(49, 130, 206, 0.95);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  animation: slide-down 0.3s ease;
}

@keyframes slide-down {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.session-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.session-info i {
  font-size: 1.8rem;
}

.session-details h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.session-details p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.btn-dismiss {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-dismiss:hover {
  opacity: 1;
}

/* Adjust whiteboard container when banner is shown */
.whiteboard-page:has(.scheduled-session-banner) .whiteboard-container {
  padding-top: 60px;
}

/* Fallback for browsers that don't support :has() */
.scheduled-session-banner + .whiteboard-container {
  padding-top: 60px;
}

/* Dark mode adjustments */
.whiteboard-page.dark-mode .scheduled-session-banner {
  background-color: rgba(45, 55, 72, 0.95);
}

</style>