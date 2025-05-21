#!/bin/bash
set -e

# Change to the script directory
cd "$(dirname "$0")"

# Install axios if not already installed
if ! npm list axios >/dev/null 2>&1; then
  echo "Installing axios dependency..."
  npm install --no-save axios
fi

# Get auth token first if your API requires it
echo "Do you need to get a new auth token? (y/n)"
read need_token

if [[ "$need_token" == "y" ]]; then
  echo "Getting auth token..."
  node get-auth-token.js
  
  # Update token in test script
  if [ -f "token.json" ]; then
    echo "Updating token in test script..."
    TOKEN=$(node -e "console.log(require('./token.json').token)")
    
    # Replace the placeholder token with the actual token
    sed -i '' "s|const AUTH_TOKEN = 'your-auth-token'|const AUTH_TOKEN = '$TOKEN'|" test-api-transfer.js
    
    echo "Token updated in test script."
  fi
fi

# Run the test
echo "Running API transfer test..."
node test-api-transfer.js
