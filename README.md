# Memory Graph Interface

A 3D visualization interface for exploring and interacting with memory graphs created by the [memory-graph MCP](https://github.com/aaronsb/memory-graph).

![Memory Graph Visualizer](docs/screenshot-nodes.png)

## Overview

Memory Graph Interface is a companion application to the [memory-graph MCP](https://github.com/aaronsb/memory-graph) which creates and manages memory nodes. This interface provides a powerful 3D visualization of memory nodes and their relationships, allowing for intuitive exploration and manipulation of the memory graph.

## Demo

Watch the Memory Graph Interface in action:

[![Memory Graph Interface Demo](https://img.youtube.com/vi/u9EFn4BcviY/0.jpg)](https://www.youtube.com/watch?v=u9EFn4BcviY)

Click the image above to watch a demonstration of the Memory Graph Interface being used in real time.

## Features

- **3D Force-Directed Graph**: Visualize memory nodes and their connections in an interactive 3D space
- **Node Interaction**: Click nodes to view detailed content, add tags, and manage connections
- **Link Creation**: Create links between nodes by shift-clicking or dragging nodes together
- **Visual Cues**: Node sizes reflect the number of tags (larger nodes have more tags), and colors indicate domain membership
- **Real-time Updates**: Automatically detect changes to the underlying database
- **Visual Effects**: Toggle bloom effect for enhanced visualization
- **Multi-domain Support**: Visualize connections across different memory domains

## Getting Started

### Prerequisites

- Node.js
- SQLite database created by the memory-graph MCP

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/memory-graph-interface.git
   cd memory-graph-interface
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure the database path in a `.env` file:
   ```
   PORT=3000
   DB_PATH=/path/to/your/memory-graph.db
   ```

4. Start the server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

- **View Node Details**: Click on a node to see its content and tags
- **Create Links**: Shift-click two nodes to create a link between them
- **Drag to Link**: Drag a node near another to automatically create a link
- **Delete Links**: Control-click on a link to delete it
- **Delete Nodes**: Control-click on a node to delete it and all its connections
- **Add Tags**: Select a node and use the tag input field to add new tags
- **Refresh Data**: Click the "Refresh Data" button to manually update the visualization
- **Toggle Effects**: Use the "Toggle Bloom" button to enable/disable the bloom visual effect

## Multi-Agent Support

The Memory Graph Interface can be used by multiple agents simultaneously, all accessing the same memory database. This allows for collaborative memory management and exploration across different AI systems.

## Related Projects

- [memory-graph MCP](https://github.com/aaronsb/memory-graph): The MCP server that creates and manages the memory nodes visualized by this interface

## License

[MIT License](LICENSE)
