import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';

// Base tool class
class Tool {
  constructor(stage, layer, addObjectCallback) {
    this.stage = stage;
    this.layer = layer;
    this.addObjectCallback = addObjectCallback;
    this.options = {
      strokeColor: '#000000',
      strokeWidth: 2,
      fillColor: 'transparent',
      dash: []
    };
  }

  activate() {
    // To be implemented by subclasses
  }

  deactivate() {
    // To be implemented by subclasses
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
}

// Pen Tool - Hybrid approach with native canvas for drawing
class PenTool extends Tool {
  constructor(stage, layer, addObjectCallback, renderObjectsCallback) {
    super(stage, layer, addObjectCallback);
    this.isPainting = false;
    this.icon = 'pen';
    
    // Properties for Konva version
    this.currentLine = null;
    this.lastPointerPosition = null;
    this.pointsBuffer = [];
    
    // Properties for native canvas version
    this.nativeCanvas = null;
    this.nativeContext = null;
    this.lastX = 0;
    this.lastY = 0;
    this.paths = []; // Store multiple strokes
    this.currentPath = null;
    
    // Configuration
    this.smoothingFactor = 0.2;
    this.isTablet = this._detectTablet();
    this.useNativeCanvas = this.isTablet; // Use native canvas on tablets
    this.renderObjectsCallback = renderObjectsCallback; // Store the callback
  }
  
  // Detect if we're on a tablet device
  _detectTablet() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isTablet || isTouch || navigator.maxTouchPoints > 0;
  }

  activate() {
    if (this.useNativeCanvas) {
      this._setupNativeCanvas();
      
      // Make sure the layer is visible for rendering Konva shapes
      if (this.layer) {
        this.layer.visible(true);
        this.layer.batchDraw();
      }
    } else {
      // Standard Konva setup for desktop
      this._setupKonvaEvents();
    }
  }
  
  deactivate() {
    console.log('[PenTool] Deactivating');
    if (this.useNativeCanvas) {
      // *** Add this block to finalize any pending stroke ***
      if (this.currentPath && this.currentPath.points.length >= 4 && !this.isPainting) {
        console.log('[PenTool] Finalizing pending stroke on deactivate', this.currentPath.id);
        this._createKonvaObjectFromPath(this.currentPath);
        this.currentPath = null; // Clear the path after saving
      }
      // ***************************************************
      
      this._removeNativeCanvas(); // This already clears the canvas
    } else {
      this._removeKonvaEvents();
    }
    
    this.isPainting = false;
    // Don't call reset here, as it might clear things prematurely
    // this.reset(); 
  }
  
  // Native Canvas Implementation
  _setupNativeCanvas() {
    // Create a canvas that overlays the Konva stage
    const container = this.stage.container();
    
    // Check if canvas already exists
    let existingCanvas = container.querySelector('.pen-native-canvas');
    if (existingCanvas) {
      this.nativeCanvas = existingCanvas;
      this.nativeContext = this.nativeCanvas.getContext('2d');
      this._clearCanvas();
      console.log('Reusing existing native canvas');
    } else {
      // Create and position the canvas
      this.nativeCanvas = document.createElement('canvas');
      this.nativeCanvas.className = 'pen-native-canvas';
      this.nativeCanvas.style.position = 'absolute';
      this.nativeCanvas.style.top = '0';
      this.nativeCanvas.style.left = '0';
      this.nativeCanvas.style.zIndex = '100'; // Above Konva
      this.nativeCanvas.style.touchAction = 'none';
      this.nativeCanvas.style.pointerEvents = 'none'; // Let events pass through to Konva except when drawing
      
      // Match size to container
      this.nativeCanvas.width = container.clientWidth;
      this.nativeCanvas.height = container.clientHeight;
      
      // Get drawing context
      this.nativeContext = this.nativeCanvas.getContext('2d');
      
      // Configure for best line quality
      this.nativeContext.lineCap = 'round';
      this.nativeContext.lineJoin = 'round';
      this.nativeContext.imageSmoothingEnabled = true;
      
      // Add to container
      container.appendChild(this.nativeCanvas);
      console.log('Created new native canvas for pen drawing');
    }
    
    // Setup touch event handlers
    this._addNativeEventListeners();
  }
  
  _addNativeEventListeners() {
    if (!this.nativeCanvas) return;
    
    const container = this.stage.container();
    
    // Set up handlers
    this._touchStartHandler = this._handleNativeTouchStart.bind(this);
    this._touchMoveHandler = this._handleNativeTouchMove.bind(this);
    this._touchEndHandler = this._handleNativeTouchEnd.bind(this);
    
    // Add them with high priority
    container.addEventListener('touchstart', this._touchStartHandler, { passive: false, capture: true });
    container.addEventListener('touchmove', this._touchMoveHandler, { passive: false, capture: true });
    container.addEventListener('touchend', this._touchEndHandler, { passive: false, capture: true });
    container.addEventListener('touchcancel', this._touchEndHandler, { passive: false, capture: true });
    
    // Also add mouse events for testing
    container.addEventListener('mousedown', this._touchStartHandler, { capture: true });
    container.addEventListener('mousemove', this._touchMoveHandler, { capture: true });
    container.addEventListener('mouseup', this._touchEndHandler, { capture: true });
  }
  
