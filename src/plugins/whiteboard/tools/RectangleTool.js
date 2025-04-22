import Konva from 'konva';
import BaseTool from './BaseTool';

export default class RectangleTool extends BaseTool {
  constructor() {
    super();
    this.name = 'rectangle';
    this.icon = 'square';
    this.cursor = 'crosshair';
    this.options = {
      strokeColor: '#000000',
      strokeWidth: 2,
      fillColor: 'transparent',
      filled: false
    };
    
    this.isDrawing = false;
    this.startPos = null;
    this.currentShape = null;
  }
  
  activate(options = {}) {
    super.activate(options);
    this.isDrawing = false;
    this.startPos = null;
    this.currentShape = null;
  }
  
  deactivate() {
    super.deactivate();
    this.isDrawing = false;
    this.startPos = null;
    
    // Remove any temporary shape
    if (this.currentShape) {
      this.currentShape.destroy();
      this.currentShape = null;
    }
  }
  
  onMouseDown(event, stage, layer, _addObject) {
    if (!this.isActive) return;
    
    // Begin drawing
    this.isDrawing = true;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    this.startPos = { x: pos.x, y: pos.y };
    
    // Create rectangle
    this.currentShape = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.fillColor : 'transparent',
      draggable: false,
      id: 'temp',
      isTemp: true
    });
    
    // Add rectangle to layer
    layer.add(this.currentShape);
    layer.batchDraw();
  }
  
  onMouseMove(event, stage, layer) {
    if (!this.isDrawing || !this.isActive) return;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Calculate width and height
    const width = pos.x - this.startPos.x;
    const height = pos.y - this.startPos.y;
    
    // Handle negative dimensions (drawing from bottom-right to top-left)
    if (width < 0) {
      this.currentShape.x(pos.x);
      this.currentShape.width(Math.abs(width));
    } else {
      this.currentShape.width(width);
    }
    
    if (height < 0) {
      this.currentShape.y(pos.y);
      this.currentShape.height(Math.abs(height));
    } else {
      this.currentShape.height(height);
    }
    
    layer.batchDraw();
  }
  
  onMouseUp(event, stage, layer, addObject) {
    if (!this.isDrawing || !this.isActive) return;
    
    this.isDrawing = false;
    
    // Create the final object to add to the whiteboard
    const rectObj = {
      type: 'rectangle',
      tool: this.name,
      x: this.currentShape.x(),
      y: this.currentShape.y(),
      width: this.currentShape.width(),
      height: this.currentShape.height(),
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.fillColor : 'transparent'
    };
    
    // Remove temporary shape
    this.currentShape.destroy();
    this.currentShape = null;
    
    // Add to whiteboard if it has a size
    if (rectObj.width > 1 && rectObj.height > 1) {
      addObject(rectObj);
    }
    
    layer.batchDraw();
  }
  
  // Touch events use the same logic as mouse events via parent class
  
  getConfigComponent() {
    // For now, return null. Later we can implement a configuration component.
    return null;
  }
} 