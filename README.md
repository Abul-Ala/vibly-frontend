# Vibly — Dating & Social Web Application (React + Vite)

A modern, high-performance web client for the **Vibly Dating & Social Networking Application**, built using **React, TypeScript, Vite, and Modern Responsive CSS**. It features rich animations, touch/mouse swipe gestures, stories, messaging, match celebration, and full desktop & mobile adaptability.

---

## ⚡ Deploy to Vercel in 2 Minutes

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repository to your GitHub account (e.g. `https://github.com/<your-username>/vibly-web`).
2. Go to [vercel.com/new](https://vercel.com/new) and click **Import** next to the repository.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. (Optional) Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://dating-social-app-production.up.railway.app/api/v1`
5. Click **Deploy**! 🚀

---

## 🚀 Quickstart

### 1. Install & Run Locally

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **`http://localhost:5173/`**.

### 2. Build for Production

```bash
npm run build
npm run preview
```

---

## 🎨 Design & Aesthetic Features

- **Dark Obsidian Aesthetic**: Uses `#0C0D14` background, `#161822` surface panels, and `#1E2130` glassmorphic cards matching the Android Jetpack Compose Material 3 theme.
- **Vibrant Gradients**: Flame gradient (`#FF3366` ➔ `#FF7A00`), Romantic gradient (`#FF3366` ➔ `#9B51E0`), and Superlike gradient (`#00C6FF` ➔ `#0072FF`).
- **Interactive Swipeable Card Deck**: Full touch and mouse drag gestures with dynamic "LIKE", "NOPE", and "SUPER LIKE" stamps, card rotation, and photo gallery pagination dots.
- **"It's a Match!" Celebration**: Animated mutual attraction celebration modal with celebratory confetti (`canvas-confetti`), mutual profile avatars, and direct messaging triggers.
- **Stories Tray & Viewer**: Instagram-style stories tray with romantic gradient rings, photo uploading modal, and full-screen auto-advancing segmented progress story viewer.
- **Who Liked You**: Live feed of users who liked your profile, with instant one-tap "Match Back" action.
- **Real-Time Chat**: Conversation message history, icebreaker prompt chips, instant messaging, online activity status, and safety moderation tools (Block & Report).
- **Profile Management**: Profile photo and gallery photo uploads/deletions, privacy toggles (*Hide Distance*, *Hide Online Status*), and passions/interests selection.
- **Multi-Server Support**: Built-in modal allowing switching between Railway Cloud backend (`https://dating-social-app-production.up.railway.app/api/v1`) and Local Spring Boot (`http://localhost:8080/api/v1`).

---

## 📂 Project Architecture

```
frontend/
├── src/
│   ├── api/
│   │   ├── apiClient.ts           # Fetch API client with auth interceptor & URL resolution
│   │   └── types.ts               # TypeScript interfaces matching backend JPA/DTO entities
│   ├── components/
│   │   ├── ActionButtons.tsx      # Rewind, Pass, SuperLike, Like, Boost
│   │   ├── AddStoryModal.tsx      # Story photo selection & caption submission
│   │   ├── FilterModal.tsx        # Age, gender, distance discovery filters
│   │   ├── MatchCelebrationModal.tsx # Animated match modal with confetti
│   │   ├── ProfileDetailSheet.tsx # Bottom sheet modal for expanded profile details
│   │   ├── ReportBlockModal.tsx   # Safety block and abuse reporting modal
│   │   ├── ServerSettingsModal.tsx# Switch between Railway and localhost backend
│   │   ├── StoriesTray.tsx        # Stories row with gradient rings
│   │   ├── StoryViewerModal.tsx   # Full-screen segmented story viewer
│   │   ├── SwipeableCard.tsx      # Drag gestures, stamps, and photo carousel
│   │   └── Toast.tsx              # Animated in-app notifications
│   ├── screens/
│   │   ├── AuthScreen.tsx         # Sign in, registration, 1-click test accounts
│   │   ├── ChatScreen.tsx         # Conversation view with real-time polling
│   │   ├── DiscoverScreen.tsx     # Card deck, filters, and action buttons
│   │   ├── EditProfileScreen.tsx  # Edit bio, job, location, and passion tags
│   │   ├── MatchesScreen.tsx      # Stories tray, Who Liked You, and conversations
│   │   └── ProfileScreen.tsx      # Profile view, photo gallery, privacy toggles
│   ├── theme/
│   │   └── theme.css              # Obsidian theme tokens, gradients, and typography
│   ├── App.tsx                    # Main navigation host, bottom bar, and live notifications
│   ├── index.css                  # Global responsive layout and animations
│   └── main.tsx                   # React 18 root bootstrap
├── index.html                     # HTML5 entry with Outfit & Plus Jakarta Sans fonts
├── package.json
└── vite.config.ts
```