  _removeNativeEventListeners() {
    if (!this.nativeCanvas) return;
    
    const container = this.stage.container();
    
    // Remove all event listeners
    container.removeEventListener('touchstart', this._touchStartHandler, { capture: true });
    container.removeEventListener('touchmove', this._touchMoveHandler, { capture: true });
    container.removeEventListener('touchend', this._touchEndHandler, { capture: true });
    container.removeEventListener('touchcancel', this._touchEndHandler, { capture: true });
    
    container.removeEventListener('mousedown', this._touchStartHandler, { capture: true });
    container.removeEventListener('mousemove', this._touchMoveHandler, { capture: true });
    container.removeEventListener('mouseup', this._touchEndHandler, { capture: true });
  }
  
  _handleNativeTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // *** Force render of Konva layer BEFORE clearing native canvas ***
    if (typeof this.renderObjectsCallback === 'function') {
      console.log('[PenTool] Forcing Konva render before starting new stroke.');
      this.renderObjectsCallback();
    } else {
      console.warn('[PenTool] renderObjectsCallback not available.');
    }
    // ***********************************************************
    
    // Clear the canvas before starting a new stroke
    console.log('[PenTool] Clearing native canvas before new stroke.');
    this._clearCanvas();
    
    // Get coordinates
    let x, y;
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const rect = this.nativeCanvas.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else if (e.clientX !== undefined) {
      const rect = this.nativeCanvas.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      return;
    }
    
    // Start new path
    this.isPainting = true;
    this.lastX = x;
    this.lastY = y;
    
    // Set drawing style
    this.nativeContext.strokeStyle = this.options.strokeColor;
    this.nativeContext.lineWidth = this.options.strokeWidth;
    
    // Start collecting points for this stroke
    this.currentPath = {
      points: [x, y],
      color: this.options.strokeColor,
      width: this.options.strokeWidth,
      dash: this.options.dash,
      id: uuidv4() // Assign ID early for logging
    };
    
    console.log(`[PenTool] Started new path: ${this.currentPath.id}`);
    
    // Begin actual drawing
    this.nativeContext.beginPath();
    this.nativeContext.moveTo(x, y);
    
    // Force immediate canvas event capture
    this.nativeCanvas.style.pointerEvents = 'auto';
    
