#!/bin/bash

# Phase 6 Endpoint Testing Script
# Run this script to verify all API endpoints work correctly

API_URL="https://api.lavprishjemmeside.dk"
TOKEN="" # Add your JWT token here (from localStorage after login)

echo "========================================="
echo "Phase 6 API Endpoint Tests"
echo "========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Get design settings (public endpoint - no auth)
echo "1. Testing GET /design-settings/public (no auth required)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/design-settings/public")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Design settings retrieved"
    echo "$BODY" | jq '.color_primary, .font_heading'
else
    echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 2: Get theme presets (requires auth)
echo "2. Testing GET /theme-presets (requires JWT)..."
if [ -z "$TOKEN" ]; then
    echo -e "${RED}⚠ SKIPPED${NC} - No JWT token provided (set TOKEN variable)"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/theme-presets")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Theme presets retrieved"
        echo "$BODY" | jq 'map(.name)'
    else
        echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
        echo "$BODY"
    fi
fi
echo ""

# Test 3: Get AI context (requires auth)
echo "3. Testing GET /ai/context (requires JWT)..."
if [ -z "$TOKEN" ]; then
    echo -e "${RED}⚠ SKIPPED${NC} - No JWT token provided"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/ai/context")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - AI context generated"
        echo "$BODY" | jq '.designTokens.colors.primary, .cssVariableSyntax.critical'
    else
        echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
        echo "$BODY"
    fi
fi
echo ""

# Test 4: Update design settings (requires auth)
echo "4. Testing POST /design-settings/update (requires JWT)..."
if [ -z "$TOKEN" ]; then
    echo -e "${RED}⚠ SKIPPED${NC} - No JWT token provided"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"color_accent":"#10B981"}' \
        "$API_URL/design-settings/update")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Design settings updated"
        echo "$BODY" | jq '.data.color_accent'
    else
        echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
        echo "$BODY"
    fi
fi
echo ""

# Test 5: Apply theme preset (requires auth)
echo "5. Testing POST /design-settings/apply-preset (requires JWT)..."
if [ -z "$TOKEN" ]; then
    echo -e "${RED}⚠ SKIPPED${NC} - No JWT token provided"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"preset_id":1}' \
        "$API_URL/design-settings/apply-preset")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Theme preset applied"
        echo "$BODY" | jq '.preset, .data.color_primary'
    else
        echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
        echo "$BODY"
    fi
fi
echo ""

# Test 6: Get publish status (requires auth)
echo "6. Testing GET /publish/status (requires JWT)..."
if [ -z "$TOKEN" ]; then
    echo -e "${RED}⚠ SKIPPED${NC} - No JWT token provided"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/publish/status")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - Publish status retrieved"
        echo "$BODY" | jq '.'
    else
        echo -e "${RED}✗ FAILED${NC} - HTTP $HTTP_CODE"
        echo "$BODY"
    fi
fi
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
if [ -z "$TOKEN" ]; then
    echo "⚠️  Most tests skipped - Set TOKEN variable with your JWT"
    echo ""
    echo "To get your JWT token:"
    echo "1. Log in at https://lavprishjemmeside.dk/admin/"
    echo "2. Open browser console (F12)"
    echo "3. Run: localStorage.getItem('token')"
    echo "4. Copy the token and set: TOKEN='your-token-here'"
else
    echo "✓ All authenticated tests completed"
fi
echo ""
