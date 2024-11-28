/**
 * @class IMAPParser
 * @description A utility class for parsing IMAP server responses
 * @static
 */
class IMAPParser {
    /**
     * Parses the LIST command response to extract mailbox information
     * @static
     * @param {string} response - Raw IMAP server response from LIST command
     * @returns {Array<Object>} Array of mailbox objects with flags, delimiter, and name
     * @example
     * // Returns: [{ flags: ['\\Noselect'], delimiter: '/', name: 'INBOX' }]
     * IMAPParser.parseList('* LIST (\\Noselect) "/" "INBOX"')
     */
    static parseList(response) {
        const mailboxes = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.startsWith('* LIST')) {
                const match = line.match(/^\* LIST \((.*?)\) "(.+)" "(.+)"$/);
                if (match) {
                    const [, flags, delimiter, name] = match;
                    mailboxes.push({
                        flags: flags.split(' '),
                        delimiter,
                        name
                    });
                }
            }
        }
        return mailboxes;
    }

    /**
    * Parses the SELECT command response to extract mailbox metadata
    * @static
    * @param {string} response - Raw IMAP server response from SELECT command
    * @returns {Object} Mailbox metadata including message count, flags, and UIDs
    * @property {number} exists - Number of messages in the mailbox
    * @property {number} recent - Number of recent messages
    * @property {number|null} unseen - First unseen message number
    * @property {number|null} uidvalidity - UIDVALIDITY value
    * @property {number|null} uidnext - Next expected UID
    * @property {string[]} flags - Available mailbox flags
    */
    static parseSelect(response) {
        const result = {
            exists: 0,
            recent: 0,
            unseen: null,
            uidvalidity: null,
            uidnext: null,
            flags: []
        };

        const lines = response.split('\n');
        for (const line of lines) {
            if (line.startsWith('* ')) {
                const parts = line.substring(2).split(' ');
                if (parts[1] === 'EXISTS') {
                    result.exists = parseInt(parts[0]);
                } else if (parts[1] === 'RECENT') {
                    result.recent = parseInt(parts[0]);
                } else if (line.includes('UNSEEN')) {
                    const match = line.match(/UNSEEN (\d+)/);
                    if (match) result.unseen = parseInt(match[1]);
                } else if (line.includes('UIDVALIDITY')) {
                    const match = line.match(/UIDVALIDITY (\d+)/);
                    if (match) result.uidvalidity = parseInt(match[1]);
                } else if (line.includes('UIDNEXT')) {
                    const match = line.match(/UIDNEXT (\d+)/);
                    if (match) result.uidnext = parseInt(match[1]);
                } else if (line.includes('FLAGS')) {
                    const match = line.match(/FLAGS \((.*?)\)/);
                    if (match) result.flags = match[1].split(' ');
                }
            }
        }
        return result;
    }

    /**
     * Parses the SEARCH command response to extract message sequence numbers
     * @static
     * @param {string} response - Raw IMAP server response from SEARCH command
     * @returns {number[]} Array of message sequence numbers
     */
    static parseSearch(response) {
        const match = response.match(/\* SEARCH(.*)/);
        if (match) {
            const numbers = match[1].trim().split(' ');
            return numbers.map(num => parseInt(num)).filter(num => !isNaN(num));
        }
        return [];
    }

    /**
     * Parses the ENVELOPE command response to extract email metadata
     * @static
     * @param {string} response - Raw IMAP server response from FETCH ENVELOPE command
     * @returns {Object|Object[]} Parsed email envelope information
     * @property {string} date - Email date
     * @property {string} subject - Email subject
     * @property {Array} from - Sender email addresses
     * @property {Array} to - Recipient email addresses
     * @property {string} messageId - Unique message identifier
     */
    static parseEnvelope(response) {
        const result = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.includes('ENVELOPE')) {
                const match = line.match(/ENVELOPE \((.*?)\)(?:\))?$/);
                if (match) {
                    const parts = this.parseEnvelopeParts(match[1]);

                    // Safely handle parts with null checks and defaults
                    result.push({
                        date: parts[0] ? parts[0].replace(/"/g, '') : '',
                        subject: parts[1] ? parts[1].replace(/"/g, '') : '',
                        from: this.parseAddressList(parts[2]),
                        sender: this.parseAddressList(parts[3]),
                        replyTo: this.parseAddressList(parts[4]),
                        to: this.parseAddressList(parts[5]),
                        cc: this.parseAddressList(parts[6] || 'NIL'),
                        bcc: this.parseAddressList(parts[7] || 'NIL'),
                        inReplyTo: parts[8] ? parts[8].replace(/"/g, '') : '',
                        messageId: parts[9] ? parts[9].replace(/"/g, '') : ''
                    });
                }
            }
        }
        return result.length === 1 ? result[0] : result;
    }

    static parseEnvelopeParts(envelope) {
        const parts = [];
        let current = '';
        let depth = 0;
        let inQuotes = false;

        for (let i = 0; i < envelope.length; i++) {
            const char = envelope[i];
            if (char === '"' && envelope[i - 1] !== '\\') {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === '(' && !inQuotes) {
                depth++;
                current += char;
            } else if (char === ')' && !inQuotes) {
                depth--;
                current += char;
            } else if (char === ' ' && depth === 0 && !inQuotes) {
                if (current) parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        if (current) parts.push(current);
        return parts;
    }

    static parseAddressList(addresses) {
        if (addresses === 'NIL' || !addresses) return [];

        const addressList = [];
        const matches = addresses.match(/\((.*?)\)/g);

        if (matches) {
            for (const match of matches) {
                const parts = match.slice(1, -1).split(' ');
                addressList.push({
                    name: this.decodeValue(parts[0]),
                    sourceRoute: this.decodeValue(parts[1]),
                    mailbox: this.decodeValue(parts[2]),
                    host: this.decodeValue(parts[3])
                });
            }
        }

        return addressList;
    }

    static decodeValue(value) {
        if (value === 'NIL') return null;
        return value.replace(/"/g, '');
    }

}

export default IMAPParser;