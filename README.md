# QR-Nonsense

A React-based web application for QR code processing and manipulation, built with modern web technologies.

## Quick Start

**Fastest way to get started:**

```bash
./start.sh
```

Or manually:

```bash
pnpm install && pnpm start
```

The application will be available at **http://localhost:3000**

## Tech Stack

- React
- Vite
- Tailwind CSS
- Radix UI Components
- DND Kit for drag and drop
- Monaco Editor for code editing

## Getting Started

### Prerequisites

- Node.js (v23.x - see `engines` in package.json)
- pnpm package manager

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm start
```

The dev server will start on **http://localhost:3000** (configured in `vite.config.mjs`)

3. Build for production:
```bash
pnpm build
```

4. Preview production build:
```bash
pnpm serve
```

## Project Structure

- `/src` - Source code
  - `/components` - Reusable React components
  - `/app` - Main application components
  - `/domain` - Domain-specific logic
  - `/state` - State management
  - `/hooks` - Custom React hooks
  - `/utils` - Utility functions
  - `/qr` - QR code related functionality
  - `/lib` - Library configurations
  - `/assets` - Static assets

## Features

- QR Code processing
- Drag and drop functionality
- Code editing capabilities
- Modern UI components using Radix UI
- Responsive design with Tailwind CSS

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 