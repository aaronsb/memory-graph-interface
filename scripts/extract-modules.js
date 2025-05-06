#!/usr/bin/env node

/**
 * Extract-Modules Script
 * 
 * This script analyzes app.js and extracts functions into separate module files
 * based on the defined module boundaries.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const APP_JS_PATH = path.join(__dirname, '../public/js/app.js');
const MODULES_DIR = path.join(__dirname, '../public/js/modules');
const MODULE_DEFINITIONS_PATH = path.join(__dirname, '../module-boundaries.txt');

// Module structure to store extracted code
const modules = {};
let currentModule = null;
let moduleDefinitions = {};

// Function to read and parse module definitions
async function parseModuleDefinitions() {
  try {
    const data = fs.readFileSync(MODULE_DEFINITIONS_PATH, 'utf8');
    const lines = data.split('\n');
    
    let currentModuleName = null;
    let collectingFunctions = false;
    
    for (const line of lines) {
      // Module headers are in the format: N. **Module Name**
      if (line.match(/^\d+\.\s+\*\*(.*)\*\*/)) {
        currentModuleName = line.match(/^\d+\.\s+\*\*(.*)\*\*/)[1].trim();
        moduleDefinitions[currentModuleName] = {
          functions: [],
          fileName: kebabCase(currentModuleName) + '.js'
        };
        collectingFunctions = true;
      } 
      // Function names are indented with a hyphen
      else if (collectingFunctions && line.trim().startsWith('-')) {
        const funcName = line.trim().replace(/^-\s+/, '').trim();
        if (funcName && currentModuleName) {
          moduleDefinitions[currentModuleName].functions.push(funcName);
        }
      }
      // Empty line or a non-function entry
      else if (line.trim() === '') {
        collectingFunctions = false;
      }
    }
    
    return moduleDefinitions;
  } catch (error) {
    console.error('Error parsing module definitions:', error);
    process.exit(1);
  }
}

