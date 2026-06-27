/**
 * Static AI Engines for Visual Whiteboard Pro
 * Resolves layout alignments and validates system architecture designs locally.
 */

/**
 * Robust Geometric Layout Engine for Visual Whiteboard Pro
 * Snaps, aligns, and spaces canvas elements using multi-pass optimization.
 * 
 * @param {Array} elements - Canvas elements with coordinates and sizes.
 * @returns {Array} List of elements with updated left/top coordinates.
 */
function cleanupLayout(elements, connectors = []) {
  if (!elements || !Array.isArray(elements) || elements.length === 0) {
    return [];
  }

  // 1. Initial Data Prep
  let items = elements.map(el => {
    const w = el.width * (el.scaleX || 1);
    const h = el.height * (el.scaleY || 1);
    return {
      id: el.id,
      type: el.type,
      left: el.left,
      top: el.top,
      width: w,
      height: h,
      centerX: el.left + w / 2,
      centerY: el.top + h / 2,
      isLocked: el.isLocked || false
    };
  });

  const GRID_SIZE = 20;

  // Check if we have connections to preserve layout topology
  const validEdges = (connectors || []).map(conn => ({
    sourceId: conn.sourceId,
    targetId: conn.targetId
  })).filter(e => e.sourceId && e.targetId);

  const hasConnections = validEdges.length > 0;
  console.log("[cleanupLayout] Elements:", elements.length, "Connectors:", connectors.length, "Valid Edges:", validEdges.length, "hasConnections:", hasConnections);

  if (hasConnections) {
    // GRAPH LAYOUT: Force-directed diagram spacing optimizer
    const movableItems = items.filter(i => !i.isLocked);
    if (movableItems.length > 0) {
      const iterations = 80;
      
      for (let iter = 0; iter < iterations; iter++) {
        // Initialize forces
        const forces = {};
        items.forEach(item => {
          forces[item.id] = { fx: 0, fy: 0 };
        });

        // 1. Repulsive forces between ALL items (to prevent overlaps and space them out)
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i];
            const b = items[j];

            const dx = b.centerX - a.centerX;
            const dy = b.centerY - a.centerY;
            const d = Math.hypot(dx, dy) || 1;

            // Desired buffer spacing based on shape sizes
            const desiredDist = (a.width + b.width) / 2 + 100; // Keep at least 100px gap
            if (d < desiredDist) {
              const forceMag = (desiredDist - d) / d * 0.4;
              const pushX = dx * forceMag;
              const pushY = dy * forceMag;

              if (!a.isLocked) {
                forces[a.id].fx -= pushX;
                forces[a.id].fy -= pushY;
              }
              if (!b.isLocked) {
                forces[b.id].fx += pushX;
                forces[b.id].fy += pushY;
              }
            }
          }
        }

        // 2. Attractive / spring forces along edges (connectors) to keep layout structured
        validEdges.forEach(edge => {
          const a = items.find(item => item.id === edge.sourceId);
          const b = items.find(item => item.id === edge.targetId);
          if (!a || !b) return;

          const dx = b.centerX - a.centerX;
          const dy = b.centerY - a.centerY;
          const d = Math.hypot(dx, dy) || 1;

          const idealLength = 220; // Natural connection distance
          const springStrength = 0.08;
          const forceMag = (d - idealLength) / d * springStrength;
          const pullX = dx * forceMag;
          const pullY = dy * forceMag;

          if (!a.isLocked) {
            forces[a.id].fx += pullX;
            forces[a.id].fy += pullY;
          }
          if (!b.isLocked) {
            forces[b.id].fx -= pullX;
            forces[b.id].fy -= pullY;
          }
        });

        // 3. Apply forces to update positions
        movableItems.forEach(item => {
          const f = forces[item.id];
          // Limit maximum displacement per iteration to avoid instability
          const maxDisplacement = 40;
          const dispX = Math.max(-maxDisplacement, Math.min(maxDisplacement, f.fx));
          const dispY = Math.max(-maxDisplacement, Math.min(maxDisplacement, f.fy));

          item.left += dispX;
          item.top += dispY;
          item.centerX = item.left + item.width / 2;
          item.centerY = item.top + item.height / 2;
        });
      }
    }
  } else {
    // Existing ROW/COLUMN alignment for unconnected shapes
    const GAP_SIZE = 60;
    const movableItems = items.filter(i => !i.isLocked);
    if (movableItems.length === 0) return [];

    const minX = Math.min(...items.map(i => i.left));
    const maxX = Math.max(...items.map(i => i.left + i.width));
    const minY = Math.min(...items.map(i => i.top));
    const maxY = Math.max(...items.map(i => i.top + i.height));

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;
    const isRow = totalWidth >= totalHeight;

    if (isRow) {
      // ROW ALIGNMENT: Align to mean Y of ALL items
      const meanY = items.reduce((sum, i) => sum + i.centerY, 0) / items.length;
      movableItems.forEach(item => {
        item.top = meanY - item.height / 2;
        item.centerY = item.top + item.height / 2;
      });

      // Uniform horizontal distribution
      movableItems.sort((a, b) => a.left - b.left);
      let currentX = minX;
      movableItems.forEach((item) => {
        item.left = currentX;
        item.centerX = item.left + item.width / 2;
        currentX += item.width + GAP_SIZE;
      });
    } else {
      // COLUMN ALIGNMENT: Align to mean X
      const meanX = items.reduce((sum, i) => sum + i.centerX, 0) / items.length;
      movableItems.forEach(item => {
        item.left = meanX - item.width / 2;
        item.centerX = item.left + item.width / 2;
      });

      // Uniform vertical distribution
      movableItems.sort((a, b) => a.top - b.top);
      let currentY = minY;
      movableItems.forEach((item) => {
        item.top = currentY;
        item.centerY = item.top + item.height / 2;
        currentY += item.height + GAP_SIZE;
      });
    }

    // Overlap push-away resolution for unconnected
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          const a = items[i];
          const b = items[j];

          const overlapX = (a.left < b.left + b.width) && (a.left + a.width > b.left);
          const overlapY = (a.top < b.top + b.height) && (a.top + a.height > b.top);

          if (overlapX && overlapY) {
            if (isRow) {
              if (b.centerX > a.centerX) {
                b.left = a.left + a.width + 40;
              } else {
                a.left = b.left + b.width + 40;
              }
            } else {
              if (b.centerY > a.centerY) {
                b.top = a.top + a.height + 40;
              } else {
                a.top = b.top + b.height + 40;
              }
            }
            a.centerX = a.left + a.width / 2;
            a.centerY = a.top + a.height / 2;
            b.centerX = b.left + b.width / 2;
            b.centerY = b.top + b.height / 2;
          }
        }
      }
    }
  }

  // Snap all elements to the grid size at the end (for all alignment algorithms)
  items.forEach(item => {
    if (!item.isLocked) {
      item.left = Math.round(item.left / GRID_SIZE) * GRID_SIZE;
      item.top = Math.round(item.top / GRID_SIZE) * GRID_SIZE;
    }
  });

  return items.map(item => ({
    id: item.id,
    left: item.left,
    top: item.top
  }));
}