    console.log('[PenTool] Touch start processed at', x, y);
  }
  
  _handleNativeTouchMove(e) {
    if (!this.isPainting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get coordinates
    let x, y;
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const rect = this.nativeCanvas.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else if (e.clientX !== undefined) {
      const rect = this.nativeCanvas.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      return;
    }
    
    // Add point to current path
    this.currentPath.points.push(x, y);
    
    // Clear the area where we'll draw the new line segment to ensure clean drawing
    this.nativeContext.lineCap = 'round';
    this.nativeContext.lineJoin = 'round';
    this.nativeContext.lineWidth = this.options.strokeWidth;
    this.nativeContext.strokeStyle = this.options.strokeColor;
    
    // Draw a segment from last position to current
    this.nativeContext.beginPath();
    this.nativeContext.moveTo(this.lastX, this.lastY);
    this.nativeContext.lineTo(x, y);
    this.nativeContext.stroke();
    
    // Update last position
    this.lastX = x;
    this.lastY = y;
  }
  
  _handleNativeTouchEnd(e) {
    if (!this.isPainting) return;
    e.preventDefault();
    
    // Stop drawing
    this.isPainting = false;
    
    // Finalize the current path
    if (this.currentPath && this.currentPath.points.length >= 4) { // At least 2 points (x,y pairs)
      // Save this path
      this.paths.push(this.currentPath);
      
      // Add to store via Konva for compatibility
      this._createKonvaObjectFromPath(this.currentPath);
    }
    
    this.currentPath = null;
    
    // Stop capturing pointer events
    this.nativeCanvas.style.pointerEvents = 'none';
  }
  
  _createKonvaObjectFromPath(path) {
    // Create a Konva line object using the path points
    const object = {
      id: uuidv4(),
      type: 'path',
      points: [...path.points], // Copy points array
      stroke: path.color,
      strokeWidth: path.width,
      tension: this.smoothingFactor,
      dash: path.dash
    };
    
    console.log(`[PenTool] Creating Konva object for path: ${object.id}`);
    
    // Add to the store and make sure it gets drawn
    // This will trigger the store update and RTC send
    this.addObjectCallback(object);
  }
  
  _clearCanvas() {
    if (this.nativeContext) {
      this.nativeContext.clearRect(0, 0, this.nativeCanvas.width, this.nativeCanvas.height);
    }
  }
  
  _removeNativeCanvas() {
    this._removeNativeEventListeners();
    
    if (this.nativeCanvas && this.nativeCanvas.parentNode) {
      // Don't actually remove, just hide it - we'll reuse it later
      this.nativeCanvas.style.pointerEvents = 'none';
      this._clearCanvas();
    }
    
    this.isPainting = false;
    this.currentPath = null;
  }
  
  // Konva Implementation for Desktop
  _setupKonvaEvents() {
    this.stage.on('mousedown touchstart', this._handleKonvaMouseDown.bind(this));
    this.stage.on('mousemove touchmove', this._handleKonvaMouseMove.bind(this));
    this.stage.on('mouseup touchend', this._handleKonvaMouseUp.bind(this));
  }
  
  _removeKonvaEvents() {
    this.stage.off('mousedown touchstart');
    this.stage.off('mousemove touchmove');
    this.stage.off('mouseup touchend');
  }
  
  _handleKonvaMouseDown(e) {
    // Prevent default behavior for touch events
    if (e.evt.type.startsWith('touch')) {
      e.evt.preventDefault();
    }
    
    this.isPainting = true;
    const pos = this.stage.getPointerPosition();
    if (!pos) return;
    
    this.lastPointerPosition = pos;
    this.pointsBuffer = [pos.x, pos.y];
    
    this.currentLine = new Konva.Line({
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      tension: this.smoothingFactor,
      dash: this.options.dash,
      points: this.pointsBuffer,
      draggable: false,
    });
    
    this.layer.add(this.currentLine);
    this.layer.batchDraw();
  }
  
  _handleKonvaMouseMove(e) {
    if (!this.isPainting) return;
    
    // Prevent default behavior for touch events
    if (e.evt.type.startsWith('touch')) {
      e.evt.preventDefault();
    }
    
    const pos = this.stage.getPointerPosition();
    if (!pos) return;
    
    this.pointsBuffer.push(pos.x, pos.y);
    this.lastPointerPosition = pos;
    
    if (this.currentLine) {
      this.currentLine.points(this.pointsBuffer);
      this.layer.batchDraw();
    }
  }
  
  _handleKonvaMouseUp(e) {
    if (!this.isPainting) return;
    
    // Prevent default behavior for touch events
    if (e.evt.type.startsWith('touch')) {
      e.evt.preventDefault();
    }
    
    this.isPainting = false;
    
    if (this.currentLine) {
      // Create object for storage
      const object = {
        id: uuidv4(),
        type: 'path',
        points: [...this.pointsBuffer],
        stroke: this.options.strokeColor,
        strokeWidth: this.options.strokeWidth,
        tension: this.smoothingFactor,
        dash: this.options.dash
      };
      
      // Add to the store
      this.addObjectCallback(object);
      
      this.currentLine = null;
    }
    
    this.lastPointerPosition = null;
    this.pointsBuffer = [];
  }
  
  // Common methods
  reset() {
    if (this.useNativeCanvas) {
      this._clearCanvas();
      this.paths = [];
      this.currentPath = null;
      this.isPainting = false;
      
      // Make sure the canvas is ready for the next stroke
      if (this.nativeCanvas) {
        this.nativeCanvas.style.pointerEvents = 'none';
      }
    } else {
      if (this.currentLine) {
        this.currentLine.remove();
        this.currentLine = null;
      }
      this.pointsBuffer = [];
      this.isPainting = false;
    }
  }
  
  setOptions(options) {
    this.options = { ...this.options, ...options };
    
    // Update native canvas context if it exists
    if (this.nativeContext) {
      this.nativeContext.strokeStyle = this.options.strokeColor;
      this.nativeContext.lineWidth = this.options.strokeWidth;
    }
  }

  // Add a direct point method for external callers
  _addPoint(point) {
    if (!this.isPainting || !this.nativeContext || !point) return;
    
    // Add the point to our current path
    this.currentPath.points.push(point.x, point.y);
    
    // Draw the line segment
    this.nativeContext.beginPath();
    this.nativeContext.moveTo(this.lastX, this.lastY);
    this.nativeContext.lineTo(point.x, point.y);
    this.nativeContext.stroke();
    
    // Update last position
    this.lastX = point.x;
    this.lastY = point.y;
  }

  // Add a resize method to handle window resizing
  resizeNativeCanvas() {
    if (!this.useNativeCanvas || !this.nativeCanvas) return;
    
    const container = this.stage.container();
    if (!container) return;
    
    // Update canvas size to match container
    this.nativeCanvas.width = container.clientWidth;
    this.nativeCanvas.height = container.clientHeight;
    
    // Reset context settings after resize
    if (this.nativeContext) {
      this.nativeContext.lineCap = 'round';
      this.nativeContext.lineJoin = 'round';
      this.nativeContext.lineWidth = this.options.strokeWidth;
      this.nativeContext.strokeStyle = this.options.strokeColor;
    }
    
    console.log('Resized native canvas to', this.nativeCanvas.width, 'x', this.nativeCanvas.height);
  }
}

