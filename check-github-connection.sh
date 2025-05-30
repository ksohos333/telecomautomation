#!/bin/bash

echo "Checking GitHub repository connection..."
echo

git remote -v

if [ $? -eq 0 ]; then
    echo
    echo "GitHub remote information found above."
    echo "If you see \"origin\" pointing to your GitHub repository, the connection is successful."
else
    echo
    echo "No GitHub remote found. Please run connect-to-github.sh first."
fi

echo
echo "Checking branch information..."
echo

git branch -v

echo
echo
read -p "Press Enter to continue..."
