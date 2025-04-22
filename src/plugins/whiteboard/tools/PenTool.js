import Konva from 'konva';
import { smoothLine } from '../utils/smooth';
import BaseTool from './BaseTool';

export default class PenTool extends BaseTool {
  constructor() {
    super();
    this.name = 'pen';
    this.icon = 'pen';
    this.cursor = 'crosshair';
    this.options = {
      strokeColor: '#000000',
      strokeWidth: 2,
      smoothing: true,
      smoothingFactor: 0.2 // Chaikin's algorithm factor
    };
    
    this.isDrawing = false;
    this.currentLine = null;
    this.points = [];
  }
  
  activate(options = {}) {
    super.activate(options);
    this.isDrawing = false;
    this.currentLine = null;
    this.points = [];
  }
  
  deactivate() {
    super.deactivate();
    this.isDrawing = false;
    this.currentLine = null;
    this.points = [];
  }
  
  onMouseDown(event, stage, layer, _addObject) {
    if (!this.isActive) return;
    
    // Begin drawing
    this.isDrawing = true;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Start collecting points
    this.points = [pos.x, pos.y];
    
    // Create line
    this.currentLine = new Konva.Line({
      points: this.points,
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      draggable: false,
      tension: 0.5,
      globalCompositeOperation: 'source-over'
    });
    
    // Add line to layer
    layer.add(this.currentLine);
  }
  
  onMouseMove(event, stage, layer) {
    if (!this.isDrawing || !this.isActive) return;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Add point
    this.points.push(pos.x);
    this.points.push(pos.y);
    
    // Update line points
    this.currentLine.points(this.points);
    layer.batchDraw();
  }
  
  onMouseUp(event, stage, layer, addObject) {
    if (!this.isDrawing || !this.isActive) return;
    
    this.isDrawing = false;
    
    // Apply smoothing if enabled
    if (this.options.smoothing && this.points.length > 4) {
      const smoothedPoints = smoothLine(this.points, this.options.smoothingFactor);
      this.currentLine.points(smoothedPoints);
      layer.batchDraw();
    }
    
    // Create the final object to add to the whiteboard
    const lineObject = {
      type: 'path',
      tool: this.name,
      points: [...this.currentLine.points()],
      stroke: this.options.strokeColor,
      strokeWidth: this.options.strokeWidth,
      tension: 0.5
    };
    
    // Add to whiteboard
    addObject(lineObject);
    
    // Reset
    this.currentLine = null;
    this.points = [];
  }
  
  // Touch events use the same logic as mouse events via parent class
  
  getConfigComponent() {
    // For now, return null. Later we can implement a configuration component.
    return null;
  }
} 