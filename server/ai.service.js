/**
 * Static AI Engines for Visual Whiteboard Pro
 * Resolves layout alignments and validates system architecture designs locally.
 */

/**
 * Snaps, aligns, and spaces canvas elements.
 * @param {Array} elements - Canvas elements coordinates and sizes.
 * @returns {Array} List of elements with updated left/top coordinates.
 */
function cleanupLayout(elements) {
  if (!elements || !Array.isArray(elements) || elements.length === 0) {
    return [];
  }

  // 1. Snap everything to 20px grid
  let items = elements.map(el => {
    const w = Math.round((el.width || 120) / 20) * 20;
    const h = Math.round((el.height || 80) / 20) * 20;
    return {
      id: el.id,
      type: el.type,
      left: Math.round(el.left / 20) * 20,
      top: Math.round(el.top / 20) * 20,
      width: w,
      height: h,
      scaleX: el.scaleX || 1,
      scaleY: el.scaleY || 1
    };
  });

  // Tolerance for matching alignment groups: 60px
  const tolerance = 60;

  // 2. Row Alignment: align tops of elements that are horizontally close
  let processedRows = new Set();
  for (let i = 0; i < items.length; i++) {
    if (processedRows.has(items[i].id)) continue;
    let row = [items[i]];
    for (let j = i + 1; j < items.length; j++) {
      if (processedRows.has(items[j].id)) continue;
      if (Math.abs(items[i].top - items[j].top) < tolerance) {
        row.push(items[j]);
      }
    }

    if (row.length > 1) {
      const avgTop = Math.round((row.reduce((sum, el) => sum + el.top, 0) / row.length) / 20) * 20;
      row.forEach(el => {
        el.top = avgTop;
        processedRows.add(el.id);
      });
      // Distribute row elements horizontally with a uniform gap (60px)
      row.sort((a, b) => a.left - b.left);
      for (let k = 1; k < row.length; k++) {
        const prev = row[k - 1];
        const current = row[k];
        const minLeft = prev.left + (prev.width * prev.scaleX) + 60;
        if (current.left < minLeft) {
          current.left = Math.round(minLeft / 20) * 20;
        }
      }
    }
  }

  // 3. Column Alignment: align lefts of elements that are vertically close
  let processedCols = new Set();
  for (let i = 0; i < items.length; i++) {
    if (processedCols.has(items[i].id)) continue;
    let col = [items[i]];
    for (let j = i + 1; j < items.length; j++) {
      if (processedCols.has(items[j].id)) continue;
      if (Math.abs(items[i].left - items[j].left) < tolerance) {
        col.push(items[j]);
      }
    }

    if (col.length > 1) {
      const avgLeft = Math.round((col.reduce((sum, el) => sum + el.left, 0) / col.length) / 20) * 20;
      col.forEach(el => {
        el.left = avgLeft;
        processedCols.add(el.id);
      });
      // Distribute col elements vertically with a uniform gap (60px)
      col.sort((a, b) => a.top - b.top);
      for (let k = 1; k < col.length; k++) {
        const prev = col[k - 1];
        const current = col[k];
        const minTop = prev.top + (prev.height * prev.scaleY) + 60;
        if (current.top < minTop) {
          current.top = Math.round(minTop / 20) * 20;
        }
      }
    }
  }

  // 4. Overlap Resolution pass
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const a = items[i];
        const b = items[j];
        const aWidth = a.width * a.scaleX;
        const aHeight = a.height * a.scaleY;
        const bWidth = b.width * b.scaleX;
        const bHeight = b.height * b.scaleY;

        const overlapX = (a.left < b.left + bWidth) && (a.left + aWidth > b.left);
        const overlapY = (a.top < b.top + bHeight) && (a.top + aHeight > b.top);

        if (overlapX && overlapY) {
          const diffX = (b.left + bWidth / 2) - (a.left + aWidth / 2);
          const diffY = (b.top + bHeight / 2) - (a.top + aHeight / 2);
          if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX >= 0) {
              b.left = Math.round((a.left + aWidth + 40) / 20) * 20;
            } else {
              b.left = Math.round((a.left - bWidth - 40) / 20) * 20;
            }
          } else {
            if (diffY >= 0) {
              b.top = Math.round((a.top + aHeight + 40) / 20) * 20;
            } else {
              b.top = Math.round((a.top - bHeight - 40) / 20) * 20;
            }
          }
        }
      }
    }
  }

  return items.map(item => ({
    id: item.id,
    left: item.left,
    top: item.top
  }));
}

/**
 * Runs an architectural check linter on whiteboard system elements.
 * @param {Array} elements - Canvas elements containing id, type, and labels.
 * @returns {Array} List of suggestions with type, severity, message, suggestedComponent.
 */
function architectureAssist(elements) {
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

  const hasFrontend = list.some(el => el.category === 'frontend');
  const hasBackend = list.some(el => el.category === 'backend');
  const hasDatabase = list.some(el => el.category === 'database');
  const hasCache = list.some(el => el.category === 'cache');
  const hasQueue = list.some(el => el.category === 'queue');
  const hasGateway = list.some(el => el.category === 'gateway');
  const hasAuth = list.some(el => el.category === 'auth');

  const suggestions = [];

  // Check 1: Direct Client-to-DB Connection (Severe Security Risk)
  if (hasFrontend && hasDatabase && !hasBackend) {
    suggestions.push({
      type: 'security_concern',
      severity: 'critical',
      message: 'Critical Security Warning: Your frontend client connects directly to a database. Direct client database connections leak credentials and expose schema configurations. Add a Backend API service (e.g. Node/Express Server) as a security intermediary.',
      suggestedComponent: {
        type: 'rect',
        label: 'Express API Server'
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
        label: 'Redis Cache'
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
        label: 'Auth Service (JWT)'
      }
    });
  }

  // Check 4: Multiple Backend services without API Gateway (Routing Optimization)
  const backendCount = list.filter(el => el.category === 'backend').length;
  if (backendCount > 1 && !hasGateway) {
    suggestions.push({
      type: 'improvement',
      severity: 'warning',
      message: 'Architectural Alert: You have multiple microservices directly exposed to frontend clients. Implement an API Gateway / Reverse Proxy (e.g., NGINX, Kong) to handle central routing, SSL termination, and rate limiting.',
      suggestedComponent: {
        type: 'rect',
        label: 'API Gateway (NGINX)'
      }
    });
  }

  // Check 5: Heavy Background Job Queue (Scalability)
  if (hasBackend && hasDatabase && !hasQueue) {
    suggestions.push({
      type: 'optimization',
      severity: 'info',
      message: 'Scalability Suggestion: If your system processes heavy tasks (e.g. PDF exports, image processing, notification mailing), doing it synchronously blocks Express HTTP threads. Introduce an asynchronous Message Queue (e.g. RabbitMQ or Kafka) for worker jobs.',
      suggestedComponent: {
        type: 'diamond',
        label: 'RabbitMQ Message Queue'
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
        label: 'System Architecture Diagram'
      }
    });
  }

  return suggestions;
}

module.exports = {
  cleanupLayout,
  architectureAssist
};
