import { Router } from 'express'
import { checkMongoHealth, checkRedisHealth } from '../../utils/database'
import cors, { CorsOptionsDelegate } from 'cors'

const router = Router()

// Allow all localhost origins for development
const corsOptions: CorsOptionsDelegate = (req, callback) => {
  const origin = req.headers['origin'] as string | undefined;
  if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
    callback(null, {
      origin: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    });
  } else {
    callback(new Error('Not allowed by CORS'), {});
  }
};

// Apply CORS middleware to all health routes
router.use(cors(corsOptions));

router.get('/', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LuluPay Build System'
  })
})

router.get('/detailed', async (req, res) => {
  try {
    const [mongo, redis] = await Promise.all([
      checkMongoHealth(),
      checkRedisHealth()
    ])

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongo,
        redis: redis
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
})

export { router as healthRoutes } 