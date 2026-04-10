# AI Chatbot for Local Businesses

A modern, intelligent chatbot application built for small local businesses. The chatbot uses AI-powered conversations, web search capabilities, and business integration features to provide exceptional customer service.

**[Live Demo](https://my-chatbot-app-chi.vercel.app)** | *Looking to integrate this for your business? Let's customize it for your needs!*

## 🎯 Features

- **AI-Powered Conversations** - Intelligent chat responses using Groq API
- **Web Search Integration** - Real-time web search capability for current information
- **Business Integration** - Retrieve and display business information dynamically
- **Calendar Integration** - Add events to Google Calendar directly from chat
- **Fully Typed** - Built with TypeScript for developer confidence
- **Modern UI** - Responsive design with Tailwind CSS
- **Tested** - Comprehensive test suite with Vitest
- **Production Ready** - Deployed on Vercel with optimized performance

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: [Groq API](https://groq.com) for LLM inference
- **Data**: [Supabase](https://supabase.com) for backend storage
- **APIs**: Google Calendar & Search integrations
- **Testing**: [Vitest](https://vitest.dev)
- **Linting**: ESLint with Husky pre-commit hooks
- **Deployment**: Vercel

## 📋 Prerequisites

Before getting started, ensure you have:

- Node.js 20+ and npm installed
- A [Groq API key](https://console.groq.com)
- A [Supabase project](https://supabase.com) with API credentials
- (Optional) [Google API credentials](https://developers.google.com/calendar) for calendar integration
- (Optional) A Vercel account for deployment

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/my-chatbot-app.git
cd my-chatbot-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Groq API
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google APIs (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key

# Business Configuration
NEXT_PUBLIC_BUSINESS_NAME=Your Business Name
NEXT_PUBLIC_BUSINESS_EMAIL=contact@yourbusiness.com
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application. The page will auto-update as you make changes.

## 📦 Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── add-to-calendar/      # Google Calendar integration
│   │   ├── business-info/        # Business information endpoint
│   │   └── chat/                 # Main chat API endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   └── ChatPreview.tsx           # Chat UI component
├── lib/                          # Utility functions & API clients
│   ├── groq-agent.ts             # Groq API integration
│   └── web-search.ts             # Web search functionality
├── public/                       # Static assets
│   └── widget.js                 # Embeddable chat widget
├── tests/                        # Test files
│   ├── business-info-route.test.ts
│   ├── chat-route.test.ts
│   ├── web-search.test.ts
│   └── widget-behavior.test.ts
└── package.json                  # Dependencies & scripts
```

## 🧪 Testing

Run the test suite:

```bash
# Run tests once
npm test

# Watch mode for development
npm run test:watch
```

## 📝 Linting & Code Quality

Check and fix code style:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

Pre-commit hooks are automatically set up via Husky to run linting on staged files.

## 🏗️ Building for Production

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

The simplest way to deploy is to use the [Vercel Platform](https://vercel.com).

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy with one click!

Check the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## 🔌 API Endpoints

### POST `/api/chat`
Send a message to the chatbot and receive an AI-powered response.

**Request:**
```json
{
  "message": "What are your business hours?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "We're open Monday to Friday, 9 AM to 6 PM...",
  "sources": ["web_search", "business_info"]
}
```

### GET `/api/business-info`
Retrieve business information.

### POST `/api/add-to-calendar`
Add an event to Google Calendar.

## 🛠️ Customization

### Connect to Groq LLM

Edit [lib/groq-agent.ts](lib/groq-agent.ts) to customize AI behavior and system prompts.

### Modify Business Info

Update [app/api/business-info/route.ts](app/api/business-info/route.ts) to return your business details.

### Embed the Chat Widget

Include the chat widget on external websites:

```html
<script src="https://my-chatbot-app-chi.vercel.app/widget.js"></script>
<div id="chatbot-widget"></div>
```

## 📄 License

This project is private project.

## 💬 Support & Customization

Are you a local business looking to integrate this chatbot? I'd be happy to customize it for your specific needs, including:

- Custom AI training on your business data
- Integration with your existing systems
- Branded UI/UX
- Multi-language support
- Analytics and insights

Feel free to reach out to discuss your requirements!

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Groq API Documentation](https://console.groq.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
