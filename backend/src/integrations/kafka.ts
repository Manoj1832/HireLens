import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Silence the KafkaJS default partitioner warning
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

// Custom log creator to suppress noisy connection retry logs when running locally without a Kafka broker
const customLogCreator = () => {
  return (entry: any) => {
    const message = entry.log.message || '';
    const msgLower = message.toLowerCase();
    if (
      msgLower.includes('connection error') || 
      msgLower.includes('failed to connect') ||
      msgLower.includes('econnrefused') ||
      msgLower.includes('connection timeout') ||
      msgLower.includes('timeout')
    ) {
      // Suppress these to keep developer console clean
      return;
    }
    
    // Otherwise log normally
    if (entry.level === logLevel.ERROR) {
      logger.error(`[Kafka] ${message}`, { service: 'kafka' });
    } else if (entry.level === logLevel.WARN) {
      logger.warn(`[Kafka] ${message}`, { service: 'kafka' });
    }
  };
};

const kafka = new Kafka({
  clientId: 'hirelens-api',
  brokers: config.kafkaBrokers,
  logLevel: logLevel.WARN,
  logCreator: customLogCreator,
  retry: {
    initialRetryTime: 100,
    retries: 1,
  },
});

let producer: Producer | null = null;
let isKafkaAvailable = false;

export async function connectProducer(): Promise<void> {
  try {
    producer = kafka.producer();
    await producer.connect();
    isKafkaAvailable = true;
    logger.info('Kafka producer connected', { service: 'kafka' });
  } catch (error) {
    isKafkaAvailable = false;
    logger.warn('Kafka producer connection failed — running without event streaming', {
      service: 'kafka',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka producer disconnected', { service: 'kafka' });
  }
}

export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>,
  correlationId: string
): Promise<void> {
  if (!producer || !isKafkaAvailable) {
    logger.warn(`Kafka unavailable — event on topic "${topic}" logged locally only`, {
      service: 'kafka',
      correlationId,
      payload,
    });
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: (payload.eventId as string) || correlationId,
          value: JSON.stringify(payload),
          headers: { correlationId },
        },
      ],
    });
    logger.info(`Event published to ${topic}`, {
      service: 'kafka',
      correlationId,
      eventId: payload.eventId,
    });
  } catch (error) {
    // Publish to DLQ topic
    logger.error(`Failed to publish event to ${topic}`, {
      service: 'kafka',
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}

export { kafka, isKafkaAvailable };
