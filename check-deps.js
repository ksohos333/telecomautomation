console.log('Checking dependencies...');

try {
  const express = require('express');
  console.log('Express is installed correctly.');
} catch (error) {
  console.error('Express is not installed correctly:', error.message);
}

try {
  const fs = require('fs');
  console.log('fs module is available.');
} catch (error) {
  console.error('fs module error:', error.message);
}

try {
  const path = require('path');
  console.log('path module is available.');
} catch (error) {
  console.error('path module error:', error.message);
}

console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);