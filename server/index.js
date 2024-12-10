import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import pkg from 'twilio'; // Import the default CommonJS export
const { Twilio } = pkg; // Destructure Twilio from the default export

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI,)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  content: String,
  recipients: [
    {
      type: { type: String, enum: ['sms', 'whatsapp', 'email'] },
      value: String,
      status: { type: String, enum: ['success', 'failed'] },
    },
  ],
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Validation Schema
const sendMessageSchema = z.object({
  message: z.string().min(1),
  smsNumbers: z.array(z.string()).max(1000).optional(),
  whatsappNumbers: z.array(z.string()).max(1000).optional(),
  emails: z.array(z.string().email()).max(1000).optional(),
});

// Initialize Twilio Client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// API Endpoint for Sending Messages
app.post('/api/send', async (req, res) => {
  try {
    const validatedData = sendMessageSchema.parse(req.body);
    const { message, smsNumbers = [], whatsappNumbers = [], emails = [] } = validatedData;

    const messageDoc = new Message({
      content: message,
      recipients: [],
    });

    // Send SMS messages
    for (const number of smsNumbers) {
      try {
        await twilioClient.messages.create({
          body: message,
          to: number,
          from: process.env.TWILIO_PHONE_NUMBER,
        });
        messageDoc.recipients.push({ type: 'sms', value: number, status: 'success' });
      } catch (error) {
        messageDoc.recipients.push({ type: 'sms', value: number, status: 'failed' });
      }
    }

    // Send WhatsApp messages
    for (const number of whatsappNumbers) {
      try {
        await twilioClient.messages.create({
          body: message,
          to: `whatsapp:${number}`,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        });
        messageDoc.recipients.push({ type: 'whatsapp', value: number, status: 'success' });
      } catch (error) {
        messageDoc.recipients.push({ type: 'whatsapp', value: number, status: 'failed' });
      }
    }

    // Send Emails
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: 'New Message',
          text: message,
        });
        messageDoc.recipients.push({ type: 'email', value: email, status: 'success' });
      } catch (error) {
        messageDoc.recipients.push({ type: 'email', value: email, status: 'failed' });
      }
    }

    // Save the Message Document
    await messageDoc.save();

    res.json({
      success: true,
      message: 'Messages sent successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// API Endpoint to Fetch All Messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving messages',
    });
  }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
