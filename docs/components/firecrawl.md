# FireCrawl Content Extractor

## Overview

The FireCrawl Content Extractor is a crucial component that handles intelligent web content extraction. It uses advanced heuristics and machine learning techniques to identify and extract meaningful content from web pages while filtering out noise like ads, navigation, and irrelevant elements.

## Core Functionality

### Content Extraction
```python
def extract_content(url: str) -> Dict[str, Any]:
    """
    Extracts meaningful content from a given URL using FireCrawl API.
    Returns a dictionary containing the extracted content and metadata.
    """
```

### Main Features

1. **Intelligent Content Detection**
   - Main content identification
   - Noise filtering
   - Content relevance scoring
   - Structure preservation

2. **Metadata Extraction**
   - Title extraction
   - Author information
   - Publication date
   - Reading time estimation

3. **Content Cleaning**
   - HTML sanitization
   - Style normalization
   - Link processing
   - Image handling

## Integration Points

### 1. API Integration
- FireCrawl API endpoint configuration
- API key management
- Request rate limiting
- Error handling

### 2. Content Processing Pipeline
- Integration with page processor
- Content format standardization
- Error propagation
- Status reporting

## Configuration

```python
FIRECRAWL_CONFIG = {
    'api_key': 'your_api_key',
    'endpoint': 'https://api.firecrawl.com/extract',
    'timeout': 30,
    'max_retries': 3,
    'rate_limit': 60  # requests per minute
}
```

## Error Handling

1. **API Errors**
   - Connection timeouts
   - Rate limit exceeded
   - Invalid API key
   - Server errors

2. **Content Errors**
   - Invalid URLs
   - Access denied
   - Content not found
   - Parsing errors

## Performance Considerations

1. **Optimization Techniques**
   - Request caching
   - Content compression
   - Parallel processing
   - Resource pooling

2. **Resource Management**
   - Memory usage optimization
   - Connection pooling
   - Timeout handling
   - Resource cleanup

## Usage Examples

### Basic Content Extraction
```python
from firecrawl_extractor import FireCrawlExtractor

extractor = FireCrawlExtractor()
content = extractor.extract_content("https://example.com")
```

### Advanced Usage
```python
# Custom extraction with options
content = extractor.extract_content(
    url="https://example.com",
    options={
        'include_images': True,
        'extract_metadata': True,
        'clean_content': True
    }
)
```

## Response Format

```json
{
    "title": "Article Title",
    "content": "Main content text...",
    "metadata": {
        "author": "Author Name",
        "published_date": "2024-03-20",
        "reading_time": 5
    },
    "images": [
        {
            "url": "image_url",
            "alt": "image description"
        }
    ]
}
```

## Best Practices

1. **API Usage**
   - Implement proper error handling
   - Use rate limiting
   - Cache responses when possible
   - Handle timeouts gracefully

2. **Content Processing**
   - Validate input URLs
   - Sanitize extracted content
   - Preserve important metadata
   - Handle different content types

3. **Error Recovery**
   - Implement retry mechanisms
   - Log errors for debugging
   - Provide fallback options
   - Maintain state consistency

## Troubleshooting

### Common Issues

1. **API Connection**
   - Check API key validity
   - Verify network connectivity
   - Monitor rate limits
   - Check endpoint status

2. **Content Extraction**
   - Invalid URL format
   - Access restrictions
   - Content type mismatches
   - Parsing failures

### Debug Logging

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('firecrawl_extractor')
```

## Testing

### Unit Tests
```python
def test_content_extraction():
    extractor = FireCrawlExtractor()
    content = extractor.extract_content(test_url)
    assert content['title'] is not None
    assert len(content['content']) > 0
```

### Integration Tests
```python
def test_pipeline_integration():
    processor = PageProcessor()
    result = processor.process_url(test_url)
    assert result.extraction_success
    assert result.content is not None
``` 