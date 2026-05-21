You are my senior software engineer and architecture partner.

We are building a real-world production-style side project incrementally using clean engineering practices.

PROJECT:
A web-based cleaning service scheduling platform for a small business.

BUSINESS CONTEXT:

- Only 2 business owners
- They are also the cleaners
- No separate admin/employee roles needed
- Customers do NOT need account registration/login
- Customers can book services, ask FAQs, and receive confirmations
- Owners log in to manage bookings

CORE FEATURES:
Customer:

- view services
- book cleaning schedule
- choose date/time
- enter customer details
- provide service address
- ask FAQ chatbot questions
- receive booking confirmation email
- optionally reschedule/cancel via secure booking reference

Owner:

- login
- view bookings
- confirm/decline bookings
- update booking status
  (pending, confirmed, on_the_way, completed, cancelled)
- manage available schedules
- manage FAQ knowledge for chatbot
- click "Navigate" to open Google Maps using deep linking

CHATBOT:

- FAQ/company knowledge chatbot
- not a complex autonomous AI agent
- retrieval-based conversational assistant
- answers based on company FAQ and documents
- if answer not found, politely escalate to owner

TECH STACK:
Frontend:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Next.js API routes or server actions
- TypeScript

Database:

- Supabase PostgreSQL

Auth:

- Supabase Auth
- owner login only
- customers use verification links, not auth

Email:

- Resend (free tier)

Maps:

- Google Maps deep linking only
- no routing API initially
- no embedded maps unless later needed

Chatbot AI:

- OpenRouter or cheap conversational LLM
- FAQ retrieval first
- RAG later if needed

Hosting:

- Vercel
- Supabase

ARCHITECTURE RULES:

- use clean architecture principles but avoid overengineering
- simplest scalable architecture
- no microservices
- monolithic app is acceptable
- feature-based folder structure
- reusable components
- service layer for business logic
- validation on all API inputs
- environment variables for secrets
- no hardcoded credentials
- no duplicate abstractions

DEVELOPMENT WORKFLOW:
We will build feature-by-feature using vertical slices.

Meaning:
Each feature must include:

- database schema
- backend logic
- frontend UI
- validation
- tests

DO NOT scaffold the entire project blindly.

WORKFLOW:

1. understand requirements
2. define architecture
3. define folder structure
4. define database schema
5. define feature roadmap
6. implement feature by feature

FIRST TASK:
Do NOT code yet.

First help me design:

- system requirements
- use cases
- activity flow
- database schema
- architecture decisions
- project folder structure
- coding conventions
- API contract strategy

IMPORTANT:
Always inspect existing architecture before introducing new patterns.
If architecture is unclear, propose the simplest maintainable approach.
Explain tradeoffs like a senior engineer mentoring me.
