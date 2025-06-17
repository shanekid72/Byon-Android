import WebSocket from 'ws'
import { logger } from '../utils/logger'

export class BuildStatusService {
  private wss: WebSocket.Server
  private connections: Map<string, WebSocket[]> = new Map()

  constructor(wss: WebSocket.Server) {
    this.wss = wss
  }

  public addConnection(buildId: string, ws: WebSocket): void {
    if (!this.connections.has(buildId)) {
      this.connections.set(buildId, [])
    }
    this.connections.get(buildId)!.push(ws)
    logger.info(`WebSocket connection added for build ${buildId}`)
  }

  public removeConnection(ws: WebSocket): void {
    for (const [buildId, connections] of this.connections.entries()) {
      const index = connections.indexOf(ws)
      if (index > -1) {
        connections.splice(index, 1)
        if (connections.length === 0) {
          this.connections.delete(buildId)
        }
        logger.info(`WebSocket connection removed for build ${buildId}`)
        break
      }
    }
  }

  public broadcastUpdate(buildId: string, update: any): void {
    const connections = this.connections.get(buildId) || []
    const message = JSON.stringify({
      type: 'build-update',
      buildId,
      data: update
    })

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })
  }

  public handleMessage(ws: WebSocket, data: any): void {
    if (data.type === 'subscribe' && data.buildId) {
      this.addConnection(data.buildId, ws)
    }
  }
} 