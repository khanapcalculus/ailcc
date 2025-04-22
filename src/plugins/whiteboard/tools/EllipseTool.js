import Konva from 'konva';
import BaseTool from './BaseTool';

export default class EllipseTool extends BaseTool {
  constructor() {
    super();
    this.name = 'ellipse';
    this.icon = 'circle';
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
    
    // Create ellipse
    this.currentShape = new Konva.Ellipse({
      x: pos.x,
      y: pos.y,
      radiusX: 0,
      radiusY: 0,
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.fillColor : 'transparent',
      draggable: false,
      id: 'temp',
      isTemp: true
    });
    
    // Add ellipse to layer
    layer.add(this.currentShape);
    layer.batchDraw();
  }
  
  onMouseMove(event, stage, layer) {
    if (!this.isDrawing || !this.isActive) return;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Calculate radiusX and radiusY
    const radiusX = Math.abs(pos.x - this.startPos.x);
    const radiusY = Math.abs(pos.y - this.startPos.y);
    
    // Update ellipse center and radii
    const centerX = this.startPos.x + (pos.x - this.startPos.x) / 2;
    const centerY = this.startPos.y + (pos.y - this.startPos.y) / 2;
    
    this.currentShape.x(centerX);
    this.currentShape.y(centerY);
    this.currentShape.radiusX(radiusX / 2);
    this.currentShape.radiusY(radiusY / 2);
    
    layer.batchDraw();
  }
  
  onMouseUp(event, stage, layer, addObject) {
    if (!this.isDrawing || !this.isActive) return;
    
    this.isDrawing = false;
    
    // Create the final object to add to the whiteboard
    const ellipseObj = {
      type: 'ellipse',
      tool: this.name,
      x: this.currentShape.x(),
      y: this.currentShape.y(),
      radiusX: this.currentShape.radiusX(),
      radiusY: this.currentShape.radiusY(),
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.fillColor : 'transparent'
    };
    
    // Remove temporary shape
    this.currentShape.destroy();
    this.currentShape = null;
    
    // Add to whiteboard if it has a size
    if (ellipseObj.radiusX > 1 && ellipseObj.radiusY > 1) {
      addObject(ellipseObj);
    }
    
    layer.batchDraw();
  }
  
  // Touch events use the same logic as mouse events via parent class
  
  getConfigComponent() {
    // For now, return null. Later we can implement a configuration component.
    return null;
  }
} 