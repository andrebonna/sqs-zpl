import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { defaultProvider } from "@aws-sdk/credential-provider-node";

import { config } from "@dotenvx/dotenvx";
import net from "net";

config();

const REGION = process.env.AWS_REGION!;
const QUEUE_URL = process.env.SQS_QUEUE_URL!;
const PRINTER_IP = process.env.PRINTER_IP!;
const PRINTER_PORT: number = +process.env.PRINTER_PORT!;

const sqsClient = new SQSClient({
  region: REGION,
  credentials: defaultProvider(),
});

async function pollMessages() {
  console.log("🚀 SQS Polling Service Started...");

  while (true) {
    console.log("Long Polling starting...");
    try {
      // Fetch messages from SQS
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
      });

      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          await print(message.Body!);

          // Delete message from SQS after processing
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });

          await sqsClient.send(deleteCommand);
          console.log("✅ Message deleted from SQS");
        }
      }
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
    }
  }
}

// Start polling
pollMessages();

const print = async (zplData: string) => {
  return new Promise<void>((resolve) => {
    const client = new net.Socket();
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log("Connected to Zebra printer...");
      client.write(`${zplData}\n`, () => {
        client.end();
        console.log("Connection ended!");
        resolve();
      });
    });
    client.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "ECONNRESET") {
        console.error("❌ Unexpected Printer Connection Error:", err);
      }
    });
  });
};
