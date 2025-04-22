/**
 * Base class for all whiteboard tools
 * This class defines the interface that all tools must implement
 */
export default class BaseTool {
  constructor() {
    this.name = 'base';
    this.icon = 'question-circle';
    this.cursor = 'default';
    this.isActive = false;
    this.options = {};
  }

  /**
   * Called when the tool is activated
   * @param {Object} options - Tool options
   */
  activate(options = {}) {
    this.isActive = true;
    this.options = { ...this.options, ...options };
  }

  /**
   * Called when the tool is deactivated
   */
  deactivate() {
    this.isActive = false;
  }

  /**
   * Handle mouse down event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   * @param {Function} addObject - Function to add objects to the whiteboard
   */
  onMouseDown(_event, _stage, _layer, _addObject) {
    // To be implemented by child classes
  }

  /**
   * Handle mouse move event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   */
  onMouseMove(_event, _stage, _layer) {
    // To be implemented by child classes
  }

  /**
   * Handle mouse up event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   * @param {Function} addObject - Function to add objects to the whiteboard
   */
  onMouseUp(_event, _stage, _layer, _addObject) {
    // To be implemented by child classes
  }

  /**
   * Handle touch start event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   * @param {Function} addObject - Function to add objects to the whiteboard
   */
  onTouchStart(event, stage, layer, addObject) {
    // Default to mouse down behavior
    this.onMouseDown(event, stage, layer, addObject);
  }

  /**
   * Handle touch move event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   */
  onTouchMove(event, stage, layer) {
    // Default to mouse move behavior
    this.onMouseMove(event, stage, layer);
  }

  /**
   * Handle touch end event
   * @param {Object} event - Konva.js event object
   * @param {Object} stage - Konva.js stage
   * @param {Object} layer - Konva.js layer
   * @param {Function} addObject - Function to add objects to the whiteboard
   */
  onTouchEnd(event, stage, layer, addObject) {
    // Default to mouse up behavior
    this.onMouseUp(event, stage, layer, addObject);
  }

  /**
   * Get cursor style for when this tool is active
   * @returns {String} CSS cursor value
   */
  getCursor() {
    return this.cursor;
  }

  /**
   * Get the tool's configuration UI component
   * @returns {Object|null} Vue component
   */
  getConfigComponent() {
    return null;
  }

  /**
   * Get tool options
   * @returns {Object} Tool options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Set tool options
   * @param {Object} options - Tool options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
} 