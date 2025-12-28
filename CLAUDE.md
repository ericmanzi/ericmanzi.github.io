# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website (ericmanzi.github.io) hosted on GitHub Pages. It's a static site containing a simple portfolio landing page, an AI chat interface, and a Bananagrams word game.

## Architecture

### Site Structure
- `index.html` - Main landing page with profile links (LinkedIn, GitHub, Resume, Email)
- `chat/index.html` - AI chat interface using Groq API
- `bananagrams/index.html` - Single-player Bananagrams word game built with React
- `email.html` - Simple contact information page
- `assets/` - Static assets (CSS, content like resume PDF)

### Technology Stack
- Pure HTML/CSS for the landing page
- Vanilla JavaScript for the chat interface
- React 18 (loaded via CDN with Babel standalone) for Bananagrams game
- Bootstrap 4.5 for styling the main landing page
- No build system or package manager

### Chat Application (`chat/index.html`)
- Self-contained single-file application
- Uses Groq API for AI chat functionality
- API key stored in localStorage
- Supports multiple Llama and Mixtral models
- Maintains conversation history in memory
- Note: Contains a hardcoded API key (line 240) - should be removed before deploying to production

### Bananagrams Game (`bananagrams/`)
- Single-player word game implementation
- React component loaded via CDN (no build step)
- Uses local word validation with a hardcoded COMMON_WORDS set
- Implements tap-to-select, tap-to-place tile mechanics
- 15x15 grid with 21 starting tiles
- PEEL and DUMP game mechanics

## Development Workflow

Since this is a static GitHub Pages site with no build process:

1. **Local Development**: Open HTML files directly in a browser, or use a simple HTTP server:
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server
   ```

2. **Deployment**: Push to the `master` branch - GitHub Pages automatically serves the site

