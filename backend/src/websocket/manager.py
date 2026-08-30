from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.active_connections = []

    async def connect(
        self,
        websocket: WebSocket,
    ):
        await websocket.accept()

        self.active_connections.append(
            websocket
        )

    def disconnect(
        self,
        websocket: WebSocket,
    ):
        if websocket in self.active_connections:
            self.active_connections.remove(
                websocket
            )

    async def broadcast(
        self,
        payload: dict,
    ):
        dead = []

        for connection in self.active_connections:

            try:
                await connection.send_json(
                    payload
                )

            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)


manager = ConnectionManager()