// Line Tool
class LineTool extends Tool {
  constructor(stage, layer, addObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.isDrawing = false;
    this.startPos = null;
    this.currentLine = null;
    this.icon = 'grip-lines';
  }

  activate() {
    this.stage.on('mousedown touchstart', this.handleMouseDown.bind(this));
    this.stage.on('mousemove touchmove', this.handleMouseMove.bind(this));
    this.stage.on('mouseup touchend', this.handleMouseUp.bind(this));
  }

  deactivate() {
    this.stage.off('mousedown touchstart');
    this.stage.off('mousemove touchmove');
    this.stage.off('mouseup touchend');
    this.isDrawing = false;
    this.startPos = null;
    this.currentLine = null;
  }

  handleMouseDown(_e) {
    this.isDrawing = true;
    this.startPos = this.stage.getPointerPosition();
    this.currentLine = new Konva.Line({
      points: [this.startPos.x, this.startPos.y, this.startPos.x, this.startPos.y],
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      dash: this.options.dash,
      draggable: false,
    });
    this.layer.add(this.currentLine);
  }

  handleMouseMove(_e) {
    if (!this.isDrawing) return;
    
    const pos = this.stage.getPointerPosition();
    
    // Update end point of the line
    this.currentLine.points([this.startPos.x, this.startPos.y, pos.x, pos.y]);
    
    this.layer.batchDraw();
  }

  handleMouseUp(_e) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    // Only add if the line has non-zero length
    const points = this.currentLine.points();
    const dx = points[2] - points[0];
    const dy = points[3] - points[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 1) {
      // Create object for storage
      const object = {
        id: uuidv4(),
        type: 'line',
        points: points,
        stroke: this.options.strokeColor,
        strokeWidth: this.options.strokeWidth,
        dash: this.options.dash
      };
      
      // Add to the store
      this.addObjectCallback(object);
    } else {
      // Remove zero-length line
      this.currentLine.destroy();
      this.layer.batchDraw();
    }
    
    this.currentLine = null;
    this.startPos = null;
  }
}

// Selection Tool
class SelectionTool extends Tool {
  constructor(stage, layer, addObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.selectedShape = null;
    this.transformer = null;
    this.icon = 'mouse-pointer';
    this.objectStartState = null;
  }

  activate() {
    this.stage.on('click tap', this.handleClick.bind(this));
    this.stage.container().style.cursor = 'default';
    
    // Create transformer
    this.transformer = new Konva.Transformer({
      nodes: [],
      resizeEnabled: true,
      rotateEnabled: true,
      borderStroke: '#0099ff',
      borderStrokeWidth: 2,
      anchorStroke: '#0099ff',
      anchorFill: '#ffffff',
      anchorSize: 8,
      // Make the transformer more visible
      anchorCornerRadius: 4,
      borderDash: [],
      enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 
                      'bottom-right', 'bottom-center', 'bottom-left', 'middle-left']
    });
    
    this.layer.add(this.transformer);
    
    // Add transform event listeners
    this.transformer.on('transform', this.handleTransform.bind(this));
    this.transformer.on('transformend', this.handleTransform.bind(this));
    
    this.layer.batchDraw();
    
    // Make cursor change when over objects
    this.stage.on('mouseover', (e) => {
      const shape = e.target;
      if (shape && shape.getClassName() !== 'Stage') {
        this.stage.container().style.cursor = 'pointer';
      }
    });
    
    this.stage.on('mouseout', () => {
      this.stage.container().style.cursor = 'default';
    });
    
