import Konva from 'konva';
import BaseTool from './BaseTool';

export default class TextTool extends BaseTool {
  constructor() {
    super();
    this.name = 'text';
    this.icon = 'font';
    this.cursor = 'text';
    this.options = {
      textColor: '#000000',
      fontSize: 16,
      fontFamily: 'Arial',
      textAlign: 'left',
      fontStyle: 'normal' // normal, bold, italic, bold italic
    };
    
    this.isEditing = false;
    this.currentText = null;
    this.transformer = null;
    this.textNode = null;
    this.textareaElement = null;
  }
  
  activate(options = {}) {
    super.activate(options);
    this.isEditing = false;
    this.currentText = null;
  }
  
  deactivate() {
    super.deactivate();
    
    // Clean up any active editing
    this.removeTextarea();
    
    if (this.transformer) {
      this.transformer.destroy();
      this.transformer = null;
    }
    
    this.isEditing = false;
    this.currentText = null;
  }
  
  onMouseDown(event, stage, layer, addObject) {
    if (!this.isActive) return;
    
    // If we're already editing text, finish that first
    if (this.isEditing) {
      this.finishEditing(addObject);
      return;
    }
    
    // Begin new text
    this.isEditing = true;
    
    // Get pointer position
    const pos = stage.getPointerPosition();
    
    // Create text
    this.textNode = new Konva.Text({
      x: pos.x,
      y: pos.y,
      text: '',
      fontSize: this.options.fontSize,
      fontFamily: this.options.fontFamily,
      fill: this.options.textColor,
      align: this.options.textAlign,
      fontStyle: this.options.fontStyle,
      draggable: true,
      width: 200,
      id: 'temp-text',
      isTemp: true
    });
    
    // Add text to layer
    layer.add(this.textNode);
    
    // Create transformer for resizing
    this.transformer = new Konva.Transformer({
      nodes: [this.textNode],
      enabledAnchors: ['middle-right', 'bottom-right'],
      rotateEnabled: false,
      borderEnabled: true,
      borderStroke: '#0096FF',
      anchorFill: '#0096FF',
      anchorStroke: '#0096FF'
    });
    
    layer.add(this.transformer);
    layer.batchDraw();
    
    // Create textarea for editing
    this.createTextarea(pos.x, pos.y, stage, layer);
  }
  
  createTextarea(x, y, stage, layer) {
    // Create textarea element
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    // Position textarea
    const stageBox = stage.container().getBoundingClientRect();
    
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + y}px`;
    textarea.style.left = `${stageBox.left + x}px`;
    textarea.style.width = '200px';
    textarea.style.fontSize = `${this.options.fontSize}px`;
    textarea.style.fontFamily = this.options.fontFamily;
    textarea.style.color = this.options.textColor;
    textarea.style.lineHeight = '1.2';
    textarea.style.padding = '5px';
    textarea.style.margin = '0px';
    textarea.style.border = '1px solid #0096FF';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.zIndex = '1000';
    
    // Set focus
    textarea.focus();
    
    // Add event listeners
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.textNode.text(textarea.value);
        this.finishEditing(layer.getStage().addObjectCallback);
      }
      
      if (e.key === 'Escape') {
        this.removeTextarea();
        this.textNode.destroy();
        this.transformer.destroy();
        layer.batchDraw();
      }
    });
    
    textarea.addEventListener('input', () => {
      // Update text as user types
      this.textNode.text(textarea.value);
      layer.batchDraw();
    });
    
    // Save reference
    this.textareaElement = textarea;
  }
  
  removeTextarea() {
    if (this.textareaElement) {
      document.body.removeChild(this.textareaElement);
      this.textareaElement = null;
    }
  }
  
  finishEditing(addObject) {
    if (!this.isEditing || !this.textNode) return;
    
    // Get text value
    const text = this.textNode ? this.textNode.text() : '';
    
    // Remove textarea
    this.removeTextarea();
    
    // Create the final object to add to the whiteboard
    if (text.trim() !== '') {
      const textObj = {
        type: 'text',
        tool: this.name,
        x: this.textNode.x(),
        y: this.textNode.y(),
        text: text,
        fontSize: this.options.fontSize,
        fontFamily: this.options.fontFamily,
        fill: this.options.textColor,
        align: this.options.textAlign,
        fontStyle: this.options.fontStyle,
        width: this.textNode.width()
      };
      
      // Add to whiteboard
      addObject(textObj);
    }
    
    // Clean up
    if (this.textNode) {
      this.textNode.destroy();
      this.textNode = null;
    }
    
    if (this.transformer) {
      this.transformer.destroy();
      this.transformer = null;
    }
    
    this.isEditing = false;
  }
  
  // We don't use the standard mouse events for text tool
  onMouseMove() {}
  onMouseUp() {}
  
  getConfigComponent() {
    // For now, return null. Later we can implement a configuration component.
    return null;
  }
} 