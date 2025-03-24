// HTML templates for results and error pages
export function generateResultPage(data, mode, originalUrl) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title || 'Processed Page'}</title>
        <link rel="stylesheet" href="${chrome.runtime.getURL('styles/results.css')}">
    </head>
    <body>
        <!-- Result page content -->
        ${generateResultContent(data, mode, originalUrl)}
    </body>
    </html>`;
}

export function generateErrorPage(errorMessage, mode, originalUrl) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error Processing Page</title>
        <link rel="stylesheet" href="${chrome.runtime.getURL('styles/error.css')}">
    </head>
    <body>
        <!-- Error page content -->
        ${generateErrorContent(errorMessage, mode, originalUrl)}
    </body>
    </html>`;
} 