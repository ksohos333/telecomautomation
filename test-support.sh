#!/bin/bash

# Test the /support endpoint with a simple request
echo "Testing /support endpoint with a simple request..."
curl -X POST http://localhost:3000/support \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, Notion!"}'

echo -e "\n\nTesting /support endpoint with a missing content field..."
curl -X POST http://localhost:3000/support \
  -H "Content-Type: application/json" \
  -d '{}'