    // Add drag events
    this.stage.on('dragstart', this.handleDragStart.bind(this));
    this.stage.on('dragmove', this.handleDragMove.bind(this));
    this.stage.on('dragend', this.handleDragEnd.bind(this));
  }

  deactivate() {
    this.stage.off('click tap');
    this.stage.off('mouseover');
    this.stage.off('mouseout');
    this.stage.off('dragstart');
    this.stage.off('dragmove');
    this.stage.off('dragend');
    
    if (this.transformer) {
      // Save final state of any transformed objects before removing transformer
      if (this.transformer.nodes().length > 0) {
        this.transformer.nodes().forEach(node => {
          if (node && typeof node.id === 'function') {
            const updates = {
              id: node.id(),
              type: 'position-update'
            };
            
            if (typeof node.x === 'function') updates.x = node.x();
            if (typeof node.y === 'function') updates.y = node.y();
            if (typeof node.width === 'function') updates.width = node.width();
            if (typeof node.height === 'function') updates.height = node.height();
            if (typeof node.rotation === 'function') updates.rotation = node.rotation();
            if (typeof node.scaleX === 'function') updates.scaleX = node.scaleX();
            if (typeof node.scaleY === 'function') updates.scaleY = node.scaleY();
            
            // Update the store
            if (this.addObjectCallback) {
              this.addObjectCallback(updates);
            }
          }
        });
      }
      
      // Now remove the transformer
      this.transformer.nodes([]);
      this.transformer.remove();
      this.transformer = null;
    }
    
    this.selectedShape = null;
    this.stage.container().style.cursor = 'default';
  }

  handleClick(_e) {
    // Clear previous selection
    if (this.transformer) {
      this.transformer.nodes([]);
    }
    
    const pos = this.stage.getPointerPosition();
    const shape = this.stage.getIntersection(pos);
    
    if (shape && shape.getClassName() !== 'Stage') {
      // Select this shape
      this.selectedShape = shape;
      
      // Make it draggable - only if it has the draggable method
      if (typeof shape.draggable === 'function') {
        shape.draggable(true);
      }
      
      // Update the transformer
      if (this.transformer) {
        this.transformer.nodes([shape]);
        this.layer.batchDraw();
      }
    } else {
      // Clicked on empty space, clear selection
      this.selectedShape = null;
      
      // Reset all shapes to non-draggable
      this.layer.children.forEach(child => {
        if (child !== this.transformer && typeof child.draggable === 'function') {
          child.draggable(false);
        }
      });
      
      this.layer.batchDraw();
    }
  }
  
  handleDragStart(e) {
    const shape = e.target;
    if (shape && shape !== this.stage && shape.id) {
      // Store the initial state for undo/redo
      this.objectStartState = {
        id: shape.id(),
        x: shape.x(),
        y: shape.y()
      };
    }
  }
  
  handleDragMove() {
    // Update transformer during drag
    if (this.transformer) {
      try {
        this.transformer.update();
        this.layer.batchDraw();
      } catch (err) {
        console.error('Error updating transformer:', err);
      }
    }
  }
  
  handleDragEnd(e) {
    const shape = e.target;
    if (shape && shape !== this.stage && 
        typeof shape.id === 'function' && 
        typeof shape.x === 'function' && 
        typeof shape.y === 'function') {
      
      // Get the final position
      const endState = {
        id: shape.id(),
        x: shape.x(),
        y: shape.y()
      };
      
      // Also handle rotation and scale if shape has these properties
      if (typeof shape.rotation === 'function') {
        endState.rotation = shape.rotation();
      }
      
      if (typeof shape.scaleX === 'function' && typeof shape.scaleY === 'function') {
        endState.scaleX = shape.scaleX();
        endState.scaleY = shape.scaleY();
      }
      
      // Compare with initial state if we have it
      let hasChanged = true;
      if (this.objectStartState) {
        hasChanged = (
          endState.x !== this.objectStartState.x || 
          endState.y !== this.objectStartState.y ||
          (endState.rotation !== undefined && endState.rotation !== this.objectStartState.rotation) ||
          (endState.scaleX !== undefined && endState.scaleX !== this.objectStartState.scaleX) ||
          (endState.scaleY !== undefined && endState.scaleY !== this.objectStartState.scaleY)
        );
      }
      
      // Only update if position changed
      if (hasChanged) {
        // Update object in the store
        if (this.addObjectCallback) {
          // Update using callback with all properties
          this.addObjectCallback({
            ...endState,
            type: 'position-update'
          });
        }
      }
      
      this.objectStartState = null;
    }
  }

  handleTransform(e) {
    const node = e.target;
    if (!node) return;
    
    // Update the store immediately with transformed properties
    if (this.addObjectCallback && typeof node.id === 'function') {
      const updates = {
        id: node.id(),
        type: 'position-update'
      };
      
      // Add all relevant properties
      if (typeof node.x === 'function') updates.x = node.x();
      if (typeof node.y === 'function') updates.y = node.y();
      if (typeof node.width === 'function') updates.width = node.width();
      if (typeof node.height === 'function') updates.height = node.height();
      if (typeof node.rotation === 'function') updates.rotation = node.rotation();
      if (typeof node.scaleX === 'function') updates.scaleX = node.scaleX();
      if (typeof node.scaleY === 'function') updates.scaleY = node.scaleY();
      
      // Update the object
      this.addObjectCallback(updates);
    }
  }
}

