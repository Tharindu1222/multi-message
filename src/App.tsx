import React, { useState, useEffect } from "react";
import { Send, Phone, MessageSquare, Mail, Check, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Papa from "papaparse";

interface Recipient {
  type: string;
  value: string;
  status: string; // "sent" or "failed"
}

interface Message {
  content: string;
  recipients: Recipient[];
  timestamp: string;
}

interface FormData {
  message: string;
  smsNumbers: string[];
  whatsappNumbers: string[];
  emails: string[];
  useCommaSeparated: boolean; // Flag to toggle between comma-separated and dynamic fields
}

const initialFormData: FormData = {
  message: "",
  smsNumbers: [""],
  whatsappNumbers: [""],
  emails: [""],
  useCommaSeparated: false,
};
// Login Credentials
const VALID_USERNAME = "Admin";
const VALID_PASSWORD = "Admin123";

const App = () => {
  const [formData, setFormData] = useState<FormData>(() => {
    const savedData = localStorage.getItem("formData");
    return savedData ? JSON.parse(savedData) : initialFormData;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // For status message
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/messages");
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      toast.error("Failed to fetch messages.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    // Filter out empty values from each list
    const validSmsNumbers = formData.smsNumbers
      .join(",")
      .split(",")
      .map((num) => num.trim())
      .filter(Boolean);
    const validWhatsappNumbers = formData.whatsappNumbers
      .join(",")
      .split(",")
      .map((num) => num.trim())
      .filter(Boolean);
    const validEmails = formData.emails
      .join(",")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    // Check if at least one contact method is provided
    if (validSmsNumbers.length === 0 && validWhatsappNumbers.length === 0 && validEmails.length === 0) {
      toast.error("Please provide at least one contact method (SMS, WhatsApp, or Email).");
      setLoading(false);
      return;
    }

    // Prepare data based on the input method selected
    let dataToSend = {
      message: formData.message,
      smsNumbers: validSmsNumbers,
      whatsappNumbers: validWhatsappNumbers,
      emails: validEmails,
    };

    if (formData.useCommaSeparated) {
      // If comma-separated values are used, we take them from the first field
      dataToSend = {
        message: formData.message,
        smsNumbers: validSmsNumbers,
        whatsappNumbers: validWhatsappNumbers,
        emails: validEmails,
      };
    }

    try {
      const response = await fetch("http://localhost:3000/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(result.messages); // Store the sent messages with status
        toast.success("Messages sent successfully!");
        setFormData(initialFormData);
        setStatusMessage("Messages sent successfully!"); // Show status message
      } else {
        const result = await response.json();
        toast.error(result.message || "Failed to send messages.");
        setStatusMessage(result.message || "Failed to send messages."); // Show failure status
      }
    } catch (error) {
      toast.error("Failed to connect to server.");
      setStatusMessage("Failed to connect to server."); // Show connection failure status
    } finally {
      setLoading(false);
    }
  };

const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: keyof Omit<FormData, "message" | "useCommaSeparated">) => {
  const file = event.target.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    complete: (results) => {
      const data = results.data as string[][]; // Assuming each row is an array of strings
      const parsedData = data.flat().map((item) => item.trim()).filter(Boolean);

      if (parsedData.length === 0) {
        toast.error("The uploaded file is empty or invalid.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [type]: parsedData,
      }));

      toast.success("File uploaded successfully!");
    },
    error: () => {
      toast.error("Failed to parse the uploaded file.");
    },
  });
};

  const handleArrayInput = (
    type: keyof Omit<FormData, "message" | "useCommaSeparated">,
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const newArray = [...prev[type]];
      newArray[index] = value;

      if (index === newArray.length - 1 && newArray.length < 1) {
        newArray.push("");
      }

      return { ...prev, [type]: newArray };
    });
  };

  useEffect(() => {
    if (showMessages) fetchMessages();
  }, [showMessages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Send className="h-10 w-10 text-indigo-600" />
            <h1 className="ml-3 text-3xl font-bold text-gray-900">Multi-Channel Messenger</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message Content
              </label>
              <textarea
                id="message"
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                required
              />
            </div>

            <div className="flex items-center mb-4">
              <label className="text-sm font-medium text-gray-700">Use Comma-Separated Values?</label>
              <input
                type="checkbox"
                checked={formData.useCommaSeparated}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    useCommaSeparated: !prev.useCommaSeparated,
                  }))
                }
                className="ml-2"
              />
            </div>

            {/* Conditional Rendering Based on useCommaSeparated */}
            {formData.useCommaSeparated ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {/* SMS Input */}
                <div>
                  <div className="flex items-center mb-4">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">SMS (Comma Separated)</h3>
                  </div>
                  <textarea
                    placeholder="+1234567890, +9876543210"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.smsNumbers.join(",")}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        smsNumbers: [e.target.value],
                      }))
                    }
                  />
                </div>

                {/* WhatsApp Input */}
                <div>
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">WhatsApp (Comma Separated)</h3>
                  </div>
                  <textarea
                    placeholder="+1234567890, +9876543210"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.whatsappNumbers.join(",")}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        whatsappNumbers: [e.target.value],
                      }))
                    }
                  />
                </div>

                {/* Email Input */}
                <div>
                  <div className="flex items-center mb-4">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">Emails (Comma Separated)</h3>
                  </div>
                  <textarea
                    placeholder="example@email.com, another@email.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={formData.emails.join(",")}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emails: [e.target.value],
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                
                {/* SMS Input */}
                <div>
  <div className="flex items-center mb-4">
    <Phone className="h-5 w-5 text-gray-400" />
    <h3 className="ml-2 text-lg font-medium text-gray-900">SMS Numbers</h3>
  </div>
  {formData.smsNumbers.map((smsNumber, index) => (
    <div key={index} className="flex items-center mb-2">
      <input
        type="text"
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        value={smsNumber}
        onChange={(e) => handleArrayInput("smsNumbers", index, e.target.value)}
        placeholder="+1234567890"
      />
    </div>
  ))}
  <div>
    <div className="flex items-center mb-4">
      <Phone className="h-5 w-5 text-gray-400" />
      <h3 className="ml-2 text-lg font-medium text-gray-900">SMS CSV Upload</h3>
    </div>
    <input
      type="file"
      accept=".csv"
      onChange={(e) => handleFileUpload(e, "smsNumbers")}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
    />
  </div>
