# Axis Lab Pro - Integration Guide

## Overview
Axis Lab Pro is an advanced CAM, laser cutting simulation, and workshop management platform built for independent digital fabrication studios.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Lucide Icons.
- **Desktop Wrapper**: Electron (`electron/main.js`).
- **Engines**: Custom Geometry Optimization, DXF Parsing, Nesting, and Pricing algorithms located in `src/engine/`.

## Setup & Run
1. Install dependencies:
   ```bash
   npm install