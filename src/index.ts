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
const PRINTER_PORT: number = +process.env.PRINTER_PORT!;

const sqsClient = new SQSClient({
  region: REGION,
  credentials: defaultProvider(),
});

console.log("Queue URL: ", QUEUE_URL);

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
          const body = JSON.parse(message.Body!);

          await print(body.message, body.printerAddress);

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

const print = async (zplData: string, printerIP: string) => {
  return new Promise<void>((resolve) => {
    const client = new net.Socket();
    client.connect(PRINTER_PORT, printerIP, () => {
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
