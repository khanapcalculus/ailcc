// Debug script for Render deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  
  // Print current working directory
  res.write(`Current working directory: ${process.cwd()}\n\n`);
  
  // List all files in current directory and subdirectories recursively
  function listFiles(dir, indent = '') {
    let output = '';
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        output += `${indent}[DIR] ${file}\n`;
        try {
          output += listFiles(filePath, indent + '  ');
        } catch (err) {
          output += `${indent}  Error reading directory: ${err.message}\n`;
        }
      } else {
        output += `${indent}[FILE] ${file} (${stats.size} bytes)\n`;
      }
    });
    
    return output;
  }
  
  try {
    res.write('Files in directory structure:\n');
    res.write(listFiles('.'));
  } catch (err) {
    res.write(`Error listing files: ${err.message}\n`);
  }
  
  // Try to find server.js
  try {
    function findFile(dir, filename, foundFiles = []) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        
        if (stat.isDirectory()) {
          try {
            findFile(filepath, filename, foundFiles);
          } catch (err) {
            // Skip directories we can't read
          }
        } else if (file === filename) {
          foundFiles.push(filepath);
        }
      }
      
      return foundFiles;
    }
    
    const serverFiles = findFile('.', 'server.js');
    
    if (serverFiles.length > 0) {
      res.write('\nFound server.js at:\n');
      serverFiles.forEach(file => {
        res.write(`- ${file}\n`);
      });
    } else {
      res.write('\nNo server.js files found\n');
    }
  } catch (err) {
    res.write(`\nError searching for server.js: ${err.message}\n`);
  }
  
  // Environment variables
  res.write('\nEnvironment Variables:\n');
  Object.keys(process.env).forEach(key => {
    // Skip sensitive values
    const value = key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN') || key.includes('PASSWORD') 
      ? '[REDACTED]' 
      : process.env[key];
    res.write(`${key}: ${value}\n`);
  });
  
  res.end();
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
}); 