// Helper function to convert "Module Name" to "module-name"
function kebabCase(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Extract functions from app.js and group them by module
async function extractFunctions() {
  try {
    // Create modules directory if it doesn't exist
    if (!fs.existsSync(MODULES_DIR)) {
      fs.mkdirSync(MODULES_DIR, { recursive: true });
    }
    
    // Initialize module containers
    Object.keys(moduleDefinitions).forEach(moduleName => {
      const fileName = moduleDefinitions[moduleName].fileName;
      modules[moduleName] = {
        functions: {},
        variables: [],
        fileName,
        dependencies: new Set()
      };
    });
    
    // Read the app.js file
    const appJsContent = fs.readFileSync(APP_JS_PATH, 'utf8');
    const lines = appJsContent.split('\n');
    
    // First pass: Find all global variables
    const globalVars = [];
    let inGlobalVarSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect start of global variables section
      if (line.includes('// Global variables')) {
        inGlobalVarSection = true;
        continue;
      }
      
      // End of global variable section detection (rough heuristic)
      if (inGlobalVarSection && line.trim() === '') {
        inGlobalVarSection = false;
      }
      
      // Extract variable declarations
      if (inGlobalVarSection && (line.trim().startsWith('let ') || line.trim().startsWith('const '))) {
        const varName = line.trim().split(/[=\s]/)[1];
        globalVars.push({ name: varName, line });
      }
    }
    
    // Second pass: Extract functions
    let currentFunction = null;
    let functionContent = [];
    let bracketCount = 0;
    let captureFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line declares a function
      const functionDecl = line.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
      
      if (functionDecl && !captureFunction) {
        currentFunction = functionDecl[1];
        
        // Find which module this function belongs to
        let targetModule = null;
        for (const moduleName in moduleDefinitions) {
          if (moduleDefinitions[moduleName].functions.includes(currentFunction)) {
            targetModule = moduleName;
            break;
          }
        }
        
        if (targetModule) {
          captureFunction = true;
          bracketCount = 0;
          functionContent = [line];
          
          // Check for opening bracket on same line
          if (line.includes('{')) {
            bracketCount++;
          }
        }
      } 
      // Capture function content
      else if (captureFunction) {
        functionContent.push(line);
        
        // Count brackets to determine function end
        bracketCount += (line.match(/{/g) || []).length;
        bracketCount -= (line.match(/}/g) || []).length;
        
        if (bracketCount === 0) {
          // Function has ended, save it to the appropriate module
          for (const moduleName in moduleDefinitions) {
            if (moduleDefinitions[moduleName].functions.includes(currentFunction)) {
              modules[moduleName].functions[currentFunction] = functionContent.join('\n');
              break;
            }
          }
          
          captureFunction = false;
          currentFunction = null;
          functionContent = [];
        }
      }
    }
    
    // Generate exports and module files
    for (const moduleName in modules) {
      const moduleData = modules[moduleName];
      let moduleCode = '';
      
      // Add import section at the top
      moduleCode += '// Generated module: ' + moduleName + '\n\n';
      
      // Add exports at the bottom
      const exportNames = Object.keys(moduleData.functions);
      if (exportNames.length > 0) {
        moduleCode += 'export {\n';
        exportNames.forEach(funcName => {
          moduleCode += '  ' + funcName + ',\n';
        });
        moduleCode += '};\n\n';
      }
      
      // Add function implementations
      for (const funcName in moduleData.functions) {
        moduleCode += moduleData.functions[funcName] + '\n\n';
      }
      
      // Write the module file
      fs.writeFileSync(
        path.join(MODULES_DIR, moduleData.fileName),
        moduleCode
      );
      
      console.log(`Created module: ${moduleData.fileName}`);
    }
    
    // Create index.js to import all modules
    let indexCode = '// Module index - imports and re-exports all modules\n\n';
    
    for (const moduleName in modules) {
      const fileName = modules[moduleName].fileName.replace('.js', '');
      indexCode += `import * as ${camelCase(moduleName)} from './${fileName}';\n`;
    }
    
    indexCode += '\n// Export all modules\nexport {\n';
    for (const moduleName in modules) {
      indexCode += `  ${camelCase(moduleName)},\n`;
    }
    indexCode += '};\n';
    
    fs.writeFileSync(
      path.join(MODULES_DIR, 'index.js'),
      indexCode
    );
    
    console.log('Created modules index.js');
    
    // Create a replacement app.js that uses the modules
    let newAppJs = '// Modular version of app.js\n';
    newAppJs += '// This file imports the extracted modules and maintains original behavior\n\n';
    
    // Import modules
    newAppJs += 'import * as modules from \'./modules/index.js\';\n\n';
    
    // Add global variables section
    newAppJs += '// Global variables\n';
    globalVars.forEach(variable => {
      newAppJs += variable.line + '\n';
    });
    
    // Add initialization code that calls the appropriate module functions
    newAppJs += '\n// Initialize the application\n';
    newAppJs += 'document.addEventListener(\'DOMContentLoaded\', () => {\n';
    newAppJs += '  // Initialize core modules\n';
    newAppJs += '  modules.coreGraphInitialization.initGraph();\n';
    newAppJs += '  modules.coreGraphInitialization.loadData();\n';
    newAppJs += '});\n';
    
    // Write the new app.js to a temporary file to avoid overwriting the original
    fs.writeFileSync(
      path.join(__dirname, '../public/js/app.modular.js'),
      newAppJs
    );
    
    console.log('Created app.modular.js (template for the new modular app)');
    
  } catch (error) {
    console.error('Error extracting functions:', error);
    process.exit(1);
  }
}

// Helper function to convert "Module Name" to "moduleName"
function camelCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

// Main execution
async function main() {
  console.log('Parsing module definitions...');
  moduleDefinitions = await parseModuleDefinitions();
  
  console.log('Extracting functions into modules...');
  await extractFunctions();
  
  console.log('\nDone! The modules have been created in public/js/modules/');
  console.log('A template for the new modular app.js has been created at public/js/app.modular.js');
  console.log('\nNext steps:');
  console.log('1. Review the generated modules and fix any missing dependencies');
  console.log('2. Update the app.modular.js file to properly initialize the application');
  console.log('3. Test the modular version');
  console.log('4. When everything works, rename app.modular.js to app.js');
}

main();