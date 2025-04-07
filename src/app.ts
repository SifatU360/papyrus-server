import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import notFound from './app/middlewares/notFound'
import globalErrorHandler from './app/middlewares/globalErrorHandler'
import router from './app/routes/routes'
// import router from './app/routes'

const app: Application = express()


app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:5173', 'https://note-nest-iota.vercel.app'],
    // origin: 'https://note-nest-iota.vercel.app',
    credentials: true,
  }),
)

// Application Routes
app.use('/api', router)
const getController = async (req: Request, res: Response) => {
  res.send('Whats Up Buddy!')
}

app.get('/', getController)
app.use(globalErrorHandler)
app.use(notFound)

export default app
