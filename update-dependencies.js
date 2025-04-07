/**
 * This script adds @msgpack/msgpack as a dependency to package.json
 */
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');

try {
  // Read the package.json file
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add @msgpack/msgpack dependency if it doesn't exist
  if (!packageJson.dependencies['@msgpack/msgpack']) {
    packageJson.dependencies['@msgpack/msgpack'] = '^2.8.0';
    console.log('Added @msgpack/msgpack dependency to package.json');
  } else {
    console.log('@msgpack/msgpack dependency already exists');
  }
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json successfully');
  
  // Print instructions for the user
  console.log('\nPlease run "npm install" to install the new dependency');
  console.log('Or run "yarn" if you are using yarn');
  console.log('\nThen restart your development server');
} catch (error) {
  console.error('Error updating package.json:', error);
}
