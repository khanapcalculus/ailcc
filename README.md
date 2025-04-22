# LCC Whiteboard - Real-time Collaborative Whiteboard

A real-time collaborative whiteboard application designed for online tutoring and teaching. Connect with your students in real-time and enhance their learning experience.

## Features

- **Real-time Collaboration**: Multiple users can work on the same whiteboard simultaneously
- **Drawing Tools**: Pen, eraser, shapes (rectangle, ellipse), text, and image tools
- **Multi-page Support**: Create and navigate between multiple pages
- **Undo/Redo**: Easy mistake correction with history tracking
- **Export Options**: Save your whiteboard as images
- **User Authentication**: Secure login and registration system
- **Mobile & Tablet Support**: Responsive design with touch support
- **Smooth Handwriting**: Chaikin's algorithm for smooth line drawing

## Technology Stack

- **Frontend**: Vue 3 with Composition API
- **Canvas Rendering**: Konva.js
- **State Management**: Pinia
- **Routing**: Vue Router
- **Real-time Communication**: Socket.IO
- **Authentication & Database**: Firebase
- **Styling**: Custom CSS with responsive design

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/khanapcalculus/ailcc.git
cd ailcc
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with your Firebase configuration:

```
VUE_APP_FIREBASE_API_KEY=your-api-key
VUE_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
VUE_APP_FIREBASE_PROJECT_ID=your-project-id
VUE_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VUE_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VUE_APP_FIREBASE_APP_ID=your-app-id
VUE_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
VUE_APP_SOCKET_SERVER=your-socket-server-url
```

4. Run the development server:

```bash
npm run serve
# or
yarn serve
```

5. Build for production:

```bash
npm run build
# or
yarn build
```

## Project Structure

```
ailcc/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Images, fonts, etc.
│   ├── components/         # Reusable Vue components
│   ├── pages/              # Page components
│   ├── plugins/            # Whiteboard tools and utilities
│   │   └── whiteboard/
│   │       ├── tools/      # Tool implementations
│   │       └── utils/      # Utility functions
│   ├── services/           # API and service integrations
│   ├── store/              # Pinia store modules
│   ├── router/             # Vue Router configuration
│   ├── App.vue             # Root component
│   └── main.js             # Application entry point
└── ...
```

## Deployment

The application can be deployed to Firebase Hosting or your preferred hosting provider.

### Deploy to Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase Hosting:

```bash
firebase init hosting
```

4. Deploy:

```bash
firebase deploy
```

### Deploy Socket.io Server for Real-Time Collaboration

The real-time collaboration features require a separate Socket.io server. When deployed to Firebase Hosting, the application defaults to mock mode for RTC (no actual real-time collaboration).

To enable real-time collaboration in production:

1. Deploy the Socket.io server (`server.js`) to a platform that supports Node.js:

**Deploy to Heroku:**
```bash
# Install Heroku CLI if you haven't already
npm install -g heroku

# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-socketio-server-name

# Create a new Git repository for the server
mkdir socket-server
cd socket-server
cp ../server.js ./
cp ../server-package.json ./package.json
git init
git add .
git commit -m "Initial commit"

# Push to Heroku
heroku git:remote -a your-socketio-server-name
git push heroku master
```

2. Set the Socket server URL in your environment variables:

Create a `.env.production` file with:
```
VUE_APP_SOCKET_SERVER_URL=https://your-socketio-server-name.herokuapp.com
```

3. Rebuild and redeploy your application:
```bash
npm run build
firebase deploy
```

Note: For security in production, you should configure CORS on your Socket.io server and implement proper authentication.

## License

[MIT](LICENSE)

## Contact

For any questions or support, please contact:
- Email: your-email@example.com
- GitHub: [khanapcalculus](https://github.com/khanapcalculus)