// Eraser Tool
class EraserTool extends Tool {
  constructor(stage, layer, addObjectCallback, deleteObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.isErasing = false;
    this.icon = 'eraser';
    this.deleteObjectCallback = deleteObjectCallback;
  }

  activate() {
    this.stage.on('mousedown touchstart', this.handleMouseDown.bind(this));
    this.stage.on('mousemove touchmove', this.handleMouseMove.bind(this));
    this.stage.on('mouseup touchend', this.handleMouseUp.bind(this));
    this.stage.container().style.cursor = 'crosshair';
  }

  deactivate() {
    this.stage.off('mousedown touchstart');
    this.stage.off('mousemove touchmove');
    this.stage.off('mouseup touchend');
    this.isErasing = false;
    this.stage.container().style.cursor = 'default';
  }

  handleMouseDown(e) {
    this.isErasing = true;
    this.handleMouseMove(e);
  }

  handleMouseMove(_e) {
    if (!this.isErasing) return;
    
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    // Log the position being checked
    // console.log(`[EraserTool] Checking position:`, pos);
    
    const shape = this.stage.getIntersection(pos);

    if (shape) {
      const objectId = shape.id();
      console.log(`[EraserTool] Intersection found: Shape Class=${shape.getClassName()}, ID=${objectId || 'NONE'}`);
      
      if (objectId && this.deleteObjectCallback) {
        console.log(`[EraserTool] Calling deleteObjectCallback with ID: ${objectId}`);
        this.deleteObjectCallback(objectId);
      } else if (!objectId) {
          console.warn(`[EraserTool] Intersected shape has no ID.`);
      }
    } else {
      // Optional: Log when no shape is found at the pointer position
      // console.log(`[EraserTool] No intersection found at position.`);
    }
  }

  handleMouseUp() {
    this.isErasing = false;
  }
}

// Rectangle Tool
class RectangleTool extends Tool {
  constructor(stage, layer, addObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.isDrawing = false;
    this.startPos = null;
    this.currentRect = null;
    this.icon = 'square';
  }

  activate() {
    this.stage.on('mousedown touchstart', this.handleMouseDown.bind(this));
    this.stage.on('mousemove touchmove', this.handleMouseMove.bind(this));
    this.stage.on('mouseup touchend', this.handleMouseUp.bind(this));
  }

  deactivate() {
    this.stage.off('mousedown touchstart');
    this.stage.off('mousemove touchmove');
    this.stage.off('mouseup touchend');
    this.isDrawing = false;
    this.startPos = null;
    this.currentRect = null;
  }

  handleMouseDown(_e) {
    this.isDrawing = true;
    this.startPos = this.stage.getPointerPosition();
    this.currentRect = new Konva.Rect({
      x: this.startPos.x,
      y: this.startPos.y,
      width: 0,
      height: 0,
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.fillColor,
      dash: this.options.dash,
      draggable: false,
    });
    this.layer.add(this.currentRect);
  }

  handleMouseMove(_e) {
    if (!this.isDrawing) return;
    
    const pos = this.stage.getPointerPosition();
    
    // Calculate width and height
    const width = pos.x - this.startPos.x;
    const height = pos.y - this.startPos.y;
    
    this.currentRect.width(width);
    this.currentRect.height(height);
    
    this.layer.batchDraw();
  }

  handleMouseUp(_e) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    // Only add if the rectangle has non-zero dimensions
    if (this.currentRect.width() !== 0 && this.currentRect.height() !== 0) {
      // Create object for storage
      const object = {
        id: uuidv4(),
        type: 'rectangle',
        x: this.currentRect.x(),
        y: this.currentRect.y(),
        width: this.currentRect.width(),
        height: this.currentRect.height(),
        stroke: this.options.strokeColor,
        strokeWidth: this.options.strokeWidth,
        fill: this.options.fillColor,
        dash: this.options.dash
      };
      
      // Add to the store
      this.addObjectCallback(object);
    } else {
      // Remove zero-dimension rectangle
      this.currentRect.destroy();
      this.layer.batchDraw();
    }
    
    this.currentRect = null;
    this.startPos = null;
  }
}

// Ellipse Tool
class EllipseTool extends Tool {
  constructor(stage, layer, addObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.isDrawing = false;
    this.startPos = null;
    this.currentEllipse = null;
    this.icon = 'circle';
  }

  activate() {
    this.stage.on('mousedown touchstart', this.handleMouseDown.bind(this));
    this.stage.on('mousemove touchmove', this.handleMouseMove.bind(this));
    this.stage.on('mouseup touchend', this.handleMouseUp.bind(this));
  }

  deactivate() {
    this.stage.off('mousedown touchstart');
    this.stage.off('mousemove touchmove');
    this.stage.off('mouseup touchend');
    this.isDrawing = false;
    this.startPos = null;
    this.currentEllipse = null;
  }

