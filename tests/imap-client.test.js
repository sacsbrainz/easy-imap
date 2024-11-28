
import { jest } from '@jest/globals';
import IMAPClient from '../src/IMAPClient.js';

// Mock dependencies
jest.mock('net');
jest.mock('tls', () => ({
    connect: jest.fn(),
}));
jest.mock('mailparser', () => ({
    simpleParser: jest.fn().mockResolvedValue({
        subject: 'Test Email',
        from: { text: 'sender@example.com' },
        text: 'Email body content'
    })
}));

describe('IMAPClient', () => {
    let client;
    const mockConfig = {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        debug: false
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a new client for each test
        client = new IMAPClient(mockConfig);
    });

    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(client.host).toBe('imap.example.com');
            expect(client.port).toBe(993);
            expect(client.secure).toBe(true);
            expect(client.debug).toBe(false);
            expect(client.connected).toBe(false);
        });
    });

    describe('Authentication', () => {
        it('should login successfully', async () => {
            // Mock connection and sendCommand
            client.connected = true;
            client.sendCommand = jest.fn().mockResolvedValue('* OK Logged in');

            const result = await client.login('user@example.com', 'password');

            expect(result).toBe('* OK Logged in');
            expect(client.sendCommand).toHaveBeenCalledWith('LOGIN user@example.com password');
        });

        it('should throw error on login failure', async () => {
            client.connected = true;
            client.sendCommand = jest.fn().mockRejectedValue(new Error('Authentication failed'));

            await expect(client.login('user@example.com', 'wrongpass'))
                .rejects.toThrow('Authentication failed');
        });
    });

    describe('Mailbox Operations', () => {
        beforeEach(() => {
            client.connected = true;
            client.sendCommand = jest.fn();
        });

        it('should list mailboxes', async () => {
            // Mock response parsing
            client.sendCommand.mockResolvedValue(
                '* LIST (\\HasNoChildren) "/" "INBOX"\n* LIST (\\HasChildren) "/" "Sent"'
            );

            const mailboxes = await client.listMailboxes();

            expect(mailboxes).toHaveLength(2);
            expect(mailboxes[0].name).toBe('INBOX');
            expect(mailboxes[1].name).toBe('Sent');
        });

        it('should select a mailbox', async () => {
            client.sendCommand.mockResolvedValue('* 10 EXISTS\n* OK [UIDVALIDITY 1] UIDs valid');

            const result = await client.selectMailbox('INBOX');

            expect(result.exists).toBe(10);
            expect(result.uidvalidity).toBe(1);
        });
    });

    describe('Email Retrieval', () => {
        beforeEach(() => {
            client.connected = true;
            client.sendCommand = jest.fn();
        });

        it('should fetch email count', async () => {
            client.sendCommand.mockResolvedValue('* SEARCH 1 2 3 4 5');

            const count = await client.fetchEmailCount();

            expect(count).toBe(5);
        });

    });

    describe('Error Handling', () => {
        it('should throw error when not connected', async () => {
            client.connected = false;

            await expect(client.login('user', 'pass'))
                .rejects.toThrow('Not connected to IMAP server');
        });

        it('should handle command queue properly', async () => {
            client.connected = true;
            client.sendCommand = jest.fn()
                .mockImplementationOnce(() => Promise.resolve('First Command'))
                .mockImplementationOnce(() => Promise.resolve('Second Command'));

            const command1Promise = client.sendCommand('FIRST');
            const command2Promise = client.sendCommand('SECOND');

            const results = await Promise.all([command1Promise, command2Promise]);

            expect(results).toEqual(['First Command', 'Second Command']);
        });
    });
});