# Chrome Extension Documentation

## Overview

This documentation covers the design, architecture, and implementation details of the Chrome Extension for web page processing and summarization. The documentation is organized into several sections, each focusing on a specific aspect of the extension.

## Table of Contents

### Architecture

- [Architecture Overview](architecture/overview.md) - High-level overview of the system architecture and component interactions

### Components

- [Frontend Components](components/frontend.md) - Details about the Chrome extension's frontend components
- [Backend Components](components/backend.md) - Information about the Python backend server
- [FireCrawl API Integration](components/firecrawl.md) - Documentation on integration with the content extraction API
- [Processing System](components/processing.md) - In-depth explanation of the URL processing system

### Core Functionality

- [Tab Independence Mechanism](tab-independence.md) - How independent tabs are implemented for multi-URL processing
- [Storage System](storage-system.md) - Details on content and state storage mechanisms
- [UI Rendering System](ui-rendering.md) - Documentation of the content rendering and UI state management

### API Documentation

- [Backend API](api/backend.md) - Documentation of the backend server API endpoints
- [Message API](api/messages.md) - Documentation of the internal messaging system

### User Guide

- [Installation Guide](user-guide/installation.md) - How to install and configure the extension
- [Usage Instructions](user-guide/usage.md) - How to use the extension features

### Development

- [Setup Guide](development/setup.md) - Setting up the development environment
- [Testing Guide](development/testing.md) - Testing procedures and guidelines
- [Contributing Guidelines](development/contributing.md) - How to contribute to the project

## How to Use This Documentation

The documentation is organized to serve different audiences:

1. **Users**: Start with the [User Guide](user-guide/) to learn how to install and use the extension.
2. **Developers**: Begin with the [Architecture Overview](architecture/overview.md) and then explore the specific components relevant to your task.
3. **Maintainers**: Review the [Development](development/) section for setup and contribution guidelines.

## Key Concepts

Here are some key concepts that are used throughout the documentation:

- **Processing Queue**: A system that manages multiple URLs for sequential processing
- **State Management**: How the extension tracks and updates processing state
- **Tab Independence**: How each result tab maintains its own state and content
- **Content Rendering**: How processed content is displayed in the result tab

## Implementation Details

The Chrome extension is implemented with:

- **Frontend**: JavaScript, HTML, CSS (with TailwindCSS)
- **Backend**: Python with FastAPI
- **Storage**: Chrome Storage API, Session Storage
- **Communication**: Chrome Messaging API, HTTP/REST API

## File Structure

The codebase is organized into the following key directories:

```
chrome-extension/
├── background/      # Background scripts for extension
│   └── processing/  # URL processing modules
├── popup/           # Extension popup UI
├── pages/           # Extension pages
│   └── result/      # Result display page
├── content/         # Content scripts
├── utils/           # Utility functions
├── backend/         # Python backend server
└── docs/            # Documentation
``` 