  handleMouseDown(_e) {
    this.isDrawing = true;
    this.startPos = this.stage.getPointerPosition();
    this.currentEllipse = new Konva.Ellipse({
      x: this.startPos.x,
      y: this.startPos.y,
      radiusX: 0,
      radiusY: 0,
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.fillColor,
      dash: this.options.dash,
      draggable: false,
    });
    this.layer.add(this.currentEllipse);
  }

  handleMouseMove(_e) {
    if (!this.isDrawing) return;
    
    const pos = this.stage.getPointerPosition();
    
    // Calculate radii
    const radiusX = Math.abs(pos.x - this.startPos.x);
    const radiusY = Math.abs(pos.y - this.startPos.y);
    
    this.currentEllipse.radiusX(radiusX);
    this.currentEllipse.radiusY(radiusY);
    
    this.layer.batchDraw();
  }

  handleMouseUp(_e) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    // Only add if the ellipse has non-zero dimensions
    if (this.currentEllipse.radiusX() !== 0 && this.currentEllipse.radiusY() !== 0) {
      // Create object for storage
      const object = {
        id: uuidv4(),
        type: 'ellipse',
        x: this.currentEllipse.x(),
        y: this.currentEllipse.y(),
        radiusX: this.currentEllipse.radiusX(),
        radiusY: this.currentEllipse.radiusY(),
        stroke: this.options.strokeColor,
        strokeWidth: this.options.strokeWidth,
        fill: this.options.fillColor,
        dash: this.options.dash
      };
      
      // Add to the store
      this.addObjectCallback(object);
    } else {
      // Remove zero-dimension ellipse
      this.currentEllipse.destroy();
      this.layer.batchDraw();
    }
    
    this.currentEllipse = null;
    this.startPos = null;
  }
}

// Text Tool
class TextTool extends Tool {
  constructor(stage, layer, addObjectCallback) {
    super(stage, layer, addObjectCallback);
    this.isEditing = false;
    this.textNode = null;
    this.transformer = null;
    this.icon = 'font';
  }

  activate() {
    this.stage.on('click tap', this.handleClick.bind(this));
  }

  deactivate() {
    this.stage.off('click tap');
    this.finishEditing();
  }

  handleClick(_e) {
    // If we're already editing, first save that text
    if (this.isEditing) {
      this.finishEditing();
      return;
    }
    
    const pos = this.stage.getPointerPosition();
    
    // Create text node
    this.textNode = new Konva.Text({
      x: pos.x,
      y: pos.y,
      text: 'Type here...',
      fontSize: 18,
      fontFamily: 'Arial',
      fill: this.options.strokeColor,
      width: 200,
      draggable: false,
    });
    
    this.layer.add(this.textNode);
    this.layer.batchDraw();
    
    // Create text input for editing
    this.createTextInput();
  }

