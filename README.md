# Easy-imap

A lightweight, promise-based IMAP email client for Node.js that simplifies email retrieval and mailbox management.

## Features

- TLS/SSL secure connections
- Comprehensive IMAP operations
- Promise-based async/await syntax
- Detailed response parsing
- Optional debug logging
- Mailbox listing and selection
- Email metadata and body retrieval

## Prerequisites

- Node.js 14+
- An email account with IMAP access

## Installation

```bash
npm install easy-imap
```

## Quick Start

```javascript
import IMAPClient from 'easy-imap';

async function fetchEmails() {
    const client = new IMAPClient({
        host: 'imap.example.com',
        port: 993,
        secure: true
    });

    try {
        await client.connect();
        await client.login('email@example.com', 'password');
        
        // List mailboxes
        const mailboxes = await client.listMailboxes();
        
        // Select INBOX
        await client.selectMailbox('INBOX');
        
        // Get email count
        const count = await client.fetchEmailCount();
        
        // Fetch latest email
        const latestEmail = await client.fetchEmail(count);
        const latestEmailBody = await client.fetchEmailBody(count);
    } finally {
        await client.close();
    }
}
```

## Configuration Options

| Option   | Type    | Default | Description                      |
|----------|---------|---------|----------------------------------|
| host     | string  | Required| IMAP server hostname             |
| port     | number  | Required| IMAP server port                 |
| secure   | boolean | true    | Use TLS/SSL connection           |
| debug    | boolean | false   | Enable detailed logging          |

## Methods

- `connect()`: Establish server connection
- `login(username, password)`: Authenticate
- `listMailboxes()`: Get available mailboxes
- `selectMailbox(name)`: Choose a mailbox
- `fetchEmailCount()`: Count total emails
- `fetchEmail(id)`: Get email metadata
- `fetchEmailBody(id)`: Retrieve email content
- `close()`: End server connection

## Error Handling

All methods return Promises and should be used with try/catch:

```javascript
try {
    // IMAP operations
} catch (error) {
    console.error('IMAP Error:', error.message);
}
```

## Security Notes

- Always use environment variables for credentials
- Enable debug only during development
- Use secure connections (TLS)

## Dependencies

- `mailparser`: Email parsing
- Node.js built-in `net` and `tls`
