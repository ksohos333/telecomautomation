#!/bin/bash

echo "This script will connect your local repository to GitHub"
echo

read -p "Enter your GitHub username: " username
read -p "Enter your repository name (default: telecom-auto): " repo

if [ -z "$repo" ]; then
  repo="telecom-auto"
fi

echo
echo "Connecting to https://github.com/$username/$repo.git"
echo

git remote add origin "https://github.com/$username/$repo.git"
git branch -M main
git push -u origin main

echo
echo "Repository connected and pushed to GitHub!"
echo
echo "You can now view your repository at: https://github.com/$username/$repo"
echo
read -p "Press Enter to continue..."