  createTextInput() {
    this.isEditing = true;
    
    // Create textarea
    const textPosition = this.textNode.absolutePosition();
    
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    textarea.value = this.textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${textPosition.y}px`;
    textarea.style.left = `${textPosition.x}px`;
    textarea.style.width = `${this.textNode.width()}px`;
    textarea.style.height = 'auto';
    textarea.style.fontSize = `${this.textNode.fontSize()}px`;
    textarea.style.fontFamily = this.textNode.fontFamily();
    textarea.style.border = '1px solid #999';
    textarea.style.padding = '5px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = this.textNode.lineHeight();
    textarea.style.fontFamily = this.textNode.fontFamily();
    textarea.style.transformOrigin = 'left top';
    textarea.style.zIndex = '1000';
    
    // Focus and select all text
    textarea.focus();
    textarea.select();
    
    // Event handlers
    textarea.addEventListener('keydown', (e) => {
      // Handle enter key or escape key
      if (e.keyCode === 13 && !e.shiftKey || e.keyCode === 27) {
        e.preventDefault();
        textarea.blur();
      }
    });
    
    textarea.addEventListener('input', () => {
      // Update text node when typing
      this.textNode.text(textarea.value);
      
      // Auto-adjust height
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
    
    textarea.addEventListener('blur', () => {
      // When losing focus, remove textarea and finish editing
      document.body.removeChild(textarea);
      
      const text = textarea.value.trim();
      
      if (text) {
        this.textNode.text(text);
        this.layer.batchDraw();
        
        // Create object for storage
        const object = {
          id: uuidv4(),
          type: 'text',
          x: this.textNode.x(),
          y: this.textNode.y(),
          text: text,
          fontSize: this.textNode.fontSize(),
          fontFamily: this.textNode.fontFamily(),
          fill: this.options.strokeColor,
          align: 'left',
          width: this.textNode.width(),
          fontStyle: 'normal'
        };
        
        // Add to the store
        this.addObjectCallback(object);
      } else {
        // Remove empty text
        this.textNode.destroy();
        this.layer.batchDraw();
      }
      
      this.isEditing = false;
      this.textNode = null;
    });
  }

  finishEditing() {
    if (this.isEditing) {
      document.querySelectorAll('textarea').forEach((el) => {
        el.blur();
      });
    }
  }
}

// Image Tool
class ImageTool extends Tool {
  constructor(stage, layer, addObjectCallback, toolManager) {
    super(stage, layer, addObjectCallback);
    this.isPlacing = false;
    this.icon = 'image';
    this.toolManager = toolManager; // Store reference to tool manager to switch tools
  }

  activate() {
    this.stage.on('click tap', this.handleClick.bind(this));
  }

  deactivate() {
    this.stage.off('click tap');
    this.isPlacing = false;
  }

  handleClick(_e) {
    if (this.isPlacing) return;
    
    this.isPlacing = true; // Prevent multiple uploads at once
    
    // Create input for file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        this.isPlacing = false; // Reset if no file selected
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const imageObj = new Image();
        imageObj.onload = () => {
          // Scale image to reasonable size if needed
          let width = imageObj.width;
          let height = imageObj.height;
          
          const maxDimension = 500;
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
          }
          
          const pos = this.stage.getPointerPosition();
          
          const konvaImage = new Konva.Image({
            x: pos.x,
            y: pos.y,
            image: imageObj,
            width: width,
            height: height,
            draggable: false,
          });
          
          this.layer.add(konvaImage);
          this.layer.batchDraw();
          
          // Create object for storage
          const object = {
            id: uuidv4(),
            type: 'image',
            x: pos.x,
            y: pos.y,
            src: event.target.result,
            width: width,
            height: height,
            rotation: 0
          };
          
          // Add to the store
          this.addObjectCallback(object);
          
          // Switch to selection tool immediately
          if (this.toolManager) {
            this.toolManager.setActiveTool('selection');
          }
        };
        
        imageObj.src = event.target.result;
      };
      
      reader.readAsDataURL(file);
    });
    
    input.click();
    
    // Reset the isPlacing after dialog closes
    setTimeout(() => {
      this.isPlacing = false;
    }, 500);
  }
}

export default class ToolManager {
  constructor() {
    this.tools = {};
    this.activeTool = null;
    this.stage = null;
    this.layer = null;
    this.addObjectCallback = null;
    this.deleteObjectCallback = null;
    this.renderObjectsCallback = null;
  }

  init(stage, layer, addObjectCallback, deleteObjectCallback, renderObjectsCallback) {
    this.stage = stage;
    this.layer = layer;
    this.addObjectCallback = addObjectCallback;
    this.deleteObjectCallback = deleteObjectCallback;
    this.renderObjectsCallback = renderObjectsCallback;
    
    try {
      // Initialize tools, passing the render callback to PenTool
      this.tools = {
        pen: new PenTool(stage, layer, addObjectCallback, this.renderObjectsCallback),
        line: new LineTool(stage, layer, addObjectCallback),
        eraser: new EraserTool(stage, layer, addObjectCallback, this.deleteObjectCallback),
        rectangle: new RectangleTool(stage, layer, addObjectCallback),
        ellipse: new EllipseTool(stage, layer, addObjectCallback),
        text: new TextTool(stage, layer, addObjectCallback),
        image: new ImageTool(stage, layer, addObjectCallback, this),
        selection: new SelectionTool(stage, layer, addObjectCallback)
      };
      
      console.log('Tools initialized', Object.keys(this.tools));
      
      // Set default tool
      this.setActiveTool('pen');
    } catch (err) {
      console.error('Error initializing tools:', err);
      
      // Fallback to minimal set of tools if initialization fails
      this.tools = {
        pen: new PenTool(stage, layer, addObjectCallback)
      };
      this.setActiveTool('pen');
    }
  }

  setActiveTool(toolName, options = {}) {
    // Deactivate current tool if any
    if (this.activeTool) {
      this.activeTool.deactivate();
    }
    
    // Set new active tool
    this.activeTool = this.tools[toolName];
    
    if (this.activeTool) {
      if (options) {
        this.activeTool.setOptions(options);
      }
      this.activeTool.activate();
    }
  }

  getActiveTool() {
    return this.activeTool;
  }

  getTool(toolName) {
    return this.tools[toolName];
  }

  destroy() {
    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.deactivate();
    }
    
    // Clear references
    this.tools = {};
    this.activeTool = null;
    this.stage = null;
    this.layer = null;
    this.addObjectCallback = null;
    this.deleteObjectCallback = null;
    this.renderObjectsCallback = null;
  }
} 