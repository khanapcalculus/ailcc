import Konva from 'konva';
import BaseTool from './BaseTool';

export default class EraserTool extends BaseTool {
  constructor() {
    super();
    this.name = 'eraser';
    this.icon = 'eraser';
    this.cursor = 'crosshair';
    this.options = {
      eraserWidth: 20,
      eraserColor: 'rgba(255, 255, 255, 0.8)'
    };
    
    this.isErasing = false;
    this.currentLine = null;
    this.points = [];
    this.eraserShape = null;
  }
  
  activate(options = {}) {
    super.activate(options);
    this.isErasing = false;
    this.currentLine = null;
    this.points = [];
  }
  
  deactivate() {
    super.deactivate();
    this.isErasing = false;
    this.currentLine = null;
    this.points = [];
    
    // Remove eraser shape
    if (this.eraserShape) {
      this.eraserShape.destroy();
      this.eraserShape = null;
    }
  }
  
  // Create a visual representation of the eraser
  createEraserVisual(stage, layer) {
    if (this.eraserShape) {
      this.eraserShape.destroy();
    }
    
    const pos = stage.getPointerPosition();
    
    this.eraserShape = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: this.options.eraserWidth / 2,
      fill: this.options.eraserColor,
      stroke: '#ddd',
      strokeWidth: 1,
      opacity: 0.8
    });
    
    layer.add(this.eraserShape);
    layer.batchDraw();
  }
  
  onMouseDown(event, stage, layer, addObject) {
    if (!this.isActive) return;
    
    // Begin erasing
    this.isErasing = true;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Start collecting points
    this.points = [pos.x, pos.y];
    
    // Create line for tracking eraser path (not visible, just for calculations)
    this.currentLine = {
      points: [...this.points]
    };
    
    // Create eraser visual
    this.createEraserVisual(stage, layer);
    
    // Find objects to erase
    this.eraseAtPoint(pos.x, pos.y, layer, addObject);
  }
  
  onMouseMove(event, stage, layer, addObject) {
    if (!this.isActive) return;
    
    // Update eraser visual
    const pos = stage.getPointerPosition();
    
    if (this.eraserShape) {
      this.eraserShape.x(pos.x);
      this.eraserShape.y(pos.y);
      layer.batchDraw();
    }
    
    // If erasing, continue erasing
    if (this.isErasing) {
      // Add point
      this.points.push(pos.x);
      this.points.push(pos.y);
      
      // Update line points
      this.currentLine.points = [...this.points];
      
      // Find objects to erase
      this.eraseAtPoint(pos.x, pos.y, layer, addObject);
    }
  }
  
  onMouseUp(event, stage, layer, addObject) {
    if (!this.isErasing || !this.isActive) return;
    
    this.isErasing = false;
    
    // We're done erasing, create an erase action
    // This is a special type of object that tells the whiteboard to erase objects
    addObject({
      type: 'eraser',
      tool: this.name,
      points: [...this.currentLine.points],
      width: this.options.eraserWidth
    });
    
    // Reset
    this.currentLine = null;
    this.points = [];
  }

  // Find objects to erase at the given point  
  eraseAtPoint(x, y, layer, _addObject) {
    // Calculate eraser bounds
    const radius = this.options.eraserWidth / 2;
    const left = x - radius;
    const top = y - radius;
    const right = x + radius;
    const bottom = y + radius;
    
    // Find shapes that intersect with eraser
    const shapes = layer.find('.object');
    const erasedIds = [];
    
    shapes.forEach(shape => {
      // Skip temporary objects
      if (shape.attrs.id === 'temp' || shape.attrs.isTemp) return;
      
      // Check for intersection
      const shapePos = shape.getAbsolutePosition();
      const shapeLeft = shapePos.x;
      const shapeTop = shapePos.y;
      const shapeRight = shapeLeft + shape.width();
      const shapeBottom = shapeTop + shape.height();
      
      // Simple bounding box collision detection
      if (left < shapeRight && right > shapeLeft && top < shapeBottom && bottom > shapeTop) {
        // Mark this object for erasure
        erasedIds.push(shape.attrs.id);
      }
    });
    
    // Return the IDs of erased objects
    return erasedIds;
  }
  
  // Touch events use the same logic as mouse events via parent class
} 