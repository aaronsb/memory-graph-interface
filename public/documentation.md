# Memory Graph Visualization Documentation

## Overview

This document explains the approach used to visualize the memory graph data from our SQLite database. The visualization creates a multi-dimensional representation of memory nodes and their tags, using force-directed layout to naturally cluster related items.

## Data Structure

The visualization uses a multi-level structure that includes:

1. **Memory Nodes**: Represent individual memories from the database
   - Sourced from the `MEMORY_NODES` table
   - Displayed as smaller nodes in the visualization
   - Colored based on their domain

2. **Tag Nodes**: Represent tags that categorize memories
   - Derived from the `MEMORY_TAGS` table
   - Displayed as larger nodes in the visualization
   - Colored based on tag name

3. **Relationship Links**: Three types of connections between nodes
   - **Memory-to-Memory Links**: Direct relationships between memories (from `MEMORY_EDGES` table)
     - Uses actual strength values (0-1) from the database
     - Different colors based on relationship type (relates_to, synthesizes, supports, refines)
   - **Tag-to-Memory Links**: Connections between tags and their associated memories
     - Fixed moderate strength (0.6)
     - Visualized with a distinct color
   - **Tag-to-Tag Links**: Derived connections between tags that co-occur in the same memories
     - Strength calculated based on co-occurrence frequency
     - Visualized with a distinct color

## Force Dynamics

The visualization uses a force-directed layout with several key dynamics:

1. **Attraction Forces**: Links pull nodes together
   - Stronger relationships (higher strength values) create stronger attraction
   - Memory-memory relationships use the exact strength values from the database
   - Tag-memory relationships use a fixed moderate strength
   - Tag-tag relationships use calculated strength based on co-occurrence

2. **Repulsion Forces**: Nodes push each other away
   - Tag nodes have stronger repulsion than memory nodes
   - This creates natural clustering where tags act as "anchors" for their associated memories

3. **Collision Detection**: Prevents nodes from overlapping
   - Tag nodes have larger collision areas than memory nodes
   - Node size is proportional to importance (tags) or connectivity (memories)

## Visual Elements

The visualization uses several visual cues to represent the data:

1. **Node Size**: 
   - Tag nodes are larger than memory nodes
   - Tag node size is proportional to the number of associated memories
   - Memory node size is smaller and more uniform

2. **Node Color**:
   - Tag nodes use a predefined color scheme based on tag name
   - Memory nodes are colored based on their domain
   - Highlighted nodes use a distinct orange color

3. **Link Appearance**:
   - Links are rendered as straight lines to ensure true 3D positioning
   - Different link types use different colors
   - Directional particles flow along links to enhance visual interest
   - The bloom effect creates a glowing appearance for all nodes and links

4. **Bloom Effect**:
   - Enhanced glow effect using UnrealBloomPass with optimized parameters
   - Strength set to 4 for maximum visibility
   - Threshold set to 0 to ensure all elements glow
   - Creates a vibrant, ethereal appearance similar to the reference example

## Why the Graph Looks This Way

The graph's appearance is driven by several key factors:

1. **True 3D Distribution**: 
   - Nodes are distributed in genuine 3D space rather than being projected onto a plane
   - Straight links (no curvature) ensure proper spatial positioning
   - Simplified force parameters allow for more natural 3D arrangement
   - Nodes can freely position themselves in all three dimensions

2. **Clustering Based on Relationships**: 
   - Memory nodes naturally cluster around their associated tag nodes
   - Tags that frequently co-occur will be positioned closer together
   - Memories with strong relationships form tight clusters
   - Relationship strength directly influences spatial proximity

3. **Enhanced Visual Appeal**:
   - The bloom effect (strength: 4, threshold: 0) creates a vibrant glow
   - Nodes and links appear to emit light, similar to the reference example
   - The dark background (#000003) maximizes contrast and glow visibility
   - Simplified visual styling focuses attention on the structure itself

4. **Visual Hierarchy**:
   - Tags are visually prominent (larger, brighter)
   - Memories are subordinate but still distinct
   - Different node types and relationship types use distinct visual encodings
   - Interactive elements (hover, click) allow exploration of the complex structure

## Technical Implementation

The implementation uses several key technologies:

1. **Data Extraction**:
   - Server-side Node.js with Express
   - SQLite database queries to extract memory nodes, tags, and relationships
   - Data transformation to create the multi-level structure

2. **Visualization**:
   - 3D Force Graph library for the force-directed layout
   - Three.js for 3D rendering with UnrealBloomPass for the glow effect
   - D3.js for force simulation
   - Optimized bloom parameters (strength: 4, radius: 1, threshold: 0)

3. **Force Parameters**:
   - Simplified force parameters to allow for better 3D distribution
   - Link distance inversely proportional to strength (60 / strength)
   - Moderate charge strength (-120) for balanced repulsion
   - Increased distanceMax (500) to allow for more spread in 3D space
   - Collision detection sized by node type (tag: 12, memory: 8)

## Interaction Guide

Users can interact with the visualization in several ways:

1. **Hover**: Hover over a node to see its details and highlight its connections
2. **Click**: Click on a node to center the view on it
3. **Orbit**: Click and drag to orbit around the visualization
4. **Zoom**: Use the mouse wheel to zoom in and out
5. **Info Panel**: View detailed information about selected nodes
6. **Refresh**: Click the refresh button to update the data
7. **Toggle Bloom**: Turn the bloom effect on or off

## Conclusion

This visualization approach creates a rich, multi-dimensional representation of the memory graph data. By incorporating both tags and memories in the visualization and using the actual strength values from the database, we create a natural clustering effect that reveals the underlying structure of the data.

The force-directed layout, combined with visual cues like node size, color, and link appearance, creates an intuitive visualization that allows users to explore complex relationships between memories and their tags.
