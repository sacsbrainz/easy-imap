import { simpleParser } from "mailparser";
import net from "net";
import tls from "tls";
import IMAPParser from "./parser.js";

/**
 * @class IMAPClient
 * @description A comprehensive IMAP client for email server interactions
 * @param {Object} options - Configuration options for IMAP connection
 * @param {string} options.host - IMAP server hostname
 * @param {number} options.port - IMAP server port
 * @param {boolean} [options.secure=true] - Use TLS/SSL connection
 * @param {boolean} [options.debug=false] - Enable debug logging
 */
class IMAPClient {
    constructor({ host, port, secure = true, debug = false }) {
        this.host = host;
        this.port = port;
        this.secure = secure;
        this.debug = debug;
        this.socket = null;
        this.connected = false;
        this.commandCounter = 0;
        this.responseBuffer = '';
        this.commandQueue = [];
        this.currentCommand = null;
        this.emailBuffer = [];
    }


    log(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }

    /**
    * Establishes a connection to the IMAP server
    * @async
    * @returns {Promise<string>} Connection status message
    * @throws {Error} If connection fails
    */
    async connect() {
        return new Promise((resolve, reject) => {
            const connectionOptions = {
                host: this.host,
                port: this.port,
                rejectUnauthorized: false
            };

            const socket = this.secure
                ? tls.connect(connectionOptions, () => {
                    this.socket = socket;
                    this.socket.setEncoding('utf8');
                    this.socket.on('data', this.handleRawResponse.bind(this));
                    this.socket.on('close', () => {
                        this.connected = false;
                        this.log('Connection closed');
                    });
                    this.connected = true;
                    resolve('Connected successfully');
                })
                : net.createConnection(connectionOptions, () => {
                    this.socket = socket;
                    this.socket.setEncoding('utf8');
                    this.socket.on('data', this.handleRawResponse.bind(this));
                    this.socket.on('close', () => {
                        this.connected = false;
                        this.log('Connection closed');
                    });
                    this.connected = true;
                    resolve('Connected successfully');
                });

            socket.on('error', (err) => {
                this.log('Socket error:', err);
                reject(err);
            });
        });
    }

    /**
     * Generates a unique command tag for IMAP communication
     * @private
     * @returns {string} Unique command tag
     */
    generateTag() {
        return `A${++this.commandCounter}`;
    }