</div>


                {/* WhatsApp Input */}
                <div>
                  <div className="flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">WhatsApp Numbers</h3>
                  </div>
                  {formData.whatsappNumbers.map((whatsappNumber, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={whatsappNumber}
                        onChange={(e) => handleArrayInput("whatsappNumbers", index, e.target.value)}
                        placeholder="+1234567890"
                      />
                    </div>
                  ))}
                <div>
    <div className="flex items-center mb-4">
      <Phone className="h-5 w-5 text-gray-400" />
      <h3 className="ml-2 text-lg font-medium text-gray-900">WhatsApp CSV Upload</h3>
    </div>
    <input
      type="file"
      accept=".csv"
      onChange={(e) => handleFileUpload(e, "whatsappNumbers")}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
    />
  </div>
</div>

                {/* Email Input */}
                <div>
                  <div className="flex items-center mb-4">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <h3 className="ml-2 text-lg font-medium text-gray-900">Email Addresses</h3>
                  </div>
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="email"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={email}
                        onChange={(e) => handleArrayInput("emails", index, e.target.value)}
                        placeholder="example@email.com"
                      />
                    </div>
                  ))}
                  <div>
    <div className="flex items-center mb-4">
      <Phone className="h-5 w-5 text-gray-400" />
      <h3 className="ml-2 text-lg font-medium text-gray-900">Email CSV Upload</h3>
    </div>
    <input
      type="file"
      accept=".csv"
      onChange={(e) => handleFileUpload(e, "emails")}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
    />
  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Messages"}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowMessages((prev) => !prev)}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              {showMessages ? "Hide Sent Messages" : "Show Sent Messages"}
            </button>
          </div>

          {/* Display sent messages */}
{showMessages && messages.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-medium text-gray-900">Sent Messages</h3>
    <div className="mt-4 space-y-4">
      {messages.map((message, index) => (
        <div key={index} className="border-t pt-4">
          {/* Message content */}
          <div className="font-semibold text-gray-900">{message.content}</div>

          {/* Recipients */}
          <div className="mt-2 text-sm text-gray-600">
            {message.recipients.map((recipient, i) => (
              <div key={i} className="flex items-center">
                {/* Icons and type names for recipient type */}
                {recipient.type === "sms" && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-700">SMS</span>
                  </div>
                )}
                {recipient.type === "whatsapp" && (
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-700">WhatsApp</span>
                  </div>
                )}
                {recipient.type === "email" && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-700">Email</span>
                  </div>
                )}

                {/* Recipient information */}
                <span className="ml-2">{recipient.value}</span>

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default App;