/**
 * Runs an architectural check linter on whiteboard system elements.
 * @param {Array} elements - Canvas elements containing id, type, and labels.
 * @param {Array} edges - Array of {from, to} edge objects connecting element IDs.
 * @returns {Array} List of suggestions with type, severity, message, suggestedComponent.
 */
function architectureAssist(elements, edges = []) {
  if (!elements || !Array.isArray(elements)) {
    return [];
  }

  // Pre-process labels to extract categories
  const list = elements.map(el => {
    const label = (el.label || '').trim();
    const lLower = label.toLowerCase();
    
    let category = 'unknown';
    if (lLower.includes('db') || lLower.includes('database') || lLower.includes('mongodb') || lLower.includes('postgres') || lLower.includes('mysql') || lLower.includes('sql') || lLower.includes('mongo') || lLower.includes('dynamodb') || lLower.includes('nosql') || lLower.includes('oracle') || lLower.includes('sqlite')) {
      category = 'database';
    } else if (lLower.includes('cache') || lLower.includes('redis') || lLower.includes('memcached')) {
      category = 'cache';
    } else if (lLower.includes('queue') || lLower.includes('rabbitmq') || lLower.includes('kafka') || lLower.includes('mq') || lLower.includes('pubsub') || lLower.includes('activemq')) {
      category = 'queue';
    } else if (lLower.includes('gateway') || lLower.includes('api-gateway') || lLower.includes('nginx') || lLower.includes('proxy') || lLower.includes('loadbalancer') || lLower.includes('load balancer') || lLower.includes('ingress')) {
      category = 'gateway';
    } else if (lLower.includes('auth') || lLower.includes('cognito') || lLower.includes('jwt') || lLower.includes('login') || lLower.includes('oauth') || lLower.includes('identity')) {
      category = 'auth';
    } else if (lLower.includes('react') || lLower.includes('vue') || lLower.includes('client') || lLower.includes('frontend') || lLower.includes('ui') || lLower.includes('web') || lLower.includes('app') || lLower.includes('browser') || lLower.includes('website') || lLower.includes('ios') || lLower.includes('android') || lLower.includes('mobile')) {
      category = 'frontend';
    } else if (lLower.includes('server') || lLower.includes('express') || lLower.includes('node') || lLower.includes('api') || lLower.includes('backend') || lLower.includes('django') || lLower.includes('spring') || lLower.includes('flask') || lLower.includes('service') || lLower.includes('microservice')) {
      category = 'backend';
    }

    return {
      id: el.id,
      type: el.type,
      label: label,
      category: category
    };
  });

  const getById = (id) => list.find(el => el.id === id);

  const hasFrontend = list.some(el => el.category === 'frontend');
  const hasBackend = list.some(el => el.category === 'backend');
  const hasDatabase = list.some(el => el.category === 'database');
  const hasCache = list.some(el => el.category === 'cache');
  const hasQueue = list.some(el => el.category === 'queue');
  const hasGateway = list.some(el => el.category === 'gateway');
  const hasAuth = list.some(el => el.category === 'auth');

  const suggestions = [];

  // Edge-based Topology Checks
  let directDbConnection = false;
  let frontendNode = null;
  
  edges.forEach(edge => {
    const fromNode = getById(edge.from);
    const toNode = getById(edge.to);
    if (!fromNode || !toNode) return;

    // Check 1: Direct Client-to-DB Connection (Severe Security Risk)
    if (
      (fromNode.category === 'frontend' && toNode.category === 'database') ||
      (fromNode.category === 'database' && toNode.category === 'frontend')
    ) {
      directDbConnection = true;
      frontendNode = fromNode.category === 'frontend' ? fromNode : toNode;
    }
  });

  if (directDbConnection) {
    suggestions.push({
      type: 'security_concern',
      severity: 'critical',
      message: 'Critical Security Warning: Your frontend client connects directly to a database. Direct client database connections leak credentials and expose schema configurations. Add a Backend API service as a security intermediary.',
      suggestedComponent: {
        type: 'rect',
        label: 'Express API Server',
        targetId: frontendNode ? frontendNode.id : null
      }
    });
  } else if (hasFrontend && hasDatabase && !hasBackend && edges.length === 0) {
     // Fallback if no edges but shapes exist
     suggestions.push({
      type: 'security_concern',
      severity: 'critical',
      message: 'Critical Security Warning: Your frontend client appears to connect directly to a database. Add a Backend API service as a security intermediary.',
      suggestedComponent: {
        type: 'rect',
        label: 'Express API Server',
        targetId: list.find(el => el.category === 'frontend')?.id
      }
    });
  }

  // Check 2: Missing Database Cache (Performance Optimization)
  if (hasBackend && hasDatabase && !hasCache) {
    suggestions.push({
      type: 'optimization',
      severity: 'warning',
      message: 'Performance Recommendation: High-frequency queries hitting your database directly can cause read bottlenecks and latency spikes. Consider introducing an in-memory Caching layer (e.g. Redis Cache) to cache database reads.',
      suggestedComponent: {
        type: 'circle',
        label: 'Redis Cache',
        targetId: list.find(el => el.category === 'database')?.id
      }
    });
  }

  // Check 3: User Authentication & Security (Best Practice)
  if ((hasFrontend || hasBackend) && !hasAuth) {
    suggestions.push({
      type: 'improvement',
      severity: 'info',
      message: 'Security Best Practice: Your API endpoints and client views do not specify user session validation. Introduce a dedicated Authentication Service or JWT token validator to handle user registers, logins, and route guard permissions.',
      suggestedComponent: {
        type: 'rect',
        label: 'Auth Service (JWT)',
        targetId: list.find(el => el.category === 'backend' || el.category === 'frontend')?.id
      }
    });
  }

  // Check 4: Multiple Backend services without API Gateway (Routing Optimization)
  const backendNodes = list.filter(el => el.category === 'backend');
  if (backendNodes.length > 1 && !hasGateway) {
    suggestions.push({
      type: 'improvement',
      severity: 'warning',
      message: 'Architectural Alert: You have multiple microservices directly exposed. Implement an API Gateway / Reverse Proxy (e.g., NGINX, Kong) to handle central routing, SSL termination, and rate limiting.',
      suggestedComponent: {
        type: 'rect',
        label: 'API Gateway (NGINX)',
        targetId: backendNodes[0].id
      }
    });
  }

  // Check 5: Heavy Background Job Queue (Scalability)
  if (hasBackend && hasDatabase && !hasQueue) {
    suggestions.push({
      type: 'optimization',
      severity: 'info',
      message: 'Scalability Suggestion: If your system processes heavy tasks (e.g. PDF exports, image processing), doing it synchronously blocks Express HTTP threads. Introduce an asynchronous Message Queue.',
      suggestedComponent: {
        type: 'diamond',
        label: 'RabbitMQ Message Queue',
        targetId: list.find(el => el.category === 'backend')?.id
      }
    });
  }

  // Check 6: Title banner suggestion (Documentation)
  if (list.length > 2 && !list.some(el => el.type === 'text' && el.label.length > 15)) {
    suggestions.push({
      type: 'improvement',
      severity: 'info',
      message: 'Diagram Readability: Diagrams are easier to digest with clear descriptions and visual titles. Add a prominent system design header to the top of your whiteboard canvas.',
      suggestedComponent: {
        type: 'text',
        label: 'System Architecture Diagram',
        targetId: null
      }
    });
  }

  return suggestions;
}

module.exports = {
  cleanupLayout,
  architectureAssist
};