    /**
    * Sends a command to the IMAP server and manages command queue
    * @private
    * @param {string} command - IMAP command to send
    * @param {boolean} [expectMultiline=false] - Whether response might span multiple lines
    * @returns {Promise<string>} Server's response
    */
    async sendCommand(command, expectMultiline = false) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('Not connected to IMAP server'));
            }

            const tag = this.generateTag();
            const fullCommand = `${tag} ${command}\r\n`;

            const commandObj = {
                tag,
                command,
                resolve,
                reject,
                expectMultiline,
                response: [] // Store response lines
            };

            if (!this.currentCommand) {
                this.currentCommand = commandObj;
                this._writeCommand(fullCommand);
            } else {
                this.commandQueue.push(commandObj);
            }
        });
    }

    _writeCommand(fullCommand) {
        this.log('Sending:', fullCommand.trim());
        this.socket.write(fullCommand, 'utf8', (err) => {
            if (err) {
                this.log('Write error:', err);
                this.currentCommand.reject(err);
                this._processNextCommand();
            }
        });
    }

    handleRawResponse(data) {
        this.responseBuffer += data;
        const lines = this.responseBuffer.split('\r\n');
        this.responseBuffer = lines.pop() || '';
        lines.forEach(line => this.processResponseLine(line));
    }

    processResponseLine(line) {
        if (!this.currentCommand) return;

        if (!line.startsWith(this.currentCommand.tag)) {
            this.currentCommand.response.push(line);
        } else {
            const status = line.split(' ')[1];
            if (status === 'OK') {
                this.currentCommand.resolve(this.currentCommand.response.join('\n'));
            } else {
                this.currentCommand.reject(new Error(`Command failed: ${line}`));
            }
            this._processNextCommand();
        }
    }

    _processNextCommand() {
        this.currentCommand = null;
        if (this.commandQueue.length > 0) {
            const nextCommand = this.commandQueue.shift();
            this.currentCommand = nextCommand;
            const fullCommand = `${nextCommand.tag} ${nextCommand.command}\r\n`;
            this._writeCommand(fullCommand);
        }
    }

    /**
     * Authenticates with the IMAP server using username and password
     * @async
     * @param {string} username - Email account username
     * @param {string} password - Email account password
     * @returns {Promise<string>} Login response from server
     * @throws {Error} If login fails
     */
    async login(username, password) {
        try {
            const response = await this.sendCommand(`LOGIN ${username} ${password}`);
            this.log('Login successful');
            return response;
        } catch (error) {
            this.log('Login failed:', error);
            throw error;
        }
    }

    /**
     * Retrieves a list of available mailboxes
     * @async
     * @returns {Promise<Array<Object>>} List of mailboxes with their attributes
     * @throws {Error} If mailbox listing fails
     */
    async listMailboxes() {
        try {
            const response = await this.sendCommand('LIST "" "*"', true);
            const parsed = IMAPParser.parseList(response);
            this.log('Mailboxes:', parsed);
            return parsed;
        } catch (error) {
            this.log('List mailboxes failed:', error);
            throw error;
        }
    }

    /**
     * Selects a specific mailbox for further operations
     * @async
     * @param {string} mailbox - Name of the mailbox to select
     * @returns {Promise<Object>} Mailbox metadata
     * @throws {Error} If mailbox selection fails
     */
    async selectMailbox(mailbox) {
        try {
            const response = await this.sendCommand(`SELECT "${mailbox}"`);
            const parsed = IMAPParser.parseSelect(response);
            this.log(`Mailbox ${mailbox} selected:`, parsed);
            return parsed;
        } catch (error) {
            this.log(`Select mailbox ${mailbox} failed:`, error);
            throw error;
        }
    }

    /**
     * Retrieves the total number of emails in the current mailbox
     * @async
     * @returns {Promise<number>} Total email count
     * @throws {Error} If email count retrieval fails
     */
    async fetchEmailCount() {
        try {
            const response = await this.sendCommand(`SEARCH ALL`);
            const parsed = IMAPParser.parseSearch(response);
            this.log(`Email count:`, parsed.length);
            return parsed.length;
        } catch (error) {
            this.log(`Email count failed:`, error);
            throw error;
        }
    }

    /**
     * Fetches email envelope metadata for a specific email
     * @async
     * @param {number} id - Message sequence number
     * @returns {Promise<Object>} Email envelope information
     * @throws {Error} If email fetch fails
     */
    async fetchEmail(id) {
        try {
            const response = await this.sendCommand(`FETCH ${id} ENVELOPE`);
            const parsed = IMAPParser.parseEnvelope(response);
            this.log(`Fetched email:`, parsed);
            return parsed;
        } catch (error) {
            this.log(`Fetch email ${id} failed:`, error);
            throw error;
        }
    }

    /**
     * Retrieves the body of a specific email
     * @async
     * @param {number} id - Message sequence number
     * @param {string} [format="TEXT"] - Preferred body format (TEXT, HTML)
     * @returns {Promise<Object>} Parsed email body using mailparser
     * @throws {Error} If email body retrieval fails
     */
    async fetchEmailBody(id, format = "TEXT") {
        try {
            const res = await this.sendCommand(`FETCH ${id} BODY[${format}]`);
            let response = res

            // Remove trailing = at the end of lines and join them
            response = response.replace(/=\n/g, '');

            // Decode soft-break encoded characters (fixing =3D and similar issues)
            response = response.replace(/=3D/g, '=');

            // Apply other specific fixes (optional based on previous logic)
            response = response.replace(/="=/g, '="');
            response = response.replace(/:=/g, ':');
            response = response.replace(/class==/g, 'class=');

            // const parsed = IMAPParser.parseBody(response);
            const match = response.match(/{\d+}\s(<!DOCTYPE html[\s\S]*)/);
            let parsed = null
            if (match) {
                let htmlContent = match[1].trimEnd(); // Remove trailing spaces or )

                if (htmlContent.endsWith(')')) {
                    htmlContent = htmlContent.slice(0, -1); // Remove the last character if it's a `)`
                }
                parsed = await simpleParser(htmlContent);
            } else {
                parsed = await simpleParser(res);
            }

            this.log(`Fetched email body:`, res);
            return parsed;
        } catch (error) {
            this.log(`Fetch email body ${id} failed:`, error);
            throw error;
        }
    }

    /**
     * Closes the connection and logs out from the IMAP server
     * @async
     * @returns {Promise<string>} Logout response
     * @throws {Error} If logout fails
     */
    async close() {
        try {
            const response = await this.sendCommand('LOGOUT');
            this.socket.end();
            this.connected = false;
            this.log('Connection closed');
            return response;
        } catch (error) {
            this.log('Logout failed:', error);
            throw error;
        }
    }
}

export default IMAPClient