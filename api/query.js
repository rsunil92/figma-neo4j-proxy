// Neo4j Proxy for Vercel - Handles Figma → Neo4j Forge communication
import https from 'https';

const NEO4J_CONFIG = {
  endpoint: 'https://42a19f89.databases.neo4j.io',
  db: '42a19f89',
  user: 'neo4j',
  password: '7jCkriX9XpH8qL_E28y5nCIehRoAZj3RwdLX1J8beKI'
};

function queryNeo4j(cypher) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${NEO4J_CONFIG.user}:${NEO4J_CONFIG.password}`).toString('base64');

    const postData = JSON.stringify({ query: cypher });

    const options = {
      hostname: NEO4J_CONFIG.endpoint.replace('https://', ''),
      path: `/db/${NEO4J_CONFIG.db}/query/v2`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, data: parsed });
          }
        } catch (e) {
          reject({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { query } = req.body;

      if (!query) {
        res.status(400).json({
          error: 'No query provided',
          example: { query: 'MATCH (c:Criterion) RETURN c.id, c.name LIMIT 5' }
        });
        return;
      }

      console.log('📤 Cypher query received');

      const result = await queryNeo4j(query);

      res.status(200).json(result);

    } catch (error) {
      console.error('Neo4j error:', error);
      res.status(500).json({
        error: 'Neo4j query failed',
        details: error.message || error
      });
    }
  } else if (req.method === 'GET') {
    res.status(200).json({
      status: 'OK',
      message: 'Neo4j Proxy for Figma Accessibility Plugin',
      endpoint: 'POST /api/query',
      example: {
        query: 'MATCH (c:Criterion) RETURN c.id, c.name LIMIT 5'
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
