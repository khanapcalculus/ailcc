import { uploadImage } from '@/services/firebase';
import Konva from 'konva';
import BaseTool from './BaseTool';

export default class ImageTool extends BaseTool {
  constructor() {
    super();
    this.name = 'image';
    this.icon = 'image';
    this.cursor = 'pointer';
    this.options = {
      maxSize: 1000 // Maximum image size in pixels
    };
    
    this.imageInput = null;
    this.isAdding = false;
    this.currentImage = null;
    this.transformer = null;
  }
  
  activate(options = {}) {
    super.activate(options);
    this.createImageInput();
  }
  
  deactivate() {
    super.deactivate();
    
    // Clean up
    if (this.imageInput) {
      document.body.removeChild(this.imageInput);
      this.imageInput = null;
    }
    
    if (this.transformer) {
      this.transformer.destroy();
      this.transformer = null;
    }
    
    this.isAdding = false;
    this.currentImage = null;
  }
  
  createImageInput() {
    // Create a hidden file input for image selection
    if (this.imageInput) {
      document.body.removeChild(this.imageInput);
    }
    
    this.imageInput = document.createElement('input');
    this.imageInput.type = 'file';
    this.imageInput.accept = 'image/*';
    this.imageInput.style.display = 'none';
    
    document.body.appendChild(this.imageInput);
    
    this.imageInput.addEventListener('change', this.handleImageSelection.bind(this));
  }
  
  handleImageSelection(event) {
    if (!event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    
    // Reset input (so the same file can be selected again)
    this.imageInput.value = '';
    
    // Read the file
    const reader = new FileReader();
    
    reader.onload = (e) => {
      // Create image object to check dimensions
      const img = new Image();
      
      img.onload = () => {
        // Resolve the callback from the tool click to add the image
        if (this.imageSelectionCallback) {
          this.imageSelectionCallback(img);
        }
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  }
  
  onMouseDown(event, stage, layer, addObject) {
    if (!this.isActive) return;
    
    // Open file selection dialog
    this.imageSelectionCallback = (img) => {
      this.addImageToWhiteboard(img, stage, layer, addObject);
    };
    
    this.imageInput.click();
  }
  
  addImageToWhiteboard(img, stage, layer, addObject) {
    // Calculate scaled dimensions to fit within max size
    let width = img.width;
    let height = img.height;
    
    if (width > this.options.maxSize || height > this.options.maxSize) {
      if (width > height) {
        height = (height / width) * this.options.maxSize;
        width = this.options.maxSize;
      } else {
        width = (width / height) * this.options.maxSize;
        height = this.options.maxSize;
      }
    }
    
    // Get center position of stage
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const x = (stageWidth - width) / 2;
    const y = (stageHeight - height) / 2;
    
    // Upload image to Firebase Storage (for permanent storage)
    this.isAdding = true;
    const imageName = `images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    
    // First add a temporary image while uploading
    const tempImage = new Konva.Image({
      x: x,
      y: y,
      width: width,
      height: height,
      image: img,
      draggable: true,
      opacity: 0.7,
      id: 'temp-image',
      isTemp: true
    });
    
    layer.add(tempImage);
    
    // Create transformer for resizing
    this.transformer = new Konva.Transformer({
      nodes: [tempImage],
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      rotateEnabled: true,
      borderEnabled: true,
      borderStroke: '#0096FF',
      anchorFill: '#0096FF',
      anchorStroke: '#0096FF'
    });
    
    layer.add(this.transformer);
    layer.batchDraw();
    
    this.currentImage = tempImage;
    
    // Upload to Firebase
    uploadImage(this.dataURLToBlob(img.src), imageName)
      .then((url) => {
        // Create the final object to add to the whiteboard
        const imageObj = {
          type: 'image',
          tool: this.name,
          x: tempImage.x(),
          y: tempImage.y(),
          width: tempImage.width(),
          height: tempImage.height(),
          rotation: tempImage.rotation(),
          src: url,
          originalWidth: img.width,
          originalHeight: img.height,
        };
        
        // Clean up temporary objects
        tempImage.destroy();
        this.transformer.destroy();
        this.transformer = null;
        this.currentImage = null;
        
        // Add to whiteboard
        addObject(imageObj);
        this.isAdding = false;
        
        layer.batchDraw();
      })
      .catch((error) => {
        console.error('Error uploading image:', error);
        
        // Clean up on error
        tempImage.destroy();
        this.transformer.destroy();
        this.transformer = null;
        this.currentImage = null;
        this.isAdding = false;
        
        layer.batchDraw();
        
        alert('Failed to upload image. Please try again.');
      });
  }
  
  // Convert data URL to Blob for upload
  dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }
  
  // We don't use the standard mouse events for image tool
  onMouseMove() {}
  onMouseUp() {}
  
  getConfigComponent() {
    // For now, return null. Later we can implement a configuration component.
    return null;
  }
}