// Type definitions for IMAPClient

export interface IMAPConfig {
  host: string;
  port: number;
  secure?: boolean;
  debug?: boolean;
}

export interface MailboxInfo {
  flags: string[];
  delimiter: string;
  name: string;
}

export interface MailboxStatus {
  exists: number;
  recent: number;
  unseen: number | null;
  uidvalidity: number | null;
  uidnext: number | null;
  flags: string[];
}

export interface EmailAddress {
  name: string | null;
  sourceRoute: string | null;
  mailbox: string | null;
  host: string | null;
}

export interface EmailEnvelope {
  date: string;
  subject: string;
  from: EmailAddress[];
  sender: EmailAddress[];
  replyTo: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  inReplyTo: string;
  messageId: string;
}

export interface ParsedEmail {
  subject: string;
  from: {
    text: string;
    value: EmailAddress[];
  };
  to: {
    text: string;
    value: EmailAddress[];
  };
  text: string;
  html?: string;
}

declare class IMAPClient {
  constructor(config: IMAPConfig);

  // Connection Methods
  connect(): Promise<string>;
  close(): Promise<string>;

  // Authentication
  login(username: string, password: string): Promise<string>;

  // Mailbox Operations
  listMailboxes(): Promise<MailboxInfo[]>;
  selectMailbox(mailbox: string): Promise<MailboxStatus>;
  fetchEmailCount(): Promise<number>;

  // Email Retrieval
  fetchEmail(id: number): Promise<EmailEnvelope>;
  fetchEmailBody(id: number, format?: "TEXT" | "HEADER"): Promise<ParsedEmail>;
}

export default IMAPClient;
