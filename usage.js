import IMAPClient from "./imap.js";

async function main() {
    // IMAP Server Configuration
    const config = {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        debug: true  // Set to false in production
    };

    // Create IMAP Client instance
    const client = new IMAPClient(config);

    try {
        // 1. Connect to the IMAP server
        await client.connect();

        // 2. Login to the email account
        await client.login('youremail@example.com', 'your-password');

        // 3. List available mailboxes
        const mailboxes = await client.listMailboxes();
        console.log('Available Mailboxes:', mailboxes);

        // 4. Select INBOX
        const inboxStatus = await client.selectMailbox('INBOX');
        console.log('Inbox Status:', inboxStatus);

        // 5. Get total email count
        const emailCount = await client.fetchEmailCount();
        console.log('Total Emails:', emailCount);

        // 6. Fetch the most recent email (last email)
        if (emailCount > 0) {
            const latestEmailId = emailCount;

            // Fetch email envelope metadata
            const emailEnvelope = await client.fetchEmail(latestEmailId);
            console.log('Latest Email Envelope:', emailEnvelope);

            // Fetch email body (HTML or TEXT)
            const emailBody = await client.fetchEmailBody(latestEmailId, 'TEXT');
            console.log('Email Body:', {
                subject: emailBody.subject,
                from: emailBody.from.text,
                text: emailBody.text
            });
        }

    } catch (error) {
        console.error('IMAP Operation Failed:', error);
    } finally {
        // 7. Always close the connection
        await client.close();
    }
}

// Run the example
main().catch(console.error);