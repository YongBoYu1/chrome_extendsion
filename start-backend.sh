#!/bin/bash

# Check internet connectivity
echo "Checking internet connectivity..."
if ping -c 1 google.com &> /dev/null; then
    echo "Internet connection is available"
else
    echo "WARNING: No internet connection detected. FireCrawl API may not be accessible."
    echo "The backend will still start, but duplicating pages may not work."
fi

# Run the backend server as a module from the project root
python -m backend.app 