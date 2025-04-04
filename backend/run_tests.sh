#!/bin/bash

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Install required test dependencies
echo "Installing test dependencies..."
pip install pytest pytest-cov fastapi testclient httpx requests

# Run the tests with coverage
echo "Running tests with coverage..."
python -m pytest test_app.py -v --cov=app --cov-report=term

# Run integration tests
echo "Running integration tests..."
python -m pytest test_app.py::IntegrationTests -v

# Display summary
echo ""
echo "Test Summary:"
echo "============="
echo "Unit and integration tests completed."
echo "Check the output above for any failures."
echo ""
echo "If all tests passed, the backend should be bug-free and working properly."
echo "Make sure the backend is running before connecting with the Chrome extension."
echo "" 