// Simple start script for Render deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List files in current directory
console.log('Files in current directory:');
console.log(fs.readdirSync('.'));

// Check for server.js in the current directory
if (fs.existsSync('./server.js')) {
  console.log('Found server.js in current directory, starting server...');
  // Execute server.js
  require('./server.js');
} else {
  console.log('server.js not found in current directory.');
  console.log('Checking parent directory...');
  
  // Check parent directory
  if (fs.existsSync('../server.js')) {
    console.log('Found server.js in parent directory, starting server...');
    process.chdir('..');
    require('./server.js');
  } else {
    // Search for server.js
    console.log('Searching for server.js in project directory...');
    
    function findFile(dir, filename) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        
        if (stat.isDirectory()) {
          const found = findFile(filepath, filename);
          if (found) return found;
        } else if (file === filename) {
          return filepath;
        }
      }
      
      return null;
    }
    
    const serverPath = findFile('.', 'server.js');
    
    if (serverPath) {
      console.log(`Found server.js at: ${serverPath}`);
      process.chdir(path.dirname(serverPath));
      require('./server.js');
    } else {
      console.error('server.js not found in project directory');
      process.exit(1);
    }
  }
} 