"""Fox MCP server: Fox's own tools over MCP.

Hermes connects to ``/mcp`` (Streamable HTTP) and calls the tools in
``tools/``. Compose uses ``/health``.
"""

import os

from mcp.server.mcpserver import MCPServer
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from tools import TOOLS

server = MCPServer(
    name="fox",
    instructions="Fox assistant tools: reminders, notes, device toggles, calculations, and system status.",
)
for tool in TOOLS:
    server.add_tool(tool)


@server.custom_route("/health", methods=["GET"])
async def health(request: Request) -> Response:
    tools = await server.list_tools()
    return JSONResponse({"status": "ok", "service": "fox-mcp-server", "tools": [t.name for t in tools]})


# host="0.0.0.0" tells the SDK this is not a localhost-only server, so it does
# not reject requests whose Host header is the Compose service name.
app = server.streamable_http_app(host="0.0.0.0")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("MCP_SERVER_PORT", "8100")))
