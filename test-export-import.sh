#!/bin/bash

# Test script for domain export/import functionality

echo "Domain Export/Import Test Script"
echo "================================"

# Server URL
BASE_URL="http://localhost:3000/api"

# Test domain ID
TEST_DOMAIN="test-domain-export"

echo -e "\n1. Creating test domain..."
curl -X POST "$BASE_URL/domains/create" \
  -H "Content-Type: application/json" \
  -d "{\"domain\": \"$TEST_DOMAIN\"}"

echo -e "\n\n2. Exporting domain..."
EXPORT_FILE="$TEST_DOMAIN-export.json"
curl -s "$BASE_URL/domains/$TEST_DOMAIN/export" -o "$EXPORT_FILE"

echo -e "\n3. Checking exported file..."
if [ -f "$EXPORT_FILE" ]; then
  echo "Export file created successfully"
  echo "File contents:"
  cat "$EXPORT_FILE" | jq '.' 2>/dev/null || cat "$EXPORT_FILE"
else
  echo "Export failed - file not created"
  exit 1
fi

echo -e "\n\n4. Importing domain back..."
curl -X POST "$BASE_URL/domains/import" \
  -H "Content-Type: application/json" \
  -d @"$EXPORT_FILE"

echo -e "\n\n5. Cleanup..."
rm -f "$EXPORT_FILE"
echo "Test completed!"